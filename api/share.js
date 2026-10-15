import { callApi, siteOrigin, escapeHtml, shareImage } from "./_lib.js";

/*
 * Link preview for product pages.
 * Facebook, WhatsApp, Messenger, Telegram ... do not run the website's
 * JavaScript, so they would only ever see the same preview for every page.
 * vercel.json sends THEIR requests for /product/<id> here; real visitors
 * still get the normal website.
 */
export default async function handler(req, res) {
  const id = String(req.query.id || "").slice(0, 80);

  let product = null;
  let store = {};

  try {
    const data = await callApi({ action: "product", id });
    product = data.product;
    store = data.store || {};
  } catch {
    /* fall through to the general card */
  }

  const origin = siteOrigin(req, store.siteUrl);
  const brand = store.name || "PearlSkino BD";
  const url = `${origin}/product/${encodeURIComponent(id)}`;

  const title = product ? `${product.name} | ${brand}` : brand;
  const description = product
    ? [
        product.price ? `৳${product.price}` : "",
        product.stock > 0 && product.status !== "inactive" ? "In stock" : "Out of stock",
        product.description || "",
      ]
        .filter(Boolean)
        .join(" · ")
        .slice(0, 200)
    : "Authentic skincare, cosmetics and fragrances, delivered across Bangladesh.";
  const image = shareImage((product && product.image) || store.logoUrl || `${origin}/logo.png`);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(url)}">
<meta property="og:site_name" content="${escapeHtml(brand)}">
<meta property="og:type" content="${product ? "product" : "website"}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:image" content="${escapeHtml(image)}">
${
  product && product.price
    ? `<meta property="product:price:amount" content="${escapeHtml(product.price)}">
<meta property="product:price:currency" content="BDT">`
    : ""
}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(description)}</p>
<p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  /* cached for 5 minutes at Vercel's edge, so a shared link never slows the shop down */
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  res.status(200).send(html);
}
