import { useState } from "react";

import { apiPost } from "../lib/api";
import { useCustomer } from "../context/CustomerContext";
import T, { useText } from "../content/T";
import { BellIcon } from "./Icons";

/*
 * "Tell me when it's back" for a sold-out product (or sold-out option).
 * The shop owner sees these requests in Admin > Inventory > Stock alerts
 * and the customer is told by WhatsApp / email when the stock returns.
 */
export default function NotifyForm({ product, variant }) {
  const { account } = useCustomer();
  const [name, setName] = useState(account?.name || "");
  const [contact, setContact] = useState(account?.phone || account?.email || "");
  const [trap, setTrap] = useState("");
  const [state, setState] = useState({ busy: false, error: "", done: "" });
  const nameHint = useText("product.notify.name");
  const contactHint = useText("product.notify.contact");

  async function send(event) {
    event.preventDefault();

    const text = contact.trim();
    if (!text) {
      setState({ busy: false, error: contactHint, done: "" });
      return;
    }

    setState({ busy: true, error: "", done: "" });

    try {
      const result = await apiPost({
        action: "stockNotify",
        productId: product.id,
        variantId: variant ? variant.id : "",
        name,
        phone: text.includes("@") ? "" : text,
        email: text.includes("@") ? text : "",
        hp: trap,
      });

      setState({ busy: false, error: "", done: result.inStock ? "instock" : "saved" });
    } catch (error) {
      setState({ busy: false, error: error?.message || "Could not save your request.", done: "" });
    }
  }

  return (
    <div className="notify-box">
      <div className="notify-head">
        <BellIcon size={20} />
        <T k="product.notify.title" as="h3" />
      </div>

      {state.done ? (
        <p className="form-success" role="status">
          <T k={state.done === "instock" ? "product.notify.instock" : "product.notify.done"} />
        </p>
      ) : (
        <form onSubmit={send}>
          <T k="product.notify.text" as="p" className="notify-text" />

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={nameHint}
            aria-label={nameHint}
            maxLength={80}
            autoComplete="name"
          />
          <input
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder={contactHint}
            aria-label={contactHint}
            maxLength={120}
            autoComplete="tel"
            inputMode="text"
            required
          />

          <input
            className="hp-field"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={trap}
            onChange={(event) => setTrap(event.target.value)}
          />

          {state.error && (
            <p className="form-error" role="alert">
              {state.error}
            </p>
          )}

          <button type="submit" className="hero-button" disabled={state.busy}>
            <T k="product.notify.button" />
          </button>
        </form>
      )}
    </div>
  );
}
