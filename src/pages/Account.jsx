import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useStore } from "../context/StoreContext";
import { useCustomer } from "../context/CustomerContext";
import { trackEvent } from "../lib/analytics";
import { useContent } from "../content/context";
import { useSeo } from "../hooks/useSeo";
import { listZones } from "../lib/delivery";
import { formatDate, isBdMobile, money, normalizePhone } from "../lib/format";
import T, { useText } from "../content/T";
import EditViewSwitch from "../components/EditViewSwitch";
import ProductTile from "../components/ProductTile";
import { StatusBadge } from "../components/OrderParts";

/* a safe place to go after logging in: only pages of this website */
function safeNext(value) {
  const text = String(value || "");
  return text.startsWith("/") && !text.startsWith("//") && !text.startsWith("/admin") ? text : "";
}

const DEMO_ACCOUNT = {
  id: "demo",
  name: "Ayesha Rahman",
  phone: "01700000000",
  email: "ayesha@example.com",
  addresses: [
    {
      label: "Home",
      name: "Ayesha Rahman",
      phone: "01700000000",
      address: "House 12, Road 3, Sample Residential Area",
      area: "GEC, Chattogram",
      zoneId: "",
    },
  ],
  wishlist: [],
};

function demoOrders() {
  const p = (n) => String(n).padStart(2, "0");
  const d = new Date(Date.now() - 2 * 86400000);
  const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} 12:00:00`;

  return [
    {
      orderId: "PS-DEMO",
      placedAt: stamp,
      status: "Shipped",
      items: [
        { name: "Sample Glow Serum", variant: "30 ml", qty: 1, price: 1450 },
        { name: "Sample Rose Mist", variant: "", qty: 2, price: 650 },
        { name: "Sample Lip Balm", variant: "", qty: 1, price: 350 },
      ],
      total: 2680,
      token: "",
    },
  ];
}

/* =========================================================
   LOG IN / CREATE ACCOUNT / FORGOT PASSWORD
========================================================= */
function AuthCard({ mode, setMode, next }) {
  const { login, register, forgot, reset } = useCustomer();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    code: "",
    newPassword: "",
  });
  const [trap, setTrap] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [haveCode, setHaveCode] = useState(false);

  const ph = {
    name: useText("account.ph.name"),
    phone: useText("account.ph.phone"),
    email: useText("account.ph.email"),
    password: useText("account.ph.password"),
  };

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function go(nextMode) {
    setMode(nextMode);
    setError("");
    setInfo("");
    setHaveCode(false);
  }

  async function submit(event) {
    event.preventDefault();

    if (busy) return;

    setError("");
    setInfo("");

    const phone = normalizePhone(form.phone);

    if (!isBdMobile(phone)) return setError("Please enter a valid Bangladeshi mobile number (01XXXXXXXXX).");

    setBusy(true);

    try {
      if (mode === "login") {
        if (!form.password) throw new Error("Please enter your password.");
        await login({ phone, password: form.password });
        navigate(next || "/account", { replace: true });
      } else if (mode === "register") {
        if (form.name.trim().length < 2) throw new Error("Please enter your name.");
        if (form.password.length < 6) throw new Error("Password must be at least 6 characters.");

        await register({
          name: form.name.trim(),
          phone,
          email: form.email.trim(),
          password: form.password,
          hp: trap,
        });
        trackEvent("sign_up");
        navigate(next || "/account", { replace: true });
      } else if (haveCode) {
        if (form.newPassword.length < 6) throw new Error("New password must be at least 6 characters.");

        const message = await reset({ phone, code: form.code.trim(), newPassword: form.newPassword });

        setMode("login");
        setHaveCode(false);
        setForm((current) => ({ ...current, password: "", code: "", newPassword: "" }));
        setInfo(message || "Password updated. You can log in now.");
      } else {
        const message = await forgot(phone);
        setInfo(message || "If this number has an email on file, we have sent a reset code to it.");
        setHaveCode(true);
      }
    } catch (problem) {
      setError(problem.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const isForgot = mode === "forgot";

  return (
    <div className="account-card">
      {!isForgot && (
        <div className="account-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={mode === "login" ? "on" : ""}
            onClick={() => go("login")}
          >
            <T k="account.tab.login" />
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            className={mode === "register" ? "on" : ""}
            onClick={() => go("register")}
          >
            <T k="account.tab.register" />
          </button>
        </div>
      )}

      <form className="contact-form account-form" onSubmit={submit} noValidate>
        {mode === "register" && (
          <label>
            <T k="account.f.name" as="span" />
            <input
              name="name"
              value={form.name}
              onChange={change}
              placeholder={ph.name}
              autoComplete="name"
              required
            />
          </label>
        )}

        <label>
          <T k="account.f.phone" as="span" />
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={change}
            placeholder={ph.phone}
            autoComplete="tel"
            required
          />
        </label>

        {mode === "register" && (
          <label>
            <span>
              <T k="account.f.email" /> <small className="account-optional"><T k="account.optional" /></small>
            </span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={change}
              placeholder={ph.email}
              autoComplete="email"
            />
            <T k="account.hint.email" as="em" className="account-field-hint" />
          </label>
        )}

        {(mode === "login" || mode === "register") && (
          <label>
            <T k="account.f.password" as="span" />
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={change}
              placeholder={mode === "register" ? ph.password : ""}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              required
            />
          </label>
        )}

        {isForgot && haveCode && (
          <>
            <label>
              <T k="account.f.code" as="span" />
              <input
                name="code"
                value={form.code}
                onChange={change}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
              />
            </label>

            <label>
              <T k="account.f.newPassword" as="span" />
              <input
                name="newPassword"
                type="password"
                value={form.newPassword}
                onChange={change}
                placeholder={ph.password}
                autoComplete="new-password"
                required
              />
            </label>
          </>
        )}

        {mode === "register" && (
          <input
            className="hp-field"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={trap}
            onChange={(event) => setTrap(event.target.value)}
          />
        )}

        {info && (
          <p className="form-success" role="status">
            {info}
          </p>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="contact-submit" disabled={busy}>
          <T
            k={
              mode === "login"
                ? busy
                  ? "account.login.busy"
                  : "account.login.submit"
                : mode === "register"
                  ? busy
                    ? "account.register.busy"
                    : "account.register.submit"
                  : haveCode
                    ? "account.forgot.reset"
                    : busy
                      ? "account.forgot.busy"
                      : "account.forgot.send"
            }
            as="span"
            className="contact-submit-label"
          />
          <span aria-hidden="true">&#8594;</span>
        </button>

        <div className="account-links">
          {mode === "login" && (
            <button type="button" className="account-link" onClick={() => go("forgot")}>
              <T k="account.forgot.link" />
            </button>
          )}

          {isForgot && !haveCode && (
            <button type="button" className="account-link" onClick={() => setHaveCode(true)}>
              <T k="account.forgot.have" />
            </button>
          )}

          {isForgot && (
            <button type="button" className="account-link" onClick={() => go("login")}>
              <T k="account.forgot.back" />
            </button>
          )}
        </div>

        {!isForgot && <T k="account.guest" as="p" className="contact-hint" />}
      </form>
    </div>
  );
}

/* =========================================================
   DASHBOARD PARTS
========================================================= */
function OrdersTab({ demo }) {
  const { fetchOrders, claimOrder } = useCustomer();

  const [orders, setOrders] = useState(demo ? demoOrders() : null);
  const [error, setError] = useState("");
  const [claim, setClaim] = useState({ orderId: "", phone: "" });
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimMessage, setClaimMessage] = useState("");
  const [claimError, setClaimError] = useState("");

  useEffect(() => {
    if (demo) {
      setOrders(demoOrders());
      return undefined;
    }

    let cancelled = false;

    fetchOrders()
      .then((list) => {
        if (!cancelled) setOrders(list);
      })
      .catch((problem) => {
        if (!cancelled) setError(problem.message || "Could not load your orders.");
      });

    return () => {
      cancelled = true;
    };
  }, [demo, fetchOrders]);

  async function submitClaim(event) {
    event.preventDefault();

    if (claimBusy || demo) return;

    setClaimError("");
    setClaimMessage("");

    const phone = normalizePhone(claim.phone);

    if (!claim.orderId.trim()) return setClaimError("Please enter the order number.");
    if (!isBdMobile(phone)) return setClaimError("Please enter the phone number you used for that order.");

    setClaimBusy(true);

    try {
      const order = await claimOrder(claim.orderId.trim(), phone);

      setOrders((current) => [order, ...(current || []).filter((item) => item.orderId !== order.orderId)]);
      setClaim({ orderId: "", phone: "" });
      setClaimMessage("ok");
    } catch (problem) {
      setClaimError(problem.message || "Could not add that order.");
    } finally {
      setClaimBusy(false);
    }
  }

  return (
    <div className="account-panel">
      <T k="account.orders.title" as="h2" />

      {error && <p className="form-error">{error}</p>}

      {orders === null && !error && <T k="account.orders.loading" as="p" className="account-muted" />}

      {orders && !orders.length && (
        <div className="account-empty">
          <T k="account.orders.empty" as="p" />
          <Link to="/shop" className="hero-button">
            <T k="account.orders.shop" />
            <span>&#8594;</span>
          </Link>
        </div>
      )}

      {orders && orders.length > 0 && (
        <ul className="account-orders">
          {orders.map((order) => {
            const first = (order.items || []).slice(0, 2);
            const rest = (order.items || []).length - first.length;
            const trackLink = `/track?order=${encodeURIComponent(order.orderId)}${
              order.token ? `&token=${encodeURIComponent(order.token)}` : ""
            }`;

            return (
              <li key={order.orderId} className="account-order">
                <div className="account-order-top">
                  <div>
                    <strong>{order.orderId}</strong>
                    <small>
                      <T k="account.orders.placed" /> {formatDate(order.placedAt)}
                    </small>
                  </div>

                  <StatusBadge status={order.status} />
                </div>

                <p className="account-order-items">
                  {first.map((item) => `${item.name}${item.qty > 1 ? ` x ${item.qty}` : ""}`).join(", ")}
                  {rest > 0 && (
                    <>
                      {", "}
                      <T k="account.orders.more" vars={{ count: rest }} />
                    </>
                  )}
                </p>

                <div className="account-order-bottom">
                  <span>
                    <T k="account.orders.total" /> <strong>{money(order.total)}</strong>
                  </span>

                  <Link to={trackLink} className="account-order-track">
                    <T k="account.orders.track" /> <span aria-hidden="true">&#8594;</span>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form className="account-claim contact-form" onSubmit={submitClaim} noValidate>
        <T k="account.claim.title" as="h3" />
        <T k="account.claim.text" as="p" className="account-muted" />

        <div className="faq-form-row">
          <label>
            <T k="account.claim.order" as="span" />
            <input
              value={claim.orderId}
              onChange={(event) => setClaim((current) => ({ ...current, orderId: event.target.value }))}
              autoCapitalize="characters"
            />
          </label>

          <label>
            <T k="account.claim.phone" as="span" />
            <input
              type="tel"
              inputMode="tel"
              value={claim.phone}
              onChange={(event) => setClaim((current) => ({ ...current, phone: event.target.value }))}
            />
          </label>
        </div>

        {claimMessage && <T k="account.claim.ok" as="p" className="form-success" />}
        {claimError && <p className="form-error">{claimError}</p>}

        <button type="submit" className="contact-submit" disabled={claimBusy}>
          <T k="account.claim.submit" as="span" className="contact-submit-label" />
          <span aria-hidden="true">&#8594;</span>
        </button>
      </form>
    </div>
  );
}

function WishlistTab() {
  const { wishlistProducts } = useCustomer();

  return (
    <div className="account-panel">
      <T k="account.wishlist.title" as="h2" />

      {!wishlistProducts.length ? (
        <div className="account-empty">
          <T k="account.wishlist.empty" as="p" />
          <Link to="/shop" className="hero-button">
            <T k="account.wishlist.shop" />
            <span>&#8594;</span>
          </Link>
        </div>
      ) : (
        <div className="account-wishlist">
          {wishlistProducts.map((product) => (
            <ProductTile key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddressesTab({ account, demo }) {
  const { storeSettings } = useStore();
  const { updateProfile } = useCustomer();
  const zones = listZones(storeSettings);

  const [list, setList] = useState(() => (account.addresses || []).map((item) => ({ ...item })));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function change(index, key, value) {
    setList((current) => current.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
    setMessage("");
  }

  function add() {
    if (list.length >= 5) return;
    setList((current) => [
      ...current,
      {
        label: current.length ? "" : "Home",
        name: account.name || "",
        phone: account.phone || "",
        address: "",
        area: "",
        zoneId: "",
      },
    ]);
  }

  async function save(event) {
    event.preventDefault();

    if (busy || demo) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const clean = list
        .map((item) => ({
          label: item.label.trim() || "Home",
          name: item.name.trim(),
          phone: normalizePhone(item.phone),
          address: item.address.trim(),
          area: item.area.trim(),
          zoneId: item.zoneId || "",
        }))
        .filter((item) => item.address);

      const updated = await updateProfile({ addresses: clean });
      setList((updated.addresses || []).map((item) => ({ ...item })));
      setMessage("ok");
    } catch (problem) {
      setError(problem.message || "Could not save your addresses.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="account-panel">
      <T k="account.addresses.title" as="h2" />
      <T k="account.addresses.text" as="p" className="account-muted" />

      <form className="account-addresses contact-form" onSubmit={save} noValidate>
        {!list.length && <T k="account.addresses.empty" as="p" className="account-muted" />}

        {list.map((item, index) => (
          <fieldset className="account-address" key={index}>
            <div className="faq-form-row">
              <label>
                <T k="account.addresses.label" as="span" />
                <input value={item.label} onChange={(event) => change(index, "label", event.target.value)} maxLength={30} />
              </label>

              <label>
                <T k="account.addresses.phone" as="span" />
                <input
                  type="tel"
                  inputMode="tel"
                  value={item.phone}
                  onChange={(event) => change(index, "phone", event.target.value)}
                />
              </label>
            </div>

            <label>
              <T k="account.addresses.name" as="span" />
              <input value={item.name} onChange={(event) => change(index, "name", event.target.value)} maxLength={80} />
            </label>

            <label>
              <T k="account.addresses.address" as="span" />
              <textarea
                rows={2}
                value={item.address}
                onChange={(event) => change(index, "address", event.target.value)}
                maxLength={400}
              />
            </label>

            <div className="faq-form-row">
              <label>
                <T k="account.addresses.area" as="span" />
                <input value={item.area} onChange={(event) => change(index, "area", event.target.value)} maxLength={100} />
              </label>

              {zones.length > 1 && (
                <label>
                  <T k="checkout.f.zone" as="span" />
                  <select value={item.zoneId || ""} onChange={(event) => change(index, "zoneId", event.target.value)}>
                    <option value="">-</option>
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <button
              type="button"
              className="account-link danger"
              onClick={() => setList((current) => current.filter((_, i) => i !== index))}
            >
              <T k="account.addresses.remove" />
            </button>
          </fieldset>
        ))}

        <div className="account-actions">
          <button type="button" className="hero-button secondary" onClick={add} disabled={list.length >= 5}>
            + <T k="account.addresses.add" />
          </button>
          {list.length >= 5 && <T k="account.addresses.limit" as="small" className="account-muted" />}
        </div>

        {message && <T k="account.saved" as="p" className="form-success" />}
        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="contact-submit" disabled={busy}>
          <T k="account.addresses.save" as="span" className="contact-submit-label" />
          <span aria-hidden="true">&#8594;</span>
        </button>
      </form>
    </div>
  );
}

function ProfileTab({ account, demo }) {
  const { updateProfile } = useCustomer();

  const [form, setForm] = useState({ name: account.name || "", email: account.email || "" });
  const [pass, setPass] = useState({ currentPassword: "", newPassword: "" });
  const [busy, setBusy] = useState(false);
  const [passBusy, setPassBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [passMessage, setPassMessage] = useState("");
  const [error, setError] = useState("");
  const [passError, setPassError] = useState("");

  const ph = {
    name: useText("account.ph.name"),
    email: useText("account.ph.email"),
    password: useText("account.ph.password"),
  };

  async function saveProfile(event) {
    event.preventDefault();

    if (busy || demo) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (form.name.trim().length < 2) throw new Error("Please enter your name.");
      await updateProfile({ name: form.name.trim(), email: form.email.trim() });
      setMessage("ok");
    } catch (problem) {
      setError(problem.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();

    if (passBusy || demo) return;

    setPassBusy(true);
    setPassError("");
    setPassMessage("");

    try {
      if (!pass.currentPassword) throw new Error("Please enter your current password.");
      if (pass.newPassword.length < 6) throw new Error("New password must be at least 6 characters.");

      await updateProfile({ currentPassword: pass.currentPassword, newPassword: pass.newPassword });
      setPass({ currentPassword: "", newPassword: "" });
      setPassMessage("ok");
    } catch (problem) {
      setPassError(problem.message || "Could not update the password.");
    } finally {
      setPassBusy(false);
    }
  }

  return (
    <div className="account-panel">
      <T k="account.profile.title" as="h2" />

      <form className="contact-form account-form" onSubmit={saveProfile} noValidate>
        <label>
          <T k="account.f.name" as="span" />
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder={ph.name}
            autoComplete="name"
          />
        </label>

        <label>
          <T k="account.f.phone" as="span" />
          <input value={account.phone} readOnly disabled />
          <T k="account.profile.phoneNote" as="em" className="account-field-hint" />
        </label>

        <label>
          <T k="account.f.email" as="span" />
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder={ph.email}
            autoComplete="email"
          />
        </label>

        {message && <T k="account.saved" as="p" className="form-success" />}
        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="contact-submit" disabled={busy}>
          <T k="account.profile.save" as="span" className="contact-submit-label" />
          <span aria-hidden="true">&#8594;</span>
        </button>
      </form>

      <form className="contact-form account-form account-password" onSubmit={savePassword} noValidate>
        <T k="account.password.title" as="h3" />

        <label>
          <T k="account.f.currentPassword" as="span" />
          <input
            type="password"
            value={pass.currentPassword}
            onChange={(event) => setPass((current) => ({ ...current, currentPassword: event.target.value }))}
            autoComplete="current-password"
          />
        </label>

        <label>
          <T k="account.f.newPassword" as="span" />
          <input
            type="password"
            value={pass.newPassword}
            onChange={(event) => setPass((current) => ({ ...current, newPassword: event.target.value }))}
            placeholder={ph.password}
            autoComplete="new-password"
          />
        </label>

        {passMessage && <T k="account.passwordSaved" as="p" className="form-success" />}
        {passError && <p className="form-error">{passError}</p>}

        <button type="submit" className="contact-submit" disabled={passBusy}>
          <T k="account.password.save" as="span" className="contact-submit-label" />
          <span aria-hidden="true">&#8594;</span>
        </button>
      </form>
    </div>
  );
}

function Dashboard({ account, tab, setTab, demo }) {
  const { logout } = useCustomer();
  const first = String(account.name || "").split(" ")[0] || account.name;

  const tabs = [
    ["orders", "account.nav.orders"],
    ["wishlist", "account.nav.wishlist"],
    ["addresses", "account.nav.addresses"],
    ["profile", "account.nav.profile"],
  ];

  return (
    <div className="account-dash">
      <header className="account-dash-head">
        <div>
          <T k="account.hi" as="h2" vars={{ name: first }} />
          <T k="account.hi.text" as="p" className="account-muted" />
        </div>

        <button type="button" className="account-link" onClick={logout} disabled={demo}>
          <T k="account.logout" />
        </button>
      </header>

      <nav className="account-nav" aria-label="Account sections">
        {tabs.map(([id, key]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "on" : ""}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => setTab(id)}
          >
            <T k={key} />
          </button>
        ))}
      </nav>

      {tab === "orders" && <OrdersTab demo={demo} />}
      {tab === "wishlist" && <WishlistTab />}
      {tab === "addresses" && <AddressesTab account={account} demo={demo} />}
      {tab === "profile" && <ProfileTab account={account} demo={demo} />}
    </div>
  );
}

/* =========================================================
   THE PAGE
========================================================= */
export default function Account() {
  const { account, ready, loggedIn, accountsEnabled } = useCustomer();
  const content = useContent();
  const [params, setParams] = useSearchParams();

  useSeo({ page: "account", noindex: true });

  const next = safeNext(params.get("next"));
  const wantedTab = params.get("tab");
  const tab = ["orders", "wishlist", "addresses", "profile"].includes(wantedTab) ? wantedTab : "orders";

  const [mode, setMode] = useState(params.get("mode") === "register" ? "register" : "login");
  const [editView, setEditView] = useState("login");

  function setTab(id) {
    const copy = new URLSearchParams(params);
    copy.set("tab", id);
    setParams(copy, { replace: true });
  }

  const editing = content.isEditing;

  /* in edit mode the owner can look at every version of this page */
  const view = useMemo(() => {
    if (!editing) return loggedIn ? "dash" : mode;
    return editView;
  }, [editing, editView, loggedIn, mode]);

  const dashTab = editing && ["orders", "wishlist", "addresses", "profile"].includes(editView) ? editView : tab;
  const dashAccount = loggedIn ? account : DEMO_ACCOUNT;
  const demo = editing && !loggedIn;

  const heading =
    view === "login"
      ? ["account.login.title", "account.login.text"]
      : view === "register"
        ? ["account.register.title", "account.register.text"]
        : view === "forgot"
          ? ["account.forgot.title", "account.forgot.text"]
          : null;

  return (
    <main className="account-page page">
      <section className={`account-hero${heading ? "" : " compact"}`}>
        <span className="account-orb" aria-hidden="true"></span>

        <T k="account.eyebrow" as="p" className="eyebrow" />

        {heading && (
          <>
            <T k={heading[0]} as="h1" />
            <T k={heading[1]} as="p" className="account-hero-text" />
          </>
        )}
      </section>

      <section className="account-body">
        <EditViewSwitch
          views={[
            ["login", "Log in"],
            ["register", "Create account"],
            ["forgot", "Forgot password"],
            ["orders", "Orders"],
            ["wishlist", "Favourites"],
            ["addresses", "Addresses"],
            ["profile", "Profile"],
          ]}
          value={editView}
          onChange={setEditView}
        />

        {!accountsEnabled && !editing ? (
          <div className="account-card account-off">
            <T k="account.off" as="p" />
            <Link to="/track" className="hero-button">
              <T k="account.off.button" />
              <span>&#8594;</span>
            </Link>
          </div>
        ) : !ready && !editing ? (
          <div className="account-card">
            <p className="account-muted">...</p>
          </div>
        ) : view === "dash" || (editing && ["orders", "wishlist", "addresses", "profile"].includes(editView)) ? (
          <Dashboard
            key={`${demo}-${dashTab}`}
            account={dashAccount}
            tab={dashTab}
            setTab={editing ? setEditView : setTab}
            demo={demo}
          />
        ) : (
          <AuthCard
            key={view}
            mode={view}
            setMode={editing ? setEditView : setMode}
            next={next}
          />
        )}
      </section>
    </main>
  );
}
