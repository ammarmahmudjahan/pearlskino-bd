import React from "react";
import { Link } from "react-router-dom";

export default function Checkout() {
  return (
    <main className="page">
      <section className="checkout-page">
        <div className="page-hero compact">
          <span className="eyebrow">PEARLSKINO BD</span>
          <h1>Complete your <em>order.</em></h1>
        </div>

        <form className="checkout-form">
          <label>
            Full Name
            <input
              type="text"
              name="name"
              placeholder="Your name"
            />
          </label>

          <label>
            Phone Number
            <input
              type="tel"
              name="phone"
              placeholder="01XXXXXXXXX"
            />
          </label>

          <label>
            Delivery Address
            <textarea
              name="address"
              placeholder="Your delivery address"
              rows="4"
            />
          </label>

          <label>
            Payment Method
            <select name="payment">
              <option>Cash on Delivery</option>
              <option>Pickup</option>
            </select>
          </label>

          <button type="submit" className="primary-button">
            Place Order
          </button>
        </form>

        <Link to="/shop" className="secondary-button">
          Continue Shopping
        </Link>
      </section>
    </main>
  );
}