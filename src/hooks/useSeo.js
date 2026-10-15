import { useEffect } from "react";

import { useStore } from "../context/StoreContext";
import { useContent } from "../content/context";
import { plainText } from "../lib/markup";
import { trackPageView } from "../lib/analytics";

/*
|--------------------------------------------------------------------------
| useSeo - page title, description, share cards, canonical link, JSON-LD
|--------------------------------------------------------------------------
|   useSeo({ page: "shop" })                       // texts from Admin > Site Text
|   useSeo({ page: "product", title, description,  // product pages pass their own
|            image, type: "product", jsonLd })
|   useSeo({ page: "cart", noindex: true })        // keep private pages out of Google
|
| Page titles and descriptions come from the "seo.<page>.title" and
| "seo.<page>.description" texts, so they can be changed without code.
| Google reads them (it runs JavaScript). The Facebook / WhatsApp link
| preview does NOT run JavaScript - it reads the fixed tags in index.html.
*/

function setMeta(attribute, name, content) {
  const selector = `meta[${attribute}="${name}"]`;
  let tag = document.head.querySelector(selector);

  if (!content) {
    if (tag) tag.remove();
    return;
  }

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, name);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
}

function setLink(rel, href) {
  let tag = document.head.querySelector(`link[rel="${rel}"]:not([data-pearlskino-favicon])`);

  if (!href) {
    if (tag) tag.remove();
    return;
  }

  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", rel);
    document.head.appendChild(tag);
  }

  tag.setAttribute("href", href);
}

function setJsonLd(id, data) {
  let tag = document.getElementById(id);

  if (!data) {
    if (tag) tag.remove();
    return;
  }

  if (!tag) {
    tag = document.createElement("script");
    tag.type = "application/ld+json";
    tag.id = id;
    document.head.appendChild(tag);
  }

  tag.textContent = JSON.stringify(data);
}

function absolute(url, origin) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${origin}${url}`;
  return "";
}

export function useSeo({
  page,
  title,
  description,
  image,
  type = "website",
  noindex = false,
  path,
  jsonLd,
} = {}) {
  const { settings } = useStore();
  const content = useContent();

  const brand = settings.storeName || "PearlSkino BD";
  const origin = (settings.siteUrl || window.location.origin).replace(/\/+$/, "");

  const titleKey = page ? `seo.${page}.title` : "";
  const descriptionKey = page ? `seo.${page}.description` : "";

  const fromContentTitle = titleKey ? plainText(String(content.getRaw(titleKey) || ""), content.baseVars) : "";
  const fromContentDescription = descriptionKey
    ? plainText(String(content.getRaw(descriptionKey) || ""), content.baseVars)
    : "";

  /* the home page falls back to the general settings */
  const finalTitle =
    title ||
    fromContentTitle ||
    (page === "home" ? settings.seoTitle : "") ||
    brand;

  const finalDescription =
    description ||
    fromContentDescription ||
    settings.seoDescription ||
    "";

  const finalImage = absolute(image || settings.seoImage || settings.logoUrl, origin);
  const pagePath = path ?? window.location.pathname;
  const canonical = `${origin}${pagePath === "/" ? "/" : pagePath}`;
  const robots = noindex || settings.seoIndex === false ? "noindex, nofollow" : "index, follow";
  const jsonKey = JSON.stringify(jsonLd || null);

  useEffect(() => {
    document.title = finalTitle;

    setMeta("name", "description", finalDescription);
    setMeta("name", "keywords", page === "home" || !page ? settings.seoKeywords : "");
    setMeta("name", "robots", robots);
    setMeta("name", "google-site-verification", settings.googleSiteVerification);

    setMeta("property", "og:site_name", brand);
    setMeta("property", "og:type", type);
    setMeta("property", "og:title", finalTitle);
    setMeta("property", "og:description", finalDescription);
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:image", finalImage);
    setMeta("property", "og:locale", "en_US");

    setMeta("name", "twitter:card", finalImage ? "summary_large_image" : "summary");
    setMeta("name", "twitter:title", finalTitle);
    setMeta("name", "twitter:description", finalDescription);
    setMeta("name", "twitter:image", finalImage);

    setLink("canonical", canonical);
  }, [
    finalTitle,
    finalDescription,
    finalImage,
    canonical,
    robots,
    brand,
    type,
    page,
    settings.seoKeywords,
    settings.googleSiteVerification,
  ]);

  /* business details for Google (once per page) */
  useEffect(() => {
    const sameAs = [
      settings.facebookUrl,
      settings.instagramUrl,
      settings.tiktokUrl,
      settings.youtubeUrl,
    ].filter(Boolean);

    setJsonLd("pk-jsonld-org", {
      "@context": "https://schema.org",
      "@type": "Store",
      name: brand,
      url: origin,
      logo: absolute(settings.logoUrl, origin) || undefined,
      image: finalImage || undefined,
      telephone: settings.phone || undefined,
      email: settings.email || undefined,
      address: settings.storeAddress
        ? { "@type": "PostalAddress", streetAddress: settings.storeAddress, addressCountry: "BD" }
        : undefined,
      sameAs: sameAs.length ? sameAs : undefined,
    });
  }, [
    brand,
    origin,
    finalImage,
    settings.logoUrl,
    settings.phone,
    settings.email,
    settings.storeAddress,
    settings.facebookUrl,
    settings.instagramUrl,
    settings.tiktokUrl,
    settings.youtubeUrl,
  ]);

  useEffect(() => {
    setJsonLd("pk-jsonld-page", jsonLd || null);
    return () => setJsonLd("pk-jsonld-page", null);
    // jsonKey is the stable version of jsonLd
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsonKey]);

  /* one page view per page (the tracker only exists if an id was saved) */
  useEffect(() => {
    trackPageView(pagePath);
  }, [pagePath]);
}
