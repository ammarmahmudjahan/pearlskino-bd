import React from "react";
import { useStore } from "../context/StoreContext";

export default function Footer() {
  const { storeSettings } = useStore();

  const brand = storeSettings?.storeName || "";
  const tagline = storeSettings?.tagline || "";

  return (
    <footer className="ps-footer">

      <div className="ps-footer-brand">
        <a
          href="/"
          className="ps-footer-brand-link"
          aria-label={`${brand} home`}
        >
          <img
            src="/logo.png"
            alt={brand}
            className="ps-footer-logo"
          />

          <span className="ps-footer-brand-copy">
            <strong>{brand}</strong>
            <span>{tagline}</span>
          </span>
        </a>
      </div>

      <div className="ps-footer-column">
        <h4>Quick Links</h4>
        <a href="/shop">Shop</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        <a href="/faq">FAQ</a>
      </div>

      <div className="ps-footer-column">
        <h4>Order</h4>
        <p>COD available in metropolitan areas.</p>
        <p>Pickup available in selected areas.</p>
      </div>

      <div className="ps-footer-bottom">
        © {new Date().getFullYear()} {brand}. All rights reserved.
      </div>

    </footer>
  );
}

