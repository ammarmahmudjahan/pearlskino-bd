import { Link } from "react-router-dom";

import { useStore } from "../context/StoreContext";
import { useCustomer } from "../context/CustomerContext";
import T from "../content/T";
import {
  FacebookIcon,
  InstagramIcon,
  TiktokIcon,
  YoutubeIcon,
  WhatsappIcon,
  MessengerIcon,
} from "./Icons";

export default function Footer() {
  const { storeSettings } = useStore();
  const { accountsEnabled } = useCustomer();

  const brand = storeSettings?.storeName || "";
  const tagline = storeSettings?.tagline || "";
  const logoUrl = storeSettings?.logoDataUrl || storeSettings?.logoUrl || "/logo.png";

  const whatsappLink =
    storeSettings.whatsappEnabled && storeSettings.whatsappUrl ? storeSettings.whatsappUrl : "";
  const messengerLink =
    storeSettings.messengerEnabled !== false && storeSettings.messengerUrl
      ? storeSettings.messengerUrl
      : "";

  const social = [
    [storeSettings.facebookUrl, "Facebook", FacebookIcon],
    [storeSettings.instagramUrl, "Instagram", InstagramIcon],
    [storeSettings.tiktokUrl, "TikTok", TiktokIcon],
    [storeSettings.youtubeUrl, "YouTube", YoutubeIcon],
    [whatsappLink, "WhatsApp", WhatsappIcon],
    [messengerLink, "Messenger", MessengerIcon],
  ].filter(([url]) => Boolean(url));

  return (
    <footer className="ps-footer">
      <div className="ps-footer-brand">
        <Link to="/" className="ps-footer-brand-link" aria-label={`${brand} home`}>
          {logoUrl && <img src={logoUrl} alt={brand} className="ps-footer-logo" />}

          <span className="ps-footer-brand-copy">
            <strong>{brand}</strong>
            <span>{tagline}</span>
          </span>
        </Link>

        {social.length > 0 && (
          <div className="ps-footer-social">
            {social.map(([url, label, Icon]) => (
              <a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
                <Icon size={18} />
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="ps-footer-column">
        <h4>
          <T k="footer.links" />
        </h4>
        <Link to="/shop">
          <T k="nav.shop" />
        </Link>
        <Link to="/about">
          <T k="nav.about" />
        </Link>
        <Link to="/contact">
          <T k="nav.contact" />
        </Link>
        <Link to="/faq">
          <T k="nav.faq" />
        </Link>
        <Link to="/track">
          <T k="nav.track" />
        </Link>
        {accountsEnabled && (
          <Link to="/account">
            <T k="nav.account" />
          </Link>
        )}
      </div>

      <div className="ps-footer-column">
        <h4>
          <T k="footer.order" />
        </h4>
        <p>
          <T k="footer.line1" />
        </p>
        <p>
          <T k="footer.line2" />
        </p>

        {(storeSettings.phone || storeSettings.email) && (
          <>
            <h4 className="ps-footer-sub">
              <T k="footer.connect" />
            </h4>
            {storeSettings.phone && <a href={`tel:${storeSettings.phone}`}>{storeSettings.phone}</a>}
            {storeSettings.email && <a href={`mailto:${storeSettings.email}`}>{storeSettings.email}</a>}
          </>
        )}
      </div>

      <div className="ps-footer-bottom">
        <T k="footer.rights" />
      </div>
    </footer>
  );
}
