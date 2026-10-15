import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useStore } from "../context/StoreContext";
import { useCatalog, categoryHref, flaggedProducts } from "../hooks/useCatalog";
import { useSeo } from "../hooks/useSeo";
import { readRecent } from "../lib/recent";
import { sized } from "../lib/img";
import T, { useList, ListEditTrigger } from "../content/T";
import ProductTile from "../components/ProductTile";
import Img from "../components/Img";

const FLAG_ORDER = ["new", "trending", "featured", "deal"];
const BANNER_WIDTHS = [640, 960, 1400, 1920];

/* =========================================================
   MOVING ANNOUNCEMENT STRIP  (the lines are editable)
========================================================= */
function Marquee() {
  const items = useList("home.marquee").filter((item) => item.text);

  if (!items.length) {
    return (
      <div className="home-marquee pk-list-host" aria-hidden="true">
        <ListEditTrigger k="home.marquee" />
      </div>
    );
  }

  /* the track holds two identical halves, so it can loop seamlessly */
  const repeat = Math.max(1, Math.ceil(6 / items.length));
  const half = [];

  for (let r = 0; r < repeat; r += 1) {
    items.forEach((item, index) => half.push({ text: item.text, id: `${r}-${index}` }));
  }

  return (
    <div className="home-marquee pk-list-host" aria-label="Announcements">
      <div className="home-marquee-track" style={{ "--marquee-items": half.length }}>
        {[0, 1].map((copy) =>
          half.map((item) => (
            <Fragment key={`${copy}-${item.id}`}>
              <span aria-hidden={copy === 1}>{item.text}</span>
              <span className="marquee-star" aria-hidden="true">
                &#10022;
              </span>
            </Fragment>
          ))
        )}
      </div>

      <ListEditTrigger k="home.marquee" />
    </div>
  );
}

