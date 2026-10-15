import { useMemo } from "react";

import { useStore } from "../context/StoreContext";

/*
|--------------------------------------------------------------------------
| THE ONE PLACE THAT DECIDES WHAT A CUSTOMER MAY SEE
|--------------------------------------------------------------------------
| Rules (the server applies the same ones, so nothing hidden is ever sent):
|   - a hidden or deleted product is never shown
|   - a product whose category is hidden or deleted is never shown
|   - deleting a category does NOT delete its products
|
| Home, Shop, search and filters all read from here, so they can never
| disagree with each other.
*/

export function canonKey(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function productImage(product) {
  return product?.image || product?.images?.[0] || "";
}

export function isSoldOut(product) {
  return !product || product.status === "inactive" || Number(product.stock || 0) <= 0;
}

/* "Only 3 left": the number left when the stock is running low, otherwise 0 */
export function urgencyLeft(product, settings) {
  if (!settings || settings.urgencyEnabled === false) return 0;
  if (isSoldOut(product)) return 0;

  const left = Number(product.stock || 0);
  const limit = Math.max(1, Number(settings.urgencyThreshold) || 5);

  return left > 0 && left <= limit ? left : 0;
}

/* products carrying a flag ("new", "trending", ...): in-stock first, sold-out only to fill */
export function flaggedProducts(products, flag, limit = 8) {
  const all = products.filter((product) => product.status !== "inactive" && product.flags?.includes(flag));
  const available = all.filter((product) => !isSoldOut(product));
  const soldOut = all.filter((product) => isSoldOut(product));

  return [...available, ...soldOut].slice(0, Math.max(1, limit));
}

/* lowest / highest price a product can be bought for (variants may differ) */
export function priceInfo(product) {
  const base = Number(product?.price || 0);
  const variants = product?.variants || [];
  const list = variants.length
    ? variants.map((variant) =>
        variant.price !== null && variant.price !== undefined ? Number(variant.price) : base
      )
    : [base];
  const min = Math.min(...list);
  const max = Math.max(...list);

  return { min, max, range: min !== max };
}

export function categoryHref(name) {
  return `/shop?category=${encodeURIComponent(name)}`;
}

/* ----- the Shop filters ----- */
export const SORTS = [
  { id: "default", label: "Default" },
  { id: "price-asc", label: "Price: Low → High" },
  { id: "price-desc", label: "Price: High → Low" },
];

export function filterProducts(products, { category = "", min = "", max = "", sort = "default" } = {}) {
  const wantedCategory = canonKey(category);
  const low = min === "" ? null : Number(min);
  const high = max === "" ? null : Number(max);

  let list = products.filter((product) => {
    if (wantedCategory && canonKey(product.category) !== wantedCategory) return false;

    const { min: lowest } = priceInfo(product);

    if (low !== null && !Number.isNaN(low) && lowest < low) return false;
    if (high !== null && !Number.isNaN(high) && lowest > high) return false;

    return true;
  });

  if (sort === "price-asc") {
    list = [...list].sort((a, b) => priceInfo(a).min - priceInfo(b).min);
  } else if (sort === "price-desc") {
    list = [...list].sort((a, b) => priceInfo(b).min - priceInfo(a).min);
  }

  return list;
}

export function useCatalog() {
  const { products, categories, loaded } = useStore();

  /* the server already removed hidden / deleted items; "inactive" ones
     (switched off but still existing) are dropped here */
  const listable = useMemo(
    () => products.filter((product) => product.status !== "inactive"),
    [products]
  );

  const byCategory = useMemo(() => {
    const map = new Map();

    listable.forEach((product) => {
      const key = canonKey(product.category);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(product);
    });

    return map;
  }, [listable]);

  /* visible categories that really have something to show */
  const shownCategories = useMemo(
    () =>
      categories
        .map((category) => ({
          ...category,
          count: byCategory.get(canonKey(category.name))?.length || 0,
        }))
        .filter((category) => category.count > 0),
    [categories, byCategory]
  );

  /* Home: for every visible category, the first N products
     (in-stock ones first, sold-out ones only to fill the row) */
  const islands = useMemo(
    () =>
      (limit) =>
        shownCategories.map((category) => {
          const all = byCategory.get(canonKey(category.name)) || [];
          const available = all.filter((product) => !isSoldOut(product));
          const soldOut = all.filter((product) => isSoldOut(product));

          return {
            ...category,
            products: [...available, ...soldOut].slice(0, limit),
          };
        }),
    [shownCategories, byCategory]
  );

  return {
    loading: !loaded,
    products: listable,
    categories: shownCategories,
    islands,
    byCategory,
  };
}
