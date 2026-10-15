import { useStore } from "../context/StoreContext";
import { money } from "../lib/format";
import T from "../content/T";
import Img from "./Img";
import { CartIcon } from "./Icons";

/* the little "Added to your bag" card in the corner */
export default function CartToast() {
  const { cartNotice, closeCartNotice, openDrawer } = useStore();

  if (!cartNotice) return null;

  return (
    <div className="cart-success-popup" role="status" key={cartNotice.stamp}>
      <div className="cart-success-image">
        {cartNotice.image ? (
          <Img src={cartNotice.image} alt="" widths={[120, 200]} sizes="72px" width="72" height="72" />
        ) : (
          <span className="cart-toast-star">
            <CartIcon size={22} />
          </span>
        )}
      </div>

      <div className="cart-success-content">
        <p className="cart-success-eyebrow">
          <T k="toast.title" as="span" />
        </p>
        <h3>{cartNotice.name}</h3>
        <p>
          {cartNotice.variantLabel ? `${cartNotice.variantLabel} · ` : ""}
          {money(cartNotice.price)}
        </p>

        <div className="cart-success-actions">
          <button
            type="button"
            className="popup-cart-button"
            onClick={() => {
              closeCartNotice();
              openDrawer();
            }}
          >
            <T k="toast.view" />
          </button>
          <button type="button" className="popup-continue-button" onClick={closeCartNotice}>
            <T k="toast.continue" />
          </button>
        </div>
      </div>
    </div>
  );
}
