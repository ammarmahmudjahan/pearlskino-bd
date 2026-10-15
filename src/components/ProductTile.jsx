import { Link } from "react-router-dom";

import { priceInfo, productImage, isSoldOut, urgencyLeft } from "../hooks/useCatalog";
import { money } from "../lib/format";
import { useStore } from "../context/StoreContext";
import { useCustomer } from "../context/CustomerContext";
import { trackEvent } from "../lib/analytics";
import T from "../content/T";
import Img from "./Img";
import { HeartIcon } from "./Icons";

/* the small card used on the home page rails, the "related" rows and the wishlist */
export default function ProductTile({ product, showHeart = true }) {
  const { storeSettings } = useStore();
  const { toggleWishlist, isWishlisted, accountsEnabled } = useCustomer();
  const brand = storeSettings?.storeName || "PearlSkino BD";
  const image = productImage(product);
  const price = priceInfo(product);
  const soldOut = isSoldOut(product);
  const wished = isWishlisted(product.id);
  const left = urgencyLeft(product, storeSettings);

  function onHeart() {
    const result = toggleWishlist(product.id);

    if (result === "added") {
      trackEvent("add_to_wishlist", {
        value: price.min,
        items: [{ id: product.id, name: product.name, price: price.min, qty: 1 }],
      });
    }
  }

  return (
    <div className={`home-product-card${soldOut ? " is-soldout" : ""}`}>
      <Link to={`/product/${product.id}`} className="home-product-link" aria-label={product.name}>
        <div className="home-product-image">
          {image ? (
            <Img src={image} alt={product.alt || product.name} width="480" height="480" />
          ) : (
            <span>✦</span>
          )}

          {soldOut && (
            <em className="home-product-flag">
              <T k="home.island.soldout" />
            </em>
          )}
          {!soldOut && product.flags?.includes("deal") && <em className="home-product-flag deal">Deal</em>}
          {!soldOut && !product.flags?.includes("deal") && product.flags?.includes("new") && (
            <em className="home-product-flag">New</em>
          )}
          {left > 0 && (
            <em className="home-product-left">
              <T k="shop.urgency" vars={{ count: left }} />
            </em>
          )}
        </div>

        <div className="home-product-info">
          <span>{product.brand || brand}</span>
          <h3>{product.name}</h3>
          <strong>
            {price.range && (
              <>
                <T k="home.island.from" />{" "}
              </>
            )}
            {money(price.min)}
            {product.oldPrice > price.min && !price.range && <s>{money(product.oldPrice)}</s>}
          </strong>
        </div>
      </Link>

      {showHeart && accountsEnabled && (
        <button
          type="button"
          className={`tile-heart${wished ? " on" : ""}`}
          onClick={onHeart}
          aria-pressed={wished}
          aria-label={wished ? "Remove from favourites" : "Save to favourites"}
        >
          <HeartIcon size={16} filled={wished} />
        </button>
      )}
    </div>
  );
}
