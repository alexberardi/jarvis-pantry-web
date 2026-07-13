/**
 * Catalog constants shared by the server component (page.tsx) and the client
 * component (BrowseClient.tsx).
 *
 * These MUST live in a module without "use client". A server component that
 * imports a value from a client module receives a client-reference proxy, not
 * the value — interpolating that into a URL yields a garbage query string, and
 * the Pantry API answers 422. (It did. That's why this file exists.)
 */

/**
 * The API defaults to per_page=20 and the browse page has no pagination control,
 * so it used to render only the first 20 packages while its header printed
 * `total` — the store announced a number it wasn't showing, and everything past
 * the first page (incl. Philips Hue) was unreachable in the browser.
 */
export const CATALOG_PAGE_SIZE = 100;

export const DEFAULT_SORT = "popular";
