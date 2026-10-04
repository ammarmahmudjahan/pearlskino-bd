import React from "react";
import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext";

export default function Cart() {
  const {
    storeSettings,
    cart,
    count,
    subtotal,
    shipping,
    total,
    changeQty,
    removeFromCart,
  } = useStore();

  const storeName = storeSettings?.storeName || "PearlSkino BD";
  const tagline = storeSettings?.tagline || "Pearly Glow";

  if (!cart || cart.length === 0) {
    return (
      <main className="page cart-page-luxury">
        <section className="cart-empty-luxury">

          <div className="cart-orbit">
            <span className="star-accent">&#10022;</span>
            <span className="star-accent">&#10022;</span>
            <span className="star-accent">&#10022;</span>
          </div>

          <p className="eyebrow">
            {storeName.toUpperCase()} · YOUR COLLECTION
          </p>

          <h1>
            Nothing chosen
            <em> yet.</em>
          </h1>

          <p className="cart-empty-text">
            {tagline}
          </p>

          <Link
            to="/shop"
            className="cart-luxury-button"
          >
            Discover the Collection
            <span className="arrow-accent">&#8594;</span>
          </Link>

        </section>
      </main>
    );
  }

  return (
    <main className="page cart-page-luxury">

      <section className="cart-luxury-hero">

        <div>

          <p className="eyebrow">
            {storeName.toUpperCase()} · YOUR COLLECTION
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
          <span className="star-accent">&#10022;</span>
          <small>
            {count === 1 ? "ITEM" : "ITEMS"}
          </small>
        </div>

      </section>

      <section className="cart-items">

        {cart.map((item) => {

          const itemTotal =
            Number(item.price || 0) *
            Number(item.qty || 0);

          return (
            <article
              className="cart-item"
              key={item.id}
            >

              <div className="cart-item-image">

                <img
                  src={item.image || "/logo.png"}
                  alt={item.name || storeName}
                />

              </div>

              <div className="cart-item-info">

                <span className="cart-item-brand">
                  {item.brand || storeName}
                </span>

                <h2>
                  {item.name}
                </h2>

                {item.size && (
                  <small>
                    {item.size}
                  </small>
                )}

                <p>
                  ৳{Number(item.price || 0).toLocaleString()}
                </p>

              </div>

              <div className="cart-item-actions">

                <div className="cart-quantity">

                  <button
                    type="button"
                    onClick={() => {
                      if (Number(item.qty || 1) > 1) {
                        changeQty(item.id, -1);
                      }
                    }}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>

                  <span className="star-accent">&#10022;</span>

                  <button
                    type="button"
                    onClick={() => {
                      changeQty(item.id, 1);
                    }}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>

                </div>

                <strong>
                  ৳{itemTotal.toLocaleString()}
                </strong>

                <button
                  type="button"
                  className="cart-remove"
                  onClick={() => removeFromCart(item.id)}
                >
                  Remove
                </button>

              </div>

            </article>
          );
        })}

      </section>

      <section className="cart-summary">

  <div className="cart-summary-row">
    <span className="star-accent">&#10022;</span>
    <strong>
      &#2547;{Number(subtotal || 0).toLocaleString()}
    </strong>
  </div>

  <div className="cart-summary-row">
    <span className="star-accent">&#10022;</span>
    <strong>
      {Number(shipping || 0) === 0
        ? "Free"
        : `&#2547;${Number(shipping).toLocaleString()}`}
    </strong>
  </div>

  <div className="cart-summary-total">
    <span className="star-accent">&#10022;</span>
    <strong>
      &#2547;{Number(total || 0).toLocaleString()}
    </strong>
  </div>
<Link
          to="/checkout"
          className="cart-luxury-button"
        >
          Proceed to Checkout
          <span className="star-accent">&#10022;</span>
        </Link>

        <Link
          to="/shop"
          className="cart-continue-shopping"
        >
          Continue Shopping
        </Link>

      </section>

      <section className="cart-final-note">

        <div className="cart-final-pearl">
          <span className="star-accent">&#10022;</span>
        </div>

        <p>
          Carefully packed · Beautifully delivered
        </p>

        <strong>
          {storeName}
        </strong>

        <span className="star-accent">&#10022;</span>

      </section>

    </main>
  );
}
