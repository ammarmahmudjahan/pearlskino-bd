
import React, { useState } from "react";
import { Link } from "react-router-dom";

import { useStore } from "../context/StoreContext";
import { GOOGLE_FORMS } from "../utils/googleForms";
import { submitToGoogleForm } from "../utils/submitToGoogleForm";

export default function Checkout() {
  const {
    cart,
    count,
    subtotal,
    shipping,
    total,
    storeSettings,
    clearCart,
  } = useStore();

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    area: "",
    payment: "Cash on Delivery",
    delivery: "Home Delivery",
    note: "",
  });

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!cart || cart.length === 0 || submitting) {
      return;
    }

    setSubmitting(true);

    const products = cart
      .map(
        (item) =>
          `${item.name} × ${Number(item.qty || 1)}`
      )
      .join(", ");

    const quantity = cart.reduce(
      (sum, item) =>
        sum + Number(item.qty || 0),
      0
    );
    const costData = cart
      .map((item) => {
        const qty = Number(item.qty || 1);
        const sellingPrice = Number(item.price || 0);
        const buyingPrice = Number(item.costPrice || 0);

        return [
          item.id || "",
          item.name || "",
          qty,
          sellingPrice,
          buyingPrice,
        ].join(" | ");
      })
      .join(" || ");

    try {
      const result = await submitToGoogleForm(
        GOOGLE_FORMS.order.url,
        {
          [GOOGLE_FORMS.order.fields.name]:
            form.name,

          [GOOGLE_FORMS.order.fields.phone]:
            form.phone,

          [GOOGLE_FORMS.order.fields.email]:
            form.email,

          [GOOGLE_FORMS.order.fields.address]:
            form.address,

          [GOOGLE_FORMS.order.fields.area]:
            form.area,

          [GOOGLE_FORMS.order.fields.products]:
            products,

          [GOOGLE_FORMS.order.fields.quantity]:
            quantity,

          [GOOGLE_FORMS.order.fields.total]:
            `৳${Number(total).toLocaleString()}`,

          [GOOGLE_FORMS.order.fields.costData]:
            costData,

          [GOOGLE_FORMS.order.fields.payment]:
            form.payment,

          [GOOGLE_FORMS.order.fields.delivery]:
            form.delivery,

          [GOOGLE_FORMS.order.fields.note]:
            form.note,
        }
      );

      if (result.success) {
        clearCart();
        setSubmitted(true);

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    } catch (error) {
      console.error("Order submission failed:", error);
    } finally {
      setSubmitting(false);
    }
  }

  /* =========================================================
     SUCCESS
  ========================================================= */

  if (submitted) {
    return (
      <main className="checkout-luxury-page">
        <section className="checkout-success-luxury">

          <div className="checkout-success-orbit">
            <span>✦</span>
            <span>✧</span>
            <span>*</span>
          </div>

          <p className="eyebrow">
            PEARLSKINO BD  -  ORDER CONFIRMED
          </p>

          <h1>
            It's officially
            <br />
            <em>yours.</em>
          </h1>

          <div className="checkout-success-pearl">
            ✦
          </div>

          <h2>
            Your order has
            <br />
            <em>been received.</em>
          </h2>

          <p className="checkout-success-copy">
            Thank you for choosing PearlSkino BD.
            We've received your order details and
            will contact you shortly to confirm
            everything before delivery.
          </p>

          <div className="checkout-success-note">
            <span>✦</span>
            <p>
              Carefully packed  -  Beautifully delivered
            </p>
            <span>✦</span>
          </div>

          <Link
            to="/shop"
            className="checkout-luxury-button"
          >
            Continue Exploring
            <span>→</span>
          </Link>

        </section>
      </main>
    );
  }

  /* =========================================================
     EMPTY CART
  ========================================================= */

  if (!cart || cart.length === 0) {
    return (
      <main className="checkout-luxury-page">
        <section className="checkout-empty-luxury">

          <div className="checkout-empty-pearl">
            ✦
          </div>

          <p className="eyebrow">
            PEARLSKINO BD  -  YOUR BAG
          </p>

          <h1>
            Nothing to
            <br />
            <em>complete yet.</em>
          </h1>

          <p>
            Your beauty collection is waiting.
            Explore the shop and choose something
            that feels perfectly yours.
          </p>

          <Link
            to="/shop"
            className="checkout-luxury-button"
          >
            Discover the Collection
            <span>→</span>
          </Link>

        </section>
      </main>
    );
  }

  /* =========================================================
     MAIN CHECKOUT
  ========================================================= */

  return (
    <main className="checkout-luxury-page">

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="checkout-luxury-hero">

        <div className="checkout-hero-orb checkout-orb-one">
          ✦
        </div>

        <div className="checkout-hero-orb checkout-orb-two">
          ✧
        </div>

        <div className="checkout-hero-content">

          <p className="eyebrow">
            PEARLSKINO BD  -  CHECKOUT
          </p>

          <h1>
            Almost
            <br />
            <em>yours.</em>
          </h1>

          <p>
            A few little details,
            <br />
            and we'll take care of the rest.
          </p>

        </div>

        <div className="checkout-hero-count">
          <strong>
            {String(count).padStart(2, "0")}
          </strong>

          <span>
            {count === 1 ? "ITEM" : "ITEMS"}
          </span>
        </div>

      </section>


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <section className="checkout-luxury-layout">

        {/* ===================================================
            CUSTOMER DETAILS
        =================================================== */}

        <div className="checkout-details">

          <div className="checkout-section-heading">

            <span>01</span>

            <div>
              <p className="eyebrow">
                YOUR DETAILS
              </p>

              <h2>
                Tell us where
                <br />
                <em>to find you.</em>
              </h2>
            </div>

          </div>


          <form
            className="checkout-luxury-form"
            onSubmit={handleSubmit}
          >

            {/* NAME */}

            <div className="checkout-field">
              <label htmlFor="checkout-name">
                <span>01</span>
                Full Name
              </label>

              <input
                id="checkout-name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your name"
                autoComplete="name"
                required
              />
            </div>


            {/* PHONE */}

            <div className="checkout-field">
              <label htmlFor="checkout-phone">
                <span>02</span>
                Phone Number
              </label>

              <input
                id="checkout-phone"
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="01XXXXXXXXX"
                autoComplete="tel"
                required
              />
            </div>


            {/* EMAIL */}

            <div className="checkout-field">
              <label htmlFor="checkout-email">
                <span>03</span>
                Email Address
                <small>OPTIONAL</small>
              </label>

              <input
                id="checkout-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>


            {/* ADDRESS */}

            <div className="checkout-field">
              <label htmlFor="checkout-address">
                <span>04</span>
                Delivery Address
              </label>

              <textarea
                id="checkout-address"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="House, road, building or landmark..."
                rows="4"
                autoComplete="street-address"
                required
              />
            </div>


            {/* AREA */}

            <div className="checkout-field">
              <label htmlFor="checkout-area">
                <span>05</span>
                Area
              </label>

              <input
                id="checkout-area"
                type="text"
                name="area"
                value={form.area}
                onChange={handleChange}
                placeholder="e.g. GEC, Chattogram"
                autoComplete="address-level2"
                required
              />
            </div>


            {/* PAYMENT + DELIVERY */}

            <div className="checkout-options">

              <div className="checkout-field">
                <label htmlFor="checkout-payment">
                  <span>06</span>
                  Payment
                </label>

                <select
                  id="checkout-payment"
                  name="payment"
                  value={form.payment}
                  onChange={handleChange}
                >
                  {storeSettings.codEnabled && (
                    <option value="Cash on Delivery">
                      Cash on Delivery
                    </option>
                  )}

                  {storeSettings.pickupEnabled && (
                    <option value="Pickup">
                      Pickup
                    </option>
                  )}
                </select>
              </div>


              <div className="checkout-field">
                <label htmlFor="checkout-delivery">
                  <span>07</span>
                  Delivery
                </label>

                <select
                  id="checkout-delivery"
                  name="delivery"
                  value={form.delivery}
                  onChange={handleChange}
                >
                  <option value="Home Delivery">
                    Home Delivery
                  </option>

                  {storeSettings.pickupEnabled && (
                    <option value="Pickup">
                      Pickup
                    </option>
                  )}
                </select>
              </div>

            </div>


            {/* NOTE */}

            <div className="checkout-field">
              <label htmlFor="checkout-note">
                <span>08</span>
                A Little Note
                <small>OPTIONAL</small>
              </label>

              <textarea
                id="checkout-note"
                name="note"
                value={form.note}
                onChange={handleChange}
                placeholder="Anything you'd like us to know?"
                rows="3"
              />
            </div>


            {/* SUBMIT */}

            <button
              type="submit"
              className="checkout-place-order"
              disabled={submitting}
            >
              <span className="checkout-place-order-label">
                {submitting
                  ? "Sending your order..."
                  : "Place My Order"}
              </span>

              <span className="checkout-place-order-price">
                ৳{Number(total).toLocaleString()}
              </span>

              <span className="checkout-place-order-arrow">
                →
              </span>
            </button>

            <p className="checkout-submit-note">
              By placing your order, you confirm that
              the information provided is correct.
            </p>

          </form>

        </div>


        {/* ===================================================
            ORDER SUMMARY
        =================================================== */}

        <aside className="checkout-order-card">

          <div className="checkout-card-glow"></div>

          <div className="checkout-card-top">

            <div>
              <p className="eyebrow">
                02  -  YOUR COLLECTION
              </p>

              <h2>
                A little
                <br />
                <em>beauty.</em>
              </h2>
            </div>

            <span className="checkout-card-symbol">
              ✦
            </span>

          </div>


          {/* PRODUCTS */}

          <div className="checkout-products">

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
                <div
                  className="checkout-product-luxury"
                  key={item.id}
                >

                  <div className="checkout-product-image">

                    {image ? (
                      <img
                        src={image}
                        alt={item.name}
                      />
                    ) : (
                      <span>✦</span>
                    )}

                    <small>
                      ×{quantity}
                    </small>

                  </div>


                  <div className="checkout-product-info">

                    <p>
                      {item.brand ||
                        "PEARLSKINO BD"}
                    </p>

                    <h3>
                      {item.name}
                    </h3>

                    <span>
                      {item.category ||
                        "Beauty Essential"}
                    </span>

                  </div>


                  <strong>
                    ৳{itemTotal.toLocaleString()}
                  </strong>

                </div>
              );
            })}

          </div>


          {/* PRICE */}

          <div className="checkout-price-summary">

            <div>
              <span>Subtotal</span>

              <strong>
                ৳{Number(
                  subtotal
                ).toLocaleString()}
              </strong>
            </div>

            <div>
              <span>Delivery</span>

              <strong
                className={
                  shipping === 0
                    ? "checkout-free"
                    : ""
                }
              >
                {shipping === 0
                  ? "Complimentary"
                  : `৳${shipping}`}
              </strong>
            </div>

          </div>


          {/* GRAND TOTAL */}

          <div className="checkout-grand-total">

            <div>
              <span>TOTAL</span>
              <p>Your order</p>
            </div>

            <strong>
              ৳{Number(
                total
              ).toLocaleString()}
            </strong>

          </div>


          {/* DELIVERY NOTE */}

          <div
            className={
              shipping === 0
                ? "checkout-free-note"
                : "checkout-delivery-note"
            }
          >

            <span>
              {shipping === 0 ? "✦" : "✧"}
            </span>

            <p>
              {shipping === 0
                ? "Your order qualifies for complimentary delivery."
                : "Delivery is calculated based on your order location."}
            </p>

          </div>


          {/* TRUST */}

          <div className="checkout-trust">

            <span>✦</span>

            <p>
              Carefully packed
              <br />
              Beautifully delivered
            </p>

            <span>✦</span>

          </div>

        </aside>

      </section>


      {/* =====================================================
          BOTTOM
      ===================================================== */}

      <section className="checkout-bottom">

        <Link
          to="/cart"
          className="checkout-back"
        >
          <span>&larr;</span>
          Back to your collection
        </Link>

        <p>
          PearlSkino BD  -  Beauty, thoughtfully selected.
        </p>

      </section>

    </main>
  );
}








