import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useStore } from "../context/StoreContext";
import { freeDeliveryGap } from "../lib/delivery";
import { money } from "../lib/format";
import T from "../content/T";
import Img from "./Img";
import FreeShipBar from "./FreeShipBar";
import { CartIcon } from "./Icons";

/*
 * The bag that slides in from the right when the Cart button is pressed.
 * (Before, this was a plain block that sat at the bottom of every page.)
 */
export default function CartDrawer() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const {
    lines,
    count,
    subtotal,
    delivery,
    total,
    storeSettings,
    drawerOpen,
    closeDrawer,
    changeQty,
    removeFromCart,
  } = useStore();

  const brand = storeSettings?.storeName || "PearlSkino BD";
  const closeButton = useRef(null);

  /* close on page change and on Escape; lock the page behind it */
  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  useEffect(() => {
    if (!drawerOpen) return undefined;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();

    function onKey(event) {
      if (event.key === "Escape") closeDrawer();
    }

    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen, closeDrawer]);

  const unavailable = lines.some((line) => line.unavailable);
  const gap = freeDeliveryGap(storeSettings, subtotal, "", "");
  const shippingText = delivery.free || delivery.max === 0
    ? null
    : delivery.exact
      ? money(delivery.min)
      : `from ${money(delivery.min)}`;

  return (
    <div className={`drawer-shell${drawerOpen ? " open" : ""}`} aria-hidden={!drawerOpen}>
      <div className="drawer-overlay" onClick={closeDrawer} />

      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Your cart">
        <div className="cart-drawer-sparkles">
          <span>✦</span>
          <span>✧</span>
          <span>⋆</span>
          <span>✦</span>
        </div>

        <div className="cart-drawer-glow"></div>

        <div className="cart-drawer-header">
          <div>
            <p className="eyebrow">{brand.toUpperCase()}</p>
            <h2>
              <T k="drawer.title" />
            </h2>
          </div>

          <div className="cart-drawer-head-tools">
            <span className="cart-count">{count}</span>
            <button
              type="button"
              ref={closeButton}
              className="drawer-close"
              onClick={closeDrawer}
              aria-label="Close cart"
            >
              ×
            </button>
          </div>
        </div>

        {lines.length === 0 ? (
          <div className="cart-drawer-empty">
            <div className="empty-pearl">
              <CartIcon size={30} />
            </div>

            <h3>
              <T k="drawer.emptyTitle" />
            </h3>

            <p>
              <T k="drawer.emptyText" />
            </p>

            <button
              type="button"
              className="cart-drawer-shop"
              onClick={() => {
                closeDrawer();
                navigate("/shop");
              }}
            >
              <T k="drawer.shop" />
            </button>
          </div>
        ) : (
          <>
            <div className="drawer-items">
              {lines.map((line) => (
                <div className={`drawer-item${line.unavailable ? " is-unavailable" : ""}`} key={line.key}>
                  <Link to={`/product/${line.id}`} className="drawer-item-image" onClick={closeDrawer}>
                    {line.image ? (
                      <Img src={line.image} alt={line.name} widths={[120, 200]} sizes="84px" width="84" height="84" />
                    ) : (
                      <span>✦</span>
                    )}
                  </Link>

                  <div className="drawer-item-details">
                    <small>{line.brand || brand.toUpperCase()}</small>
                    <strong>{line.name}</strong>
                    {line.variantLabel && <em className="drawer-item-variant">{line.variantLabel}</em>}

                    <span className="drawer-item-price">{money(line.unitPrice)}</span>

                    {line.unavailable ? (
                      <span className="drawer-item-note">Sold out - please remove</span>
                    ) : (
                      <div className="drawer-quantity">
                        <button
                          type="button"
                          onClick={() => changeQty(line.key, -1)}
                          aria-label={`Less ${line.name}`}
                        >
                          −
                        </button>
                        <span>{line.qty}</span>
                        <button
                          type="button"
                          onClick={() => changeQty(line.key, 1)}
                          disabled={line.qty >= Math.min(line.stock, 20)}
                          aria-label={`More ${line.name}`}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="drawer-remove"
                    onClick={() => removeFromCart(line.key)}
                    aria-label={`Remove ${line.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <FreeShipBar subtotal={subtotal} className="drawer-ship" />

            {gap > 0 && storeSettings.freeShipBar === false && (
              <p className="drawer-nudge">
                <T k="drawer.freeGap" vars={{ amount: money(gap) }} />
              </p>
            )}

            <div className="drawer-summary">
              <div>
                <span>
                  <T k="drawer.subtotal" />
                </span>
                <strong>{money(subtotal)}</strong>
              </div>

              <div>
                <span>
                  <T k="drawer.shipping" />
                </span>
                <strong>{shippingText === null ? <T k="drawer.free" /> : shippingText}</strong>
              </div>

              <div className="drawer-total">
                <span>
                  <T k="drawer.total" />
                </span>
                <strong>{money(total)}</strong>
              </div>
            </div>

            <div className="drawer-actions">
              <Link to="/cart" className="drawer-secondary-button" onClick={closeDrawer}>
                <T k="drawer.view" />
              </Link>

              <Link
                to="/checkout"
                className={`drawer-primary-button${unavailable ? " is-disabled" : ""}`}
                onClick={(event) => {
                  if (unavailable) event.preventDefault();
                  else closeDrawer();
                }}
              >
                <T k="drawer.checkout" />
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
