import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useStore } from "../context/StoreContext";
import { useCustomer } from "../context/CustomerContext";
import { useContent } from "../content/context";
import { useSeo } from "../hooks/useSeo";
import { useCoupon } from "../hooks/useCoupon";
import { apiPost, ApiError } from "../lib/api";
import { markOrdered, clearSavedCoupon } from "../lib/couponStore";
import { deliveryFor, listZones, pickZone } from "../lib/delivery";
import { isBdMobile, money, normalizePhone } from "../lib/format";
import { trackEvent } from "../lib/analytics";
import T, { useText } from "../content/T";
import EditViewSwitch from "../components/EditViewSwitch";
import Img from "../components/Img";
import FreeShipBar from "../components/FreeShipBar";

const LAST_ORDER_KEY = "pearlskino_last_order";

const SAMPLE_ORDER = {
  orderId: "PS-20260101-001",
  token: "",
  total: 1250,
  payment: "Cash on Delivery",
  paymentStatus: "Unpaid",
};

function newClientRef() {
  try {
    return `c_${crypto.randomUUID()}`;
  } catch {
    return `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
}

function readLastOrder() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) || "null");
    if (saved && saved.orderId && Date.now() - Number(saved.at || 0) < 30 * 60 * 1000) return saved;
  } catch {
    /* ignore */
  }
  return null;
}

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function sendOrder(payload) {
  let attempt = 0;

  /* a dropped connection is retried with the SAME reference, so the shop
     can never create the same order twice */
  for (;;) {
    try {
      return await apiPost(payload, { timeout: 35000 });
    } catch (error) {
      const retryable =
        error instanceof ApiError && ["network", "timeout", "http"].includes(error.code);

      if (!retryable || attempt >= 2) throw error;

      attempt += 1;
      await sleep(1500 * attempt);
    }
  }
}

export default function Checkout() {
  const { lines, count, subtotal, storeSettings, clearCart, refresh } = useStore();
  const { account, token, accountsEnabled } = useCustomer();
  const content = useContent();

  useSeo({ page: "checkout", noindex: true });

  const brand = storeSettings?.storeName || "PearlSkino BD";

  const [done, setDone] = useState(() => readLastOrder());
  const [editView, setEditView] = useState("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ name: "", phone: "", email: "", whatsapp: "", address: "", area: "", note: "" });
  const [sameWhatsapp, setSameWhatsapp] = useState(false);
  const [delivery, setDelivery] = useState("Home Delivery");
  const [payment, setPayment] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [bkash, setBkash] = useState({ trxId: "", sender: "" });
  const [trap, setTrap] = useState("");

  const [couponInput, setCouponInput] = useState("");
  const coupon = useCoupon(form.phone);

  const clientRef = useRef(newClientRef());

  const ph = {
    name: useText("checkout.ph.name"),
    phone: useText("checkout.ph.phone"),
    email: useText("checkout.ph.email"),
    whatsapp: useText("checkout.ph.whatsapp"),
    address: useText("checkout.ph.address"),
    area: useText("checkout.ph.area"),
    coupon: useText("checkout.ph.coupon"),
    note: useText("checkout.ph.note"),
  };

  /* <option> children must be plain text */
  const label = {
    home: useText("checkout.opt.home"),
    pickup: useText("checkout.opt.pickup"),
    cod: useText("checkout.opt.cod"),
    payPickup: useText("checkout.opt.payPickup"),
    bkash: useText("checkout.opt.bkash"),
  };

  /* ---------- logged-in customers: fill the form once ---------- */
  const prefilled = useRef("");

  useEffect(() => {
    if (!account || prefilled.current === account.id) return;
    prefilled.current = account.id;

    const first = account.addresses?.[0];

    setForm((current) => ({
      ...current,
      name: current.name || account.name || "",
      phone: current.phone || account.phone || "",
      email: current.email || account.email || "",
      address: current.address || first?.address || "",
      area: current.area || first?.area || "",
    }));

    if (first?.zoneId) setZoneId(first.zoneId);
  }, [account]);

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  /* ---------- delivery + payment choices ---------- */
  const zones = listZones(storeSettings);
  const pickup = delivery === "Pickup";

  const paymentOptions = useMemo(() => {
    const options = [];

    if (pickup) {
      if (storeSettings.pickupEnabled) options.push(["Pickup", label.payPickup]);
    } else if (storeSettings.codEnabled) {
      options.push(["Cash on Delivery", label.cod]);
    }

    if (storeSettings.bkashEnabled && storeSettings.bkashNumber) options.push(["bKash", label.bkash]);

    return options;
  }, [
    pickup,
    storeSettings.pickupEnabled,
    storeSettings.codEnabled,
    storeSettings.bkashEnabled,
    storeSettings.bkashNumber,
    label.payPickup,
    label.cod,
    label.bkash,
  ]);

  useEffect(() => {
    if (!paymentOptions.some(([value]) => value === payment)) {
      setPayment(paymentOptions[0]?.[0] || "");
    }
  }, [paymentOptions, payment]);

  useEffect(() => {
    if (pickup && !storeSettings.pickupEnabled) setDelivery("Home Delivery");
  }, [pickup, storeSettings.pickupEnabled]);

  /* ---------- money ---------- */
  const orderLines = lines.filter((line) => !line.unavailable);
  const hasUnavailable = lines.some((line) => line.unavailable);

  const activeZone = pickZone(storeSettings, zoneId, form.area);
  const quote = deliveryFor(storeSettings, subtotal, delivery, activeZone?.id || "", form.area);
  const discount = coupon.applied ? Math.min(subtotal, coupon.applied.discount) : 0;
  const deliveryCharge = coupon.applied?.freeShipping ? 0 : quote.charge;
  const total = Math.max(0, subtotal - discount) + deliveryCharge;

  /* ---------- coupon ---------- */
  const itemsForServer = orderLines.map((line) => ({ id: line.id, variantId: line.variantId, qty: line.qty }));
  const itemsSignature = JSON.stringify(itemsForServer);

  const lastCart = useRef("");

  /* ---------- left-behind carts (so the shop can follow up on WhatsApp) ---------- */
  useEffect(() => {
    if (storeSettings.abandonedCartsEnabled === false || !orderLines.length || done) return undefined;

    const phone = normalizePhone(form.phone);
    const email = form.email.trim();
    const goodPhone = isBdMobile(phone);
    const goodEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

    if (!goodPhone && !goodEmail) return undefined;

    const snapshot = `${phone}|${email}|${itemsSignature}`;
    if (lastCart.current === snapshot) return undefined;

    const timer = window.setTimeout(() => {
      lastCart.current = snapshot;

      apiPost({
        action: "cartSave",
        name: form.name.trim(),
        phone: goodPhone ? phone : "",
        email: goodEmail ? email : "",
        items: itemsForServer,
        hp: "",
      }).catch(() => {
        lastCart.current = "";
      });
    }, 2500);

    return () => window.clearTimeout(timer);
    // only the contact details and the bag matter here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.phone, form.email, itemsSignature, done]);

  /* ---------- tracking ---------- */
  useEffect(() => {
    if (orderLines.length) {
      trackEvent("begin_checkout", {
        value: subtotal,
        items: orderLines.map((line) => ({ id: line.id, name: line.name, price: line.unitPrice, qty: line.qty })),
      });
    }
    // once per visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- placing the order ---------- */
  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting || !orderLines.length || hasUnavailable) return;

    const phone = normalizePhone(form.phone);
    const whatsapp = sameWhatsapp ? phone : normalizePhone(form.whatsapp);

    if (!form.name.trim() || form.name.trim().length < 2) return setError("Please enter your full name.");
    if (!isBdMobile(phone)) return setError("Please enter a valid mobile number, like 01XXXXXXXXX.");
    if (whatsapp && !isBdMobile(whatsapp)) return setError("The WhatsApp number does not look right. Fix it or leave it empty.");
    if (!pickup && form.address.trim().length < 5) return setError("Please enter your delivery address.");
    if (!payment) return setError("Please choose how you would like to pay.");
    if (payment === "bKash" && !/^[A-Za-z0-9]{6,40}$/.test(bkash.trxId.trim())) {
      return setError("Please enter the bKash transaction ID (letters and numbers only).");
    }

    setError("");
    setSubmitting(true);

    try {
      const result = await sendOrder({
        action: "placeOrder",
        clientRef: clientRef.current,
        customerToken: token || undefined,
        hp: trap,
        customer: {
          name: form.name.trim(),
          phone,
          email: form.email.trim(),
          whatsapp,
          address: form.address.trim(),
          area: form.area.trim(),
        },
        delivery,
        payment,
        payRef: payment === "bKash" ? { trxId: bkash.trxId.trim(), sender: normalizePhone(bkash.sender) } : undefined,
        zoneId: pickup ? "" : activeZone?.id || "",
        coupon: coupon.applied?.code || "",
        note: form.note.trim(),
        items: itemsForServer,
      });

      const summary = {
        orderId: result.orderId,
        token: result.token,
        total: result.total,
        payment: result.payment,
        paymentStatus: result.paymentStatus,
        at: Date.now(),
      };

      try {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(summary));
      } catch {
        /* ignore */
      }

      trackEvent("purchase", {
        orderId: result.orderId,
        value: result.total,
        items: orderLines.map((line) => ({ id: line.id, name: line.name, price: line.unitPrice, qty: line.qty })),
      });

      clientRef.current = newClientRef();
      markOrdered();
      clearSavedCoupon();
      clearCart();
      setDone(summary);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (problem) {
      setError(problem?.message || "We could not place your order. Please try again.");

      /* stock changed or an item vanished: bring the bag up to date */
      if (problem instanceof ApiError && ["stock", "maintenance"].includes(problem.code)) refresh(true);
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- which screen ---------- */
  const editing = content.isEditing;
  const screen = editing
    ? editView
    : done && lines.length === 0
      ? "success"
      : lines.length === 0
        ? "empty"
        : "form";

  const switcher = (
    <EditViewSwitch
      views={[
        ["form", "Order form"],
        ["success", "Thank-you page"],
        ["empty", "Empty bag"],
      ]}
      value={editView}
      onChange={setEditView}
    />
  );

  if (screen === "success") {
    const order = (editing ? SAMPLE_ORDER : done) || SAMPLE_ORDER;

    return (
      <main className="checkout-luxury-page">
        {switcher}

        <section className="checkout-success-luxury">
          <div className="checkout-success-orbit">
            <span>✦</span>
            <span>✧</span>
            <span>*</span>
          </div>

          <T k="checkout.ok.eyebrow" as="p" className="eyebrow" />

          <T k="checkout.ok.title" as="h1" />

          <div className="checkout-success-pearl">✦</div>

          <T k="checkout.ok.subtitle" as="h2" />

          <T k="checkout.ok.copy" as="p" className="checkout-success-copy" />

          <div className="checkout-success-order">
            <div>
              <small>
                <T k="checkout.ok.orderId" />
              </small>
              <strong>{order.orderId}</strong>
            </div>
            <div>
              <small>
                <T k="checkout.ok.total" />
              </small>
              <strong>{money(order.total)}</strong>
            </div>
          </div>

          {order.payment === "bKash" && <T k="checkout.ok.bkash" as="p" className="checkout-success-copy" />}

          <div className="checkout-success-note">
            <span>✦</span>
            <T k="checkout.ok.note" as="p" />
            <span>✦</span>
          </div>

          <div className="checkout-success-actions">
            <Link
              to={`/track?order=${encodeURIComponent(order.orderId)}${order.token ? `&token=${encodeURIComponent(order.token)}` : ""}`}
              className="checkout-luxury-button"
            >
              <T k="checkout.ok.track" />
              <span>→</span>
            </Link>

            <Link to="/shop" className="checkout-luxury-button secondary">
              <T k="checkout.ok.button" />
              <span>→</span>
            </Link>
          </div>

          {accountsEnabled && !account && (
            <p className="checkout-success-account">
              <T k="checkout.ok.account" />{" "}
              <Link to="/account?mode=register">
                <T k="checkout.ok.accountLink" />
              </Link>
            </p>
          )}
        </section>
      </main>
    );
  }

  if (screen === "empty") {
    return (
      <main className="checkout-luxury-page">
        {switcher}

        <section className="checkout-empty-luxury">
          <div className="checkout-empty-pearl">✦</div>

          <T k="checkout.empty.eyebrow" as="p" className="eyebrow" />

          <T k="checkout.empty.title" as="h1" />

          <T k="checkout.empty.text" as="p" />

          <Link to="/shop" className="checkout-luxury-button">
            <T k="checkout.empty.button" />
            <span>→</span>
          </Link>
        </section>
      </main>
    );
  }

  let step = 0;
  const number = () => String(++step).padStart(2, "0");
  const free = deliveryCharge === 0;

  return (
    <main className="checkout-luxury-page">
      {switcher}

      <section className="checkout-luxury-hero">
        <div className="checkout-hero-orb checkout-orb-one">✦</div>
        <div className="checkout-hero-orb checkout-orb-two">✧</div>

        <div className="checkout-hero-content">
          <T k="checkout.eyebrow" as="p" className="eyebrow" />

          <T k="checkout.hero.title" as="h1" />

          <T k="checkout.hero.text" as="p" />
        </div>

        <div className="checkout-hero-count">
          <strong>{String(count).padStart(2, "0")}</strong>

          <span>
            <T k={count === 1 ? "checkout.item" : "checkout.items"} />
          </span>
        </div>
      </section>

      <section className="checkout-luxury-layout">
        {/* ===================== customer details ===================== */}
        <div className="checkout-details">
          <div className="checkout-section-heading">
            <span>01</span>

            <div>
              <T k="checkout.details.eyebrow" as="p" className="eyebrow" />

              <T k="checkout.details.title" as="h2" />
            </div>
          </div>

          {accountsEnabled && !account && (
            <p className="checkout-login-hint">
              <T k="checkout.login.text" />{" "}
              <Link to="/account?next=/checkout">
                <T k="checkout.login.link" />
              </Link>
            </p>
          )}

          {account?.addresses?.length > 1 && (
            <div className="checkout-field">
              <label htmlFor="checkout-saved">
                <T k="checkout.saved" />
              </label>
              <select
                id="checkout-saved"
                defaultValue=""
                onChange={(event) => {
                  const chosen = account.addresses[Number(event.target.value)];
                  if (!chosen) return;
                  setForm((current) => ({ ...current, address: chosen.address, area: chosen.area || current.area }));
                  if (chosen.zoneId) setZoneId(chosen.zoneId);
                }}
              >
                <option value="">—</option>
                {account.addresses.map((address, index) => (
                  <option key={index} value={index}>
                    {address.label}: {address.address.slice(0, 40)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <form className="checkout-luxury-form" onSubmit={handleSubmit} noValidate>
            <div className="checkout-field">
              <label htmlFor="checkout-name">
                <span>{number()}</span>
                <T k="checkout.f.name" />
              </label>
              <input
                id="checkout-name"
                type="text"
                name="name"
                value={form.name}
                onChange={change}
                placeholder={ph.name}
                autoComplete="name"
                required
              />
            </div>

            <div className="checkout-field">
              <label htmlFor="checkout-phone">
                <span>{number()}</span>
                <T k="checkout.f.phone" />
              </label>
              <input
                id="checkout-phone"
                type="tel"
                name="phone"
                value={form.phone}
                onChange={change}
                placeholder={ph.phone}
                autoComplete="tel"
                inputMode="tel"
                required
              />
            </div>

            <div className="checkout-field">
              <label htmlFor="checkout-whatsapp">
                <span>{number()}</span>
                <T k="checkout.f.whatsapp" />
                <small>
                  <T k="checkout.optional" />
                </small>
              </label>
              <input
                id="checkout-whatsapp"
                type="tel"
                name="whatsapp"
                value={sameWhatsapp ? form.phone : form.whatsapp}
                onChange={change}
                placeholder={ph.whatsapp}
                inputMode="tel"
                disabled={sameWhatsapp}
              />
              <label className="checkout-check">
                <input
                  type="checkbox"
                  checked={sameWhatsapp}
                  onChange={(event) => setSameWhatsapp(event.target.checked)}
                />
                <T k="checkout.whatsapp.same" />
              </label>
              <T k="checkout.whatsapp.hint" as="p" className="checkout-hint" />
            </div>

            <div className="checkout-field">
              <label htmlFor="checkout-email">
                <span>{number()}</span>
                <T k="checkout.f.email" />
                <small>
                  <T k="checkout.optional" />
                </small>
              </label>
              <input
                id="checkout-email"
                type="email"
                name="email"
                value={form.email}
                onChange={change}
                placeholder={ph.email}
                autoComplete="email"
              />
            </div>

            <div className="checkout-options">
              <div className="checkout-field">
                <label htmlFor="checkout-delivery">
                  <span>{number()}</span>
                  <T k="checkout.f.delivery" />
                </label>
                <select id="checkout-delivery" value={delivery} onChange={(event) => setDelivery(event.target.value)}>
                  <option value="Home Delivery">{label.home}</option>
                  {storeSettings.pickupEnabled && <option value="Pickup">{label.pickup}</option>}
                </select>
              </div>

              <div className="checkout-field">
                <label htmlFor="checkout-payment">
                  <span>{number()}</span>
                  <T k="checkout.f.payment" />
                </label>
                <select id="checkout-payment" value={payment} onChange={(event) => setPayment(event.target.value)}>
                  {paymentOptions.map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {paymentOptions.length === 0 && <T k="checkout.opt.none" as="p" className="checkout-error" />}

            {payment === "bKash" && (
              <div className="checkout-bkash">
                <T k="checkout.bkash.title" as="h3" />

                <T
                  k="checkout.bkash.send"
                  as="p"
                  vars={{
                    amount: money(total),
                    number: storeSettings.bkashNumber,
                    type: storeSettings.bkashType || "Personal",
                  }}
                />

                {storeSettings.bkashInstructions && <p className="checkout-hint">{storeSettings.bkashInstructions}</p>}

                <div className="checkout-field">
                  <label htmlFor="checkout-trx">
                    <T k="checkout.bkash.trx" />
                  </label>
                  <input
                    id="checkout-trx"
                    value={bkash.trxId}
                    onChange={(event) => setBkash({ ...bkash, trxId: event.target.value })}
                    autoComplete="off"
                    maxLength={40}
                  />
                </div>

                <div className="checkout-field">
                  <label htmlFor="checkout-sender">
                    <T k="checkout.bkash.sender" />
                    <small>
                      <T k="checkout.optional" />
                    </small>
                  </label>
                  <input
                    id="checkout-sender"
                    type="tel"
                    inputMode="tel"
                    value={bkash.sender}
                    onChange={(event) => setBkash({ ...bkash, sender: event.target.value })}
                  />
                </div>

                <T k="checkout.bkash.verify" as="p" className="checkout-hint" />
              </div>
            )}

            <div className="checkout-field">
              <label htmlFor="checkout-address">
                <span>{number()}</span>
                <T k="checkout.f.address" />
                {pickup && (
                  <small>
                    <T k="checkout.optional" />
                  </small>
                )}
              </label>
              <textarea
                id="checkout-address"
                name="address"
                value={form.address}
                onChange={change}
                placeholder={ph.address}
                rows="4"
                autoComplete="street-address"
                required={!pickup}
              />
            </div>

            <div className="checkout-field">
              <label htmlFor="checkout-area">
                <span>{number()}</span>
                <T k="checkout.f.area" />
              </label>
              <input
                id="checkout-area"
                type="text"
                name="area"
                value={form.area}
                onChange={change}
                placeholder={ph.area}
                autoComplete="address-level2"
              />
            </div>

            {zones.length > 0 && !pickup && (
              <div className="checkout-field">
                <label htmlFor="checkout-zone">
                  <span>{number()}</span>
                  <T k="checkout.f.zone" />
                </label>
                <select
                  id="checkout-zone"
                  value={activeZone?.id || ""}
                  onChange={(event) => setZoneId(event.target.value)}
                >
                  {zones.map((zone) => {
                    const charge = deliveryFor(storeSettings, subtotal, "Home Delivery", zone.id, "").charge;
                    return (
                      <option key={zone.id} value={zone.id}>
                        {zone.name} — {charge === 0 ? "Free" : money(charge)}
                      </option>
                    );
                  })}
                </select>
                {activeZone?.note && <p className="checkout-hint">{activeZone.note}</p>}
              </div>
            )}

            <div className="checkout-field checkout-coupon">
              <label htmlFor="checkout-coupon">
                <span>{number()}</span>
                <T k="checkout.f.coupon" />
                <small>
                  <T k="checkout.optional" />
                </small>
              </label>

              {coupon.applied ? (
                <div className="coupon-applied" role="status">
                  <span>
                    ✦ <T k="checkout.coupon.applied" vars={{ code: coupon.applied.code }} />
                    {coupon.applied.freeShipping && (
                      <>
                        {" · "}
                        <T k="checkout.coupon.freeShip" />
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      coupon.remove();
                      setCouponInput("");
                    }}
                  >
                    <T k="checkout.coupon.remove" />
                  </button>
                </div>
              ) : (
                <div className="coupon-row">
                  <input
                    id="checkout-coupon"
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                    placeholder={ph.coupon}
                    autoComplete="off"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        if (couponInput.trim()) coupon.apply(couponInput);
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={!couponInput.trim() || coupon.busy}
                    onClick={() => coupon.apply(couponInput)}
                  >
                    <T k="checkout.coupon.apply" />
                  </button>
                </div>
              )}

              {coupon.error && (
                <p className="checkout-error" role="alert">
                  {coupon.error}
                </p>
              )}
            </div>

            <div className="checkout-field">
              <label htmlFor="checkout-note">
                <span>{number()}</span>
                <T k="checkout.f.note" />
                <small>
                  <T k="checkout.optional" />
                </small>
              </label>
              <textarea
                id="checkout-note"
                name="note"
                value={form.note}
                onChange={change}
                placeholder={ph.note}
                rows="3"
                maxLength={600}
              />
            </div>

            {/* spam trap: people never see this */}
            <input
              className="hp-field"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={trap}
              onChange={(event) => setTrap(event.target.value)}
            />

            {hasUnavailable && (
              <p className="checkout-error" role="alert">
                <T k="checkout.problem.soldout" />{" "}
                <Link to="/cart">
                  <T k="checkout.problem.fix" />
                </Link>
              </p>
            )}

            {error && (
              <p className="checkout-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="checkout-place-order"
              disabled={submitting || hasUnavailable || paymentOptions.length === 0 || orderLines.length === 0}
            >
              <span className="checkout-place-order-label">
                <T k={submitting ? "checkout.submitting" : "checkout.submit"} />
              </span>

              <span className="checkout-place-order-price">{money(total)}</span>

              <span className="checkout-place-order-arrow">→</span>
            </button>

            <T k="checkout.submitNote" as="p" className="checkout-submit-note" />
          </form>
        </div>

        {/* ===================== order summary ===================== */}
        <aside className="checkout-order-card">
          <div className="checkout-card-glow"></div>

          <div className="checkout-card-top">
            <div>
              <T k="checkout.summary.eyebrow" as="p" className="eyebrow" />

              <T k="checkout.summary.title" as="h2" />
            </div>

            <span className="checkout-card-symbol">✦</span>
          </div>

          <div className="checkout-products">
            {lines.map((line) => (
              <div className="checkout-product-luxury" key={line.key}>
                <div className="checkout-product-image">
                  {line.image ? (
                    <Img src={line.image} alt={line.name} widths={[120, 200]} sizes="72px" width="72" height="72" />
                  ) : (
                    <span>✦</span>
                  )}

                  <small>×{line.qty}</small>
                </div>

                <div className="checkout-product-info">
                  <p>{line.brand || brand.toUpperCase()}</p>

                  <h3>{line.name}</h3>

                  <span>{line.variantLabel || line.category || "Beauty Essential"}</span>
                </div>

                <strong>{money(line.lineTotal)}</strong>
              </div>
            ))}
          </div>

          {!pickup && <FreeShipBar subtotal={subtotal} className="checkout-ship" />}

          <div className="checkout-price-summary">
            <div>
              <span>
                <T k="checkout.summary.subtotal" />
              </span>
              <strong>{money(subtotal)}</strong>
            </div>

            {discount > 0 && (
              <div>
                <span>
                  <T k="checkout.summary.discount" />
                </span>
                <strong className="checkout-free">− {money(discount)}</strong>
              </div>
            )}

            <div>
              <span>
                <T k="checkout.summary.delivery" />
              </span>

              <strong className={free ? "checkout-free" : ""}>
                {free ? <T k="checkout.summary.complimentary" /> : money(deliveryCharge)}
              </strong>
            </div>
          </div>

          <div className="checkout-grand-total">
            <div>
              <span>
                <T k="checkout.summary.total" />
              </span>
              <p>
                <T k="checkout.summary.totalNote" />
              </p>
            </div>

            <strong>{money(total)}</strong>
          </div>

          <div className={free ? "checkout-free-note" : "checkout-delivery-note"}>
            <span>{free ? "✦" : "✧"}</span>

            <T k={free ? "checkout.summary.freeNote" : "checkout.summary.chargeNote"} as="p" />
          </div>

          <div className="checkout-trust">
            <span>✦</span>

            <T k="checkout.summary.trust" as="p" />

            <span>✦</span>
          </div>
        </aside>
      </section>

      <section className="checkout-bottom">
        <Link to="/cart" className="checkout-back">
          <span>&larr;</span>
          <T k="checkout.back" />
        </Link>

        <T k="checkout.bottom" as="p" />
      </section>
    </main>
  );
}
