import { useEffect, useMemo, useState } from "react";

import { adminCall } from "../../lib/adminApi";
import { printOrders } from "../printing";
import { downloadFile, formatDate, isBdMobile, money, normalizePhone, toCsv, whatsappLink } from "../../lib/format";
import {
  Badge,
  Card,
  Empty,
  ErrorBox,
  Field,
  Modal,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PageHead,
  Pager,
  PayPill,
  Spinner,
  StatusPill,
  Tabs,
  Toggle,
  act,
  askConfirm,
  askText,
  toast,
  useAdmin,
  useDebounced,
  useLoad,
} from "../ui";

const PAGE_SIZE = 25;
const EDITABLE = ["New", "Confirmed", "Processing"];

/* pick a product (and variant) from the catalog */
export function ProductPicker({ onPick, products }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];

    return (products || [])
      .filter((p) => p.visibility !== "deleted" && `${p.name} ${p.sku || ""} ${p.brand || ""}`.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [q, products]);

  return (
    <div>
      <input type="search" placeholder="Search a product to add…" value={q} onChange={(e) => setQ(e.target.value)} />

      {list.length > 0 && (
        <div className="ad-tablewrap" style={{ marginTop: 8 }}>
          <table className="ad-table">
            <tbody>
              {list.map((p) =>
                p.variants?.length ? (
                  p.variants.map((v) => (
                    <tr key={`${p.id}-${v.id}`} className="click" onClick={() => { onPick(p, v); setQ(""); }}>
                      <td>
                        {p.name} <small>{v.label}</small>
                      </td>
                      <td className="num">{money(v.price ?? p.price)}</td>
                      <td className="num">{v.stock} in stock</td>
                    </tr>
                  ))
                ) : (
                  <tr key={p.id} className="click" onClick={() => { onPick(p, null); setQ(""); }}>
                    <td>{p.name}</td>
                    <td className="num">{money(p.price)}</td>
                    <td className="num">{p.stock} in stock</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* manual order                                                         */
/* ------------------------------------------------------------------ */
function NewOrderModal({ onClose, onDone }) {
  const { data: catalog } = useLoad("products");
  const [f, setF] = useState({
    name: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    area: "",
    delivery: "Home Delivery",
    payment: "Cash on Delivery",
    paymentStatus: "Unpaid",
    note: "",
    notify: false,
    skipStock: false,
  });
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  function addItem(p, v) {
    setItems((list) => {
      const idx = list.findIndex((i) => i.id === p.id && i.variantId === (v?.id || ""));
      if (idx >= 0) return list.map((i, n) => (n === idx ? { ...i, qty: i.qty + 1 } : i));
      return [...list, { id: p.id, variantId: v?.id || "", name: p.name, variant: v?.label || "", qty: 1, price: v?.price ?? p.price }];
    });
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  async function save() {
    if (!items.length) return toast("Add at least one product.", "error");
    if (!isBdMobile(f.phone)) return toast("Enter a valid mobile number (01XXXXXXXXX).", "error");

    setBusy(true);
    const data = await act(
      "orderCreate",
      {
        customer: { name: f.name, phone: normalizePhone(f.phone), whatsapp: f.whatsapp, email: f.email, address: f.address, area: f.area },
        items: items.map((i) => ({ id: i.id, variantId: i.variantId, qty: i.qty, price: i.price })),
        delivery: f.delivery,
        payment: f.payment,
        paymentStatus: f.paymentStatus,
        note: f.note,
        notify: f.notify,
        skipStock: f.skipStock,
        clientRef: `adm-${Date.now()}`,
      },
      "Order created."
    );
    setBusy(false);

    if (data) onDone(data.order);
  }

  return (
    <Modal
      title="New order (phone / Messenger / walk-in)"
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="ad-btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="ad-btn primary" disabled={busy} onClick={save}>
            {busy ? "Saving…" : "Create order"}
          </button>
        </>
      }
    >
      <div className="ad-form">
        <div className="ad-row">
          <Field label="Customer name *"><input value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Mobile *"><input type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="01XXXXXXXXX" /></Field>
          <Field label="WhatsApp (optional)"><input type="tel" value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
          <Field label="Email (optional)"><input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        </div>
        <div className="ad-row">
          <Field label="Address"><input value={f.address} onChange={(e) => set("address", e.target.value)} /></Field>
          <Field label="Area / zone"><input value={f.area} onChange={(e) => set("area", e.target.value)} /></Field>
        </div>

        <div>
          <strong>Products</strong>
          <ProductPicker products={catalog?.products} onPick={addItem} />
          {items.length > 0 && (
            <table className="ad-items" style={{ marginTop: 10 }}>
              <tbody>
                {items.map((i, n) => (
                  <tr key={`${i.id}-${i.variantId}`}>
                    <td>{i.name} {i.variant && <small className="ad-muted">({i.variant})</small>}</td>
                    <td><input type="number" min="1" value={i.qty} onChange={(e) => setItems((l) => l.map((x, k) => (k === n ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x)))} /></td>
                    <td><input type="number" min="0" value={i.price} onChange={(e) => setItems((l) => l.map((x, k) => (k === n ? { ...x, price: Math.max(0, Number(e.target.value) || 0) } : x)))} /></td>
                    <td className="num">{money(i.price * i.qty)}</td>
                    <td><button type="button" className="ad-btn small danger" onClick={() => setItems((l) => l.filter((_, k) => k !== n))}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="ad-muted">Items subtotal {money(subtotal)}. Delivery charge and discounts are calculated by the store rules when the order is saved.</p>
        </div>

        <div className="ad-row">
          <Field label="Delivery">
            <select value={f.delivery} onChange={(e) => set("delivery", e.target.value)}>
              <option>Home Delivery</option>
              <option>Pickup</option>
            </select>
          </Field>
          <Field label="Payment method">
            <select value={f.payment} onChange={(e) => set("payment", e.target.value)}>
              <option>Cash on Delivery</option>
              <option>bKash</option>
              <option>Pickup</option>
            </select>
          </Field>
          <Field label="Payment status">
            <select value={f.paymentStatus} onChange={(e) => set("paymentStatus", e.target.value)}>
              {PAYMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Note"><textarea value={f.note} onChange={(e) => set("note", e.target.value)} /></Field>
        <Toggle checked={f.notify} onChange={(v) => set("notify", v)} label="Send the normal new-order alerts" hint="Admin alert + customer confirmation email (if an email is given)" />
        <Toggle checked={f.skipStock} onChange={(v) => set("skipStock", v)} label="Do not reduce stock" hint="Use when the stock was already taken off by hand" />
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* returns                                                              */
/* ------------------------------------------------------------------ */
function ReturnForm({ order, onClose, onDone }) {
  const [type, setType] = useState("return");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState(order.total);
  const [restock, setRestock] = useState(true);
  const [pick, setPick] = useState(() => Object.fromEntries((order.items || []).map((i, n) => [n, i.qty])));
  const [busy, setBusy] = useState(false);

  async function save() {
    const items = (order.items || [])
      .map((i, n) => ({ id: i.id, variantId: i.variantId, name: i.name, qty: Number(pick[n]) || 0 }))
      .filter((i) => i.qty > 0);

    setBusy(true);
    const data = await act("returnCreate", { orderId: order.orderId, type, items, amount: Number(amount) || 0, reason, restock }, "Return recorded.");
    setBusy(false);

    if (data) onDone();
  }

  return (
    <Modal
      title={`Return / refund · ${order.orderId}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ad-btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="ad-btn primary" disabled={busy} onClick={save}>Save</button>
        </>
      }
    >
      <div className="ad-form">
        <div className="ad-row">
          <Field label="Type">
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="return">Return</option>
              <option value="refund">Refund only</option>
              <option value="exchange">Exchange</option>
            </select>
          </Field>
          <Field label="Refund amount (৳)"><input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        </div>

        <table className="ad-items">
          <tbody>
            {(order.items || []).map((i, n) => (
              <tr key={n}>
                <td>{i.name} {i.variant && <small className="ad-muted">({i.variant})</small>}</td>
                <td className="num">
                  <input type="number" min="0" max={i.qty} value={pick[n]} onChange={(e) => setPick((p) => ({ ...p, [n]: Math.min(i.qty, Math.max(0, Number(e.target.value) || 0)) }))} /> / {i.qty}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Field label="Reason *"><textarea value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <Toggle checked={restock} onChange={setRestock} label="Put the items back in stock when received" />
      </div>
    </Modal>
  );
}

export function Returns() {
  const { data, loading, error, reload } = useLoad("returns");
  const { can, go } = useAdmin();
  const [tab, setTab] = useState("open");

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const all = data.returns || [];
  const open = all.filter((r) => ["requested", "approved", "received"].includes(r.status));
  const list = tab === "open" ? open : all;

  async function update(r, patch, ok) {
    const res = await act("returnUpdate", { id: r.id, ...patch }, ok);
    if (res) reload();
  }

  return (
    <>
      <PageHead title="Returns & refunds" sub="Create a return from an order's detail window" />
      <Tabs tabs={[["open", "Open", open.length], ["all", "All", all.length]]} value={tab} onChange={setTab} />

      {!list.length ? (
        <Empty>No returns here.</Empty>
      ) : (
        <div className="ad-tablewrap">
          <table className="ad-table">
            <thead>
              <tr><th>Order</th><th>Type</th><th>Items</th><th>Reason</th><th className="num">Refund</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td>
                    <a href="#/orders" onClick={(e) => { e.preventDefault(); go("orders", { open: r.orderId }); }}>{r.orderId}</a>
                    <small>{r.customer?.name} · {formatDate(r.created)}</small>
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{r.type}</td>
                  <td>{(r.items || []).map((i) => `${i.name} × ${i.qty}`).join(", ") || "—"}</td>
                  <td>{r.reason}</td>
                  <td className="num">{money(r.amount)}</td>
                  <td><Badge tone={r.status === "refunded" ? "green" : r.status === "rejected" ? "red" : "amber"}>{r.status}</Badge></td>
                  <td>
                    {can("orders.edit") && (
                      <select
                        value={r.status}
                        onChange={(e) => update(r, { status: e.target.value }, "Return updated.")}
                      >
                        {["requested", "approved", "received", "refunded", "rejected"].map((s) => <option key={s}>{s}</option>)}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* one order                                                            */
/* ------------------------------------------------------------------ */
function OrderModal({ orderId, onClose, onChanged }) {
  const { can } = useAdmin();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [items, setItems] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(false);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [waText, setWaText] = useState("");

  async function load() {
    try {
      const data = await adminCall("orderDetail", { orderId });
      setDetail(data);
      const o = data.order;
      setForm({
        name: o.name, phone: o.phone, whatsapp: o.whatsapp || "", email: o.email || "", address: o.address || "", area: o.area || "",
        note: o.note || "", adminNote: o.adminNote || "", trackingCode: o.trackingCode || "", paymentStatus: o.paymentStatus,
        payment: o.payment, delivery: o.delivery,
      });
      setItems((o.items || []).map((i) => ({ ...i })));
      setNewStatus(o.status);
      setWaText(data.whatsapp?.text || "");
      setError("");
    } catch (problem) {
      setError(problem.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (error) return <Modal title="Order" onClose={onClose}><ErrorBox error={error} onRetry={load} /></Modal>;
  if (!detail || !form) return <Modal title="Order" onClose={onClose}><Spinner /></Modal>;

  const o = detail.order;
  const canEdit = can("orders.edit") && !o.trashed;
  const itemsEditable = canEdit && EDITABLE.includes(o.status);
  const itemsChanged = JSON.stringify(items.map((i) => [i.id, i.variantId, i.qty, i.price])) !== JSON.stringify((o.items || []).map((i) => [i.id, i.variantId, i.qty, i.price]));
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const newSubtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  async function ensureCatalog() {
    if (catalog) return;
    try {
      const d = await adminCall("products");
      setCatalog(d.products || []);
    } catch (problem) {
      toast(problem.message, "error");
    }
  }

  async function saveDetails() {
    const patch = { ...form };
    if (itemsEditable && itemsChanged) patch.items = items.map((i) => ({ id: i.id, variantId: i.variantId, qty: i.qty, price: i.price }));

    setBusy(true);
    const data = await act("orderEdit", { orderId: o.orderId, patch }, "Order saved.");
    setBusy(false);

    if (data) {
      await load();
      onChanged();
    }
  }

  async function changeStatus() {
    if (newStatus === o.status) return;

    let why = reason.trim();

    if (["Cancelled"].includes(newStatus) && why.length < 3) {
      why = (await askText({ title: "Why is this order cancelled?", message: "The customer can see this reason on the tracking page.", required: true, confirmLabel: "Cancel order", danger: true })) || "";
      if (!why) return;
    }

    if (["Cancelled", "Returned"].includes(o.status) && why.length < 3) {
      why = (await askText({ title: `Reopen this ${o.status.toLowerCase()} order?`, message: "Only the owner can do this. Please write a reason.", required: true })) || "";
      if (!why) return;
    }

    setBusy(true);
    const data = await act("orderStatus", { orderId: o.orderId, status: newStatus, reason: why, restock, notify }, `Status: ${newStatus}`);
    setBusy(false);

    if (data) {
      setReason("");
      setRestock(false);

      if (data.notified && (data.notified.email || data.notified.whatsapp)) {
        toast(`Customer notified${data.notified.email ? " by email" : ""}${data.notified.whatsapp ? " on WhatsApp" : ""}.`);
      }

      await load();
      onChanged();
    }
  }

  async function trash() {
    if (!(await askConfirm({ title: "Move to trash?", message: "Stock is given back if it was taken. You can restore it later.", confirmLabel: "Move to trash", danger: true }))) return;
    if (await act("orderTrash", { orderId: o.orderId }, "Moved to trash.")) { onChanged(); onClose(); }
  }

  async function restoreOrder() {
    if (await act("orderRestore", { orderId: o.orderId }, "Order restored.")) { await load(); onChanged(); }
  }

  async function purge() {
    if (!(await askConfirm({ title: "Delete forever?", message: "This cannot be undone.", confirmLabel: "Delete forever", danger: true }))) return;
    if (await act("orderPurge", { orderId: o.orderId }, "Order deleted.")) { onChanged(); onClose(); }
  }

  async function notifyCustomerEmail() {
    if (await act("orderNotify", { orderId: o.orderId, what: "customerEmail", kind: "status" }, "Email sent.")) load();
  }

  function sendWhatsApp() {
    const to = detail.whatsapp?.to || o.whatsapp || o.phone;
    const url = whatsappLink(to, waText);
    if (!url) return toast("No phone number.", "error");
    window.open(url, "_blank", "noopener");
  }

  const waMode = !detail.whatsapp?.to && !o.whatsapp ? "phone" : "";

  return (
    <>
      <Modal
        wide
        title={`Order ${o.orderId}`}
        onClose={onClose}
        footer={
          <>
            <button type="button" className="ad-btn" onClick={() => printOrders([o], "invoice", detail.print)}>Print invoice</button>
            <button type="button" className="ad-btn" onClick={() => printOrders([o], "slip", detail.print)}>Packing slip</button>
            {can("orders.trash") && !o.trashed && <button type="button" className="ad-btn danger" onClick={trash}>Trash</button>}
            {o.trashed && can("orders.trash") && <button type="button" className="ad-btn" onClick={restoreOrder}>Restore</button>}
            {o.trashed && can("orders.delete") && <button type="button" className="ad-btn danger" onClick={purge}>Delete forever</button>}
            {canEdit && <button type="button" className="ad-btn primary" disabled={busy} onClick={saveDetails}>Save changes</button>}
          </>
        }
      >
        <div className="ad-btn-row" style={{ marginBottom: 14 }}>
          <StatusPill status={o.status} />
          <PayPill status={o.paymentStatus} />
          {o.trashed && <Badge tone="red">In trash</Badge>}
          <Badge>{o.source || "web"}</Badge>
          <span className="ad-muted">{formatDate(o.timestamp, true)}</span>
        </div>

        <div className="ad-split">
          <div>
            <Card title="Customer" className="">
              <div className="ad-form">
                <div className="ad-row">
                  <Field label="Name"><input value={form.name} disabled={!canEdit} onChange={(e) => set("name", e.target.value)} /></Field>
                  <Field label="Mobile"><input value={form.phone} disabled={!canEdit} onChange={(e) => set("phone", e.target.value)} /></Field>
                  <Field label="WhatsApp (optional)"><input value={form.whatsapp} disabled={!canEdit} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
                  <Field label="Email (optional)"><input value={form.email} disabled={!canEdit} onChange={(e) => set("email", e.target.value)} /></Field>
                </div>
                <div className="ad-row">
                  <Field label="Address"><textarea rows={2} value={form.address} disabled={!canEdit} onChange={(e) => set("address", e.target.value)} /></Field>
                  <Field label="Area"><input value={form.area} disabled={!canEdit} onChange={(e) => set("area", e.target.value)} /></Field>
                </div>
                {o.note && <div className="ad-note"><strong>Customer note:</strong> {o.note}</div>}
                {detail.customer?.blocked && <div className="ad-note bad">This customer is blocked. {detail.customer.note}</div>}
                {detail.customer?.otherOrders > 0 && <div className="ad-muted">{detail.customer.otherOrders} other order(s) from this number.</div>}
              </div>
            </Card>

            <Card title="Items" actions={itemsEditable && <button type="button" className="ad-btn small" onClick={ensureCatalog}>+ Add product</button>}>
              {itemsEditable && catalog && (
                <div style={{ marginBottom: 10 }}>
                  <ProductPicker
                    products={catalog}
                    onPick={(p, v) =>
                      setItems((list) => {
                        const idx = list.findIndex((i) => i.id === p.id && i.variantId === (v?.id || ""));
                        if (idx >= 0) return list.map((i, n) => (n === idx ? { ...i, qty: i.qty + 1 } : i));
                        return [...list, { id: p.id, variantId: v?.id || "", name: p.name, variant: v?.label || "", qty: 1, price: v?.price ?? p.price, cost: 0 }];
                      })
                    }
                  />
                </div>
              )}

              <table className="ad-items">
                <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th className="num">Total</th>{itemsEditable && <th></th>}</tr></thead>
                <tbody>
                  {items.map((i, n) => (
                    <tr key={`${i.id}-${i.variantId}-${n}`}>
                      <td>{i.name} {i.variant && <small className="ad-muted">({i.variant})</small>}</td>
                      <td>
                        {itemsEditable ? <input type="number" min="1" value={i.qty} onChange={(e) => setItems((l) => l.map((x, k) => (k === n ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x)))} /> : i.qty}
                      </td>
                      <td>
                        {itemsEditable ? <input type="number" min="0" value={i.price} onChange={(e) => setItems((l) => l.map((x, k) => (k === n ? { ...x, price: Math.max(0, Number(e.target.value) || 0) } : x)))} /> : money(i.price)}
                      </td>
                      <td className="num">{money(i.price * i.qty)}</td>
                      {itemsEditable && <td><button type="button" className="ad-btn small danger" disabled={items.length < 2} onClick={() => setItems((l) => l.filter((_, k) => k !== n))}>×</button></td>}
                    </tr>
                  ))}
                  {!items.length && <tr><td colSpan={5} className="ad-muted">{o.products}</td></tr>}
                </tbody>
              </table>

              <div className="ad-sum">
                <div><span>Subtotal</span><span>{money(itemsChanged ? newSubtotal : o.subtotal)}</span></div>
                {o.discount > 0 && <div><span>Discount {o.coupon && `(${o.coupon})`}</span><span>- {money(o.discount)}</span></div>}
                <div><span>Delivery</span><span>{money(o.deliveryCharge)}</span></div>
                <div className="total"><span>Total</span><span>{itemsChanged ? "recalculated on save" : money(o.total)}</span></div>
              </div>
              {!itemsEditable && canEdit && <p className="ad-muted">Items can be edited while the order is New, Confirmed or Processing.</p>}
            </Card>

            {(detail.returns || []).length > 0 && (
              <Card title="Returns on this order">
                {detail.returns.map((r) => (
                  <div key={r.id} className="ad-muted">{r.type} · {money(r.amount)} · <b>{r.status}</b> · {r.reason}</div>
                ))}
              </Card>
            )}
          </div>

          <div>
            {canEdit && (
              <Card title="Change status">
                <div className="ad-form">
                  <Field label="New status">
                    <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                      {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Reason / note (shown to customer for cancellations)">
                    <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="optional" />
                  </Field>
                  {newStatus === "Returned" && <Toggle checked={restock} onChange={setRestock} label="Put items back in stock" />}
                  <Toggle checked={notify} onChange={setNotify} label="Tell the customer" hint="Email, and automatic WhatsApp if it is switched on in Settings" />
                  <button type="button" className="ad-btn primary" disabled={busy || newStatus === o.status} onClick={changeStatus}>
                    Update status
                  </button>
                </div>
              </Card>
            )}

            <Card title="Payment & delivery">
              <div className="ad-form">
                <Field label="Payment status">
                  <select value={form.paymentStatus} disabled={!canEdit} onChange={(e) => set("paymentStatus", e.target.value)}>
                    {PAYMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <div className="ad-row">
                  <Field label="Method">
                    <select value={form.payment} disabled={!canEdit} onChange={(e) => set("payment", e.target.value)}>
                      <option>Cash on Delivery</option><option>bKash</option><option>Pickup</option>
                    </select>
                  </Field>
                  <Field label="Delivery">
                    <select value={form.delivery} disabled={!canEdit} onChange={(e) => set("delivery", e.target.value)}>
                      <option>Home Delivery</option><option>Pickup</option>
                    </select>
                  </Field>
                </div>
                {o.payRef && <div className="ad-note">bKash payment reference: <b>{o.payRef}</b></div>}
                <Field label="Courier tracking code"><input value={form.trackingCode} disabled={!canEdit} onChange={(e) => set("trackingCode", e.target.value)} /></Field>
                <Field label="Private admin note"><textarea rows={2} value={form.adminNote} disabled={!canEdit} onChange={(e) => set("adminNote", e.target.value)} /></Field>
              </div>
            </Card>

            {can("orders.notify") && (
              <Card title="Message the customer">
                <div className="ad-form">
                  <Field label="WhatsApp message" hint={waMode ? "Using the order phone number (no separate WhatsApp number given)" : undefined}>
                    <textarea rows={4} value={waText} onChange={(e) => setWaText(e.target.value)} />
                  </Field>
                  <div className="ad-btn-row">
                    <button type="button" className="ad-btn wa" onClick={sendWhatsApp}>Open WhatsApp</button>
                    <button type="button" className="ad-btn" disabled={!o.email} onClick={notifyCustomerEmail} title={o.email ? "" : "No email on this order"}>Send email update</button>
                  </div>
                  {detail.trackUrl && <small className="ad-muted ad-mono">{detail.trackUrl}</small>}
                </div>
              </Card>
            )}

            <Card title="History">
              <ul className="ad-timeline">
                {[...(detail.history || [])].reverse().map((h, n) => (
                  <li key={n}>
                    <strong>{h.action}{h.to ? ` → ${h.to}` : ""}</strong>
                    {h.note && <div>{h.note}</div>}
                    <small>{formatDate(h.time, true)} · {h.actor}</small>
                  </li>
                ))}
              </ul>
              {can("orders.edit") && !o.trashed && (
                <button type="button" className="ad-btn small" onClick={() => setShowReturn(true)}>Record a return / refund</button>
              )}
            </Card>
          </div>
        </div>
      </Modal>

      {showReturn && (
        <ReturnForm
          order={o}
          onClose={() => setShowReturn(false)}
          onDone={() => { setShowReturn(false); load(); onChanged(); }}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* list                                                                 */
/* ------------------------------------------------------------------ */
/* yyyy-mm-dd in the browser's own day (the shop and its owner share a time zone) */
const dayString = (date) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
};

function quickRange(id) {
  const now = new Date();
  const back = (days) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);

  if (id === "today") return [dayString(now), dayString(now)];
  if (id === "yesterday") return [dayString(back(1)), dayString(back(1))];
  if (id === "7") return [dayString(back(6)), dayString(now)];
  if (id === "30") return [dayString(back(29)), dayString(now)];
  if (id === "month") return [dayString(new Date(now.getFullYear(), now.getMonth(), 1)), dayString(now)];
  return ["", ""];
}

const QUICK = [["today", "Today"], ["yesterday", "Yesterday"], ["7", "Last 7 days"], ["30", "Last 30 days"], ["month", "This month"]];
const FORWARD = ["Confirmed", "Processing", "Shipped", "Delivered"];

function BulkStatusModal({ ids, onClose, onDone }) {
  const [status, setStatus] = useState("Confirmed");
  const [notify, setNotify] = useState(true);
  const [progress, setProgress] = useState(null);

  async function run() {
    let ok = 0;
    let skipped = 0;
    const problems = [];

    for (let i = 0; i < ids.length; i++) {
      setProgress(`${i + 1} / ${ids.length}`);

      try {
        const res = await adminCall("orderStatus", { orderId: ids[i], status, notify });
        if (res.unchanged) skipped++;
        else ok++;
      } catch (problem) {
        problems.push(`${ids[i]}: ${problem.message}`);
      }
    }

    setProgress(null);
    toast(`${ok} order${ok === 1 ? "" : "s"} set to ${status}${skipped ? `, ${skipped} already were` : ""}${problems.length ? `, ${problems.length} failed` : ""}.`, problems.length ? "error" : "ok");
    if (problems.length) await askConfirm({ title: "Some orders were not changed", message: problems.slice(0, 8).join("\n"), confirmLabel: "OK", cancelLabel: "Close" });
    onDone();
  }

  return (
    <Modal
      title={`Change status of ${ids.length} order${ids.length === 1 ? "" : "s"}`}
      onClose={progress ? () => {} : onClose}
      footer={
        <>
          <button type="button" className="ad-btn ghost" disabled={Boolean(progress)} onClick={onClose}>Cancel</button>
          <button type="button" className="ad-btn primary" disabled={Boolean(progress)} onClick={run}>{progress ? `Working… ${progress}` : "Apply"}</button>
        </>
      }
    >
      <div className="ad-form">
        <Field label="New status">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {FORWARD.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Toggle checked={notify} onChange={setNotify} label="Tell the customers" hint="Sends the usual status email / WhatsApp message to each customer" />
        <p className="ad-muted" style={{ margin: 0 }}>Cancel and Return need a reason for each order, so do those one by one from the order page.</p>
      </div>
    </Modal>
  );
}

export function Orders() {
  const { arg, can } = useAdmin();
  const [trashed, setTrashed] = useState(false);
  const { data, loading, error, reload } = useLoad("orders", { includeTrashed: trashed }, [trashed]);
  const [tab, setTab] = useState("All");
  const [pay, setPay] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(arg?.open || "");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [bulkStatus, setBulkStatus] = useState(false);
  const query = useDebounced(q);

  useEffect(() => setPage(1), [tab, pay, query, trashed, from, to]);

  const orders = useMemo(() => (data?.orders || []).filter((o) => (trashed ? o.trashed : !o.trashed)), [data, trashed]);

  const counts = useMemo(() => {
    const c = { All: orders.length };
    ORDER_STATUSES.forEach((s) => { c[s] = orders.filter((o) => o.status === s).length; });
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return orders.filter((o) => {
      if (tab !== "All" && o.status !== tab) return false;
      if (pay && o.paymentStatus !== pay) return false;
      if (from || to) {
        const day = String(o.timestamp || "").slice(0, 10);
        if (from && day < from) return false;
        if (to && day > to) return false;
      }
      if (!needle) return true;
      return `${o.orderId} ${o.name} ${o.phone} ${o.email} ${o.products} ${o.area} ${o.trackingCode}`.toLowerCase().includes(needle);
    });
  }, [orders, tab, pay, query, from, to]);

  const rangeTotal = useMemo(
    () => filtered.filter((o) => !["Cancelled", "Returned"].includes(o.status)).reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    [filtered]
  );

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allShownSelected = shown.length > 0 && shown.every((o) => selected.has(o.orderId));
  const picked = filtered.filter((o) => selected.has(o.orderId));
  const rangeOn = Boolean(from || to);

  function toggle(id) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportCsv() {
    const head = ["Order", "Date", "Status", "Name", "Phone", "Email", "Address", "Area", "Items", "Subtotal", "Discount", "Coupon", "Delivery", "Total", "Payment", "Payment status", "Tracking", "Note"];
    const rows = filtered.map((o) => [o.orderId, o.timestamp, o.status, o.name, o.phone, o.email, o.address, o.area, o.products, o.subtotal, o.discount, o.coupon, o.deliveryCharge, o.total, o.payment, o.paymentStatus, o.trackingCode, o.note]);
    downloadFile(`orders-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([head, ...rows]));
  }

  return (
    <>
      <PageHead title={trashed ? "Order trash" : "Orders"} sub={`${filtered.length} of ${orders.length} orders${rangeOn ? ` · ${money(rangeTotal)} sales in this range` : ""}`}>
        <button type="button" className="ad-btn" onClick={reload}>Refresh</button>
        <button type="button" className="ad-btn" onClick={exportCsv} disabled={!filtered.length}>Export CSV</button>
        {can("orders.trash") && (
          <button type="button" className="ad-btn" onClick={() => setTrashed((v) => !v)}>{trashed ? "Back to orders" : "Trash"}</button>
        )}
        {can("orders.edit") && !trashed && (
          <button type="button" className="ad-btn primary" onClick={() => setCreating(true)}>+ New order</button>
        )}
      </PageHead>

      {!trashed && <Tabs tabs={["All", ...ORDER_STATUSES].map((s) => [s, s, counts[s]])} value={tab} onChange={(t) => { setTab(t); setSelected(new Set()); }} />}

      <div className="ad-toolbar">
        <input type="search" placeholder="Search order no, name, phone, product…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={pay} onChange={(e) => setPay(e.target.value)} aria-label="Payment status">
          <option value="">Any payment</option>
          {PAYMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="ad-daterow">
        <label>From <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>To <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></label>
        <div className="ad-chips">
          {QUICK.map(([id, label]) => (
            <button key={id} type="button" className="ad-chipbtn" onClick={() => { const [a, b] = quickRange(id); setFrom(a); setTo(b); }}>{label}</button>
          ))}
          {rangeOn && <button type="button" className="ad-chipbtn clear" onClick={() => { setFrom(""); setTo(""); }}>✕ All dates</button>}
        </div>
      </div>

      {picked.length > 0 && !trashed && (
        <div className="ad-note ad-bulkbar">
          <b>{picked.length} selected</b>
          <button type="button" className="ad-btn small primary" onClick={() => printOrders(picked, "slip", data?.print)}>Print packing slips</button>
          <button type="button" className="ad-btn small" onClick={() => printOrders(picked, "invoice", data?.print)}>Print invoices</button>
          {can("orders.edit") && <button type="button" className="ad-btn small" onClick={() => setBulkStatus(true)}>Change status…</button>}
          <button type="button" className="ad-btn small ghost" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : !shown.length ? (
        <Empty>No orders match.</Empty>
      ) : (
        <>
          <div className="ad-tablewrap">
            <table className="ad-table">
              <thead>
                <tr>
                  {!trashed && (
                    <th style={{ width: 34 }}>
                      <input type="checkbox" checked={allShownSelected} onChange={() => setSelected(allShownSelected ? new Set() : new Set([...selected, ...shown.map((o) => o.orderId)]))} aria-label="Select all on this page" />
                    </th>
                  )}
                  <th>Order</th><th>Customer</th><th>Items</th><th className="num">Total</th><th>Payment</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((o) => (
                  <tr key={o.orderId} className="click" onClick={() => setOpenId(o.orderId)}>
                    {!trashed && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(o.orderId)} onChange={() => toggle(o.orderId)} aria-label={`Select ${o.orderId}`} />
                      </td>
                    )}
                    <td>
                      <strong>{o.orderId}</strong>
                      <small>{formatDate(o.timestamp, true)}</small>
                    </td>
                    <td>
                      {o.name}
                      <small>{o.phone}{o.area ? ` · ${o.area}` : ""}</small>
                    </td>
                    <td style={{ maxWidth: 260 }}>
                      <small style={{ color: "inherit", fontSize: 12.5 }}>{o.products}</small>
                      {o.returns > 0 && <Badge tone="amber">{o.returns} return</Badge>}
                    </td>
                    <td className="num">{money(o.total)}</td>
                    <td>
                      {o.payment}
                      <small><PayPill status={o.paymentStatus} /></small>
                    </td>
                    <td><StatusPill status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} pages={pages} onPage={setPage} />
        </>
      )}

      {openId && <OrderModal orderId={openId} onClose={() => setOpenId("")} onChanged={reload} />}
      {bulkStatus && (
        <BulkStatusModal
          ids={picked.map((o) => o.orderId)}
          onClose={() => setBulkStatus(false)}
          onDone={() => { setBulkStatus(false); setSelected(new Set()); reload(); }}
        />
      )}
      {creating && (
        <NewOrderModal
          onClose={() => setCreating(false)}
          onDone={(order) => { setCreating(false); reload(); if (order?.orderId) setOpenId(order.orderId); }}
        />
      )}
    </>
  );
}
