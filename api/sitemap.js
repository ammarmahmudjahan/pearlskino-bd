import { callApi, siteOrigin, escapeHtml } from "./_lib.js";

/* /sitemap.xml - lists the home page, the shop, the info pages and every visible product */
export default async function handler(req, res) {
  let data = { products: [], siteUrl: "" };

  try {
    data = await callApi({ action: "sitemap" });
  } catch {
    /* a sitemap with only the fixed pages is still valid */
  }

  const origin = siteOrigin(req, data.siteUrl);
  const today = new Date().toISOString().slice(0, 10);
  const pages = ["/", "/shop", "/about", "/contact", "/faq"];

  const rows = [
    ...pages.map((path) => ({ loc: `${origin}${path === "/" ? "/" : path}`, priority: path === "/" ? "1.0" : "0.7" })),
    ...(data.products || []).map((id) => ({ loc: `${origin}/product/${encodeURIComponent(id)}`, priority: "0.8" })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows
  .map(
    (row) => `  <url><loc>${escapeHtml(row.loc)}</loc><lastmod>${today}</lastmod><priority>${row.priority}</priority></url>`
  )
  .join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(xml);
}
