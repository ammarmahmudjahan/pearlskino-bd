import React from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, Share2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <Link className="logo" to="/">
            Pearl<span className="logo-accent">Skino</span> <em>BD</em>
          </Link>
          <p>Skincare and fragrance, thoughtfully curated for Bangladesh.</p>
          <div className="footer-social">
            <a href="#" aria-label="Facebook page">
              F
            </a>
            <a href="#" aria-label="Instagram page">
              <Share2 size={15} />
            </a>
          </div>
        </div>
        <div className="footer-links">
          <div>
            <b>Shop</b>
            <Link to="/shop">All products</Link>
            <Link to="/shop?category=fragrance">Fragrance</Link>
            <Link to="/shop?category=serums">Serums &amp; Actives</Link>
            <Link to="/shop?category=suncare">Suncare</Link>
          </div>
          <div>
            <b>Help</b>
            <Link to="/faq">FAQ</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/about">Our story</Link>
          </div>
          <div>
            <b>Get in touch</b>
            <a href="mailto:hello@pearlskino.bd">
              <Mail size={13} /> hello@pearlskino.bd
            </a>
            <a href="tel:+8800000000000">
              <Phone size={13} /> Messenger only
            </a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} PearlSkino BD. All rights reserved.</span>
        <span>Secure checkout via SSLCOMMERZ · Bangladesh</span>
      </div>
    </footer>
  );
}
