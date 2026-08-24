import React from "react";
import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext";

export default function CartDrawer() {
  const {
    cart,
    count,
    subtotal,
    shipping,
    total,
    storeSettings,
    changeQty,
    removeFromCart,
  } = useStore();

    const brand = storeSettings?.storeName || "PearlSkino BD";
if (!cart || cart.length === 0) {
    return (
      <aside className="cart-drawer">

        <div className="cart-drawer-sparkles">
          <span>✦</span>
          <span>✧</span>
          <span>⋆</span>
          <span>✦</span>
        </div>

        <div className="cart-drawer-glow"></div>

        <div className="cart-drawer-header">
          <div>
            <p className="eyebrow">
              {brand.toUpperCase()}
            </p>

            <h2>
              Your Bag
            </h2>
          </div>

          <span className="cart-count">
            0
          </span>
        </div>

        <div className="cart-drawer-empty">

          <div className="empty-pearl">
            ✦
          </div>

          <h3>
            Your bag is waiting.
          </h3>

          <p>
            Discover something beautiful
            and add it to your collection.
          </p>

          <Link
            to="/shop"
            className="cart-drawer-shop"
          >
            Explore Collection
          </Link>

        </div>

      </aside>
    );
  }

  return (
    <aside className="cart-drawer">

      {/* DECORATIVE ELEMENTS */}

      <div className="cart-drawer-sparkles">
        <span>✦</span>
        <span>✧</span>
        <span>⋆</span>
        <span>✦</span>
        <span>·</span>
      </div>

      <div className="cart-drawer-glow"></div>


      {/* HEADER */}

      <div className="cart-drawer-header">

        <div>

          <p className="eyebrow">
            {brand.toUpperCase()}
          </p>

          <h2>
            Your Bag
          </h2>

        </div>

        <span className="cart-count">
          {count}
        </span>

      </div>


      {/* ITEMS */}

      <div className="drawer-items">

        {cart.map((item) => {

          const image =
            item.image ||
            item.images?.[0] ||
            "";

          const quantity =
            Number(item.qty || 1);

          return (
            <div
              className="drawer-item"
              key={item.id || item.name}
            >

              {/* IMAGE */}

              <div className="drawer-item-image">

                {image ? (
                  <img
                    src={image}
                    alt={item.name}
                  />
                ) : (
                  <span>
                    ✦
                  </span>
                )}

              </div>


              {/* DETAILS */}

              <div className="drawer-item-details">

                <small>
                  {item.brand ||
                    "{brand.toUpperCase()}"}
                </small>

                <strong>
                  {item.name}
                </strong>

                <span className="drawer-item-price">
                  ৳
                  {Number(
                    item.price || 0
                  ).toLocaleString()}
                </span>


                {/* QUANTITY */}

                <div className="drawer-quantity">

                  <button
                    type="button"
                    onClick={() =>
                      changeQty(
                        item.id,
                        -1
                      )
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
                      changeQty(
                        item.id,
                        1
                      )
                    }
                  >
                    +
                  </button>

                </div>

              </div>


              {/* REMOVE */}

              <button
                type="button"
                className="drawer-remove"
                onClick={() =>
                  removeFromCart(item.id)
                }
                aria-label={`Remove ${item.name}`}
              >
                ×
              </button>

            </div>
          );
        })}

      </div>


      {/* SUMMARY */}

      <div className="drawer-summary">

        <div>
          <span>
            Subtotal
          </span>

          <strong>
            ৳
            {Number(
              subtotal || 0
            ).toLocaleString()}
          </strong>
        </div>


        <div>
          <span>
            Shipping
          </span>

          <strong>
            {shipping === 0
              ? "FREE"
              : `৳${shipping}`}
          </strong>
        </div>


        <div className="drawer-total">

          <span>
            Total
          </span>

          <strong>
            ৳
            {Number(
              total || 0
            ).toLocaleString()}
          </strong>

        </div>

      </div>


      {/* ACTIONS */}

      <div className="drawer-actions">

        <Link
          to="/cart"
          className="drawer-secondary-button"
        >
          View Cart
        </Link>

        <Link
          to="/checkout"
          className="drawer-primary-button"
        >
          Checkout
        </Link>

      </div>

    </aside>
  );
}