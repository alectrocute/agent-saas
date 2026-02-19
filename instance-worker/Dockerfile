# Build Go runner
FROM golang:1.26.0-alpine AS runner-builder
WORKDIR /src/runner
COPY runner.go .
RUN go build -o /out/runner runner.go

# Nanobot + picohost gateway wrapper + runner
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS nanobot-base
RUN apt-get update && \
  apt-get install -y --no-install-recommends curl ca-certificates jq wget && \
  rm -rf /var/lib/apt/lists/*
RUN uv pip install --system --no-cache nanobot-ai

# Final image: nanobot + our gateway (HTTP /agent) + runner
FROM nanobot-base
COPY --from=runner-builder /out/runner /usr/local/bin/runner
COPY gateway_web /tmp/gateway_web
RUN uv pip install --system --no-cache /tmp/gateway_web && rm -rf /tmp/gateway_web

# Copy CA bundle from nanobot image (HTTPS for providers)
# Already in bookworm-slim

# Initialize nanobot home (best-effort)
RUN nanobot onboard || true

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/runner"]
