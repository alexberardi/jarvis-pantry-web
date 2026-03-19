# jarvis-pantry-web

Next.js frontend for the Jarvis Pantry — community package store + AI Forge.

## Quick Reference

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:7720
npm run build      # Production build
```

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **React 19** + TanStack Query (server state)
- **Tailwind CSS v4** (CSS variables for theming, matches jarvis-admin)
- **Axios** (API client)
- **CodeMirror 6** (syntax-highlighted code editor in Forge)
- **Lucide React** (icons)
- **Sonner** (toasts)

## Architecture

```
src/
├── api/pantry.ts           # Axios client + types for Pantry API (catalog, forge, auth)
├── hooks/
│   ├── AuthContext.tsx      # GitHub OAuth provider + context
│   ├── useAuth.ts           # OAuth flow, token/user localStorage
│   ├── useCommands.ts       # React Query hooks (search, detail, reviews, categories)
│   └── useSubmission.ts     # Submission pipeline polling hook
├── lib/utils.ts             # cn() utility (clsx + tailwind-merge)
├── components/
│   ├── layout/              # Header, Footer
│   ├── catalog/             # CommandCard, SearchBar, CategoryFilter
│   └── RepoPicker.tsx       # GitHub repo dropdown (for submit page)
├── app/
│   ├── page.tsx             # Browse/search catalog (homepage)
│   ├── commands/[name]/     # Package detail (versions, reviews, security report)
│   ├── forge/               # Forge — AI-powered package builder
│   ├── submit/              # Submit page — repo validation + pipeline tracker
│   ├── layout.tsx           # Root layout + providers
│   └── providers.tsx        # QueryClient + AuthProvider + Toaster
```

## API Proxy

Next.js rewrites proxy `/v1/*` and `/health` to the Pantry backend (`PANTRY_API_URL`, default `http://localhost:7721`). Forge generation calls go directly to `NEXT_PUBLIC_PANTRY_API_URL` to avoid proxy timeout issues.

## Theme

CSS variables match jarvis-admin colors. Supports dark mode via `prefers-color-scheme`.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Browse/search catalog with category filters and sort |
| `/commands/[name]` | Package detail (versions, reviews, security report, install instructions) |
| `/forge` | Forge — AI-powered package builder with split-pane IDE |
| `/submit` | Submit a package — repo picker + validation pipeline tracker |

## Forge

The Forge is a split-pane IDE for AI-powered package generation:

- **Left panel**: Chat with the AI (describe what you want, iterate on changes)
- **Right panel**: Editable code editor with CodeMirror syntax highlighting (Python, YAML, Markdown)
- **Model selector**: 6 models (Haiku, Sonnet, Opus, GPT-4o, ChatGPT-5, Codex) with per-generation cost
- **BYOK**: User provides their own Anthropic or OpenAI API key
- **AST validation**: Static analysis runs on generated code before publish (green/yellow/red status)
- **One-click publish**: Creates GitHub repo → pushes files → redirects to Submit page

The Forge system prompt is auto-generated from SDK source code via `jarvis_command_sdk.forge.generate_spec_markdown()`. It never goes stale.

## Dependencies

- **Required**: `jarvis-pantry` (port 7721) — Backend API
- **Required**: `jarvis-command-sdk` — Installed in Pantry container for Forge spec generation

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PANTRY_API_URL` | Backend URL for Next.js rewrites (default: `http://localhost:7721`) |
| `NEXT_PUBLIC_PANTRY_API_URL` | Backend URL for client-side Forge calls (default: `http://localhost:7721`) |
| `PORT` | Dev server port (default: 7720) |
