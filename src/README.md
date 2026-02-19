# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

## Deploy to Cloudflare Workers

From the `src` directory:

1. Log in (if needed): `npx wrangler login`
2. Build and deploy: `npm run deploy`

This runs `nuxt build` then `wrangler deploy`. Ensure `wrangler.jsonc` has the correct D1 database id, `INSTANCE_PUBLIC_URL`, and `ADMIN_EMAIL` (or set secrets via the dashboard). Run DB migrations before first deploy: `npm run db:migrate`.

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