/* =========================================================
   BANNER SLIDER  (managed in Admin > Banners)
========================================================= */
function BannerLink({ banner, className, children }) {
  const link = banner.link || "";

  if (!link) return <div className={className}>{children}</div>;

  if (link.startsWith("/")) {
    return (
      <Link to={link} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a href={link} className={className} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function Banners({ banners }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;

  useEffect(() => {
    if (count < 2 || paused) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;

    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), 6500);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  if (!count) return null;

  return (
    <section
      className="home-banners"
      aria-roledescription="carousel"
      aria-label="Highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="home-banner-stage">
        {banners.map((banner, position) => (
          <div
            key={banner.id}
            className={`home-banner${position === index ? " active" : ""}`}
            aria-hidden={position !== index}
          >
            <BannerLink banner={banner} className="home-banner-inner">
              {banner.image && (
                <Img
                  src={banner.image}
                  alt=""
                  widths={BANNER_WIDTHS}
                  sizes="100vw"
                  priority={position === 0}
                />
              )}

              <div className="home-banner-copy">
                {banner.title && <h2>{banner.title}</h2>}
                {banner.subtitle && <p>{banner.subtitle}</p>}
                {banner.link && banner.button && <span className="home-banner-button">{banner.button} →</span>}
              </div>
            </BannerLink>
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="home-banner-dots" role="tablist" aria-label="Choose a highlight">
          {banners.map((banner, position) => (
            <button
              key={banner.id}
              type="button"
              role="tab"
              aria-selected={position === index}
              aria-label={`Highlight ${position + 1}`}
              className={position === index ? "on" : ""}
              onClick={() => setIndex(position)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* =========================================================
   REVIEWS
========================================================= */
function Stars({ value }) {
  return (
    <span className="stars" role="img" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(value) ? "on" : ""}>
          ★
        </span>
      ))}
    </span>
  );
}

function Reviews({ reviews, getProduct }) {
  if (!reviews.length) return null;

  return (
    <section className="home-reviews">
      <div className="home-featured-heading">
        <div>
          <T k="home.reviews.eyebrow" as="p" className="eyebrow" />
          <T k="home.reviews.title" as="h2" />
        </div>
      </div>

      <div className="home-review-grid">
        {reviews.map((review) => {
          const product = getProduct(review.productId);

          return (
            <figure className="home-review" key={review.id}>
              <Stars value={review.rating} />
              {review.title && <strong>{review.title}</strong>}
              <blockquote>{review.body}</blockquote>
              {review.photos?.length > 0 && (
                <div className="review-photos">
                  {review.photos.slice(0, 3).map((photo) => (
                    <a key={photo} href={sized(photo, 1200)} target="_blank" rel="noopener noreferrer">
                      <Img src={photo} alt="" widths={[120, 200]} sizes="64px" width="64" height="64" />
                    </a>
                  ))}
                </div>
              )}
              <figcaption>
                <span>{review.name}</span>
                {review.verified && (
                  <small>
                    <T k="home.reviews.verified" />
                  </small>
                )}
                {product && (
                  <Link to={`/product/${product.id}`} className="home-review-product">
                    {product.name}
                  </Link>
                )}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}

/* =========================================================
   NEW / TRENDING / FEATURED / DEALS  (one island each)
   Turned on/off, sized and renamed from the admin.
========================================================= */
function FlagIslands({ products, config }) {
  return FLAG_ORDER.map((flag) => {
    const setting = config?.[flag] || {};
    if (setting.on === false) return null;

    const list = flaggedProducts(products, flag, Number(setting.limit) || 8);
    if (!list.length) return null;

    return (
      <section className="home-featured home-flag" key={flag} data-flag={flag}>
        <div className="home-featured-heading">
          <div>
            <T k={`home.flag.${flag}.eyebrow`} as="p" className="eyebrow" />
            <T k={`home.flag.${flag}.title`} as="h2" />
          </div>

          <Link to={`/shop?flag=${flag}`} className="home-featured-link">
            <T k="home.flag.link" />
            <span className="arrow-accent">&#8594;</span>
          </Link>
        </div>

        <div className="home-island">
          <div className="home-product-scroll">
            {list.map((product) => (
              <ProductTile key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    );
  });
}

/* =========================================================
   RECENTLY VIEWED  (this browser only)
========================================================= */
function RecentlyViewed({ getProduct }) {
  const items = readRecent()
    .map((id) => getProduct(id))
    .filter((product) => product && product.status !== "inactive")
    .slice(0, 8);

  if (!items.length) return null;

  return (
    <section className="home-featured home-recent">
      <div className="home-featured-heading">
        <div>
          <T k="home.recent.eyebrow" as="p" className="eyebrow" />
          <T k="home.recent.title" as="h2" />
        </div>
      </div>

      <div className="home-island">
        <div className="home-product-scroll">
          {items.map((product) => (
            <ProductTile key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   HOME
========================================================= */
export default function Home() {
  const { storeSettings, banners, featuredReviews, getProduct } = useStore();
  const { loading, islands, products } = useCatalog();

  useSeo({ page: "home" });

  const sections = storeSettings.homeSections || {};
  const show = (name) => sections[name] !== false;
  const limit = Math.max(1, Math.min(12, Number(storeSettings.homeCategoryLimit) || 5));
  const groups = islands(limit);

  return (
    <main className="home">
      {show("marquee") && <Marquee />}

      {show("hero") && (
        <section className="hero">
          <div className="pearl pearl-1"></div>
          <div className="pearl pearl-2"></div>
          <div className="pearl pearl-3"></div>

          <div className="hero-content">
            <T k="home.hero.eyebrow" as="p" className="eyebrow" />

            <T k="home.hero.title" as="h1" />

            <T k="home.hero.text" as="p" className="hero-text" />

            <div className="hero-buttons">
              <Link to="/shop" className="hero-button">
                <T k="home.hero.cta1" />
                <span className="arrow-accent">&#8594;</span>
              </Link>

              <Link to="/about" className="hero-button secondary">
                <T k="home.hero.cta2" />
                <span className="arrow-accent">&#8594;</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {show("banners") && <Banners banners={banners} />}

      {show("flags") && !loading && (
        <FlagIslands products={products} config={storeSettings.homeFlagSections} />
      )}

      {show("categories") && (
        <section className="home-featured">
          <div className="home-featured-heading">
            <div>
              <T k="home.featured.eyebrow" as="p" className="eyebrow" />
              <T k="home.featured.title" as="h2" />
            </div>

            <Link to="/shop" className="home-featured-link">
              <T k="home.featured.link" />
              <span className="arrow-accent">&#8594;</span>
            </Link>
          </div>

          {loading ? (
            <div className="home-featured-loading">
              <T k="home.featured.loading" />
            </div>
          ) : groups.length > 0 ? (
            groups.map((group) => (
              <div className="home-island" key={group.id || group.name}>
                <div className="home-island-head">
                  <div>
                    <h3>{group.name}</h3>
                    {group.blurb && <p>{group.blurb}</p>}
                  </div>

                  <Link to={categoryHref(group.name)} className="home-featured-link">
                    <T k="home.featured.link" />
                    <span className="arrow-accent">&#8594;</span>
                  </Link>
                </div>

                <div className="home-product-scroll">
                  {group.products.map((product) => (
                    <ProductTile key={product.id} product={product} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="home-featured-loading">
              <T k="home.featured.empty" />
            </div>
          )}
        </section>
      )}

      {show("recent") && storeSettings.recentlyViewedEnabled !== false && !loading && (
        <RecentlyViewed getProduct={getProduct} />
      )}

      {show("reviews") && <Reviews reviews={featuredReviews} getProduct={getProduct} />}

      {show("cta") && (
        <section className="intro home-final-cta">
          <T k="home.cta.eyebrow" as="p" className="eyebrow" />

          <T k="home.cta.title" as="h2" />

          <T k="home.cta.text" as="p" />

          <div className="home-final-actions">
            <Link to="/shop" className="home-explore-button">
              <T k="home.cta.button1" as="span" />
              <strong className="arrow-accent">&#8594;</strong>
            </Link>

            <Link to="/about" className="home-story-button">
              <T k="home.cta.button2" as="span" />
              <strong className="arrow-accent">&#8594;</strong>
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
