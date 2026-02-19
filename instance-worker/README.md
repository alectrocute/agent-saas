# Picohost instance (Cloudflare Container)

Runs the user’s instance as a Cloudflare Container. Requires a **paid Workers plan** ($5/month+).

## Deploy

1. From this directory: `npm install && npm run deploy`
2. Note the deployed URL (e.g. `https://picohost-instance.<subdomain>.workers.dev`)
3. In the main app’s `src/wrangler.jsonc`, set `vars.INSTANCE_PUBLIC_URL` to that URL so Start can wake the container.

## Local dev

- `npm run dev` — runs the Worker + container locally (Docker required for container).
