import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useStore } from "../context/StoreContext";
import { useCustomer } from "../context/CustomerContext";
import {
  useCatalog,
  filterProducts,
  canonKey,
  priceInfo,
  productImage,
  isSoldOut,
  urgencyLeft,
  SORTS,
} from "../hooks/useCatalog";
import { searchProducts } from "../lib/search";
import { trackEvent } from "../lib/analytics";
import { useSeo } from "../hooks/useSeo";
import { money } from "../lib/format";
import T, { useText } from "../content/T";
import Img from "../components/Img";
import { HeartIcon, SearchIcon } from "../components/Icons";

const PAGE_SIZE = 24;

export default function Shop() {
  const { storeSettings } = useStore();
  const { toggleWishlist, isWishlisted, accountsEnabled } = useCustomer();
  const { loading, products, categories } = useCatalog();
  const [params, setParams] = useSearchParams();
  const [categorySearch, setCategorySearch] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  useSeo({ page: "shop" });

  const brand = storeSettings?.storeName || "PearlSkino BD";

  const searchHint = useText("shop.filters.searchCategory");
  const queryHint = useText("shop.search.hint");
  const minHint = useText("shop.filters.min");
  const maxHint = useText("shop.filters.max");
  const sortLabels = {
    default: useText("shop.sort.default"),
    "price-asc": useText("shop.sort.asc"),
    "price-desc": useText("shop.sort.desc"),
  };

  /* the filters live in the address, so a link like /shop?category=Skincare works */
  const wantedCategory = params.get("category") || "";
  const category =
    categories.find((item) => canonKey(item.name) === canonKey(wantedCategory))?.name || "";
  const min = params.get("min") || "";
  const max = params.get("max") || "";
  const sortParam = params.get("sort") || "default";
  const sort = SORTS.some((item) => item.id === sortParam) ? sortParam : "default";
  const flagParam = params.get("flag") || "";
  const flag = ["new", "trending", "featured", "deal"].includes(flagParam) ? flagParam : "";
  const qRaw = params.get("q") || "";
  const q = qRaw.trim();

  function update(changes) {
    const next = new URLSearchParams(params);

    Object.entries(changes).forEach(([key, value]) => {
      if (value === "" || value === "default" || value === null || value === undefined) next.delete(key);
      else next.set(key, value);
    });

    setParams(next, { replace: true });
    setLimit(PAGE_SIZE);
  }

  const filtersActive = Boolean(category || min !== "" || max !== "" || sort !== "default" || q || flag);

  const shown = useMemo(() => {
    /* a search keeps its best-match order unless a sort is chosen */
    const searched = q ? searchProducts(products, q) : products;
    const base = flag ? searched.filter((product) => product.flags?.includes(flag)) : searched;
    return filterProducts(base, { category, min, max, sort });
  }, [products, q, flag, category, min, max, sort]);

  /* the category chips narrow down while the customer types in the search box */
  const chips = useMemo(() => {
    const needle = canonKey(categorySearch);
    return needle ? categories.filter((item) => canonKey(item.name).includes(needle)) : categories;
  }, [categories, categorySearch]);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [category, q]);

  const hero = (
    <section className="shop-hero">
      <T k="shop.eyebrow" as="p" className="eyebrow" />

      <T k="shop.title" as="h1" />

      <T k="shop.text" as="p" />
    </section>
  );

  /* nothing in the shop at all */
  if (!loading && products.length === 0) {
    return (
      <main className="shop-page">
        {hero}

        <section className="shop-empty">
          <div className="shop-empty-icon">✦</div>

          <T k="shop.empty.eyebrow" as="p" className="eyebrow" />

          <T k="shop.empty.title" as="h2" />

          <T k="shop.empty.text" as="p" />
        </section>
      </main>
    );
  }

  const visible = shown.slice(0, limit);

  return (
    <main className="shop-page">
      {hero}

      {/* =========================
          FILTERS  (only on the Shop page)
      ========================== */}
      <section className="shop-filters" aria-label="Filters">
        <form
          className="shop-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            if (q) trackEvent("search", { query: q });
          }}
        >
          <SearchIcon size={18} />
          <input
            type="search"
            value={qRaw}
            onChange={(event) => update({ q: event.target.value })}
            placeholder={queryHint}
            aria-label={queryHint}
            autoComplete="off"
          />
        </form>

        {q && (
          <T k="shop.search.results" as="p" className="shop-search-title" vars={{ query: q }} />
        )}

        {flag && (
          <p className="shop-search-title">
            <T k={`home.flag.${flag}.title`} />
          </p>
        )}

        <div className="shop-filter-block shop-filter-categories">
          <div className="shop-filter-head">
            <T k="shop.filters.category" as="h2" />

            <input
              type="search"
              className="shop-filter-search"
              value={categorySearch}
              onChange={(event) => setCategorySearch(event.target.value)}
              placeholder={searchHint}
              aria-label={searchHint}
            />
          </div>

          <div className="shop-chips" role="group" aria-label="Categories">
            <button
              type="button"
              className={`shop-chip${!category ? " on" : ""}`}
              aria-pressed={!category}
              onClick={() => update({ category: "" })}
            >
              <T k="shop.filters.all" />
              <small>{products.length}</small>
            </button>

            {chips.map((item) => (
              <button
                type="button"
                key={item.id || item.name}
                className={`shop-chip${canonKey(item.name) === canonKey(category) ? " on" : ""}`}
                aria-pressed={canonKey(item.name) === canonKey(category)}
                onClick={() => update({ category: item.name })}
              >
                {item.name}
                <small>{item.count}</small>
              </button>
            ))}

            {chips.length === 0 && (
              <T k="shop.filters.noCategory" as="span" className="shop-chip-none" />
            )}
          </div>
        </div>

        <div className="shop-filter-row">
          <div className="shop-filter-block">
            <T k="shop.filters.price" as="h2" />

            <div className="shop-price-inputs">
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={min}
                placeholder={minHint}
                aria-label={minHint}
                onChange={(event) => update({ min: event.target.value })}
              />
              <span aria-hidden="true">–</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={max}
                placeholder={maxHint}
                aria-label={maxHint}
                onChange={(event) => update({ max: event.target.value })}
              />
            </div>
          </div>

          <div className="shop-filter-block">
            <T k="shop.filters.sort" as="h2" />

            <select
              className="shop-sort"
              value={sort}
              onChange={(event) => update({ sort: event.target.value })}
              aria-label="Sort by"
            >
              {SORTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {sortLabels[item.id]}
                </option>
              ))}
            </select>
          </div>

          <div className="shop-filter-summary">
            <span className="shop-result-count" aria-live="polite">
              {shown.length === 1 ? (
                <T k="shop.results1" />
              ) : (
                <T k="shop.results" vars={{ count: shown.length }} />
              )}
            </span>

            {filtersActive && (
              <button
                type="button"
                className="shop-clear"
                onClick={() => {
                  setCategorySearch("");
                  setParams(new URLSearchParams(), { replace: true });
                }}
              >
                <T k="shop.filters.clear" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* =========================
          PRODUCT GRID
      ========================== */}
      {loading ? (
        <div className="home-featured-loading">
          <T k="shop.loading" />
        </div>
      ) : shown.length === 0 ? (
        <section className="shop-empty shop-nomatch">
          <div className="shop-empty-icon">✦</div>

          <T k="shop.nomatch.title" as="h2" />

          <T k="shop.nomatch.text" as="p" />
        </section>
      ) : (
        <>
          <section className="product-grid">
            {visible.map((product, index) => {
              const image = productImage(product);
              const price = priceInfo(product);
              const outOfStock = isSoldOut(product);
              const wished = isWishlisted(product.id);
              const flags = product.flags || [];
              const left = urgencyLeft(product, storeSettings);

              return (
                <article
                  className={`product-card ${outOfStock ? "product-card-out" : ""}`}
                  key={product.id}
                >
                  <Link to={`/product/${product.id}`} className="product-image">
                    {image ? (
                      <Img
                        src={image}
                        alt={product.alt || product.name}
                        width="600"
                        height="600"
                        priority={index < 2}
                      />
                    ) : (
                      <div className="product-no-image">✦</div>
                    )}

                    <span className="product-number">{String(index + 1).padStart(2, "0")}</span>

                    {outOfStock && (
                      <span className="product-stock-badge">
                        <T k="shop.badge.out" />
                      </span>
                    )}

                    {left > 0 && (
                      <span className="product-urgency">
                        <T k="shop.urgency" vars={{ count: left }} />
                      </span>
                    )}

                    {!outOfStock && flags.length > 0 && (
                      <span className="product-flag-row">
                        {flags.includes("deal") && <em className="deal">Deal</em>}
                        {flags.includes("new") && <em>New</em>}
                        {flags.includes("trending") && <em>Trending</em>}
                        {flags.includes("featured") && <em>Featured</em>}
                      </span>
                    )}
                  </Link>

                  {accountsEnabled && (
                    <button
                      type="button"
                      className={`shop-heart${wished ? " on" : ""}`}
                      onClick={() => {
                        if (toggleWishlist(product.id) === "added") {
                          trackEvent("add_to_wishlist", {
                            value: price.min,
                            items: [{ id: product.id, name: product.name, price: price.min, qty: 1 }],
                          });
                        }
                      }}
                      aria-pressed={wished}
                      aria-label={wished ? "Remove from favourites" : "Save to favourites"}
                    >
                      <HeartIcon size={17} filled={wished} />
                    </button>
                  )}

                  <div className="product-info">
                    <p className="product-brand">{product.brand || brand.toUpperCase()}</p>

                    <p className="product-category">{product.category || "Beauty"}</p>

                    <h2>{product.name || "Unnamed Product"}</h2>

                    {product.description && (
                      <p className="product-description">{product.description}</p>
                    )}

                    <div className="product-card-bottom">
                      <div>
                        <p className="product-price">
                          {price.range && (
                            <>
                              <small className="price-from">
                                <T k="shop.from" />
                              </small>{" "}
                            </>
                          )}
                          {money(price.min)}
                          {!price.range && product.oldPrice > price.min && (
                            <s className="price-old">{money(product.oldPrice)}</s>
                          )}
                        </p>

                        {!outOfStock && (
                          <small className="product-availability">
                            <T k="shop.available" />
                          </small>
                        )}
                      </div>

                      <Link to={`/product/${product.id}`} className="view-product">
                        <T k="shop.view" />
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          {shown.length > visible.length && (
            <div className="shop-more">
              <button type="button" className="hero-button secondary" onClick={() => setLimit(limit + PAGE_SIZE)}>
                <T k="shop.more" />
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
