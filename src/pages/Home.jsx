import { Link } from "react-router-dom";
import { useProducts } from "../hooks/useProducts";

export default function Home() {
  const [products, , loading] = useProducts();

  const featuredProducts = products
    .filter(
      (product) =>
        product.status !== "inactive" &&
        Number(product.stock || 0) > 0
    )
    .slice(0, 6);

  return (
    <main className="home">

      {/* =========================================
          MOVING ADVERTISING STRIP
      ========================================= */}

      <div className="home-marquee" aria-label="PearlSkino announcements">

        <div className="home-marquee-track">

          <span>✦ FREE PICKUP IN SELECTED AREAS</span>
          <span>✧ COD AVAILABLE IN METROPOLITAN AREA</span>
          <span>✦ AUTHENTIC BEAUTY & FRAGRANCE</span>
          <span>✧ CURATED WITH CARE</span>

          <span>✦ FREE PICKUP IN SELECTED AREAS</span>
          <span>✧ COD AVAILABLE IN METROPOLITAN AREA</span>
          <span>✦ AUTHENTIC BEAUTY & FRAGRANCE</span>
          <span>✧ CURATED WITH CARE</span>

        </div>

      </div>


      {/* =========================================
          HERO
      ========================================= */}

      <section className="hero">

        <div className="pearl pearl-1"></div>
        <div className="pearl pearl-2"></div>
        <div className="pearl pearl-3"></div>

        <div className="hero-content">

          <p className="eyebrow">
            PEARLSKINO BD
          </p>

          <h1>
            Your glow,
            <br />
            <span>your story.</span>
          </h1>

          <p className="hero-text">
            Discover carefully selected skincare and fragrances
            designed to make every day feel a little more beautiful.
          </p>

        </div>

      </section>


      {/* =========================================
          FEATURED PRODUCTS
      ========================================= */}

      <section className="home-featured">

        <div className="home-featured-heading">

          <div>

            <p className="eyebrow">
              A LITTLE SOMETHING
            </p>

            <h2>
              Selected <em>for you.</em>
            </h2>

          </div>

          <Link
            to="/shop"
            className="home-featured-link"
          >
            View all →
          </Link>

        </div>


        {loading ? (

          <div className="home-featured-loading">
            Discovering something beautiful…
          </div>

        ) : featuredProducts.length > 0 ? (

          <div className="home-product-scroll">

            {featuredProducts.map((product) => {

              const image =
                product.image ||
                product.images?.[0] ||
                "";

              return (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="home-product-card"
                >

                  <div className="home-product-image">

                    {image ? (
                      <img
                        src={image}
                        alt={product.name}
                        loading="lazy"
                      />
                    ) : (
                      <span>✦</span>
                    )}

                  </div>

                  <div className="home-product-info">

                    <span>
                      {product.brand || "PearlSkino BD"}
                    </span>

                    <h3>
                      {product.name}
                    </h3>

                    <strong>
                      ৳{Number(
                        product.price || 0
                      ).toLocaleString()}
                    </strong>

                  </div>

                </Link>
              );
            })}

          </div>

        ) : (

          <div className="home-featured-loading">
            New selections are coming soon…
          </div>

        )}

      </section>


      {/* =========================================
          EXPLORE / INTRO
      ========================================= */}

    <section className="intro home-final-cta">

  <p className="eyebrow">
    FIND YOUR BEAUTY RITUAL
  </p>

  <h2>
    A little beauty,
    <br />
    <em>made personal.</em>
  </h2>

  <p>
    From everyday essentials to captivating scents,
    discover pieces chosen to become part of your story.
  </p>

  <div className="home-final-actions">

    <Link
      to="/shop"
      className="home-explore-button"
    >
      <span>Explore Collection</span>
      <strong>↗</strong>
    </Link>

    <Link
      to="/about"
      className="home-story-button"
    >
      <span>Discover Our Story</span>
      <strong>→</strong>
    </Link>

  </div>

</section>
    </main>
  );
}
