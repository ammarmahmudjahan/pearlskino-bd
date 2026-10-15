import { canonKey } from "../hooks/useCatalog";

/*
 * Tiny product search used by the header suggestions and the Shop page.
 * Every word typed must be found somewhere (name, brand, category, tags,
 * subtitle, sku). Matches in the name rank first.
 */
export function searchProducts(products, query, limit = 0) {
  const words = canonKey(query).split(" ").filter(Boolean);
  if (!words.length) return [];

  const scored = [];

  products.forEach((product) => {
    const name = canonKey(product.name);
    const rest = canonKey(
      [
        product.brand,
        product.category,
        product.subtitle,
        product.sku,
        Array.isArray(product.tags) ? product.tags.join(" ") : product.tags,
      ].join(" ")
    );

    let score = 0;
    let all = true;

    words.forEach((word) => {
      if (name.startsWith(word)) score += 6;
      else if (name.includes(` ${word}`)) score += 5;
      else if (name.includes(word)) score += 4;
      else if (rest.includes(word)) score += 2;
      else all = false;
    });

    if (all) scored.push({ product, score });
  });

  scored.sort((a, b) => b.score - a.score);

  const list = scored.map((entry) => entry.product);
  return limit > 0 ? list.slice(0, limit) : list;
}
