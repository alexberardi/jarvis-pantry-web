import BrowseClient from "./BrowseClient";
import { CATALOG_PAGE_SIZE, DEFAULT_SORT } from "@/lib/catalog";
import type { CommandsResponse } from "@/api/pantry";

// The browse page was a pure client component, so the server sent an empty shell
// and the catalog only appeared once the client-side query resolved. Anything
// that doesn't run JavaScript — crawlers, link previews, "view source" — saw a
// store advertising **0 commands**. Which is the first thing a skeptic checks
// when you link your package store from a launch post.
//
// Fetch the default view on the server and seed the client with it. Interaction
// (search, filter, sort) still happens client-side; this only pre-renders the
// landing state.

// Render at REQUEST time, not build time. PANTRY_API_URL lives in fly.toml's
// [env] — that's runtime env for the machine and is NOT present during the
// Docker build. A statically prerendered page would therefore fetch
// localhost:7721 in the builder, fail, and bake an EMPTY store into the HTML —
// worse than the bug it was meant to fix. Request-time rendering sees the real
// runtime env.
export const dynamic = "force-dynamic";

async function fetchCatalog(): Promise<CommandsResponse | undefined> {
  // Server-side we can't use the Next rewrite (that's a browser-path concern) —
  // talk to the API directly.
  const base = process.env.PANTRY_API_URL || "http://localhost:7721";
  try {
    const res = await fetch(
      `${base}/v1/commands?sort=${DEFAULT_SORT}&per_page=${CATALOG_PAGE_SIZE}`,
      { cache: "no-store" },
    );
    if (!res.ok) return undefined;
    return (await res.json()) as CommandsResponse;
  } catch {
    // Never let a store outage take the page down — the client will retry the
    // fetch itself, which is exactly the behaviour we had before.
    return undefined;
  }
}

export default async function BrowsePage() {
  const initialData = await fetchCatalog();
  return <BrowseClient initialData={initialData} />;
}
