"""Web channel: accepts HTTP POST /agent and returns agent response via the same bus."""

from __future__ import annotations

import asyncio
from typing import Any

from nanobot.bus.events import OutboundMessage
from nanobot.bus.queue import MessageBus
from nanobot.channels.base import BaseChannel


class WebChannel(BaseChannel):
    """Channel that resolves pending HTTP requests when the agent sends a response."""

    name = "web"

    def __init__(self, bus: MessageBus, pending: dict[str, asyncio.Future[str]]):
        super().__init__(config=None, bus=bus)
        self._pending = pending

    async def start(self) -> None:
        self._running = True

    async def stop(self) -> None:
        self._running = False
        for f in self._pending.values():
            if not f.done():
                f.cancel()

    async def send(self, msg: OutboundMessage) -> None:
        f = self._pending.pop(msg.chat_id, None)
        if f is not None and not f.done():
            f.set_result(msg.content or "")
