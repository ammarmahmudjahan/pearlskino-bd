import { Link } from "react-router-dom";

import { useState } from "react";

import { useStore } from "../context/StoreContext";
import { useContent } from "../content/context";
import { useSeo } from "../hooks/useSeo";
import { useCoupon } from "../hooks/useCoupon";
import { freeDeliveryGap } from "../lib/delivery";
import { money } from "../lib/format";
import T, { useText } from "../content/T";
import Img from "../components/Img";
import FreeShipBar from "../components/FreeShipBar";
import { CartIcon } from "../components/Icons";

const CART_IMAGE_WIDTHS = [160, 260];

export default function Cart() {
  const { storeSettings, lines, count, subtotal, delivery, shipping, changeQty, removeFromCart } =
    useStore();
  const content = useContent();
  const coupon = useCoupon();
  const [codeInput, setCodeInput] = useState("");
  const couponHint = useText("cart.coupon.hint");

  useSeo({ page: "cart", noindex: true });

  const storeName = storeSettings?.storeName || "PearlSkino BD";
  const hasUnavailable = lines.some((line) => line.unavailable);
  const gap = freeDeliveryGap(storeSettings, subtotal, "", "");
  const minOrder = Number(storeSettings.minOrderAmount) || 0;
  const belowMinimum = minOrder > 0 && subtotal < minOrder;
  const blocked = hasUnavailable || belowMinimum;
  const barOn = storeSettings.freeShipBar !== false && Number(storeSettings.freeDeliveryThreshold || 0) > 0;

  if (lines.length === 0) {
    return (
      <main className="page cart-page-luxury">
        <section className="cart-empty-luxury">
          <div className="cart-orbit">
            <span className="star-accent">&#10022;</span>
            <span className="cart-empty-icon">
              <CartIcon size={34} />
            </span>
            <span className="star-accent">&#10022;</span>
          </div>

          <T k="cart.eyebrow" as="p" className="eyebrow" />

          <T k="cart.empty.title" as="h1" />

          <T k="cart.empty.text" as="p" className="cart-empty-text" />

          <Link to="/shop" className="cart-luxury-button">
            <T k="cart.empty.button" />
            <span className="arrow-accent">&#8594;</span>
          </Link>
        </section>
      </main>
    );
  }

  const discount = coupon.applied ? Math.min(subtotal, coupon.applied.discount || 0) : 0;
  const freeByCoupon = Boolean(coupon.applied?.freeShipping);
  const shownTotal = Math.max(0, subtotal - discount) + (freeByCoupon ? 0 : shipping);

  const shippingValue =
    freeByCoupon || delivery.free || delivery.max === 0 ? (
      <T k="cart.free" />
    ) : delivery.exact ? (
      money(delivery.min)
    ) : (
      <>
        <T k="cart.from" /> {money(delivery.min)}
      </>
    );

  return (
    <main className="page cart-page-luxury">
      <section className="cart-luxury-hero">
        <div>
          <T k="cart.eyebrow" as="p" className="eyebrow" />

          <T k="cart.hero.title" as="h1" />

          <T k="cart.hero.text" as="p" />
        </div>

        <div className="cart-hero-count">
          <span className="star-accent">&#10022;</span>
          <small>
            <T k={count === 1 ? "cart.hero.item" : "cart.hero.items"} />
          </small>
        </div>
      </section>

      <section className="cart-items">
        {lines.map((line) => (
          <article className={`cart-item${line.unavailable ? " is-unavailable" : ""}`} key={line.key}>
            <Link to={`/product/${line.id}`} className="cart-item-image">
              {line.image ? (
                <Img
                  src={line.image}
                  alt={line.name || storeName}
                  widths={CART_IMAGE_WIDTHS}
                  sizes="120px"
                  width="120"
                  height="120"
                />
              ) : (
                <img src="/logo.png" alt={line.name || storeName} width="120" height="120" />
              )}
            </Link>

            <div className="cart-item-info">
              <span className="cart-item-brand">{line.brand || storeName}</span>

              <h2>
                <Link to={`/product/${line.id}`}>{line.name}</Link>
              </h2>

              {line.variantLabel && (
                <small className="cart-item-variant">
                  {line.product.variantLabel ? `${line.product.variantLabel}: ` : ""}
                  {line.variantLabel}
                </small>
              )}

              <p>{money(line.unitPrice)}</p>

              {line.unavailable && (
                <small className="cart-item-warning">
                  <T k="cart.soldout" />
                </small>
              )}
            </div>

            <div className="cart-item-actions">
              {!line.unavailable && (
                <div className="cart-quantity">
                  <button
                    type="button"
                    onClick={() => changeQty(line.key, -1)}
                    disabled={line.qty <= 1}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>

                  <span className="cart-qty-number">{line.qty}</span>

                  <button
                    type="button"
                    onClick={() => changeQty(line.key, 1)}
                    disabled={line.qty >= Math.min(line.stock, 20)}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              )}

              <strong>{money(line.lineTotal)}</strong>

              <button type="button" className="cart-remove" onClick={() => removeFromCart(line.key)}>
                <T k="cart.remove" />
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="cart-summary">
        <FreeShipBar subtotal={subtotal} />

        <div className="cart-coupon">
          <T k="cart.coupon.title" as="h3" />

          {coupon.applied ? (
            <div className="cart-coupon-applied" role="status">
              <span>
                {freeByCoupon && discount === 0 ? (
                  <T k="cart.coupon.freeShip" vars={{ code: coupon.applied.code }} />
                ) : (
                  <T
                    k="cart.coupon.applied"
                    vars={{ code: coupon.applied.code, amount: money(discount) }}
                  />
                )}
              </span>
              <button type="button" onClick={coupon.remove}>
                <T k="cart.coupon.remove" />
              </button>
            </div>
          ) : (
            <form
              className="cart-coupon-row"
              onSubmit={(event) => {
                event.preventDefault();
                if (codeInput.trim()) coupon.apply(codeInput);
              }}
            >
              <input
                value={codeInput}
                onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
                placeholder={couponHint}
                aria-label={couponHint}
                autoCapitalize="characters"
                autoComplete="off"
                maxLength={40}
              />
              <button type="submit" disabled={!codeInput.trim() || coupon.busy}>
                <T k="cart.coupon.apply" />
              </button>
            </form>
          )}

          {coupon.error && (
            <p className="form-error" role="alert">
              {coupon.error}
            </p>
          )}

          {!coupon.applied && coupon.welcomeCode && (
            <T k="cart.coupon.welcome" as="p" className="cart-coupon-welcome" vars={{ code: coupon.welcomeCode }} />
          )}
        </div>

        <div className="cart-summary-row">
          <span>
            <T k="cart.subtotal" />
          </span>
          <strong>{money(subtotal)}</strong>
        </div>

        {discount > 0 && (
          <div className="cart-summary-row cart-summary-discount">
            <span>{coupon.applied.code}</span>
            <strong>− {money(discount)}</strong>
          </div>
        )}

        <div className="cart-summary-row">
          <span>
            <T k="cart.shipping" />
          </span>
          <strong>{shippingValue}</strong>
        </div>

        <div className="cart-summary-total">
          <span>
            <T k="cart.total" />
          </span>
          <strong>{money(shownTotal)}</strong>
        </div>

        <T k="cart.shippingNote" as="p" className="shipping-note" />

        {gap > 0 && !barOn && (
          <p className="free-shipping-note">
            <T k="cart.freeGap" vars={{ amount: money(gap) }} />
          </p>
        )}

        {belowMinimum && (
          <p className="cart-warning" role="alert">
            <T k="cart.minOrder" vars={{ amount: money(minOrder) }} />
          </p>
        )}

        {hasUnavailable && (
          <p className="cart-warning" role="alert">
            <T k="cart.soldout" />
          </p>
        )}

        <Link
          to="/checkout"
          className={`cart-luxury-button${blocked && !content.isEditing ? " is-disabled" : ""}`}
          aria-disabled={blocked}
          onClick={(event) => {
            if (blocked) event.preventDefault();
          }}
        >
          <T k="cart.checkout" />
          <span className="star-accent">&#10022;</span>
        </Link>

        <Link to="/shop" className="cart-continue-shopping">
          <T k="cart.continue" />
        </Link>
      </section>

      <section className="cart-final-note">
        <div className="cart-final-pearl">
          <span className="star-accent">&#10022;</span>
        </div>

        <T k="cart.note" as="p" />

        <strong>{storeName}</strong>

        <span className="star-accent">&#10022;</span>
      </section>
    </main>
  );
}
