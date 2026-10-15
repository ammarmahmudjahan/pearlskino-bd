import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useCustomer } from "../context/CustomerContext";
import { useContent } from "../content/context";
import { useSeo } from "../hooks/useSeo";
import { apiPost, ApiError } from "../lib/api";
import { money, formatDate, normalizePhone, isBdMobile } from "../lib/format";
import T, { useText } from "../content/T";
import EditViewSwitch from "../components/EditViewSwitch";
import {
  OrderProgress,
  OrderTimeline,
  PaymentState,
  StatusBadge,
  StatusNote,
} from "../components/OrderParts";

/* what the owner sees while editing the "result" version of this page */
function demoOrder() {
  const now = new Date();
  const stamp = (offsetHours) => {
    const d = new Date(now.getTime() - offsetHours * 3600000);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`;
  };

  return {
    orderId: "PS-DEMO",
    placedAt: stamp(30),
    status: "Shipped",
    firstName: "Ayesha",
    items: [
      { name: "Sample Glow Serum", variant: "30 ml", qty: 1, price: 1450 },
      { name: "Sample Rose Mist", variant: "", qty: 2, price: 650 },
    ],
    subtotal: 2750,
    discount: 150,
    deliveryCharge: 80,
    total: 2680,
    payment: "Cash on Delivery",
    paymentStatus: "Unpaid",
    delivery: "Home Delivery",
    area: "GEC, Chattogram",
    coupon: "WELCOME",
    trackingCode: "",
    cancelReason: "",
    timeline: [
      { time: stamp(30), status: "New", note: "" },
      { time: stamp(24), status: "Confirmed", note: "" },
      { time: stamp(6), status: "Shipped", note: "Handed to the courier." },
    ],
  };
}

export default function Track() {
  const { account } = useCustomer();
  const content = useContent();
  const [params] = useSearchParams();

  useSeo({ page: "track", noindex: true });

  const [orderId, setOrderId] = useState(params.get("order") || "");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editView, setEditView] = useState("form");

  const ph = {
    order: useText("track.ph.order"),
    phone: useText("track.ph.phone"),
  };

  const firstRun = useRef(true);

  const lookup = useCallback(async ({ id, phoneNumber, token }) => {
    setLoading(true);
    setError("");

    try {
      const data = await apiPost({
        action: "trackOrder",
        orderId: String(id || "").trim(),
        phone: phoneNumber || "",
        token: token || "",
      });

      setOrder(data.order);
    } catch (problem) {
      setOrder(null);
      setError(
        problem instanceof ApiError ? problem.message : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /* the thank-you page links here with ?order=...&token=... - show the order right away */
  useEffect(() => {
    if (!firstRun.current) return;
    firstRun.current = false;

    const id = params.get("order");
    const token = params.get("token");

    if (id && token) lookup({ id, token });
    // only once, when the page opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (account?.phone && !phone) setPhone(account.phone);
    // fill once when the account arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    const id = orderId.trim();
    const number = normalizePhone(phone);

    if (!id) return setError("Please enter your order number.");
    if (!isBdMobile(number)) return setError("Please enter the phone number you used for the order.");

    lookup({ id, phoneNumber: number });
  }

  const editing = content.isEditing;
  const shown = editing ? (editView === "result" ? demoOrder() : null) : order;

  return (
    <main className="track-page page">
      <section className="track-hero">
        <span className="track-orb" aria-hidden="true"></span>

        <T k="track.eyebrow" as="p" className="eyebrow" />
        <T k="track.title" as="h1" />
        <T k="track.text" as="p" className="track-hero-text" />
      </section>

      <section className="track-body">
        <EditViewSwitch
          views={[
            ["form", "Search form"],
            ["result", "Order result"],
          ]}
          value={editView}
          onChange={setEditView}
        />

        {!shown ? (
          <div className="track-card">
            <form className="track-form contact-form" onSubmit={handleSubmit} noValidate>
              <label>
                <T k="track.f.order" as="span" />
                <input
                  value={orderId}
                  onChange={(event) => setOrderId(event.target.value)}
                  placeholder={ph.order}
                  autoComplete="off"
                  autoCapitalize="characters"
                />
              </label>

              <label>
                <T k="track.f.phone" as="span" />
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder={ph.phone}
                  autoComplete="tel"
                />
              </label>

              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="contact-submit" disabled={loading}>
                <T k={loading ? "track.busy" : "track.submit"} as="span" className="contact-submit-label" />
                <span aria-hidden="true">&#8594;</span>
              </button>

              <T k="track.tip" as="p" className="contact-hint" />
            </form>

            <p className="track-account-line">
              <T k="track.account" />{" "}
              <Link to="/account?tab=orders">
                <T k="track.account.link" />
              </Link>
            </p>
          </div>
        ) : (
          <article className="track-result">
            <header className="track-result-head">
              <T
                k="track.r.eyebrow"
                as="p"
                className="eyebrow"
                vars={{ order: shown.orderId }}
              />

              <T
                k="track.r.title"
                as="h2"
                vars={{ name: shown.firstName || "there" }}
              />

              <div className="track-result-meta">
                <span>
                  <T k="track.r.placed" /> <strong>{formatDate(shown.placedAt, true)}</strong>
                </span>

                <StatusBadge status={shown.status} />
              </div>

              <StatusNote status={shown.status} className="track-status-note" />

              {shown.status === "Cancelled" && shown.cancelReason && (
                <p className="track-reason">
                  <T k="track.r.reason" />: {shown.cancelReason}
                </p>
              )}
            </header>

            <OrderProgress status={shown.status} timeline={shown.timeline} />

            <div className="track-grid">
              <section className="track-panel">
                <T k="track.r.journey" as="h3" />
                <OrderTimeline timeline={shown.timeline} />
              </section>

              <section className="track-panel">
                <T k="track.r.items" as="h3" />

                <ul className="track-items">
                  {(shown.items || []).map((item, index) => (
                    <li key={`${item.name}-${index}`}>
                      <span>
                        {item.name}
                        {item.variant ? <small> - {item.variant}</small> : null}
                        <em> x {item.qty}</em>
                      </span>
                      <strong>{money(Number(item.price) * Number(item.qty))}</strong>
                    </li>
                  ))}

                  {!shown.items?.length && shown.products && (
                    <li>
                      <span>{shown.products}</span>
                    </li>
                  )}
                </ul>

                <T k="track.r.summary" as="h3" className="track-sub" />

                <dl className="track-summary">
                  <div>
                    <dt>
                      <T k="track.r.subtotal" />
                    </dt>
                    <dd>{money(shown.subtotal)}</dd>
                  </div>

                  {Number(shown.discount) > 0 && (
                    <div>
                      <dt>
                        <T k="track.r.discount" />
                        {shown.coupon ? ` (${shown.coupon})` : ""}
                      </dt>
                      <dd>- {money(shown.discount)}</dd>
                    </div>
                  )}

                  <div>
                    <dt>
                      <T k="track.r.delivery" />
                    </dt>
                    <dd>
                      {Number(shown.deliveryCharge) > 0 ? money(shown.deliveryCharge) : <T k="track.r.free" />}
                    </dd>
                  </div>

                  <div className="total">
                    <dt>
                      <T k="track.r.total" />
                    </dt>
                    <dd>{money(shown.total)}</dd>
                  </div>
                </dl>

                <dl className="track-facts">
                  <div>
                    <dt>
                      <T k="track.r.payment" />
                    </dt>
                    <dd>
                      {shown.payment} - <PaymentState value={shown.paymentStatus} />
                    </dd>
                  </div>

                  <div>
                    <dt>
                      <T k="track.r.method" />
                    </dt>
                    <dd>{shown.delivery}</dd>
                  </div>

                  {shown.area && (
                    <div>
                      <dt>
                        <T k="track.r.area" />
                      </dt>
                      <dd>{shown.area}</dd>
                    </div>
                  )}

                  {shown.trackingCode && (
                    <div>
                      <dt>
                        <T k="track.r.code" />
                      </dt>
                      <dd>{shown.trackingCode}</dd>
                    </div>
                  )}
                </dl>
              </section>
            </div>

            <footer className="track-result-foot">
              <p>
                <T k="track.r.help" />{" "}
                <Link to="/contact">
                  <T k="track.r.helpLink" />
                </Link>
              </p>

              <button
                type="button"
                className="hero-button secondary"
                onClick={() => {
                  setOrder(null);
                  setError("");
                }}
              >
                <T k="track.r.again" />
              </button>
            </footer>
          </article>
        )}
      </section>
    </main>
  );
}
