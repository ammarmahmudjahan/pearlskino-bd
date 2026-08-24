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

          <div className="cart-empty-logo">
            <img
              src="/logo.png"
              alt={storeName}
            />
          </div>

          <div className="cart-orbit">
            <span>✦</span>
            <span>✧</span>
            <span>◇</span>
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
            <span>→</span>
          </Link>

        </section>
      </main>
    );
  }

  return (
    <main className="page cart-page-luxury">

      <section className="cart-luxury-hero">

        <div>

          <div className="cart-hero-logo">
            <img
              src="/logo.png"
              alt={storeName}
            />
          </div>

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
          <span>{count}</span>
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
                    onClick={() =>
                      changeQty(
                        item.id,
                        Math.max(
                          1,
                          Number(item.qty || 1) - 1
                        )
                      )
                    }
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>

                  <span>
                    {item.qty}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      changeQty(
                        item.id,
                        Number(item.qty || 0) + 1
                      )
                    }
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
          <span>Subtotal</span>
          <strong>
            ৳{Number(subtotal || 0).toLocaleString()}
          </strong>
        </div>

        <div className="cart-summary-row">
          <span>Delivery</span>
          <strong>
            {Number(shipping || 0) === 0
              ? "Free"
              : `৳${Number(shipping).toLocaleString()}`}
          </strong>
        </div>

        <div className="cart-summary-total">
          <span>Total</span>
          <strong>
            ৳{Number(total || 0).toLocaleString()}
          </strong>
        </div>

        <Link
          to="/checkout"
          className="cart-luxury-button"
        >
          Proceed to Checkout
          <span>→</span>
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
          <span>✦</span>
        </div>

        <p>
          Carefully packed · Beautifully delivered
        </p>

        <strong>
          {storeName}
        </strong>

        <span>
          {tagline}
        </span>

      </section>

    </main>
  );
}