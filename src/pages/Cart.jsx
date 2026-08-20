import React from "react";
import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext";

export default function Cart() {
  const {
    cart,
    count,
    subtotal,
    shipping,
    total,
    changeQty,
    removeFromCart,
  } = useStore();

  if (!cart || cart.length === 0) {
    return (
      <main className="page cart-page-luxury">
        <section className="cart-empty-luxury">

          <div className="cart-orbit">
            <span>✦</span>
            <span>✧</span>
            <span>⋆</span>
          </div>

          <p className="eyebrow">
            PEARLSKINO BD · YOUR COLLECTION
          </p>

          <h1>
            Nothing chosen
            <em> yet.</em>
          </h1>

          <p className="cart-empty-text">
            Your next little beauty ritual is waiting.
            Explore our collection and discover something
            that feels perfectly yours.
          </p>

          <Link
            to="/shop"
            className="cart-luxury-button"
          >
            Discover the Collection
            <span>→</span>
          </Link>

        </section>
      </main>
    );
  }

  return (
    <main className="page cart-page-luxury">

      {/* =========================
          HERO
      ========================== */}

      <section className="cart-luxury-hero">

        <div>
          <p className="eyebrow">
            PEARLSKINO BD · YOUR COLLECTION
          </p>

          <h1>
            A little beauty,
            <em> all yours.</em>
          </h1>

          <p>
            Thoughtfully selected pieces, gathered
            together for your next beauty moment.
          </p>
        </div>

        <div className="cart-hero-count">
          <span>{count}</span>
          <small>
            {count === 1 ? "ITEM" : "ITEMS"}
          </small>
        </div>

      </section>


      {/* =========================
          MAIN CART
      ========================== */}

      <section className="cart-luxury-layout">

        {/* PRODUCTS */}

        <div className="cart-selection">

          <div className="cart-section-heading">
            <div>
              <span>01</span>
              <h2>Your selection</h2>
            </div>

            <p>
              {cart.length} {cart.length === 1 ? "piece" : "pieces"}
            </p>
          </div>


          <div className="cart-luxury-items">

            {cart.map((item) => {

              const image =
                item.image ||
                item.images?.[0] ||
                "";

              const quantity =
                Number(item.qty || 1);

              const itemTotal =
                Number(item.price || 0) *
                quantity;

              return (

                <article
                  className="cart-luxury-item"
                  key={item.id || item.name}
                >

                  {/* IMAGE */}

                  <Link
                    to={`/product/${item.id}`}
                    className="cart-luxury-image"
                  >

                    {image ? (
                      <img
                        src={image}
                        alt={item.name}
                      />
                    ) : (
                      <span>✦</span>
                    )}

                  </Link>


                  {/* INFORMATION */}

                  <div className="cart-luxury-info">

                    <p className="cart-item-brand">
                      {item.brand || "PEARLSKINO BD"}
                    </p>

                    <Link
                      to={`/product/${item.id}`}
                      className="cart-item-name"
                    >
                      {item.name}
                    </Link>

                    <p className="cart-item-category">
                      {item.category || "Beauty Essential"}
                    </p>


                    {/* QUANTITY */}

                    <div className="cart-item-controls">

                      <div className="luxury-quantity">

                        <button
                          type="button"
                          onClick={() =>
                            changeQty(item.id, -1)
                          }
                        >
                          −
                        </button>

                        <span>
                          {quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            changeQty(item.id, 1)
                          }
                        >
                          +
                        </button>

                      </div>

                      <button
                        type="button"
                        className="luxury-remove"
                        onClick={() =>
                          removeFromCart(item.id)
                        }
                      >
                        Remove
                      </button>

                    </div>

                  </div>


                  {/* PRICE */}

                  <div className="cart-luxury-price">

                    <span>
                      ৳{Number(
                        item.price || 0
                      ).toLocaleString()}
                    </span>

                    {quantity > 1 && (
                      <small>
                        ৳{itemTotal.toLocaleString()}
                      </small>
                    )}

                  </div>

                </article>
              );
            })}

          </div>


          {/* CONTINUE SHOPPING */}

          <Link
            to="/shop"
            className="cart-continue"
          >
            <span>←</span>
            Continue exploring
          </Link>

        </div>


        {/* =========================
            SUMMARY
        ========================== */}

        <aside className="cart-luxury-summary">

          <div className="summary-glow"></div>

          <p className="eyebrow">
            YOUR ORDER
          </p>

          <h2>
            Almost
            <em> yours.</em>
          </h2>

          <p className="summary-intro">
            Everything looks beautiful together.
            Here's your order at a glance.
          </p>


          <div className="summary-lines">

            <div>
              <span>
                Collection
              </span>

              <strong>
                {count} {count === 1 ? "item" : "items"}
              </strong>
            </div>

            <div>
              <span>
                Subtotal
              </span>

              <strong>
                ৳{Number(
                  subtotal || 0
                ).toLocaleString()}
              </strong>
            </div>

            <div>
              <span>
                Delivery
              </span>

              <strong className={
                shipping === 0
                  ? "free-shipping"
                  : ""
              }>
                {shipping === 0
                  ? "Complimentary"
                  : `৳${shipping}`}
              </strong>
            </div>

          </div>


          <div className="summary-total">

            <span>
              Total
            </span>

            <strong>
              ৳{Number(
                total || 0
              ).toLocaleString()}
            </strong>

          </div>


          {shipping === 0 ? (

            <div className="free-shipping-note">
              <span>✦</span>
              Your order qualifies for complimentary delivery.
            </div>

          ) : (

            <div className="shipping-note">
              Add ৳{Math.max(
                0,
                2500 - subtotal
              ).toLocaleString()} more
              to unlock complimentary delivery.
            </div>

          )}


          <Link
            to="/checkout"
            className="cart-checkout-button"
          >
            <span>Continue to Checkout</span>
            <span>→</span>
          </Link>


          <div className="cart-trust">

            <span>✦</span>

            <p>
              Carefully packed · Beautifully delivered
            </p>

            <span>✦</span>

          </div>

        </aside>

      </section>

    </main>
  );
}