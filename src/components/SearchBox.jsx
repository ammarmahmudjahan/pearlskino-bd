import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useStore } from "../context/StoreContext";
import { searchProducts } from "../lib/search";
import { productImage, priceInfo } from "../hooks/useCatalog";
import { money } from "../lib/format";
import { trackEvent } from "../lib/analytics";
import { THUMB_WIDTHS } from "../lib/img";
import T, { useText } from "../content/T";
import Img from "./Img";
import { SearchIcon, CloseIcon } from "./Icons";

/*
 * Live search in the header: type and matching products appear straight away.
 * Works on the products already loaded, so it is instant and costs no request.
 */
export default function SearchBox() {
  const { products, settings } = useStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrap = useRef(null);
  const input = useRef(null);

  const hint = useText("search.hint");
  const openLabel = useText("search.open");

  const live = settings.liveSearchEnabled !== false;

  const listable = useMemo(
    () => products.filter((product) => product.status !== "inactive"),
    [products]
  );

  const results = useMemo(
    () => (live && query.trim().length >= 2 ? searchProducts(listable, query, 6) : []),
    [live, listable, query]
  );

  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [pathname]);

  useEffect(() => {
    if (open && input.current) input.current.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    function onDown(event) {
      if (wrap.current && !wrap.current.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function submit(event) {
    event.preventDefault();
    const text = query.trim();
    if (!text) return;

    trackEvent("search", { query: text });
    setOpen(false);
    navigate(`/shop?q=${encodeURIComponent(text)}`);
  }

  return (
    <div className="ps-search" ref={wrap}>
      <button
        type="button"
        className="ps-search-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-label={openLabel}
        aria-expanded={open}
      >
        {open ? <CloseIcon size={18} /> : <SearchIcon size={18} />}
      </button>

      {open && (
        <div className="ps-search-panel" role="search">
          <form onSubmit={submit} className="ps-search-form">
            <SearchIcon size={17} />
            <input
              ref={input}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={hint}
              aria-label={hint}
              autoComplete="off"
              enterKeyHint="search"
            />
          </form>

          {live && query.trim().length >= 2 && (
            <div className="ps-search-results">
              {results.length === 0 ? (
                <T k="search.none" as="p" className="ps-search-none" />
              ) : (
                <>
                  {results.map((product) => {
                    const image = productImage(product);
                    const price = priceInfo(product);

                    return (
                      <Link key={product.id} to={`/product/${product.id}`} className="ps-search-item">
                        <span className="ps-search-thumb">
                          {image && (
                            <Img
                              src={image}
                              alt=""
                              widths={THUMB_WIDTHS}
                              sizes="56px"
                              width="56"
                              height="56"
                            />
                          )}
                        </span>
                        <span className="ps-search-text">
                          <strong>{product.name}</strong>
                          <small>{product.category || product.brand}</small>
                        </span>
                        <em>{money(price.min)}</em>
                      </Link>
                    );
                  })}

                  <Link
                    to={`/shop?q=${encodeURIComponent(query.trim())}`}
                    className="ps-search-all"
                    onClick={() => trackEvent("search", { query: query.trim() })}
                  >
                    <T k="search.all" /> →
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
