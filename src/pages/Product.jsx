import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useStore } from "../context/StoreContext";
import { useCustomer } from "../context/CustomerContext";
import { useCatalog, priceInfo, canonKey, isSoldOut } from "../hooks/useCatalog";
import { useTogether } from "../hooks/useTogether";
import { useSeo } from "../hooks/useSeo";
import { money } from "../lib/format";
import { trackEvent } from "../lib/analytics";
import { readRecent, pushRecent } from "../lib/recent";
import { sized, DETAIL_WIDTHS, DETAIL_SIZES, THUMB_WIDTHS, THUMB_SIZES } from "../lib/img";
import { videoThumb } from "../lib/video";
import T from "../content/T";
import ProductTile from "../components/ProductTile";
import ProductReviews, { Stars } from "../components/ProductReviews";
import NotifyForm from "../components/NotifyForm";
import VideoPlayer from "../components/VideoPlayer";
import Img from "../components/Img";
import { HeartIcon, WhatsappIcon, CartIcon, CheckIcon, PlayIcon } from "../components/Icons";

const MAX_LINE = 20;

/* a row of product cards with a heading (related / bought together / recently viewed) */
function Row({ eyebrow, title, items }) {
  if (!items.length) return null;

  return (
    <section className="product-section product-related">
      <div className="home-featured-heading">
        <div>
          <T k={eyebrow} as="p" className="eyebrow" />
          <T k={title} as="h2" />
        </div>
      </div>

      <div className="home-product-scroll">
        {items.map((item) => (
          <ProductTile key={item.id} product={item} />
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   PRODUCT PAGE
========================================================= */
export default function Product() {
  const { id } = useParams();
  const { storeSettings, getProduct, lines, addToCart, loaded, products } = useStore();
  const { toggleWishlist, isWishlisted, accountsEnabled } = useCustomer();
  const { byCategory } = useCatalog();
  const brand = storeSettings?.storeName || "PearlSkino BD";
  const product = getProduct(id);

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [message, setMessage] = useState("");
  const [variantId, setVariantId] = useState("");
  const [active, setActive] = useState(null); /* { type: "image", src } | { type: "video", index } */
  const [barVisible, setBarVisible] = useState(false);
  const purchaseRef = useRef(null);
  const pickerRef = useRef(null);

  const variants = useMemo(() => product?.variants || [], [product]);
  const hasVariants = variants.length > 0;
  const videos = useMemo(() => product?.videos || [], [product]);

  /* a new product: start again, pre-select the first option that is in stock */
  useEffect(() => {
    setQuantity(1);
    setAdded(false);
    setMessage("");
    setActive(null);

    const list = product?.variants || [];
    const firstAvailable = list.find((variant) => variant.stock > 0) || list[0];
    setVariantId(firstAvailable ? firstAvailable.id : "");
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const variant = hasVariants ? variants.find((item) => item.id === variantId) || null : null;
  const images = useMemo(() => {
    if (!product) return [];
    return product.images?.length ? product.images : product.image ? [product.image] : [];
  }, [product]);

  const selectedImage = active?.type === "image" ? active.src : "";
  const shownImage = selectedImage || (variant && variant.image) || images[0] || "";
  const activeVideo = active?.type === "video" ? videos[active.index] : null;

  const unitPrice = variant && variant.price !== null && variant.price !== undefined
    ? Number(variant.price)
    : Number(product?.price || 0);
  const stock = hasVariants ? (variant ? variant.stock : 0) : Math.max(0, Number(product?.stock || 0));
  const inactive = product?.status === "inactive";
  const everyOptionOut = hasVariants && variants.every((item) => item.stock <= 0);
  const unavailable = !product || inactive || (hasVariants ? everyOptionOut : stock <= 0);
  /* the chosen option (or the product) is sold out right now */
  const chosenSoldOut = !inactive && (hasVariants ? Boolean(variant) && variant.stock <= 0 : stock <= 0);
  const canBuy = !inactive && !chosenSoldOut && !(hasVariants && !variant);

  const lineKey = product ? `${product.id}|${variant ? variant.id : ""}` : "";
  const inBag = lines.find((line) => line.key === lineKey)?.qty || 0;
  const room = Math.max(0, Math.min(stock, MAX_LINE) - inBag);

  /* ----- more products to show ----- */
  const togetherMap = useTogether(storeSettings.togetherEnabled !== false);

  const together = useMemo(() => {
    if (!product || storeSettings.togetherEnabled === false) return [];
    return (togetherMap[product.id] || [])
      .map((pid) => getProduct(pid))
      .filter((item) => item && item.status !== "inactive" && item.id !== product.id)
      .slice(0, 4);
  }, [togetherMap, product, getProduct, storeSettings.togetherEnabled]);

  const related = useMemo(() => {
    if (!product || storeSettings.relatedEnabled === false) return [];

    const taken = new Set([product.id, ...together.map((item) => item.id)]);
    const same = (byCategory.get(canonKey(product.category)) || []).filter((item) => !taken.has(item.id));
    const sameBrand = product.brand
      ? products.filter(
          (item) =>
            item.status !== "inactive" &&
            canonKey(item.brand) === canonKey(product.brand) &&
            !taken.has(item.id) &&
            !same.includes(item)
        )
      : [];
    const pool = [...same, ...sameBrand];

    /* in-stock first */
    return [...pool.filter((item) => !isSoldOut(item)), ...pool.filter((item) => isSoldOut(item))].slice(0, 6);
  }, [byCategory, product, products, together, storeSettings.relatedEnabled]);

  const recent = useMemo(() => {
    if (!product || storeSettings.recentlyViewedEnabled === false) return [];
    return readRecent()
      .filter((rid) => rid !== String(product.id))
      .map((rid) => getProduct(rid))
      .filter((item) => item && item.status !== "inactive")
      .slice(0, 6);
    // remembered per visit to this product
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, getProduct, storeSettings.recentlyViewedEnabled]);

  const description = (product?.description || "").replace(/\s+/g, " ").trim();
  const price = product ? priceInfo(product) : { min: 0, max: 0 };

  useSeo({
    page: "product",
    title: product ? `${product.name}${product.brand ? ` | ${product.brand}` : ""} | ${brand}` : undefined,
    description: description ? description.slice(0, 158) : undefined,
    image: images[0] ? sized(images[0], 1200) : undefined,
    type: "product",
    noindex: !product,
    jsonLd: product
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          image: images.map((src) => sized(src, 1200)),
          description: description || undefined,
          sku: product.sku || String(product.id),
          brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
          category: product.category || undefined,
          aggregateRating:
            product.reviews > 0 && product.rating > 0
              ? { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviews }
              : undefined,
          offers: {
            "@type": "Offer",
            priceCurrency: "BDT",
            price: price.min,
            availability: unavailable ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
            url: window.location.href,
          },
        }
      : null,
  });

  useEffect(() => {
    if (product) {
      trackEvent("view_item", {
        value: price.min,
        items: [{ id: product.id, name: product.name, price: price.min, qty: 1 }],
      });
      pushRecent(product.id);
    }
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* the phone bar appears once the real button has scrolled out of view */
  useEffect(() => {
    const node = purchaseRef.current;

    if (!node || typeof IntersectionObserver === "undefined") {
      setBarVisible(false);
      return undefined;
    }

    const watcher = new IntersectionObserver(
      ([entry]) => setBarVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    );

    watcher.observe(node);
    return () => watcher.disconnect();
  }, [product?.id, canBuy, chosenSoldOut, inactive]);

  if (!loaded) {
    return (
      <main className="product-page">
        <section className="product-not-found">
          <T k="product.loading" as="h1" />
          <T k="product.loadingText" as="p" />
        </section>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="product-page">
        <section className="product-not-found">
          <p className="eyebrow">{brand.toUpperCase()}</p>

          <T k="product.nf.title" as="h1" />

          <T k="product.nf.text" as="p" />

          <Link to="/shop" className="hero-button">
            <T k="product.nf.button" />
          </Link>
        </section>
      </main>
    );
  }

  const wished = isWishlisted(product.id);
  const threshold = Math.max(1, Number(storeSettings.urgencyThreshold) || 5);
  const urgent = storeSettings.urgencyEnabled !== false && stock > 0 && stock <= threshold;
  const lowStock = !urgent && stock > 0 && stock <= 3;
  const savings = !variant && product.oldPrice > unitPrice ? product.oldPrice - unitPrice : 0;
  const whatsappText = encodeURIComponent(`Hi! I have a question about "${product.name}" (${window.location.href})`);
  const whatsappHref =
    storeSettings.whatsappEnabled && storeSettings.whatsappNumber
      ? `https://wa.me/${String(storeSettings.whatsappNumber).replace(/^0/, "880")}?text=${whatsappText}`
      : "";
  const notifyOn = storeSettings.stockAlertsEnabled !== false;
  const showBar = storeSettings.stickyBarEnabled !== false && barVisible && !inactive && !chosenSoldOut;

  function handleAddToCart() {
    if (!canBuy) {
      if (hasVariants && !variant) {
        setMessage("choose");
        pickerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    const result = addToCart(product.id, quantity, variant ? variant.id : "");

    if (!result.ok) {
      setMessage(
        result.reason === "choose"
          ? "choose"
          : result.reason === "max" || result.reason === "soldout"
            ? "max"
            : ""
      );
      return;
    }

    setMessage("");
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2600);
    setQuantity(1);
  }

  function onHeart() {
    if (toggleWishlist(product.id) === "added") {
      trackEvent("add_to_wishlist", {
        value: price.min,
        items: [{ id: product.id, name: product.name, price: price.min, qty: 1 }],
      });
    }
  }

  return (
    <main className={`product-page${showBar ? " has-sticky" : ""}`}>
      <section className="product-detail">
        {/* ---------- gallery ---------- */}
        <div className="product-gallery">
          <div className="product-detail-image">
            {activeVideo ? (
              <VideoPlayer key={`${activeVideo.kind}-${activeVideo.url}`} video={activeVideo} title={product.name} />
            ) : shownImage ? (
              <Img
                key={shownImage}
                src={shownImage}
                alt={product.alt || product.name}
                widths={DETAIL_WIDTHS}
                sizes={DETAIL_SIZES}
                width="900"
                height="900"
                priority
              />
            ) : (
              <div className="product-no-image">✦</div>
            )}

            {product.flags?.length > 0 && !activeVideo && (
              <span className="product-flag-row detail">
                {product.flags.includes("deal") && <em className="deal">Deal</em>}
                {product.flags.includes("new") && <em>New</em>}
                {product.flags.includes("trending") && <em>Trending</em>}
                {product.flags.includes("featured") && <em>Featured</em>}
              </span>
            )}
          </div>

          {images.length + videos.length > 1 && (
            <div className="product-thumbs" role="list">
              {images.map((src) => (
                <button
                  type="button"
                  role="listitem"
                  key={src}
                  className={!activeVideo && src === shownImage ? "on" : ""}
                  onClick={() => setActive({ type: "image", src })}
                  aria-label="Show this picture"
                >
                  <Img src={src} alt="" widths={THUMB_WIDTHS} sizes={THUMB_SIZES} width="68" height="68" />
                </button>
              ))}

              {videos.map((video, index) => {
                const thumb = videoThumb(video);

                return (
                  <button
                    type="button"
                    role="listitem"
                    key={`${video.kind}-${video.url}`}
                    className={`thumb-video${activeVideo === video ? " on" : ""}`}
                    onClick={() => setActive({ type: "video", index })}
                    aria-label="Play this video"
                  >
                    {thumb ? <Img src={thumb} alt="" widths={THUMB_WIDTHS} sizes={THUMB_SIZES} width="68" height="68" /> : null}
                    <span className="thumb-play">
                      <PlayIcon size={18} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ---------- information ---------- */}
        <div className="product-detail-info">
          <p className="product-detail-brand">{product.brand || brand.toUpperCase()}</p>

          <p className="product-category">
            <Link to={`/shop?category=${encodeURIComponent(product.category || "")}`}>
              {product.category || "Beauty"}
            </Link>
          </p>

          <h1>{product.name}</h1>

          {product.subtitle && <p className="product-subtitle">{product.subtitle}</p>}

          {product.reviews > 0 && product.rating > 0 && (
            <a href="#reviews" className="product-rating-link">
              <Stars value={product.rating} size={15} />
              <span>
                {product.rating} ({product.reviews})
              </span>
            </a>
          )}

          {description && <p className="product-detail-description">{product.description}</p>}

          <div className="product-detail-price">
            {!variant && price.max !== price.min && (
              <small className="price-from">
                <T k="shop.from" />{" "}
              </small>
            )}
            {money(variant ? unitPrice : hasVariants ? price.min : unitPrice)}
            {product.oldPrice > unitPrice && !hasVariants && <s className="price-old">{money(product.oldPrice)}</s>}
          </div>

          {savings > 0 && (
            <p className="product-savings">
              <T k="product.savings" vars={{ amount: money(savings) }} />
            </p>
          )}

          {/* ---------- options (size, shade, ...) ---------- */}
          {hasVariants && (
            <div
              className="variant-picker"
              role="radiogroup"
              aria-label={product.variantLabel || "Option"}
              ref={pickerRef}
            >
              <p className="variant-label">
                {product.variantLabel || <T k="product.choose" />}
              </p>

              <div className="variant-options">
                {variants.map((item) => {
                  const out = item.stock <= 0;

                  return (
                    <button
                      type="button"
                      key={item.id}
                      role="radio"
                      aria-checked={item.id === variantId}
                      /* a sold-out option can still be picked, to ask for a back-in-stock message */
                      disabled={out && !notifyOn}
                      className={`variant-option${item.id === variantId ? " on" : ""}${out ? " is-out" : ""}`}
                      onClick={() => {
                        setVariantId(item.id);
                        setActive(null);
                        setQuantity(1);
                        setMessage("");
                      }}
                    >
                      {item.label}
                      {out && (
                        <small>
                          <T k="product.optionSoldOut" />
                        </small>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="product-detail-stock">
            {inactive ? (
              <span className="stock-unavailable">
                <T k="product.stock.inactive" />
              </span>
            ) : chosenSoldOut || (unavailable && !hasVariants) ? (
              <span className="stock-unavailable">
                <T k="product.stock.out" />
              </span>
            ) : hasVariants && !variant ? null : urgent ? (
              <span className="stock-urgent">
                <i aria-hidden="true" />
                <T k="product.urgency" vars={{ count: stock }} />
              </span>
            ) : lowStock ? (
              <span className="stock-low">
                <T k="product.stock.low" vars={{ count: stock }} />
              </span>
            ) : (
              <span className="stock-available">
                <T k="product.stock.ok" vars={{ count: stock }} />
              </span>
            )}
          </div>

          {inBag > 0 && canBuy && (
            <div className="product-cart-status">
              <span>
                <CartIcon size={15} />
              </span>

              <span>
                {inBag === 1 ? (
                  <T k="product.inbag.one" />
                ) : (
                  <T k="product.inbag.many" vars={{ count: inBag }} />
                )}
              </span>

              <Link to="/cart">
                <T k="product.inbag.link" />
              </Link>
            </div>
          )}

          <div ref={purchaseRef}>
            {inactive ? (
              <button type="button" className="add-to-cart-button" disabled>
                <T k="product.inactive" as="span" />
              </button>
            ) : chosenSoldOut ? (
              <>
                <button type="button" className="add-to-cart-button" disabled>
                  <T k="product.soldout" as="span" />
                </button>

                {notifyOn && (
                  <NotifyForm key={`${product.id}|${variant ? variant.id : ""}`} product={product} variant={variant} />
                )}
              </>
            ) : (
              <div className="product-purchase">
                <div className="quantity-selector">
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>

                  <span>{quantity}</span>

                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.min(Math.max(1, room), current + 1))}
                    disabled={quantity >= Math.max(1, room)}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  className={`add-to-cart-button ${added ? "added" : ""}`}
                  onClick={handleAddToCart}
                >
                  <span className="cart-icon">{added ? <CheckIcon size={18} /> : <CartIcon size={18} />}</span>
                  <T k={added ? "product.added" : "product.add"} as="span" />
                </button>
              </div>
            )}
          </div>

          {message && (
            <p className="form-error" role="alert">
              <T k={message === "choose" ? "product.chooseError" : "product.maxError"} />
            </p>
          )}

          <div className="product-secondary-actions">
            {accountsEnabled && (
              <button
                type="button"
                className={`product-save${wished ? " on" : ""}`}
                onClick={onHeart}
                aria-pressed={wished}
              >
                <HeartIcon size={16} filled={wished} />
                <T k={wished ? "product.saved" : "product.save"} />
              </button>
            )}

            {whatsappHref && (
              <a className="product-save" href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <WhatsappIcon size={16} />
                <T k="product.ask" />
              </a>
            )}
          </div>

          <Link to="/shop" className="product-back-link">
            <T k="product.back" />
          </Link>
        </div>
      </section>

      {/* ---------- highlights + details ---------- */}
      {(product.features?.length > 0 || product.specs?.length > 0) && (
        <section className="product-section product-facts">
          {product.features?.length > 0 && (
            <div>
              <T k="product.features" as="h2" />
              <ul className="product-feature-list">
                {product.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          )}

          {product.specs?.length > 0 && (
            <div>
              <T k="product.specs" as="h2" />
              <dl className="product-spec-list">
                {product.specs.map((spec) => (
                  <div key={spec.k}>
                    <dt>{spec.k}</dt>
                    <dd>{spec.v}</dd>
                  </div>
                ))}
              </dl>
              {product.sku && <p className="product-sku">SKU: {product.sku}</p>}
            </div>
          )}
        </section>
      )}

      <ProductReviews product={product} />

      <Row eyebrow="product.together.eyebrow" title="product.together.title" items={together} />
      <Row eyebrow="product.related.eyebrow" title="product.related.title" items={related} />
      <Row eyebrow="product.recent.eyebrow" title="product.recent.title" items={recent} />

      {/* ---------- phone-only bar: Add to cart stays within reach ---------- */}
      {showBar && (
        <div className="sticky-bar" role="region" aria-label="Add to cart">
          <span className="sticky-thumb">
            {shownImage && <Img src={shownImage} alt="" widths={THUMB_WIDTHS} sizes="48px" width="48" height="48" />}
          </span>

          <span className="sticky-info">
            <strong>{product.name}</strong>
            <em>{money(variant ? unitPrice : hasVariants ? price.min : unitPrice)}</em>
          </span>

          <button type="button" className="sticky-add" onClick={handleAddToCart}>
            <CartIcon size={18} />
            <T k={hasVariants && !variant ? "product.sticky.choose" : "product.sticky.add"} as="span" />
          </button>
        </div>
      )}
    </main>
  );
}
