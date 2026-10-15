import { siteOrigin } from "./_lib.js";

/*
 * /robots.txt
 * The test (staging / preview) site tells Google NOT to list it.
 * The real site lists everything except private pages.
 */
export default function handler(req, res) {
  const preview = process.env.VERCEL_ENV === "preview";
  const origin = siteOrigin(req, "");

  const text = preview
    ? "User-agent: *\nDisallow: /\n"
    : `User-agent: *
Allow: /
Disallow: /admin
Disallow: /cart
Disallow: /checkout
Disallow: /account
Disallow: /track

Sitemap: ${origin}/sitemap.xml
`;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600");
  res.status(200).send(text);
}
