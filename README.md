# jarvis-pantry-web

Next.js frontend for the **Jarvis Pantry** — a community package store and AI Forge for `IJarvisCommand` packages. It talks to the `jarvis-pantry` backend (port 7721) for the catalog, package detail/reviews, submission pipeline, and AI-powered package generation (the Forge).

## Features

- **Catalog** — browse and search published packages with category filters and sorting.
- **Package detail** — versions, reviews, security report, and install instructions.
- **Forge** — a split-pane IDE for AI-powered package generation (chat on the left, CodeMirror editor on the right), with model selection, BYOK (bring-your-own Anthropic/OpenAI key), AST validation, and one-click publish to GitHub.
- **Submit** — repo picker plus a live validation-pipeline tracker.

## Settings, Private packages and local models

Two pages and a Forge change let a self-hosted Pantry use a model on your own network and publish packages privately. Both
pages appear only when the backend ([jarvis-pantry](https://github.com/alexberardi/jarvis-pantry)) reports support for
them, so against a Pantry that lacks the features this app looks and behaves as it always did. The backend repository's
`docker-compose.local.yaml` runs the two together.

| Page / change | Appears when | What it does |
|---|---|---|
| **Settings** (`/settings`) | the backend reports `local_llm` | Set the address and key of an OpenAI-compatible server (llama-swap, llama.cpp, vLLM, Ollama), detect its models, choose a default |
| **Forge** uses local models | a local server is saved | Detected models are listed first, free, and need no API key; the default is preselected |
| **Private** (`/private`) | the backend reports `private_packages` | Add a package to this Pantry from a Git repository, list the ones added, unpublish one |
| Public + private catalogue | the backend has `PANTRY_UPSTREAM_URL` | The catalogue pages show the public packages and yours in one list |

### How the app knows what to show

On load the header calls `GET /v1/forge/features` and gets back three booleans:

```json
{ "local_llm": true, "private_packages": true, "upstream_mirror": true }
```

**Settings** is shown only for `local_llm`, **Private** only for `private_packages`. An older or unmodified backend has no such
route; the call fails quietly and everything reads as off, so nothing breaks and nothing extra appears. The two pages also
check the flag themselves, so opening `/settings` or `/private` by URL on a Pantry without the feature says it is
unavailable rather than showing a form that cannot work.

### Settings: your own model server

1. Open **Settings**. It shows what the Pantry has saved: the address, whether a key is set (the key is never sent back),
   and the default model.
2. Enter the server address (a trailing `/v1` is fine) and its API key if it needs one, then press **Detect models**. The
   Pantry asks the server for `GET /v1/models` and returns the list; an unreachable server or a rejected key is reported
   in words.
3. Pick a **default model** and **Save**. Every detected model stays selectable in the Forge; the default is the one chosen
   first. Leave the key blank to keep the saved one, or tick the clear box to remove it.

Settings are stored by the backend (in its database), so they apply to everyone who uses this Pantry and survive restarts.
The browser never talks to your model server: the Pantry does.

### The Forge with a local model

The model list comes from `GET /v1/forge/models`, which puts detected local models first (`local:<model>`, shown as
`<model> (local)` and marked free). The Forge page preselects the default (or the first local model) instead of a paid
hosted one. For a local model the API-key field is disabled and says so: the request goes to the Pantry and the Pantry's
saved server and key are used, so nothing is sent to Anthropic or OpenAI. Choosing a hosted model works as before, with your
own key sent straight to that provider and never stored.

### Private: your own packages

The page is for packages you want your nodes to install but not publish publicly.

1. Enter the repository URL (`https://…`), optionally a **tag or branch** (the default branch when blank), and a **GitHub
   token** only if the repository is private. The token is used for the clone and not kept.
2. Enter the **admin key** and press **Add**. The Pantry clones the repository, validates its manifest and publishes it as a
   local package. The list below shows what was added; adding again with a new tag publishes a new version.
3. **Unpublish** hides a package from the catalogue (after a confirmation). It is hidden, not deleted, and nodes can no
   longer install it from this Pantry.

There is **no security review and no container test** for packages added this way, which is why the backend refuses the
feature unless it has an admin key, and why the page is replaced by an explanation when it does not.

### The admin key

Changing the Settings and adding or unpublishing a private package need the Pantry's `ADMIN_API_KEY`, sent as the
`X-Admin-Key` header. The pages ask for it once and keep it in **`sessionStorage`**: it lasts for that browser tab only, is
never written to disk or a cookie, and is gone when the tab closes. A wrong or missing key is reported as such. If the
Pantry has no admin key, the Settings page needs none and the Private page is unavailable.

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

To run the Pantry, its Forge and this interface together with a local model, use the backend repository's
`docker-compose.local.yaml`; it builds this app from a sibling checkout (`../jarvis-pantry-web`, or `PANTRY_WEB_PATH`).

## Environment Variables

Copy `.env.example` to `.env.local` and adjust. `.env.local` is gitignored and holds your local values.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PANTRY_API_URL` | no | `http://localhost:7721` | Backend URL used by the Next.js server-side rewrites that proxy `/v1/*` and `/health`. |
| `NEXT_PUBLIC_PANTRY_API_URL` | no | `http://localhost:7721` | Backend URL exposed to the browser for client-side Forge generation calls (these bypass the rewrite proxy to avoid timeout issues). |
| `PORT` | no | `7720` | Dev/prod server port. |

⚠️ **Both URLs are baked into the build.** `next.config.ts` fixes the rewrite target when `next build` runs, and
`NEXT_PUBLIC_*` is inlined into the browser bundle. Changing either needs a rebuild, not just a restart. The Dockerfile
accepts `PANTRY_API_URL` and `NEXT_PUBLIC_PANTRY_API_URL` as build arguments for this reason. The public one must be an
address **the browser** can reach (a LAN address on a server, not `localhost`).

## API Proxy

Next.js rewrites (see `next.config.ts`) proxy `/v1/*` and `/health` to `PANTRY_API_URL`. Forge generation requests go directly to `NEXT_PUBLIC_PANTRY_API_URL` from the browser to avoid proxy timeouts on long-running generations. A local model can take minutes, so that direct path matters more here.

## Project Layout

See [`CLAUDE.md`](CLAUDE.md) for the full architecture, page map, and Forge details. The files behind the features above:

| Path | Role |
|---|---|
| `src/app/settings/page.tsx` | Local LLM server settings, model detection, default model, admin key |
| `src/app/private/page.tsx` | Add, list and unpublish private packages |
| `src/api/pantry.ts` | `getForgeFeatures`, the local-LLM and admin calls, `getStoredAdminKey` / `storeAdminKey` (`sessionStorage`) |
| `src/components/layout/Header.tsx` | Shows the **Settings** and **Private** links according to the features flags |
| `src/app/forge/page.tsx` | Prefers the default local model; no key field for local models |

## Build and runtime notes

- **Builds with a custom API address.** The Dockerfile passes `PANTRY_API_URL` into the build, because the `/v1` proxy
  target is baked in at build time.
- **Builds without a `public/` folder.** The runner stage copies `/app/public`; the repository has none, so the Dockerfile
  creates it.
- **The Forge page loads over plain HTTP.** `crypto.randomUUID` exists only in secure contexts (HTTPS or `localhost`), so
  on a LAN address the page crashed; it now falls back to a generated id.

## Tech Stack

Next.js 16 (App Router, TypeScript) · React 19 · TanStack Query · Tailwind CSS v4 · Axios · CodeMirror 6 · Lucide React · Sonner.
