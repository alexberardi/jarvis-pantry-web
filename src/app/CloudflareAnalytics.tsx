"use client";

import { useEffect } from "react";

// Cloudflare Web Analytics — cookieless, measures real human page loads.
// Host-gated to production so local dev and preview deploys don't report
// pageviews, and idempotent against re-injection. The beacon token is public
// by design (it ships in page source), so hardcoding it here is fine.
const CF_TOKEN = "8ab1d8fdf7a548e09d2d316660e3520c";
const PROD_HOST = "pantry.jarvisautomation.io";

export function CloudflareAnalytics() {
  useEffect(() => {
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
