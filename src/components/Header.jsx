import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext";

export default function Header() {
  const { storeSettings } = useStore();

  const brand = storeSettings?.storeName || "";
  const tagline = storeSettings?.tagline || "";

  return (
    <header className="ps-header">

      <Link
        to="/"
        className="ps-header-brand"
        aria-label={`${brand} home`}
      >
        <img
          src="/logo.png"
          alt={brand}
          className="ps-header-logo"
        />

        <span className="ps-header-copy">
          <strong className="ps-header-name">
            {brand}
          </strong>

          <span className="ps-header-tagline">
            {tagline}
          </span>
        </span>
      </Link>

      <nav className="ps-header-nav">
        <Link to="/">Home</Link>
        <Link to="/shop">Shop</Link>
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/faq">FAQ</Link>

        <Link
          to="/cart"
          className="ps-header-cart"
        >
          Cart
        </Link>
      </nav>

    </header>
  );
}

