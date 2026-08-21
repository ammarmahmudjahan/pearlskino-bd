import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="site-header">

      <Link to="/" className="logo" aria-label="PearlSkino BD home">

        <img
          src="/logo.png"
          alt="PearlSkino BD"
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