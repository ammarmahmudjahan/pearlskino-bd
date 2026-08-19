import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Heart, Menu, Search, ShoppingBag, X } from "lucide-react";
import { NAV_LINKS } from "../data/site";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { count, wishlist, setDrawerOpen } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const submitSearch = (e) => {
    e.preventDefault();
    navigate(`/shop${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    setSearchOpen(false);
    setMobileOpen(false);
  };

  return (
    <header className="header">
      <div className="nav">
        <button className="icon mobile-only" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
          {mobileOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
        <Link className="logo" to="/">
          Pearl<span className="logo-accent">Skino</span> <em>BD</em>
        </Link>
        <nav className="nav-links desktop-only">
          {NAV_LINKS.map((l) => (
            <NavLink key={l.label} to={l.to} className={({ isActive }) => (isActive ? "active" : "")}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="actions">
          <button className="icon" onClick={() => setSearchOpen((v) => !v)} aria-label="Search">
            <Search size={18} />
          </button>
          <Link className="icon desktop-only" to="/shop" aria-label="Wishlist" title="Wishlist">
            <Heart size={18} />
            {wishlist.length > 0 && <i className="dot" />}
          </Link>
          <button className="bag" onClick={() => setDrawerOpen(true)} aria-label="Cart">
            <ShoppingBag size={17} />
            <b>{count}</b>
          </button>
        </div>
      </div>

      {searchOpen && (
        <form className="mobile-search" onSubmit={submitSearch}>
          <Search size={16} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search PearlSkino BD…" />
        </form>
      )}

      {mobileOpen && (
        <nav className="mobile-menu-panel">
          {NAV_LINKS.map((l) => (
            <Link key={l.label} to={l.to} onClick={() => setMobileOpen(false)}>
              {l.label}
            </Link>
          ))}
          <Link to="/faq" onClick={() => setMobileOpen(false)}>
            FAQ
          </Link>
        </nav>
      )}
    </header>
  );
}
