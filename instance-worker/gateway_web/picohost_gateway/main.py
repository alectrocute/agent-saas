"""Run nanobot gateway with HTTP POST /agent in the same process."""

from __future__ import annotations

import asyncio
import sys
import uuid

# Nanobot gateway setup
from nanobot.bus.events import InboundMessage, OutboundMessage
from nanobot.bus.queue import MessageBus
from nanobot.config.loader import get_data_dir, load_config
from nanobot.session.manager import SessionManager

from .web_channel import WebChannel


def _make_provider(config):
    """Create LLM provider (mirrors nanobot CLI logic without typer)."""
    from nanobot.config.schema import Config
    from nanobot.providers.litellm_provider import LiteLLMProvider
    from nanobot.providers.openai_codex_provider import OpenAICodexProvider
    from nanobot.providers.custom_provider import CustomProvider
    from nanobot.providers.registry import find_by_name

    model = config.agents.defaults.model
    provider_name = config.get_provider_name(model)
    p = config.get_provider(model)

    if provider_name == "openai_codex" or (model or "").startswith("openai-codex/"):
        return OpenAICodexProvider(default_model=model)

    if provider_name == "custom":
        return CustomProvider(
            api_key=p.api_key if p else "no-key",
            api_base=config.get_api_base(model) or "http://localhost:8000/v1",
            default_model=model,
        )

    spec = find_by_name(provider_name) if provider_name else None
    if (
        not (model or "").startswith("bedrock/")
        and not (p and p.api_key)
        and not (spec and spec.is_oauth)
    ):
        print("Error: No API key configured.", file=sys.stderr)
        print("Set one in ~/.nanobot/config.json under providers section", file=sys.stderr)
        sys.exit(1)

    return LiteLLMProvider(
        api_key=p.api_key if p else None,
        api_base=config.get_api_base(model),
        default_model=model,
        extra_headers=p.extra_headers if p else None,
        provider_name=provider_name,
    )


async def run_http_server(
    host: str,
    port: int,
    bus: MessageBus,
    pending: dict[str, asyncio.Future[str]],
    request_timeout: float = 120.0,
) -> None:
    """Run aiohttp server for POST /agent."""
    try:
        from aiohttp import web
    except ImportError:
        print("aiohttp is required for web channel. pip install aiohttp", file=sys.stderr)
        sys.exit(1)

    async def handle_agent(request: web.Request) -> web.StreamResponse:
        if request.method != "POST":
            return web.json_response({"ok": False, "error": "Method not allowed"}, status=405)
        try:
            body = await request.json()
        except Exception as e:
            return web.json_response({"ok": False, "error": str(e)}, status=400)
        message = (body.get("message") or "").strip()
        if not message:
            return web.json_response({"ok": False, "error": "Missing message"}, status=400)
        if len(message) > 16_384:
            return web.json_response({"ok": False, "error": "Message too long"}, status=413)

        request_id = str(uuid.uuid4())
        future: asyncio.Future[str] = asyncio.get_event_loop().create_future()
        pending[request_id] = future
        try:
            await bus.publish_inbound(
                InboundMessage(
                    channel="web",
                    sender_id="web",
                    chat_id=request_id,
                    content=message,
                )
            )
            output = await asyncio.wait_for(future, timeout=request_timeout)
            return web.json_response({"ok": True, "output": output})
        except asyncio.TimeoutError:
            pending.pop(request_id, None)
            return web.json_response(
                {"ok": False, "error": "Agent request timed out"},
                status=504,
            )
        except Exception as e:
            pending.pop(request_id, None)
            return web.json_response(
                {"ok": False, "error": str(e), "output": ""},
                status=502,
            )

    app = web.Application()
    app.router.add_post("/agent", handle_agent)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host, port)
    await site.start()
    print(f"Web channel listening on http://{host}:{port} POST /agent", flush=True)
    # Block forever (server runs until process exits)
    await asyncio.Future()


def main() -> None:
    verbose = "--verbose" in sys.argv or "-v" in sys.argv

    if verbose:
        import logging
        logging.basicConfig(level=logging.DEBUG)

    config = load_config()
    host = getattr(config.gateway, "host", "0.0.0.0") or "0.0.0.0"
    port = getattr(config.gateway, "port", 18790) or 18790

    print("🐈 Starting nanobot gateway (with web channel) on port {}...".format(port), flush=True)
    bus = MessageBus()
    provider = _make_provider(config)
    session_manager = SessionManager(config.workspace_path)

    from nanobot.agent.loop import AgentLoop
    from nanobot.channels.manager import ChannelManager
    from nanobot.cron.service import CronService
    from nanobot.cron.types import CronJob
    from nanobot.heartbeat.service import HeartbeatService

    cron_store_path = get_data_dir() / "cron" / "jobs.json"
    cron = CronService(cron_store_path)

    agent = AgentLoop(
        bus=bus,
        provider=provider,
        workspace=config.workspace_path,
        model=config.agents.defaults.model,
        temperature=config.agents.defaults.temperature,
        max_tokens=config.agents.defaults.max_tokens,
        max_iterations=config.agents.defaults.max_tool_iterations,
        memory_window=config.agents.defaults.memory_window,
        brave_api_key=config.tools.web.search.api_key or None,
        exec_config=config.tools.exec,
        cron_service=cron,
        restrict_to_workspace=config.tools.restrict_to_workspace,
        session_manager=session_manager,
        mcp_servers=getattr(config.tools, "mcp_servers", None) or {},
    )

    async def on_cron_job(job: CronJob) -> str | None:
        response = await agent.process_direct(
            job.payload.message,
            session_key=f"cron:{job.id}",
            channel=job.payload.channel or "cli",
            chat_id=job.payload.to or "direct",
        )
        if job.payload.deliver and job.payload.to:
            await bus.publish_outbound(
                OutboundMessage(
                    channel=job.payload.channel or "cli",
                    chat_id=job.payload.to,
                    content=response or "",
                )
            )
        return response

    cron.on_job = on_cron_job

    async def on_heartbeat(prompt: str) -> str:
        return await agent.process_direct(prompt, session_key="heartbeat")

    heartbeat = HeartbeatService(
        workspace=config.workspace_path,
        on_heartbeat=on_heartbeat,
        interval_s=30 * 60,
        enabled=True,
    )

    channels = ChannelManager(config, bus)
    pending: dict[str, asyncio.Future[str]] = {}
    channels.channels["web"] = WebChannel(bus, pending)

    if channels.enabled_channels:
        print(f"✓ Channels enabled: {', '.join(channels.enabled_channels)}, web", flush=True)
    else:
        print("✓ Channels enabled: web", flush=True)

    cron_status = cron.status()
    if cron_status["jobs"] > 0:
        print(f"✓ Cron: {cron_status['jobs']} scheduled jobs", flush=True)
    print("✓ Heartbeat: every 30m", flush=True)

    async def run() -> None:
        try:
            await cron.start()
            await heartbeat.start()
            await asyncio.gather(
                agent.run(),
                channels.start_all(),
                run_http_server(host, port, bus, pending),
            )
        except KeyboardInterrupt:
            print("\nShutting down...", flush=True)
        finally:
            await agent.close_mcp()
            heartbeat.stop()
            cron.stop()
            agent.stop()
            await channels.stop_all()

    asyncio.run(run())


if __name__ == "__main__":
    main()
