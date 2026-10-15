import { useEffect, useMemo, useState } from "react";

import { adminCall } from "../../lib/adminApi";
import { downloadFile, formatDate, money, toCsv, whatsappLink } from "../../lib/format";
import { Badge, Empty, ErrorBox, Field, Modal, PageHead, Pager, Spinner, StatusPill, Tabs, Toggle, act, askConfirm, toast, useAdmin, useDebounced, useLoad } from "../ui";

const SEGMENTS = [
  ["vip", "VIP", "purple"],
  ["repeat", "Repeat buyers", "green"],
  ["firstTimer", "First-time", "blue"],
  ["recent", "Ordered lately", "green"],
  ["inactive", "Inactive", "amber"],
  ["noOrders", "No orders yet", "grey"],
  ["blocked", "Blocked", "red"],
];
const SEGMENT_LABEL = Object.fromEntries(SEGMENTS.map(([id, label]) => [id, label]));
const SEGMENT_TONE = Object.fromEntries(SEGMENTS.map(([id, , tone]) => [id, tone]));

function CustomerModal({ customer, accountsByPhone, onClose, onChanged }) {
  const { can, go } = useAdmin();
  const detail = useLoad("customerDetail", { phone: customer.phone, id: customer.id });
  const [note, setNote] = useState(customer.note || "");
  const [tags, setTags] = useState(customer.tags || "");
  const [blocked, setBlocked] = useState(Boolean(customer.blocked));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const account = detail.data?.account || accountsByPhone[customer.phone] || null;
  const orders = detail.data?.orders || [];

  async function save() {
    setBusy(true);
    const res = await act("customerFlag", { phone: customer.phone, name: customer.name, blocked, blockReason: reason || detail.data?.flag?.blockReason || "", note, tags }, "Customer saved.");
    setBusy(false);
    if (res) { onChanged(); detail.reload(); }
  }

  async function removeCustomer() {
    const ok = await askConfirm({
      title: `Delete ${customer.name} from your customer list?`,
      message: "Their past orders are NOT touched and stay in Orders. The customer disappears from this list. If they order again, or you add the same phone number again, they come back.",
      confirmLabel: "Delete customer",
      danger: true,
    });
    if (!ok) return;

    setBusy(true);
    const res = await act("customerDelete", { id: customer.id }, "Customer removed from the list.");
    setBusy(false);

    if (res) {
      onChanged();
      onClose();
    }
  }

  async function accountOp(op) {
    if (op === "disable" && !(await askConfirm({ title: "Disable this login?", message: "They can still order as a guest, but cannot log in.", confirmLabel: "Disable", danger: true }))) return;
    const res = await act("accountAction", { phone: customer.phone, op }, op === "resetPassword" ? null : "Done.");
    if (!res) return;
    if (op === "resetPassword") {
      await askConfirm({ title: "Temporary password", message: `Give this to the customer: ${res.tempPassword}\n(They should change it after logging in.)`, confirmLabel: "OK", cancelLabel: "Close" });
    }
    detail.reload();
    onChanged();
  }

  return (
    <Modal
      wide
      title={customer.name}
      onClose={onClose}
      footer={
        can("customers.edit") ? (
          <>
            <button type="button" className="ad-btn danger" style={{ marginRight: "auto" }} disabled={busy} onClick={removeCustomer}>Delete customer</button>
            <button type="button" className="ad-btn primary" disabled={busy || !customer.phone} onClick={save} title={customer.phone ? "" : "Notes and blocking need a phone number"}>Save</button>
          </>
        ) : null
      }
    >
      <div className="ad-split">
        <div>
          <dl className="ad-kv" style={{ marginBottom: 16 }}>
            <dt>Mobile</dt><dd>{customer.phone}</dd>
            <dt>Email</dt><dd>{customer.email || "—"}</dd>
            <dt>Address</dt><dd>{customer.address || "—"} {customer.area && `· ${customer.area}`}</dd>
            <dt>Orders</dt><dd>{customer.orders} ({customer.cancelled} cancelled)</dd>
            <dt>Total spent</dt><dd>{money(customer.totalSpent)}</dd>
            <dt>First / last order</dt><dd>{formatDate(customer.firstOrder)} / {formatDate(customer.lastOrder)}</dd>
            <dt>Group</dt>
            <dd>
              {(customer.segments || []).length
                ? customer.segments.map((id) => <Badge key={id} tone={SEGMENT_TONE[id]}>{SEGMENT_LABEL[id] || id}</Badge>)
                : "—"}
            </dd>
          </dl>

          <div className="ad-btn-row" style={{ marginBottom: 14 }}>
            {customer.phone && <a className="ad-btn wa" href={whatsappLink(customer.phone, "")} target="_blank" rel="noreferrer">WhatsApp</a>}
            {customer.phone && <a className="ad-btn" href={`tel:${customer.phone}`}>Call</a>}
            {customer.email && <a className="ad-btn" href={`mailto:${customer.email}`}>Email</a>}
          </div>

          <h3 style={{ fontFamily: "Georgia, serif", margin: "6px 0 8px" }}>Order history</h3>
          {detail.loading ? <Spinner /> : orders.length ? (
            <div className="ad-tablewrap">
              <table className="ad-table">
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.orderId} className="click" onClick={() => { onClose(); go("orders", { open: o.orderId }); }}>
                      <td><strong>{o.orderId}</strong><small>{formatDate(o.timestamp)}</small></td>
                      <td><StatusPill status={o.status} /></td>
                      <td className="num">{money(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty>No orders.</Empty>}
        </div>

        <div className="ad-form">
          <div className="ad-card" style={{ margin: 0 }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: 18, marginBottom: 10 }}>Online account</h2>
            {account ? (
              <>
                <p className="ad-muted" style={{ margin: "0 0 10px" }}>
                  {account.disabled ? <Badge tone="red">Disabled</Badge> : <Badge tone="green">Active</Badge>} · joined {formatDate(account.created)} · last login {account.lastLogin ? formatDate(account.lastLogin, true) : "never"}
                </p>
                {can("customers.edit") && (
                  <div className="ad-btn-row">
                    <button type="button" className="ad-btn small" onClick={() => accountOp("resetPassword")}>Reset password</button>
                    <button type="button" className="ad-btn small" onClick={() => accountOp(account.disabled ? "enable" : "disable")}>{account.disabled ? "Enable login" : "Disable login"}</button>
                  </div>
                )}
              </>
            ) : <p className="ad-muted" style={{ margin: 0 }}>This customer has no online account (guest orders only).</p>}
          </div>

          {can("customers.edit") && (
            <>
              <Toggle checked={blocked} onChange={setBlocked} label="Block this customer" hint="New orders from this number are refused" />
              {blocked && <Field label="Reason (private)"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={detail.data?.flag?.blockReason || ""} /></Field>}
              <Field label="Private note"><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              <Field label="Tags" hint="e.g. vip, wholesale"><input value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* add a customer by hand                                               */
/* ------------------------------------------------------------------ */
function AddCustomerModal({ onClose, onDone }) {
  const [f, setF] = useState({ name: "", phone: "", email: "", area: "", address: "", note: "" });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    setBusy(true);
    const res = await act("customerCreate", f, "Customer added.");
    setBusy(false);
    if (res) onDone();
  }

  return (
    <Modal
      title="Add a customer"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ad-btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="ad-btn primary" disabled={busy || f.name.trim().length < 2} onClick={save}>{busy ? "Saving…" : "Add customer"}</button>
        </>
      }
    >
      <div className="ad-form">
        <div className="ad-note">Use this for people who order by phone, WhatsApp or Facebook. Adding a number that was deleted before brings that customer back.</div>
        <Field label="Name *"><input value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={80} /></Field>
        <div className="ad-row">
          <Field label="Mobile" hint="01XXXXXXXXX"><input type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Email"><input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        </div>
        <Field label="Area"><input value={f.area} onChange={(e) => set("area", e.target.value)} maxLength={100} /></Field>
        <Field label="Address"><textarea rows={2} value={f.address} onChange={(e) => set("address", e.target.value)} maxLength={400} /></Field>
        <Field label="Private note"><textarea rows={2} value={f.note} onChange={(e) => set("note", e.target.value)} maxLength={1000} /></Field>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* send an offer to a group                                             */
/* ------------------------------------------------------------------ */
const DEFAULT_MESSAGE = "Hi {name}, thank you for being with {store}! Here is a little something for you - use code {coupon} on your next order.\n{link}";

function BroadcastModal({ ids, segment, summary, onClose }) {
  const [channel, setChannel] = useState("whatsapp");
  const [seg, setSeg] = useState(segment || "all");
  const [subject, setSubject] = useState("A little offer from us");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [coupon, setCoupon] = useState("");
  const [check, setCheck] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [done, setDone] = useState(() => new Set());

  const target = ids.length ? { ids } : { segment: seg };

  /* "how many people will really get it?" - asked again whenever the group changes */
  useEffect(() => {
    let alive = true;
    setCheck(null);

    const timer = setTimeout(async () => {
      try {
        const res = await adminCall("customerBroadcast", { ...target, channel, dryRun: true });
        if (alive) setCheck(res);
      } catch (problem) {
        if (alive) setCheck({ error: problem.message || "Could not check." });
      }
    }, 250);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // the target object is rebuilt each render; these are its real inputs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, seg, ids.join(",")]);

  async function send() {
    if (channel === "email" && !(await askConfirm({
      title: `Email ${check?.willSend ?? ""} customers?`,
      message: "The emails are sent right away from your store email. This cannot be undone.",
      confirmLabel: "Send emails",
    }))) return;

    setBusy(true);
    const res = await act("customerBroadcast", { ...target, channel, subject, message, coupon }, null);
    setBusy(false);

    if (res) {
      setResult(res);
      if (channel === "email") {
        toast(`${res.sent} email${res.sent === 1 ? "" : "s"} sent${res.failed ? `, ${res.failed} failed` : ""}.${res.stoppedForQuota ? " Stopped: the daily email limit was reached." : ""}`);
      }
    }
  }

  const group = ids.length ? `${ids.length} selected customer${ids.length === 1 ? "" : "s"}` : null;

  return (
    <Modal
      wide
      title="Send an offer"
      onClose={onClose}
      footer={
        result?.links ? (
          <button type="button" className="ad-btn primary" onClick={onClose}>Close</button>
        ) : (
          <>
            <button type="button" className="ad-btn ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="ad-btn primary" disabled={busy || !check || check.error || !check.willSend || message.trim().length < 5 || (channel === "email" && subject.trim().length < 3) || Boolean(result)} onClick={send}>
              {busy ? "Working…" : channel === "email" ? "Send emails" : "Prepare WhatsApp links"}
            </button>
          </>
        )
      }
    >
      {result?.links ? (
        <div className="ad-form">
          <div className="ad-note ok">
            {result.links.length} message{result.links.length === 1 ? " is" : "s are"} ready. WhatsApp opens with the text already typed - just press Send there. Tick each one when done so you do not lose your place.
          </div>
          <div className="ad-wa-list">
            {result.links.map((l) => (
              <div key={l.id} className={`ad-wa-row${done.has(l.id) ? " done" : ""}`}>
                <div>
                  <strong>{l.name}</strong>
                  <small>{l.phone}</small>
                </div>
                <a
                  className="ad-btn wa small"
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setDone((d) => new Set(d).add(l.id))}
                >
                  {done.has(l.id) ? "Opened ✓" : "Open WhatsApp"}
                </a>
              </div>
            ))}
          </div>
          {result.capped && <p className="ad-muted">Only the first {result.willSend} are listed at a time. Send these, then run it again for the rest.</p>}
        </div>
      ) : result ? (
        <div className="ad-form">
          <div className={`ad-note ${result.failed ? "warn" : "ok"}`}>
            Sent: <b>{result.sent}</b> · Failed: <b>{result.failed}</b>
            {result.stoppedForQuota ? " · Stopped early because the daily Gmail limit was reached. Try again tomorrow for the rest." : ""}
          </div>
        </div>
      ) : (
        <div className="ad-form">
          <div className="ad-btn-row">
            <button type="button" className={`ad-btn${channel === "whatsapp" ? " primary" : ""}`} onClick={() => setChannel("whatsapp")}>WhatsApp</button>
            <button type="button" className={`ad-btn${channel === "email" ? " primary" : ""}`} onClick={() => setChannel("email")}>Email</button>
          </div>

          {group ? (
            <p className="ad-muted" style={{ margin: 0 }}>To: <b>{group}</b> (blocked customers are skipped)</p>
          ) : (
            <Field label="Send to">
              <select value={seg} onChange={(e) => setSeg(e.target.value)}>
                <option value="all">Everyone ({summary.total})</option>
                {SEGMENTS.filter(([id]) => id !== "blocked").map(([id, label]) => (
                  <option key={id} value={id}>{label} ({summary[id] ?? 0})</option>
                ))}
              </select>
            </Field>
          )}

          <div className={`ad-note${check && !check.error && !check.willSend ? " warn" : ""}`}>
            {!check ? "Checking who can receive this…" : check.error ? check.error : (
              <>
                <b>{check.willSend}</b> of {check.selected} can receive this by {channel === "email" ? "email (they have an email address)" : "WhatsApp (they have a mobile number)"}.
                {check.capped ? " A single send is limited, so the rest need a second send." : ""}
                {channel === "email" && check.quota != null ? ` Emails you can still send today: ${check.quota}.` : ""}
              </>
            )}
          </div>

          {channel === "email" && (
            <Field label="Subject"><input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} /></Field>
          )}

          <Field label="Message" hint="{name} = first name · {store} = store name · {link} = your website · {coupon} = the code below">
            <textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1500} />
          </Field>

          <Field label="Coupon code to mention (optional)" hint="Make the coupon first under Coupons, then type its code here">
            <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="WELCOME10" maxLength={30} />
          </Field>

          {channel === "whatsapp" && <p className="ad-muted" style={{ margin: 0 }}>WhatsApp never sends by itself: you get one tap-to-open link per customer, and you press Send in WhatsApp.</p>}
        </div>
      )}
    </Modal>
  );
}

export default function Customers() {
  const { can } = useAdmin();
  const { data, loading, error, reload } = useLoad("customers");
  const accounts = useLoad("accounts");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);
  const [broadcast, setBroadcast] = useState(null); // null = closed, {ids, segment}
  const [selected, setSelected] = useState(() => new Set());
  const query = useDebounced(q);

  const accountsByPhone = useMemo(() => Object.fromEntries((accounts.data?.accounts || []).map((a) => [a.phone, a])), [accounts.data]);
  const all = useMemo(() => data?.customers || [], [data]);
  const summary = data?.summary || { total: 0 };
  const accountCount = useMemo(() => all.filter((c) => c.hasAccount).length, [all]);

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return all.filter((c) => {
      if (tab === "accounts" && !c.hasAccount) return false;
      if (tab !== "all" && tab !== "accounts" && !(c.segments || []).includes(tab)) return false;
      if (!needle) return true;
      return `${c.name} ${c.phone} ${c.email} ${c.area} ${c.tags}`.toLowerCase().includes(needle);
    });
  }, [all, tab, query]);

  const pages = Math.max(1, Math.ceil(list.length / 30));
  const shown = list.slice((page - 1) * 30, page * 30);
  const allShownSelected = shown.length > 0 && shown.every((c) => selected.has(c.id));

  function toggle(id) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportCsv() {
    downloadFile("customers.csv", toCsv([["Name", "Phone", "Email", "Area", "Orders", "Total spent", "Last order", "Groups", "Tags"], ...list.map((c) => [c.name, c.phone, c.email, c.area, c.orders, c.totalSpent, c.lastOrder, (c.segments || []).join(" "), c.tags])]));
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const rules = data?.rules || {};

  return (
    <>
      <PageHead title="Customers" sub={`${all.length} customers · ${accountCount} with an online account`}>
        <button type="button" className="ad-btn" onClick={exportCsv}>Export CSV</button>
        {can("customers.broadcast") && (
          <button type="button" className="ad-btn" onClick={() => setBroadcast({ ids: [], segment: SEGMENTS.some(([id]) => id === tab) && tab !== "blocked" ? tab : "all" })}>
            Send an offer
          </button>
        )}
        {can("customers.edit") && <button type="button" className="ad-btn primary" onClick={() => setAdding(true)}>＋ Add customer</button>}
      </PageHead>

      <div className="ad-segments">
        {SEGMENTS.filter(([id]) => id !== "blocked").map(([id, label, tone]) => (
          <button key={id} type="button" className={`ad-seg ${tone}${tab === id ? " on" : ""}`} onClick={() => { setTab(tab === id ? "all" : id); setPage(1); }}>
            <strong>{summary[id] ?? 0}</strong>
            <span>{label}</span>
          </button>
        ))}
      </div>
      <p className="ad-muted" style={{ margin: "0 0 14px" }}>
        VIP = spent {money(rules.vipMinSpent || 0)}+ or {rules.vipMinOrders || 0}+ orders · Inactive = no order for {rules.inactiveDays || 60}+ days. You can change these in Settings.
      </p>

      <Tabs
        tabs={[["all", "All", all.length], ["accounts", "With account", accountCount], ["blocked", "Blocked", summary.blocked ?? 0]]}
        value={["all", "accounts", "blocked"].includes(tab) ? tab : ""}
        onChange={(t) => { setTab(t); setPage(1); }}
      />
      <div className="ad-toolbar"><input type="search" placeholder="Search name, phone, email…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>

      {selected.size > 0 && (
        <div className="ad-note ad-bulkbar">
          <b>{selected.size} selected</b>
          {can("customers.broadcast") && <button type="button" className="ad-btn small primary" onClick={() => setBroadcast({ ids: [...selected], segment: "all" })}>Send an offer to them</button>}
          <button type="button" className="ad-btn small ghost" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {!shown.length ? <Empty>No customers here.</Empty> : (
        <>
          <div className="ad-tablewrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th style={{ width: 34 }}>
                    <input type="checkbox" checked={allShownSelected} onChange={() => setSelected(allShownSelected ? new Set() : new Set(shown.map((c) => c.id)))} aria-label="Select all" />
                  </th>
                  <th>Customer</th><th>Area</th><th className="num">Orders</th><th className="num">Spent</th><th>Last order</th><th></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.id} className="click" onClick={() => setOpen(c)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} aria-label={`Select ${c.name}`} />
                    </td>
                    <td><strong>{c.name}</strong><small>{c.phone}{c.email ? ` · ${c.email}` : ""}</small></td>
                    <td>{c.area || "—"}</td>
                    <td className="num">{c.orders}</td>
                    <td className="num">{money(c.totalSpent)}</td>
                    <td>{c.lastOrder ? formatDate(c.lastOrder) : "—"}</td>
                    <td>
                      {(c.segments || []).filter((id) => id !== "recent" && id !== "firstTimer").map((id) => <Badge key={id} tone={SEGMENT_TONE[id]}>{SEGMENT_LABEL[id]}</Badge>)}{" "}
                      {c.hasAccount && <Badge tone="purple">Account</Badge>} {c.tags && <Badge>{c.tags}</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} pages={pages} onPage={setPage} />
        </>
      )}

      {open && <CustomerModal customer={open} accountsByPhone={accountsByPhone} onClose={() => setOpen(null)} onChanged={() => { reload(); accounts.reload(); }} />}
      {adding && <AddCustomerModal onClose={() => setAdding(false)} onDone={() => { setAdding(false); reload(); }} />}
      {broadcast && <BroadcastModal ids={broadcast.ids} segment={broadcast.segment} summary={summary} onClose={() => setBroadcast(null)} />}
    </>
  );
}
