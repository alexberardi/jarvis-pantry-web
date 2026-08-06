"use client";

import { useEffect } from "react";

// Cloudflare Web Analytics — cookieless, measures real human page loads.
// Host-gated to production so local dev and preview deploys don't report
// pageviews, and idempotent against re-injection.
//
// The token MUST be pantry's own Web Analytics site token — a CF token is bound
// to one hostname, and beacons from a non-matching host are CORS-rejected (that
// bug once had pantry sharing the installer's token, so pantry reported 0). It's
// public by design (ships in page source), so it lives in a NEXT_PUBLIC_* build
// arg (inlined at `next build`), not a secret. Unset = no-op.
const CF_TOKEN = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN?.trim();
const PROD_HOST = "pantry.jarvisautomation.io";

export function CloudflareAnalytics() {
  useEffect(() => {
    if (!CF_TOKEN) return;
    if (window.location.hostname !== PROD_HOST) return;
    if (document.querySelector("script[data-cf-beacon]")) return;
    const s = document.createElement("script");
    s.defer = true;
    s.src = "https://static.cloudflareinsights.com/beacon.min.js";
    s.setAttribute("data-cf-beacon", JSON.stringify({ token: CF_TOKEN }));
    document.head.appendChild(s);
  }, []);
  return null;
}
