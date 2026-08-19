import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { money } from "../data/products";
import { useCart } from "../context/CartContext";

export default function CartDrawer() {
  const { cart, drawerOpen, setDrawerOpen, changeQty, subtotal, shipping, total } = useCart();

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            className="backdrop"
            onClick={() => setDrawerOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            className="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 330, damping: 34 }}
          >
            <div className="drawerhead">
              <div>
                <span className="eyebrow">Your bag</span>
                <h3>{cart.length} item{cart.length !== 1 ? "s" : ""}</h3>
              </div>
              <button onClick={() => setDrawerOpen(false)} aria-label="Close cart">
                <X size={16} />
              </button>
            </div>
            {!cart.length ? (
              <div className="empty">
                <ShoppingBag size={30} />
                <h4>Your bag is waiting.</h4>
                <Link className="btn dark" to="/shop" onClick={() => setDrawerOpen(false)}>
                  Start shopping
                </Link>
              </div>
            ) : (
              <>
                <div className="items">
                  {cart.map((i) => (
                    <div key={i.id} className="item">
                      <img src={i.image} alt={i.name} />
                      <div>
                        <b>{i.name}</b>
                        <small>{i.subtitle}</small>
                        <strong>{money(i.price)}</strong>
                        <div className="qty">
                          <button onClick={() => changeQty(i.id, -1)} aria-label="Decrease quantity">
                            <Minus size={12} />
                          </button>
                          {i.qty}
                          <button onClick={() => changeQty(i.id, 1)} aria-label="Increase quantity">
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="summary">
                  <p>
                    Subtotal <b>{money(subtotal)}</b>
                  </p>
                  <p>
                    Delivery <b>{shipping ? money(shipping) : "FREE"}</b>
                  </p>
                  <h4>
                    Total <b>{money(total)}</b>
                  </h4>
                  <Link className="checkout" to="/checkout" onClick={() => setDrawerOpen(false)}>
                    Proceed to secure checkout <ArrowRight size={15} />
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
