import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import ProductCard from "../components/ProductCard";
import SectionHeading from "../components/SectionHeading";
import { CATEGORIES, PRODUCTS } from "../data/products";

const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "rating", label: "Top Rated" },
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "All";
  const q = params.get("q") || "";
  const [sort, setSort] = useState("featured");
  const [localQuery, setLocalQuery] = useState(q);

  const setCategory = (id) => {
    const next = new URLSearchParams(params);
    if (id === "All") next.delete("category");
    else next.set("category", id);
    setParams(next);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (localQuery) next.set("q", localQuery);
    else next.delete("q");
    setParams(next);
  };

  const list = useMemo(() => {
    let out = PRODUCTS.filter(
      (p) =>
        (category === "All" || p.category === category) &&
        (!q || `${p.name} ${p.brand} ${p.subtitle}`.toLowerCase().includes(q.toLowerCase()))
    );
    if (sort === "price-asc") out = [...out].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") out = [...out].sort((a, b) => b.price - a.price);
    if (sort === "rating") out = [...out].sort((a, b) => b.rating - a.rating);
    return out;
  }, [category, q, sort]);

  return (
    <section className="section shop-page">
      <SectionHeading
        eyebrow="The full edit"
        title="Shop everything."
        desc="Every product we carry, sourced and checked before it reaches you."
      >
        <form className="searchbox" onSubmit={submitSearch}>
          <Search size={14} />
          <input
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Search products, brands…"
          />
        </form>
      </SectionHeading>

      <div className="shop-toolbar">
        <div className="filters">
          <button className={category === "All" ? "active" : ""} onClick={() => setCategory("All")}>
            All
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.id} className={category === c.id ? "active" : ""} onClick={() => setCategory(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="sortbox">
          <SlidersHorizontal size={13} />
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {q && (
        <p className="results-note">
          {list.length} result{list.length !== 1 ? "s" : ""} for &ldquo;{q}&rdquo;
        </p>
      )}

      {list.length ? (
        <div className="grid">
          {list.map((p, i) => (
            <ProductCard key={p.id} p={p} index={i} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h4>No products match those filters.</h4>
          <p>Try a different category or clear your search.</p>
        </div>
      )}
    </section>
  );
}
