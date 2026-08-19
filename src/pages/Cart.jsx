import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { money } from "../data/products";
import { useCart } from "../context/CartContext";
import SectionHeading from "../components/SectionHeading";

export default function Cart() {
  const { cart, changeQty, removeFromCart, subtotal, shipping, total } = useCart();

  if (!cart.length) {
    return (
      <section className="section empty-state">
        <ShoppingBag size={34} />
        <h4>Your bag is empty.</h4>
        <p>Browse the edit and find something worth carrying home.</p>
        <Link className="btn dark" to="/shop">
          Shop the edit <ArrowRight size={15} />
        </Link>
      </section>
    );
  }

  return (
    <section className="section cart-page">
      <SectionHeading eyebrow="Your bag" title="Review your order." />
      <div className="cart-page-grid">
        <div className="cart-page-items">
          {cart.map((i) => (
            <div key={i.id} className="cart-row">
              <img src={i.image} alt={i.name} />
              <div className="cart-row-info">
                <b>{i.name}</b>
                <small>{i.subtitle}</small>
                <strong>{money(i.price)}</strong>
              </div>
              <div className="qty">
                <button onClick={() => changeQty(i.id, -1)} aria-label="Decrease quantity">
                  <Minus size={13} />
                </button>
                {i.qty}
                <button onClick={() => changeQty(i.id, 1)} aria-label="Increase quantity">
                  <Plus size={13} />
                </button>
              </div>
              <strong className="cart-row-total">{money(i.price * i.qty)}</strong>
              <button className="cart-remove" onClick={() => removeFromCart(i.id)} aria-label="Remove item">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <aside className="cart-page-summary">
          <h3>Order summary</h3>
          <p>
            Subtotal <b>{money(subtotal)}</b>
          </p>
          <p>
            Delivery <b>{shipping ? money(shipping) : "FREE"}</b>
          </p>
          {shipping > 0 && <small className="ship-hint">Add {money(2500 - subtotal)} more for free delivery.</small>}
          <h4>
            Total <b>{money(total)}</b>
          </h4>
          <Link className="checkout" to="/checkout">
            Proceed to secure checkout <ArrowRight size={15} />
          </Link>
          <Link className="btn glass wide" to="/shop" style={{ marginTop: 10 }}>
            Continue shopping
          </Link>
        </aside>
      </div>
    </section>
  );
}
