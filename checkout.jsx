import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import "./styles.css";

const cartData = JSON.parse(localStorage.getItem("pearlskino-cart") || "[]");
const money = (n) => `৳${n.toLocaleString("en-BD")}`;

function Background() {
  const sparkles = useMemo(
    () =>
      Array.from({ length: 34 }).map((_, i) => ({
        key: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 2 + Math.random() * 4,
        delay: `${(Math.random() * 8).toFixed(2)}s`,
        duration: `${(4 + Math.random() * 6).toFixed(2)}s`,
        op: (0.35 + Math.random() * 0.55).toFixed(2),
      })),
    []
  );
  return (
    <div className="bg-field" aria-hidden="true">
      <div className="aurora">
        <span className="a" />
        <span className="b" />
        <span className="c" />
      </div>
      <div className="sparkle-field">
        {sparkles.map((s) => (
          <span key={s.key} className="sparkle" style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay, animationDuration: s.duration, "--tw-op": s.op }} />
        ))}
      </div>
      <div className="grain" />
    </div>
  );
}

function CheckoutApp() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "Dhaka", postcode: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sub = cartData.reduce((a, i) => a + i.price * i.qty, 0);
  const ship = sub ? (sub >= 2500 ? 0 : 80) : 0;
  const total = sub + ship;

  async function pay(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch("/api/payment/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: form, items: cartData, totals: { subtotal: sub, shipping: ship, total } }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      location.href = d.redirectUrl;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  const fields = ["name", "phone", "email", "address", "city", "postcode"];

  return (
    <main className="checkout-page">
      <Background />
      <div>
        <a href="/" className="btn glass"><ArrowLeft />Back</a>
        <span className="eyebrow">SECURE CHECKOUT</span>
        <h1>Almost yours.</h1>
        <form className="checkout-form" onSubmit={pay}>
          {fields.map((k) => (
            <label key={k}>
              {k}
              <input
                required={k !== "email" && k !== "postcode"}
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </label>
          ))}
          {error && <p>{error}</p>}
          <button className="btn dark wide" disabled={loading}>
            {loading ? "Connecting…" : <>Pay {money(total)} securely <ShieldCheck /></>}
          </button>
        </form>
      </div>
      <aside className="checkout-summary">
        <b>YOUR ORDER</b>
        {cartData.map((i) => (
          <p key={i.id}>{i.name} × {i.qty} <b>{money(i.price * i.qty)}</b></p>
        ))}
        <h3>Total <b>{money(total)}</b></h3>
      </aside>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<CheckoutApp />);
