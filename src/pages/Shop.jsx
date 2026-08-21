
import { Link } from "react-router-dom";
import { useProducts } from "../hooks/useProducts";

export default function Shop() {
  const [products] = useProducts();

  /* =========================
     VISIBLE PRODUCTS
  ========================== */

  const visibleProducts = products.filter(
    (product) =>
      product.status !== "inactive"
  );


  /* =========================
     EMPTY SHOP
  ========================== */

  if (visibleProducts.length === 0) {
    return (
      <main className="shop-page">

        <section className="shop-hero">

          <div className="page-brand-logo">
            <img
              src="/logo.png"
              alt="PearlSkino BD"
            />
          </div>

          <p className="eyebrow">
            THE PEARLSKINO EDIT
          </p>

          <h1>
            Our Collection
          </h1>

          <p>
            Discover our carefully selected collection
            of skincare, fragrances and beauty essentials.
          </p>

        </section>


        <section className="shop-empty">

          <div className="shop-empty-icon">
            ✦
          </div>

          <p className="eyebrow">
            COLLECTION
          </p>

          <h2>
            Nothing here yet.
          </h2>

          <p>
            Products will appear here once they are
            added from the admin panel.
          </p>

          <Link
            to="/admin"
            className="hero-button"
          >
            Open Product Manager
          </Link>

        </section>

      </main>
    );
  }


  /* =========================
     SHOP
  ========================== */

  return (
    <main className="shop-page">

      {/* =========================
          SHOP HERO
      ========================== */}

      <section className="shop-hero">

        <div className="page-brand-logo">
          <img
            src="/logo.png"
            alt="PearlSkino BD"
          />
        </div>

        <p className="eyebrow">
          THE PEARLSKINO EDIT
        </p>

        <h1>
          Our <em>Collection.</em>
        </h1>

        <p>
          Discover our carefully selected collection
          of skincare, fragrances and beauty essentials.
        </p>

      </section>


      {/* =========================
          PRODUCT GRID
      ========================== */}

      <section className="product-grid">

        {visibleProducts.map(
          (product, index) => {

            const image =
              product.image ||
              product.images?.[0] ||
              "";

            const price =
              Number(product.price || 0);

            const stock =
              Number(product.stock || 0);

            const outOfStock =
              stock <= 0;


            return (
              <article
                className={`product-card ${
                  outOfStock
                    ? "product-card-out"
                    : ""
                }`}
                key={product.id}
              >

                {/* =========================
                    PRODUCT IMAGE
                ========================== */}

                <Link
                  to={`/product/${product.id}`}
                  className="product-image"
                >

                  {image ? (

                    <img
                      src={image}
                      alt={product.name}
                      loading={
                        index < 4
                          ? "eager"
                          : "lazy"
                      }
                    />

                  ) : (

                    <div className="product-no-image">
                      ✦
                    </div>

                  )}


                  {/* PRODUCT NUMBER */}

                  <span className="product-number">
                    {String(
                      index + 1
                    ).padStart(2, "0")}
                  </span>


                  {/* STOCK BADGE */}

                  {outOfStock && (

                    <span className="product-stock-badge">
                      Out of Stock
                    </span>

                  )}

                </Link>


                {/* =========================
                    PRODUCT INFORMATION
                ========================== */}

                <div className="product-info">

                  {/* BRAND */}

                  <p className="product-brand">
                    {product.brand ||
                      "PEARLSKINO BD"}
                  </p>


                  {/* CATEGORY */}

                  <p className="product-category">
                    {product.category ||
                      "Beauty"}
                  </p>


                  {/* NAME */}

                  <h2>
                    {product.name ||
                      "Unnamed Product"}
                  </h2>


                  {/* DESCRIPTION */}

                  {product.description && (

                    <p className="product-description">
                      {product.description}
                    </p>

                  )}


                  {/* =========================
                      PRICE + VIEW
                  ========================== */}

                  <div className="product-card-bottom">

                    <div>

                      <p className="product-price">
                        ৳
                        {price.toLocaleString()}
                      </p>

                      {!outOfStock && (

                        <small className="product-availability">
                          ✓ Available
                        </small>

                      )}

                    </div>


                    {/* VIEW PRODUCT */}

                    <Link
                      to={`/product/${product.id}`}
                      className="view-product"
                    >
                      View
                      <span>→</span>
                    </Link>

                  </div>

                </div>

              </article>
            );
          }
        )}

      </section>

    </main>
  );
}
