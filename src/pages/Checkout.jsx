import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import { money } from "../data/products";
import { useCart } from "../context/CartContext";

const FIELDS = [
  { key: "name", label: "Full name", required: true },
  { key: "phone", label: "Phone number", required: true },
  { key: "email", label: "Email (optional)", required: false, type: "email" },
  { key: "address", label: "Delivery address", required: true },
  { key: "city", label: "City", required: true },
  { key: "postcode", label: "Postcode (optional)", required: false },
];

export default function Checkout() {
  const { cart, subtotal, shipping, total } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "Dhaka", postcode: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!cart.length) {
    return (
      <section className="section empty-state">
        <h4>Your bag is empty.</h4>
        <p>Add something to your bag before checking out.</p>
        <Link className="btn dark" to="/shop">
          Shop the edit
        </Link>
      </section>
    );
  }

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const pay = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/payment/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: form,
          items: cart,
          totals: { subtotal, shipping, total },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment could not be started.");
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <section className="section checkout-page">
      <Link className="back-link" to="/cart">
        <ArrowLeft size={14} /> Back to bag
      </Link>

      <div className="checkout-grid">
        <div>
          <span className="eyebrow">Secure checkout</span>
          <h1>Almost yours.</h1>
          <p className="checkout-lede">
            <Lock size={13} /> Payments are processed securely through SSLCOMMERZ — your card details never touch
            our servers.
          </p>
          <form className="checkout-form" onSubmit={pay}>
            {FIELDS.map((f) => (
              <label key={f.key}>
                {f.label}
                <input
                  type={f.type || "text"}
                  required={f.required}
                  value={form[f.key]}
                  onChange={(e) => update(f.key, e.target.value)}
                />
              </label>
            ))}
            {error && <p className="form-error">{error}</p>}
            <button className="btn dark wide" disabled={loading} type="submit">
              {loading ? "Connecting…" : (
                <>
                  Pay {money(total)} securely <ShieldCheck size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        <aside className="checkout-summary">
          <b>Your order</b>
          {cart.map((i) => (
            <p key={i.id}>
              {i.name} × {i.qty} <b>{money(i.price * i.qty)}</b>
            </p>
          ))}
          <hr />
          <p>
            Subtotal <b>{money(subtotal)}</b>
          </p>
          <p>
            Delivery <b>{shipping ? money(shipping) : "FREE"}</b>
          </p>
          <h3>
            Total <b>{money(total)}</b>
          </h3>
        </aside>
      </div>
    </section>
  );
}
