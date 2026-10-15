import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { useStore } from "../context/StoreContext";
import { useCustomer } from "../context/CustomerContext";
import T from "../content/T";
import SearchBox from "./SearchBox";
import { CartIcon, UserIcon, MenuIcon, CloseIcon } from "./Icons";

const LINKS = [
  ["/", "nav.home", true],
  ["/shop", "nav.shop"],
  ["/about", "nav.about"],
  ["/contact", "nav.contact"],
  ["/faq", "nav.faq"],
];

export default function Header() {
  const { storeSettings, count, openDrawer } = useStore();
  const { account, accountsEnabled } = useCustomer();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const brand = storeSettings?.storeName || "";
  const tagline = storeSettings?.tagline || "";
  const logoUrl = storeSettings?.logoDataUrl || storeSettings?.logoUrl || "/logo.png";

  /* on the cart and checkout pages the button simply goes to the cart */
  const onCartPage = pathname === "/cart" || pathname === "/checkout";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="ps-header">
      <Link to="/" className="ps-header-brand" aria-label={`${brand} home`}>
        {logoUrl && <img src={logoUrl} alt={brand} className="ps-header-logo" />}

        <span className="ps-header-copy">
          <strong className="ps-header-name">{brand}</strong>
          <span className="ps-header-tagline">{tagline}</span>
        </span>
      </Link>

      <nav className={`ps-header-nav${menuOpen ? " open" : ""}`} aria-label="Main menu">
        {LINKS.map(([to, key, end]) => (
          <NavLink key={to} to={to} end={end}>
            <T k={key} />
          </NavLink>
        ))}

        <NavLink to="/track" className="ps-header-extra">
          <T k="nav.track" />
        </NavLink>
      </nav>

      <div className="ps-header-actions">
        <SearchBox />

        {accountsEnabled && (
          <Link
            to="/account"
            className="ps-header-account"
            aria-label={account ? `Account: ${account.name}` : "Account"}
          >
            <UserIcon size={18} />
            <span>{account ? account.name.split(" ")[0] : <T k="nav.account" />}</span>
          </Link>
        )}

        {onCartPage ? (
          <Link to="/cart" className="ps-header-cart">
            <CartIcon size={18} />
            <T k="nav.cart" />
            {count > 0 && <span className="ps-cart-count">{count}</span>}
          </Link>
        ) : (
          <button type="button" className="ps-header-cart" onClick={openDrawer} aria-haspopup="dialog">
            <CartIcon size={18} />
            <T k="nav.cart" />
            {count > 0 && <span className="ps-cart-count">{count}</span>}
          </button>
        )}

        <button
          type="button"
          className="ps-header-burger"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
        </button>
      </div>
    </header>
  );
}
