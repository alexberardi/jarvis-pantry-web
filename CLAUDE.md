# jarvis-pantry-web

Next.js frontend for the Jarvis Pantry — community command store.

## Quick Reference

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
npm run build      # Production build
```

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **React 19** + TanStack Query (server state)
- **Tailwind CSS v4** (CSS variables for theming, matches jarvis-admin)
- **Axios** (API client)
- **Lucide React** (icons)
- **Sonner** (toasts)

## Architecture

```
src/
├── api/pantry.ts           # Axios client + types for Pantry API
├── hooks/useCommands.ts    # React Query hooks (search, detail, reviews, categories)
├── lib/utils.ts            # cn() utility (clsx + tailwind-merge)
├── components/
│   ├── layout/             # Header, Footer
│   ├── catalog/            # CommandCard, SearchBar, CategoryFilter
│   └── forge/              # (coming) Chat UI components
├── app/
│   ├── page.tsx            # Browse/search catalog (homepage)
│   ├── commands/[name]/    # Command detail page
│   ├── forge/              # Command Forge (AI builder) — placeholder
│   ├── layout.tsx          # Root layout + providers
│   └── providers.tsx       # QueryClient + Toaster
```

## API Proxy

Next.js rewrites proxy `/v1/*` and `/health` to the Pantry backend (`PANTRY_API_URL`, default `http://localhost:7720`). No CORS issues in dev.

## Theme

CSS variables match jarvis-admin colors. Supports dark mode via `prefers-color-scheme`.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Browse/search catalog with category filters |
| `/commands/[name]` | Command detail (versions, reviews, security report, install instructions) |
| `/forge` | Command Forge — AI-powered command builder (coming soon) |

## Dependencies

- **Required**: `jarvis-pantry` (port 7720) — Backend API
