import React from "react";

export default function Footer() {
  return (
    <footer className="site-footer">

      <div className="footer-brand">

        <a
          href="/"
          className="footer-logo"
          aria-label="PearlSkino BD"
        >
          <img
            src="/logo.png"
            alt="PearlSkino BD"
          />
        </a>

        <p>
          Discover authentic fragrances and skincare essentials,
          beautifully curated for you.
        </p>

      </div>


      <div>

        <h4>Quick Links</h4>

        <a href="/shop">Shop</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        <a href="/faq">FAQ</a>

      </div>


      <div>

        <h4>Order</h4>

        <p>
          COD available in metropolitan areas.
        </p>

        <p>
          Pickup available in selected areas.
        </p>

      </div>


      <div className="footer-bottom">

        © {new Date().getFullYear()} PearlSkino BD.
        All rights reserved.

      </div>

    </footer>
  );
}