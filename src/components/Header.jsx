import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext";

export default function Header() {
  const { storeSettings } = useStore();

  return (
    <header className="site-header">

      <Link
        to="/"
        className="logo"
        aria-label={`${storeSettings.storeName} home`}
      >

        <img
          src="/logo.png"
          alt={storeSettings.storeName}
        />

      </Link>

      <nav className="nav-links">

        <Link to="/">Home</Link>
        <Link to="/shop">Shop</Link>
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/faq">FAQ</Link>

        <Link
          to="/cart"
          className="cart-link"
        >
          Cart
        </Link>

      </nav>

    </header>
  );
}
