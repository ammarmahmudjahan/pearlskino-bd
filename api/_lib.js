/*
 * Shared helpers for the small server functions in /api (Vercel).
 * They only READ public data from your Apps Script web app.
 */
const FALLBACK_API =
  "https://script.google.com/macros/s/AKfycby_VLzhMXlfpPuCSwUERETrCw9DbeLxufrVZXAMurklCKdg3OWar5znlxKwgqEMiaN5jA/exec";

export function apiUrl() {
  /* the same address the site itself uses (Vercel > Settings > Environment Variables) */
  return process.env.VITE_API_URL || process.env.API_URL || FALLBACK_API;
}

export async function callApi(params) {
  const query = new URLSearchParams(params).toString();
  const base = apiUrl();
  const response = await fetch(`${base}${base.includes("?") ? "&" : "?"}${query}`, {
    redirect: "follow",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) throw new Error(`API ${response.status}`);

  const data = await response.json();

  if (!data || data.success === false) throw new Error((data && data.error) || "API error");

  return data;
}

export function siteOrigin(req, configured) {
  if (configured && /^https?:\/\//i.test(configured)) return configured.replace(/\/+$/, "");

  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const proto = req.headers["x-forwarded-proto"] || "https";

  return `${proto}://${host}`;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* Facebook / WhatsApp want a normal JPEG-or-PNG address, not WebP */
export function shareImage(url, width = 1200) {
  const text = String(url || "");
  const match = /^(https:\/\/lh3\.googleusercontent\.com\/d\/[^=?#\s]+)(=[^?#\s]*)?$/.exec(text);
  return match ? `${match[1]}=w${width}` : text;
}
