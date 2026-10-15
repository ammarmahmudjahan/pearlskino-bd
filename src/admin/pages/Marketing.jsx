import { useState } from "react";

import { adminCall } from "../../lib/adminApi";
import { money } from "../../lib/format";
import { Badge, Card, Empty, ErrorBox, Field, IMAGE_TYPES, Modal, PageHead, Spinner, Toggle, act, askConfirm, compressImage, toast, useAdmin, useLoad } from "../ui";

/* ------------------------------------------------------------------ */
/* coupons                                                              */
/* ------------------------------------------------------------------ */
function couponText(c) {
  if (c.type === "percent") return `${c.value}% off${c.maxDiscount ? ` (max ${money(c.maxDiscount)})` : ""}`;
  if (c.type === "fixed") return `${money(c.value)} off`;
  return "Free delivery";
}

function CouponModal({ coupon, onClose, onSaved }) {
  const isNew = !coupon;
  const [f, setF] = useState(
    coupon
      ? { ...coupon, originalCode: coupon.code }
      : { code: "", type: "percent", value: 10, minOrder: 0, maxDiscount: 0, starts: "", expires: "", limit: 0, perCustomer: 1, active: true, description: "" }
  );
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    setBusy(true);
    const res = await act("couponSave", { coupon: f }, "Coupon saved.");
    setBusy(false);
    if (res) onSaved();
  }

  return (
    <Modal
      title={isNew ? "New coupon" : `Edit ${coupon.code}`}
      onClose={onClose}
      footer={<><button type="button" className="ad-btn ghost" onClick={onClose}>Cancel</button><button type="button" className="ad-btn primary" disabled={busy} onClick={save}>Save coupon</button></>}
    >
      <div className="ad-form">
        <div className="ad-row">
          <Field label="Code *" hint="Letters and numbers, e.g. WELCOME10"><input value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} maxLength={24} /></Field>
          <Field label="Type">
            <select value={f.type} onChange={(e) => set("type", e.target.value)}>
              <option value="percent">Percent off</option>
              <option value="fixed">Fixed amount off</option>
              <option value="shipping">Free delivery</option>
            </select>
          </Field>
          {f.type !== "shipping" && (
            <Field label={f.type === "percent" ? "Percent (1-100)" : "Amount (৳)"}><input type="number" min="0" value={f.value} onChange={(e) => set("value", e.target.value)} /></Field>
          )}
        </div>
        <div className="ad-row">
          <Field label="Minimum order (৳)" hint="0 = no minimum"><input type="number" min="0" value={f.minOrder} onChange={(e) => set("minOrder", e.target.value)} /></Field>
          {f.type === "percent" && <Field label="Max discount (৳)" hint="0 = no cap"><input type="number" min="0" value={f.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value)} /></Field>}
        </div>
        <div className="ad-row">
          <Field label="Starts"><input type="date" value={f.starts} onChange={(e) => set("starts", e.target.value)} /></Field>
          <Field label="Ends"><input type="date" value={f.expires} onChange={(e) => set("expires", e.target.value)} /></Field>
        </div>
        <div className="ad-row">
          <Field label="Total uses allowed" hint="0 = unlimited"><input type="number" min="0" value={f.limit} onChange={(e) => set("limit", e.target.value)} /></Field>
          <Field label="Uses per customer" hint="0 = unlimited"><input type="number" min="0" value={f.perCustomer} onChange={(e) => set("perCustomer", e.target.value)} /></Field>
        </div>
        <Field label="Note for yourself"><input value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={200} /></Field>
        <Toggle checked={f.active} onChange={(v) => set("active", v)} label="Coupon is active" />
      </div>
    </Modal>
  );
}

