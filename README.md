# jarvis-pantry-web

Next.js frontend for the **Jarvis Pantry** — a community package store and AI Forge for `IJarvisCommand` packages. It talks to the `jarvis-pantry` backend (port 7721) for the catalog, package detail/reviews, submission pipeline, and AI-powered package generation (the Forge).

## Features

- **Catalog** — browse and search published packages with category filters and sorting.
- **Package detail** — versions, reviews, security report, and install instructions.
- **Forge** — a split-pane IDE for AI-powered package generation (chat on the left, CodeMirror editor on the right), with model selection, BYOK (bring-your-own Anthropic/OpenAI key), AST validation, and one-click publish to GitHub.
- **Submit** — repo picker plus a live validation-pipeline tracker.

## Getting Started

Requires Node.js 20+ and the `jarvis-pantry` backend running on port 7721.

```bash
npm install
cp .env.example .env.local   # then edit values as needed
npm run dev                  # http://localhost:7720
```

Other scripts:

```bash
npm run build      # production build (Next.js standalone output)
npm run start      # serve the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

## Environment Variables

Copy `.env.example` to `.env.local` and adjust. `.env.local` is gitignored and holds your local values.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PANTRY_API_URL` | no | `http://localhost:7721` | Backend URL used by the Next.js server-side rewrites that proxy `/v1/*` and `/health`. |
| `NEXT_PUBLIC_PANTRY_API_URL` | no | `http://localhost:7721` | Backend URL exposed to the browser for client-side Forge generation calls (these bypass the rewrite proxy to avoid timeout issues). |
| `PORT` | no | `7720` | Dev/prod server port. |

## API Proxy

Next.js rewrites (see `next.config.ts`) proxy `/v1/*` and `/health` to `PANTRY_API_URL`. Forge generation requests go directly to `NEXT_PUBLIC_PANTRY_API_URL` from the browser to avoid proxy timeouts on long-running generations.

## Project Layout

See [`CLAUDE.md`](CLAUDE.md) for the full architecture, page map, and Forge details.

## Tech Stack

Next.js 16 (App Router, TypeScript) · React 19 · TanStack Query · Tailwind CSS v4 · Axios · CodeMirror 6 · Lucide React · Sonner.

## Local LLM settings (fork)

This fork adds a **Settings** page (`/settings`, shown only when the backend sets `FORGE_LOCAL_LLM_ENABLED`) where you enter the address and key of an OpenAI-compatible server on
your network, press **Detect models** and choose a default. The Forge page then lists the detected models first and needs
no API key for them. It talks to the matching backend fork
([opticon454/jarvis-pantry](https://github.com/opticon454/jarvis-pantry), branch `local-llm-settings`), which also
carries `docker-compose.local.yaml` to run both together.

Other changes: the Dockerfile passes `PANTRY_API_URL` into the build (the `/v1` proxy target is baked in at build time)
and creates the missing `public/` directory; the Forge page no longer crashes on a plain-HTTP address, where
`crypto.randomUUID` is unavailable.

## Private packages (fork)

When the backend has an admin key (`ADMIN_API_KEY`), a **Private** page (`/private`) adds a package from a Git repository
to this Pantry and lists or unpublishes the ones already added. With `PANTRY_UPSTREAM_URL` set the catalogue pages also show
the public packages. The page is hidden, and says so, when no admin key is configured. There is no security review for
packages added this way.
