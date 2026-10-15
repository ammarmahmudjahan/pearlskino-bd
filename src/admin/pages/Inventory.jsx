import { useMemo, useState } from "react";

import { downloadFile, formatDate, toCsv } from "../../lib/format";
import { Badge, Empty, ErrorBox, Field, Modal, PageHead, Pager, Spinner, Tabs, act, askConfirm, useAdmin, useDebounced, useLoad } from "../ui";

const REASONS = ["Restock / new delivery", "Damaged", "Lost", "Counting correction", "Sample / gift", "Other"];

function AdjustModal({ product, variant, onClose, onDone }) {
  const [mode, setMode] = useState("delta");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const current = variant ? variant.stock : product.stock;

  async function save() {
    if (amount === "" || Number.isNaN(Number(amount))) return;
    setBusy(true);
    const res = await act("stockAdjust", { productId: product.id, variantId: variant?.id || "", mode, amount: Number(amount), reason, note }, "Stock updated.");
    setBusy(false);
    if (res) onDone();
  }

  const after = amount === "" ? current : mode === "set" ? Number(amount) : current + Number(amount);

  return (
    <Modal
      title={`Adjust stock · ${product.name}${variant ? ` (${variant.label})` : ""}`}
      onClose={onClose}
      footer={<><button type="button" className="ad-btn ghost" onClick={onClose}>Cancel</button><button type="button" className="ad-btn primary" disabled={busy || amount === "" || after < 0} onClick={save}>Save</button></>}
    >
      <div className="ad-form">
        <div className="ad-note">Now in stock: <b>{current}</b> → after: <b>{Number.isFinite(after) ? after : "—"}</b></div>
        <div className="ad-row">
          <Field label="What to do">
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="delta">Add or remove (use − to remove)</option>
              <option value="set">Set exact count</option>
            </select>
          </Field>
          <Field label={mode === "set" ? "New count" : "Change by"}>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </Field>
        </div>
        <Field label="Reason">
          <select value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map((r) => <option key={r}>{r}</option>)}</select>
        </Field>
        <Field label="Note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} /></Field>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* "tell me when it is back" requests                                   */
/* ------------------------------------------------------------------ */
function StockAlerts() {
  const { can, refreshBadges } = useAdmin();
  const { data, loading, error, reload } = useLoad("stockAlerts");
  const [view, setView] = useState("ready");
  const editable = can("inventory.adjust");

  const items = useMemo(() => data?.items || [], [data]);

  const groups = useMemo(() => ({
    ready: items.filter((i) => i.ready),
    waiting: items.filter((i) => i.status === "waiting" && !i.ready),
    notified: items.filter((i) => i.status === "notified"),
    all: items,
  }), [items]);

  async function setStatus(ids, status, message) {
    const res = await act("stockAlertUpdate", { ids, status }, message);
    if (res) {
      reload();
      refreshBadges?.();
    }
  }

  async function remove(ids) {
    if (!(await askConfirm({ title: `Delete ${ids.length} request${ids.length === 1 ? "" : "s"}?`, message: "They are removed for good.", confirmLabel: "Delete", danger: true }))) return;
    if (await act("stockAlertDelete", { ids }, "Deleted.")) {
      reload();
      refreshBadges?.();
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const list = groups[view] || [];

  return (
    <>
      <div className="ad-note" style={{ marginBottom: 12 }}>
        Customers who pressed <b>"Notify me when it is back"</b> on a sold-out product. People with an email address are emailed automatically when you add stock. For the others, press <b>WhatsApp</b>: the message is ready, you only hit Send.
      </div>

      <div className="ad-btn-row" style={{ marginBottom: 12 }}>
        {[["ready", "Back in stock - tell them"], ["waiting", "Still waiting"], ["notified", "Told"], ["all", "All"]].map(([id, label]) => (
          <button key={id} type="button" className={`ad-chipbtn${view === id ? " on" : ""}`} onClick={() => setView(id)}>
            {label} <b>{groups[id].length}</b>
          </button>
        ))}
        {editable && view === "ready" && groups.ready.length > 0 && (
          <button type="button" className="ad-btn small" onClick={() => setStatus(groups.ready.map((i) => i.id), "notified", "Marked as told.")}>Mark all as told</button>
        )}
      </div>

      {!list.length ? (
        <Empty>{view === "ready" ? "No one is waiting for something that is back in stock." : "Nothing here."}</Empty>
      ) : (
        <div className="ad-tablewrap">
          <table className="ad-table">
            <thead><tr><th>Customer</th><th>Product</th><th className="num">Stock now</th><th>Asked</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id}>
                  <td><strong>{i.name || "Customer"}</strong><small>{[i.phone, i.email].filter(Boolean).join(" · ")}</small></td>
                  <td>{i.product}{i.variantLabel && <small>{i.variantLabel}</small>}</td>
                  <td className="num">{i.stock === null ? "—" : i.stock <= 0 ? <Badge tone="red">Out</Badge> : i.stock}</td>
                  <td>{formatDate(i.created)}</td>
                  <td>
                    {i.status === "notified" ? <Badge tone="green">told{i.via ? ` (${i.via})` : ""}</Badge> : i.ready ? <Badge tone="purple">back in stock</Badge> : i.status === "dismissed" ? <Badge>dismissed</Badge> : <Badge tone="amber">waiting</Badge>}
                  </td>
                  <td>
                    <div className="ad-btn-row" style={{ flexWrap: "nowrap", justifyContent: "flex-end" }}>
                      {i.waUrl && i.status !== "notified" && (
                        <a className="ad-btn wa small" href={i.waUrl} target="_blank" rel="noreferrer" onClick={() => editable && setStatus([i.id], "notified")}>WhatsApp</a>
                      )}
                      {editable && i.status === "waiting" && <button type="button" className="ad-btn small" onClick={() => setStatus([i.id], "notified", "Marked as told.")}>Told</button>}
                      {editable && i.status !== "dismissed" && i.status !== "notified" && <button type="button" className="ad-btn small ghost" onClick={() => setStatus([i.id], "dismissed", "Dismissed.")}>Dismiss</button>}
                      {editable && <button type="button" className="ad-btn small danger" onClick={() => remove([i.id])}>Delete</button>}
                    </div>
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

export default function Inventory() {
  const { can, arg } = useAdmin();
  const [tab, setTab] = useState(arg?.tab || "low");
  const products = useLoad("products");
  const low = useLoad("lowStock");
  const log = useLoad("inventoryLog", { limit: 200 });
  const [adjust, setAdjust] = useState(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const query = useDebounced(q);

  const list = products.data?.products || [];
  const lowItems = low.data?.items || [];

  const rows = useMemo(() => {
    const out = [];
    const needle = query.trim().toLowerCase();

    list
      .filter((p) => p.visibility !== "deleted")
      .forEach((p) => {
        if (needle && !`${p.name} ${p.sku}`.toLowerCase().includes(needle)) return;
        if (p.variants?.length) p.variants.forEach((v) => out.push({ p, v, stock: v.stock, key: `${p.id}-${v.id}` }));
        else out.push({ p, v: null, stock: p.stock, key: p.id });
      });

    return out;
  }, [list, query]);

  const pages = Math.max(1, Math.ceil(rows.length / 30));
  const shown = rows.slice((page - 1) * 30, page * 30);

  function reloadAll() {
    products.reload();
    low.reload();
    log.reload();
    setAdjust(null);
  }

  function exportStock() {
    downloadFile("stock.csv", toCsv([["Product", "Option", "SKU", "Stock", "Low alert at"], ...rows.map((r) => [r.p.name, r.v?.label || "", r.v?.sku || r.p.sku, r.stock, r.p.lowThreshold])]));
  }

  const loading = products.loading || low.loading;
  if (loading) return <Spinner />;
  if (products.error) return <ErrorBox error={products.error} onRetry={products.reload} />;

  return (
    <>
      <PageHead title="Inventory" sub="Every stock change is logged. Set a different low-stock level per product in the product editor.">
        <button type="button" className="ad-btn" onClick={exportStock}>Export stock CSV</button>
      </PageHead>

      <Tabs tabs={[["low", "Low stock", lowItems.length], ["alerts", "Waiting customers"], ["all", "All stock"], ["log", "Stock log"]]} value={tab} onChange={setTab} />

      {tab === "alerts" && <StockAlerts />}

      {tab === "low" &&
        (lowItems.length ? (
          <div className="ad-tablewrap">
            <table className="ad-table">
              <thead><tr><th>Product</th><th className="num">Left</th><th className="num">Alert at</th><th></th></tr></thead>
              <tbody>
                {lowItems.map((i) => {
                  const p = list.find((x) => x.id === i.productId);
                  const v = p?.variants?.find((x) => x.id === i.variantId) || null;
                  return (
                    <tr key={`${i.productId}-${i.variantId}`}>
                      <td>{i.name}{i.variant && <small>{i.variant}</small>}{i.visibility !== "visible" && <small>{i.visibility}</small>}</td>
                      <td className="num">{i.stock <= 0 ? <Badge tone="red">Out</Badge> : <Badge tone="amber">{i.stock}</Badge>}</td>
                      <td className="num">{i.threshold}</td>
                      <td>{p && can("inventory.adjust") && <button type="button" className="ad-btn small" onClick={() => setAdjust({ p, v })}>Adjust</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Everything is well stocked. ✦</Empty>
        ))}

      {tab === "all" && (
        <>
          <div className="ad-toolbar"><input type="search" placeholder="Search product or SKU…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
          <div className="ad-tablewrap">
            <table className="ad-table">
              <thead><tr><th>Product</th><th>SKU</th><th className="num">Stock</th><th className="num">Alert at</th><th></th></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.key}>
                    <td>{r.p.name}{r.v && <small>{r.v.label}</small>}</td>
                    <td>{r.v?.sku || r.p.sku || "—"}</td>
                    <td className="num">{r.stock <= 0 ? <Badge tone="red">Out</Badge> : r.stock <= r.p.lowThreshold ? <Badge tone="amber">{r.stock}</Badge> : r.stock}</td>
                    <td className="num">{r.p.lowThreshold}</td>
                    <td>{can("inventory.adjust") && <button type="button" className="ad-btn small" onClick={() => setAdjust({ p: r.p, v: r.v })}>Adjust</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} pages={pages} onPage={setPage} />
        </>
      )}

      {tab === "log" &&
        (log.loading ? (
          <Spinner />
        ) : (log.data?.items || []).length ? (
          <div className="ad-tablewrap">
            <table className="ad-table">
              <thead><tr><th>When</th><th>Product</th><th className="num">Change</th><th className="num">Before → after</th><th>Reason</th><th>By</th></tr></thead>
              <tbody>
                {log.data.items.map((i, n) => (
                  <tr key={n}>
                    <td>{formatDate(i.time, true)}</td>
                    <td>{i.product}{i.variantId && <small>{i.variantId}</small>}</td>
                    <td className="num"><b style={{ color: i.change < 0 ? "#a2455a" : "#2f6b45" }}>{i.change > 0 ? `+${i.change}` : i.change}</b></td>
                    <td className="num">{i.before} → {i.after}</td>
                    <td>{i.reason}{i.ref && <small>{i.ref}</small>}</td>
                    <td>{i.actor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No stock changes yet.</Empty>
        ))}

      {adjust && <AdjustModal product={adjust.p} variant={adjust.v} onClose={() => setAdjust(null)} onDone={reloadAll} />}
    </>
  );
}