export function Coupons() {
  const { data, loading, error, reload } = useLoad("coupons");
  const [edit, setEdit] = useState(undefined);

  async function remove(c) {
    if (!(await askConfirm({ title: `Delete ${c.code}?`, message: "Past orders keep their discount.", confirmLabel: "Delete", danger: true }))) return;
    if (await act("couponDelete", { code: c.code }, "Coupon deleted.")) reload();
  }

  async function toggle(c) {
    if (await act("couponSave", { coupon: { ...c, originalCode: c.code, active: !c.active } })) reload();
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const list = data.coupons || [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHead title="Coupons" sub="Customers enter these codes in the bag or at checkout">
        <button type="button" className="ad-btn primary" onClick={() => setEdit(null)}>＋ New coupon</button>
      </PageHead>

      {!list.length ? <Empty>No coupons yet.</Empty> : (
        <div className="ad-tablewrap">
          <table className="ad-table">
            <thead><tr><th>Code</th><th>Discount</th><th>Conditions</th><th className="num">Used</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.map((c) => {
                const expired = c.expires && c.expires < today;
                const full = c.limit > 0 && c.used >= c.limit;
                return (
                  <tr key={c.code}>
                    <td><strong className="ad-mono">{c.code}</strong>{c.description && <small>{c.description}</small>}</td>
                    <td>{couponText(c)}</td>
                    <td>
                      {c.minOrder > 0 && <small>min {money(c.minOrder)}</small>}
                      {(c.starts || c.expires) && <small>{c.starts || "…"} → {c.expires || "…"}</small>}
                      {c.perCustomer > 0 && <small>{c.perCustomer} per customer</small>}
                    </td>
                    <td className="num">{c.used}{c.limit > 0 ? ` / ${c.limit}` : ""}</td>
                    <td>{expired ? <Badge tone="red">Expired</Badge> : full ? <Badge tone="amber">Used up</Badge> : c.active ? <Badge tone="green">Active</Badge> : <Badge>Paused</Badge>}</td>
                    <td>
                      <div className="ad-btn-row" style={{ flexWrap: "nowrap", justifyContent: "flex-end" }}>
                        <button type="button" className="ad-btn small" onClick={() => setEdit(c)}>Edit</button>
                        <button type="button" className="ad-btn small" onClick={() => toggle(c)}>{c.active ? "Pause" : "Activate"}</button>
                        <button type="button" className="ad-btn small danger" onClick={() => remove(c)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {edit !== undefined && <CouponModal coupon={edit} onClose={() => setEdit(undefined)} onSaved={() => { setEdit(undefined); reload(); }} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* banners                                                              */
/* ------------------------------------------------------------------ */
function BannerModal({ banner, onClose, onSaved }) {
  const [f, setF] = useState(banner || { title: "", subtitle: "", image: "", link: "", button: "", active: true, starts: "", ends: "" });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function upload(file) {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return toast("Please use PNG, JPG or WebP.", "error");
    setBusy(true);
    try {
      const image = await compressImage(file, { max: 2000, quality: 0.85 });
      const res = await adminCall("uploadProductImage", { image, productName: f.title || "banner" });
      set("image", res.url);
    } catch (problem) {
      toast(problem.message, "error");
    }
    setBusy(false);
  }

  async function save() {
    setBusy(true);
    const res = await act("bannerSave", { banner: f }, "Banner saved.");
    setBusy(false);
    if (res) onSaved();
  }

  return (
    <Modal
      title={banner ? "Edit banner" : "New banner"}
      onClose={onClose}
      footer={<><button type="button" className="ad-btn ghost" onClick={onClose}>Cancel</button><button type="button" className="ad-btn primary" disabled={busy} onClick={save}>Save banner</button></>}
    >
      <div className="ad-form">
        <Field label="Title"><input value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={120} /></Field>
        <Field label="Subtitle"><textarea rows={2} value={f.subtitle} onChange={(e) => set("subtitle", e.target.value)} maxLength={300} /></Field>
        <div>
          <div className="ad-field"><span>Banner picture</span></div>
          <div className="ad-imglist" style={{ marginTop: 6 }}>
            {f.image && <div className="ad-img main" style={{ width: 180 }}><img src={f.image} alt="" /><div className="tools"><button type="button" onClick={() => set("image", "")}>×</button></div></div>}
            <label className="ad-upload" style={{ width: 120 }}>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
              {busy ? "Working…" : "＋ Upload"}
            </label>
          </div>
        </div>
        <div className="ad-row">
          <Field label="Button text"><input value={f.button} onChange={(e) => set("button", e.target.value)} placeholder="Shop now" maxLength={40} /></Field>
          <Field label="Button link" hint="/shop or https://…"><input value={f.link} onChange={(e) => set("link", e.target.value)} placeholder="/shop" /></Field>
        </div>
        <div className="ad-row">
          <Field label="Show from"><input type="date" value={f.starts} onChange={(e) => set("starts", e.target.value)} /></Field>
          <Field label="Show until"><input type="date" value={f.ends} onChange={(e) => set("ends", e.target.value)} /></Field>
        </div>
        <Toggle checked={f.active} onChange={(v) => set("active", v)} label="Show on the Home page" />
      </div>
    </Modal>
  );
}

export function Banners() {
  const { can } = useAdmin();
  const { data, loading, error, reload } = useLoad("banners");
  const [edit, setEdit] = useState(undefined);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const list = data.banners || [];

  async function move(index, dir) {
    const to = index + dir;
    if (to < 0 || to >= list.length) return;
    const ids = list.map((b) => b.id);
    [ids[index], ids[to]] = [ids[to], ids[index]];
    if (await act("bannerReorder", { ids })) reload();
  }

  async function remove(b) {
    if (!(await askConfirm({ title: "Delete this banner?", confirmLabel: "Delete", danger: true }))) return;
    if (await act("bannerDelete", { id: b.id }, "Banner deleted.")) reload();
  }

  async function toggle(b) {
    if (await act("bannerSave", { banner: { ...b, active: !b.active } })) reload();
  }

  return (
    <>
      <PageHead title="Home banners" sub="Offer / announcement slides shown on the Home page (the heading and marquee texts live in Site text)">
        {can("banners.manage") && <button type="button" className="ad-btn primary" onClick={() => setEdit(null)}>＋ New banner</button>}
      </PageHead>

      {!list.length ? <Empty>No banners yet. The Home banner section stays hidden until you add one.</Empty> : (
        <div className="ad-grid c2">
          {list.map((b, index) => (
            <Card key={b.id} className="">
              <div className="ad-cell" style={{ alignItems: "flex-start" }}>
                {b.image ? <img className="ad-thumb" style={{ width: 96, height: 64 }} src={b.image} alt="" /> : <span className="ad-thumb empty" style={{ width: 96, height: 64 }}>✦</span>}
                <div style={{ minWidth: 0 }}>
                  <strong>{b.title || "(no title)"}</strong>
                  <small className="ad-muted">{b.subtitle}</small>
                  <div style={{ marginTop: 6 }}>{b.active ? <Badge tone="green">Showing</Badge> : <Badge>Hidden</Badge>}{(b.starts || b.ends) && <Badge tone="amber">{b.starts || "…"} → {b.ends || "…"}</Badge>}</div>
                </div>
              </div>
              <div className="ad-btn-row" style={{ marginTop: 12 }}>
                <span className="ad-order-btns">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0}>↑</button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === list.length - 1}>↓</button>
                </span>
                <button type="button" className="ad-btn small" onClick={() => setEdit(b)}>Edit</button>
                <button type="button" className="ad-btn small" onClick={() => toggle(b)}>{b.active ? "Hide" : "Show"}</button>
                <button type="button" className="ad-btn small danger" onClick={() => remove(b)}>Delete</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {edit !== undefined && <BannerModal banner={edit} onClose={() => setEdit(undefined)} onSaved={() => { setEdit(undefined); reload(); }} />}
    </>
  );
}
