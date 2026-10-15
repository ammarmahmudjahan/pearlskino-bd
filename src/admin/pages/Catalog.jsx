import { useEffect, useMemo, useState } from "react";

import { downloadFile, money, parseCsv, toCsv } from "../../lib/format";
import { sized } from "../../lib/img";
import MediaManager from "../MediaManager";
import {
  Badge,
  Card,
  Empty,
  ErrorBox,
  Field,
  Modal,
  PageHead,
  Pager,
  Spinner,
  Tabs,
  Toggle,
  act,
  askConfirm,
  toast,
  useAdmin,
  useDebounced,
  useLoad,
} from "../ui";

const PAGE_SIZE = 30;
const FLAGS = [
  ["new", "New"],
  ["trending", "Trending"],
  ["featured", "Featured"],
  ["deal", "Deal"],
];

/* same rule as the server: ignore case and extra spaces */
const canon = (value) => String(value || "").replace(/\s+/g, " ").trim().toLowerCase();

const VIS_TONE = { visible: "green", draft: "purple", hidden: "amber", deleted: "red" };
const VIS_LABEL = { visible: "visible", draft: "draft", hidden: "hidden", deleted: "deleted" };

function Thumb({ src }) {
  return src ? <img className="ad-thumb" src={sized(src, 120)} alt="" loading="lazy" /> : <span className="ad-thumb empty">✦</span>;
}

/* ------------------------------------------------------------------ */
/* product editor                                                       */
/* ------------------------------------------------------------------ */
const EMPTY = {
  id: "",
  name: "",
  brand: "",
  subtitle: "",
  category: "",
  sku: "",
  price: "",
  oldPrice: "",
  costPrice: "",
  stock: 0,
  lowStock: 0,
  status: "active",
  visibility: "visible",
  description: "",
  tags: [],
  features: [],
  specs: [],
  flags: [],
  images: [],
  videos: [],
  alt: "",
  notes: "",
  variantLabel: "",
  variants: [],
};

function ProductEditor({ product, categories, onClose, onSaved }) {
  const { can } = useAdmin();
  const isClone = Boolean(product?.__clone);
  const isNew = !product || isClone;
  const [f, setF] = useState(() => {
    if (!product) return { ...EMPTY };

    const base = {
      ...EMPTY,
      ...product,
      oldPrice: product.oldPrice || "",
      costPrice: product.costPrice || "",
      tags: [...(product.tags || [])],
      features: [...(product.features || [])],
      specs: (product.specs || []).map((s) => ({ ...s })),
      flags: [...(product.flags || [])],
      images: [...(product.images || (product.image ? [product.image] : []))],
      videos: (product.videos || []).map((v) => ({ ...v })),
      variants: (product.variants || []).map((v) => ({ ...v, price: v.price ?? "" })),
    };

    /* a copy starts as a Draft with a new name, no SKU and fresh variant ids */
    if (isClone) {
      return {
        ...base,
        id: "",
        name: `${product.name} (copy)`,
        sku: "",
        visibility: "draft",
        variants: base.variants.map((v) => ({ ...v, id: "", sku: "" })),
      };
    }

    return base;
  });
  const [newCategory, setNewCategory] = useState(false);
  const [categoryText, setCategoryText] = useState("");
  const [tagText, setTagText] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("basic");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const liveCategories = categories.filter((c) => c.visibility !== "deleted");
  const hasVariants = f.variants.length > 0;
  const stockTotal = hasVariants ? f.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0) : Number(f.stock) || 0;

  /* what the typed new category would really become */
  const clash = useMemo(
    () => (categoryText.trim() ? categories.find((c) => canon(c.name) === canon(categoryText)) : null),
    [categoryText, categories]
  );

  function addTag() {
    const parts = tagText.split(",").map((t) => t.trim()).filter(Boolean);
    if (!parts.length) return;
    set("tags", [...new Set([...f.tags, ...parts])].slice(0, 20));
    setTagText("");
  }

  async function save() {
    if (!f.name.trim()) return toast("Product name is required.", "error");
    if (f.price === "" || Number(f.price) < 0) return toast("Enter a price.", "error");

    let category = f.category;
    if (newCategory) category = clash ? clash.name : categoryText.trim();

    const payload = {
      ...f,
      category,
      videos: f.videos,
      stock: hasVariants ? stockTotal : Number(f.stock) || 0,
      oldPrice: f.oldPrice === "" ? 0 : Number(f.oldPrice),
      variants: f.variants
        .filter((v) => v.label.trim())
        .map((v) => ({ ...v, price: v.price === "" ? null : Number(v.price), stock: Number(v.stock) || 0 })),
      variantLabel: f.variants.length ? f.variantLabel || "Option" : "",
      image: f.images[0] || "",
    };
    if (!can("finance.view")) delete payload.costPrice;
    delete payload.__clone;

    setBusy(true);
    const data = await act(
      "productSave",
      { product: payload, expectedUpdatedAt: isNew ? "" : product?.updatedAt || "", mustExist: !isNew },
      isNew ? (isClone ? "Copy created as a Draft." : "Product added.") : "Product saved."
    );
    setBusy(false);

    if (data) onSaved(data.product);
  }

  return (
    <Modal
      wide
      title={isClone ? `Copy of: ${product.name}` : isNew ? "Add product" : `Edit: ${product.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ad-btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="ad-btn primary" disabled={busy} onClick={save}>
            {busy ? "Saving…" : isClone ? "Create copy" : isNew ? "Add product" : "Save product"}
          </button>
        </>
      }
    >
      <Tabs
        tabs={[["basic", "Basics"], ["media", "Photos & videos", f.images.length + f.videos.length || null], ["variants", "Variants", f.variants.length || null], ["details", "Details & SEO"]]}
        value={tab}
        onChange={setTab}
      />

      {tab === "basic" && (
        <div className="ad-form">
          <div className="ad-row">
            <Field label="Product name *"><input value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={140} /></Field>
            <Field label="Brand"><input value={f.brand} onChange={(e) => set("brand", e.target.value)} /></Field>
          </div>
          <Field label="Short subtitle"><input value={f.subtitle} onChange={(e) => set("subtitle", e.target.value)} maxLength={160} /></Field>

          <div className="ad-row">
            <Field
              label="Category"
              hint={newCategory ? (clash ? `"${clash.name}" already exists - it will be used (no duplicates).` : "A new category will be created.") : "Pick one, or create a new one."}
            >
              {newCategory ? (
                <div className="ad-btn-row" style={{ flexWrap: "nowrap" }}>
                  <input autoFocus value={categoryText} onChange={(e) => setCategoryText(e.target.value)} placeholder="New category name" maxLength={60} />
                  <button type="button" className="ad-btn small" onClick={() => { setNewCategory(false); setCategoryText(""); }}>Cancel</button>
                </div>
              ) : (
                <select
                  value={f.category}
                  onChange={(e) => (e.target.value === "__new" ? setNewCategory(true) : set("category", e.target.value))}
                >
                  <option value="">— No category —</option>
                  {liveCategories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}{c.visibility === "hidden" ? " (hidden)" : ""}</option>
                  ))}
                  <option value="__new">＋ Create new category…</option>
                </select>
              )}
            </Field>
            <Field label="SKU"><input value={f.sku} onChange={(e) => set("sku", e.target.value)} maxLength={40} /></Field>
          </div>

          <div className="ad-row">
            <Field label="Price (৳) *"><input type="number" min="0" value={f.price} onChange={(e) => set("price", e.target.value)} /></Field>
            <Field label="Old price (৳)" hint="Shows as a crossed-out price"><input type="number" min="0" value={f.oldPrice} onChange={(e) => set("oldPrice", e.target.value)} /></Field>
            {can("finance.view") && (
              <Field label="Cost price (৳)" hint="Only you can see this; used for profit"><input type="number" min="0" value={f.costPrice} onChange={(e) => set("costPrice", e.target.value)} /></Field>
            )}
          </div>

          <div className="ad-row">
            <Field label="Stock" hint={hasVariants ? "Counted from the variants" : undefined}>
              <input type="number" min="0" value={hasVariants ? stockTotal : f.stock} disabled={hasVariants} onChange={(e) => set("stock", e.target.value)} />
            </Field>
            <Field label="Low-stock alert at" hint="0 = use the store setting">
              <input type="number" min="0" value={f.lowStock} onChange={(e) => set("lowStock", e.target.value)} />
            </Field>
            <Field label="Visibility">
              <select value={f.visibility} onChange={(e) => set("visibility", e.target.value)}>
                <option value="visible">Visible in store</option>
                <option value="draft">Draft (not in store yet)</option>
                <option value="hidden">Hidden (not in store)</option>
                {f.visibility === "deleted" && <option value="deleted">Deleted</option>}
              </select>
            </Field>
            <Field label="Sales status">
              <select value={f.status} onChange={(e) => set("status", e.target.value)}>
                <option value="active">Active (can be bought)</option>
                <option value="inactive">Inactive (shown, not for sale)</option>
              </select>
            </Field>
          </div>

          <div>
            <div className="ad-field"><span>Badges</span></div>
            <div className="ad-btn-row" style={{ marginTop: 6 }}>
              {FLAGS.map(([id, label]) => (
                <Toggle
                  key={id}
                  checked={f.flags.includes(id)}
                  onChange={(on) => set("flags", on ? [...f.flags, id] : f.flags.filter((x) => x !== id))}
                  label={label}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "media" && (
        <div className="ad-form">
          <MediaManager
            images={f.images}
            videos={f.videos}
            productName={f.name}
            onImages={(images) => set("images", images)}
            onVideos={(videos) => set("videos", videos)}
            onImageRemoved={(gone) =>
              setF((s) => ({ ...s, variants: s.variants.map((v) => (v.image === gone ? { ...v, image: "" } : v)) }))
            }
            onImageReplaced={(old, fresh) =>
              setF((s) => ({ ...s, variants: s.variants.map((v) => (v.image === old ? { ...v, image: fresh } : v)) }))
            }
          />

          <Field label="Image description (alt text)" hint="Helps search engines and screen readers">
            <input value={f.alt} onChange={(e) => set("alt", e.target.value)} maxLength={160} />
          </Field>
        </div>
      )}

      {tab === "variants" && (
        <div className="ad-form">
          <div className="ad-note">
            Use variants for sizes, shades or packs. Each variant has its own stock; leave a variant price empty to use the product price. The product stock becomes the total of all variants.
          </div>

          <Field label="What do you call the choice? (e.g. Size, Shade)">
            <input value={f.variantLabel} onChange={(e) => set("variantLabel", e.target.value)} placeholder="Size" maxLength={30} />
          </Field>

          <div className="ad-subtable">
            {f.variants.map((v, n) => (
              <div className="ad-subrow" key={v.id || n}>
                <Field label="Name"><input value={v.label} onChange={(e) => setF((s) => ({ ...s, variants: s.variants.map((x, k) => (k === n ? { ...x, label: e.target.value } : x)) }))} /></Field>
                <Field label="SKU"><input value={v.sku || ""} onChange={(e) => setF((s) => ({ ...s, variants: s.variants.map((x, k) => (k === n ? { ...x, sku: e.target.value } : x)) }))} /></Field>
                <Field label="Price ৳"><input type="number" min="0" value={v.price} placeholder={String(f.price || "")} onChange={(e) => setF((s) => ({ ...s, variants: s.variants.map((x, k) => (k === n ? { ...x, price: e.target.value } : x)) }))} /></Field>
                <Field label="Stock"><input type="number" min="0" value={v.stock} onChange={(e) => setF((s) => ({ ...s, variants: s.variants.map((x, k) => (k === n ? { ...x, stock: e.target.value } : x)) }))} /></Field>
                <Field label="Photo (optional)">
                  <select value={v.image || ""} onChange={(e) => setF((s) => ({ ...s, variants: s.variants.map((x, k) => (k === n ? { ...x, image: e.target.value } : x)) }))}>
                    <option value="">Same as product</option>
                    {f.images.map((src, i) => <option key={src} value={src}>Photo {i + 1}</option>)}
                  </select>
                </Field>
                <button type="button" className="ad-btn small danger" onClick={() => set("variants", f.variants.filter((_, k) => k !== n))}>Remove</button>
              </div>
            ))}
          </div>

          <div>
            <button type="button" className="ad-btn" onClick={() => set("variants", [...f.variants, { id: "", label: "", sku: "", price: "", stock: 0, image: "" }])}>
              ＋ Add variant
            </button>
          </div>
        </div>
      )}

      {tab === "details" && (
        <div className="ad-form">
          <Field label="Description"><textarea rows={6} value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={4000} /></Field>

          <div>
            <div className="ad-field"><span>Tags</span></div>
            <div className="ad-chips" style={{ margin: "6px 0" }}>
              {f.tags.map((t) => (
                <span className="ad-chip" key={t}>{t}<button type="button" onClick={() => set("tags", f.tags.filter((x) => x !== t))}>×</button></span>
              ))}
            </div>
            <div className="ad-btn-row" style={{ flexWrap: "nowrap" }}>
              <input value={tagText} onChange={(e) => setTagText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="type a tag, press Enter (e.g. dry skin, vitamin c)" />
              <button type="button" className="ad-btn" onClick={addTag}>Add</button>
            </div>
          </div>

          <Field label="Key features (one per line)">
            <textarea rows={4} value={f.features.join("\n")} onChange={(e) => set("features", e.target.value.split("\n"))} />
          </Field>

          <div>
            <div className="ad-field"><span>Specifications</span></div>
            <div className="ad-subtable" style={{ marginTop: 6 }}>
              {f.specs.map((s, n) => (
                <div className="ad-subrow" key={n}>
                  <Field label="Name"><input value={s.k} onChange={(e) => setF((st) => ({ ...st, specs: st.specs.map((x, k) => (k === n ? { ...x, k: e.target.value } : x)) }))} placeholder="Volume" /></Field>
                  <Field label="Value"><input value={s.v} onChange={(e) => setF((st) => ({ ...st, specs: st.specs.map((x, k) => (k === n ? { ...x, v: e.target.value } : x)) }))} placeholder="50 ml" /></Field>
                  <button type="button" className="ad-btn small danger" onClick={() => set("specs", f.specs.filter((_, k) => k !== n))}>Remove</button>
                </div>
              ))}
            </div>
            <button type="button" className="ad-btn small" style={{ marginTop: 8 }} onClick={() => set("specs", [...f.specs, { k: "", v: "" }])}>＋ Add specification</button>
          </div>

          <Field label="Private notes (not shown in the store)">
            <textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} maxLength={1000} />
          </Field>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* CSV import                                                           */
/* ------------------------------------------------------------------ */
const CSV_COLUMNS = ["id", "name", "brand", "category", "subtitle", "tags", "price", "oldPrice", "costPrice", "stock", "lowStock", "status", "visibility", "sku", "description", "image", "images", "features", "alt", "notes"];

function ImportModal({ onClose, onDone }) {
  const [rows, setRows] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  async function pick(file) {
    if (!file) return;
    const parsed = parseCsv(await file.text());
    if (parsed.length < 2) return toast("The file has no rows.", "error");

    const head = parsed[0].map((h) => h.trim());
    const list = parsed.slice(1).map((cells) => Object.fromEntries(head.map((h, i) => [h, (cells[i] ?? "").trim()])));
    setRows(list);
    setPreview(null);

    setBusy(true);
    const res = await act("productImport", { rows: list, dryRun: true });
    setBusy(false);
    if (res) setPreview(res);
  }

  async function run() {
    setBusy(true);
    const res = await act("productImport", { rows }, null);
    setBusy(false);

    if (res) {
      toast(`Imported: ${res.created} new, ${res.updated} updated.`);
      onDone();
    }
  }

  function template() {
    downloadFile("products-template.csv", toCsv([CSV_COLUMNS, ["", "Rose Glow Serum", "PearlSkino", "Skincare", "Brightening serum", "serum|glow", "1450", "1750", "800", "20", "3", "active", "visible", "SER-001", "Lightweight serum", "", "", "Hydrates|Brightens", "", ""]]));
  }

  return (
    <Modal
      title="Import / update products from CSV"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ad-btn ghost" onClick={onClose}>Close</button>
          <button type="button" className="ad-btn primary" disabled={busy || !preview || (!preview.created && !preview.updated)} onClick={run}>
            {busy ? "Working…" : "Import now"}
          </button>
        </>
      }
    >
      <div className="ad-form">
        <div className="ad-note">
          Rows with an <b>id</b> that exists update that product (empty cells keep the old value); rows without an id create new products. Use <b>|</b> between several tags, images or features. Variants are not part of CSV - add them in the product editor. A restore point is saved before every import.
        </div>
        <div className="ad-btn-row">
          <button type="button" className="ad-btn" onClick={template}>Download template</button>
          <label className="ad-btn">
            Choose CSV file
            <input type="file" accept=".csv,text/csv" hidden onChange={(e) => pick(e.target.files?.[0])} />
          </label>
        </div>
        {busy && <Spinner label="Checking…" />}
        {preview && (
          <div className={`ad-note ${preview.errors.length ? "warn" : "ok"}`}>
            Check result: <b>{preview.created}</b> to create, <b>{preview.updated}</b> to update, <b>{preview.errors.length}</b> problem row(s).
            {preview.errors.slice(0, 10).map((e) => (
              <div key={e.line}>Line {e.line} {e.name && `(${e.name})`}: {e.error}</div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* bulk edit                                                            */
/* ------------------------------------------------------------------ */
const BULK_OPS = [
  ["category", "Move to a category"],
  ["flagAdd", "Add a badge (New / Trending…)"],
  ["flagRemove", "Remove a badge"],
  ["priceSet", "Set one price"],
  ["pricePercent", "Raise / lower price by %"],
  ["status", "Sales status (active / inactive)"],
  ["visibility", "Visibility (visible / draft / hidden)"],
  ["lowStock", "Low-stock alert level"],
];

function BulkModal({ ids, categories, onClose, onDone }) {
  const [op, setOp] = useState("category");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  function pick(next) {
    setOp(next);
    setValue(
      { flagAdd: "new", flagRemove: "new", status: "active", visibility: "visible" }[next] || ""
    );
  }

  async function run() {
    setBusy(true);
    const res = await act("productBulk", { ids, op, value }, null);
    setBusy(false);

    if (res) {
      toast(`${res.changed} product${res.changed === 1 ? "" : "s"} updated.`);
      onDone();
    }
  }

  return (
    <Modal
      title={`Change ${ids.length} product${ids.length === 1 ? "" : "s"} at once`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ad-btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="ad-btn primary" disabled={busy || value === ""} onClick={run}>
            {busy ? "Working…" : "Apply to all selected"}
          </button>
        </>
      }
    >
      <div className="ad-form">
        <div className="ad-note">A restore point of your catalog is saved automatically before the change.</div>

        <Field label="What do you want to change?">
          <select value={op} onChange={(e) => pick(e.target.value)}>
            {BULK_OPS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </Field>

        {op === "category" && (
          <Field label="Category" hint="Type a new name to create a new category">
            <input list="ad-bulk-cats" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Category name" maxLength={60} />
            <datalist id="ad-bulk-cats">
              {categories.filter((c) => c.visibility !== "deleted").map((c) => <option key={c.id} value={c.name} />)}
            </datalist>
          </Field>
        )}

        {(op === "flagAdd" || op === "flagRemove") && (
          <Field label="Badge">
            <select value={value} onChange={(e) => setValue(e.target.value)}>
              {FLAGS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </Field>
        )}

        {op === "priceSet" && (
          <Field label="New price (৳)" hint="Every selected product gets this price (variant prices are not changed)">
            <input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
        )}

        {op === "pricePercent" && (
          <Field label="Change by %" hint="10 = 10% dearer, -15 = 15% cheaper. Variant prices change too.">
            <input type="number" min="-90" max="300" value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
        )}

        {op === "status" && (
          <Field label="Sales status">
            <select value={value} onChange={(e) => setValue(e.target.value)}>
              <option value="active">Active (can be bought)</option>
              <option value="inactive">Inactive (shown, not for sale)</option>
            </select>
          </Field>
        )}

        {op === "visibility" && (
          <Field label="Visibility">
            <select value={value} onChange={(e) => setValue(e.target.value)}>
              <option value="visible">Visible in store</option>
              <option value="draft">Draft (not in store yet)</option>
              <option value="hidden">Hidden (not in store)</option>
            </select>
          </Field>
        )}

        {op === "lowStock" && (
          <Field label="Alert when stock is at or below" hint="0 = use the store setting">
            <input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* products list                                                        */
/* ------------------------------------------------------------------ */
const SORTS = [
  ["manual", "Store order (drag with ↑ ↓)"],
  ["newest", "Newest first"],
  ["updated", "Recently edited"],
  ["name", "Name A → Z"],
  ["price_asc", "Price: low → high"],
  ["price_desc", "Price: high → low"],
  ["stock_asc", "Stock: low → high"],
  ["stock_desc", "Stock: high → low"],
];

function sortProducts(list, sort) {
  if (sort === "manual") return list;

  const stamp = (v) => String(v || "");
  const sorters = {
    newest: (a, b) => stamp(b.createdAt).localeCompare(stamp(a.createdAt)),
    updated: (a, b) => stamp(b.updatedAt).localeCompare(stamp(a.updatedAt)),
    name: (a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" }),
    price_asc: (a, b) => Number(a.price) - Number(b.price),
    price_desc: (a, b) => Number(b.price) - Number(a.price),
    stock_asc: (a, b) => Number(a.stock) - Number(b.stock),
    stock_desc: (a, b) => Number(b.stock) - Number(a.stock),
  };

  return [...list].sort(sorters[sort] || (() => 0));
}

export function Products() {
  const { can } = useAdmin();
  const { data, loading, error, reload } = useLoad("products");
  const [tab, setTab] = useState("visible");
  const [cat, setCat] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [sort, setSort] = useState("manual");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new
  const [importing, setImporting] = useState(false);
  const [bulk, setBulk] = useState(false);
  const query = useDebounced(q);

  useEffect(() => setPage(1), [tab, cat, stockFilter, query, sort]);

  const products = useMemo(() => data?.products || [], [data]);
  const categories = useMemo(() => data?.categories || [], [data]);

  const counts = useMemo(() => {
    const c = { visible: 0, draft: 0, hidden: 0, deleted: 0, all: products.length };
    products.forEach((p) => { c[p.visibility || "visible"] = (c[p.visibility || "visible"] || 0) + 1; });
    return c;
  }, [products]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const list = products.filter((p) => {
      if (tab !== "all" && (p.visibility || "visible") !== tab) return false;
      if (cat === "__none" ? p.category : cat && canon(p.category) !== canon(cat)) return false;
      if (stockFilter === "low" && !(p.isLow && p.stock > 0)) return false;
      if (stockFilter === "out" && p.stock > 0) return false;
      if (!needle) return true;
      return `${p.name} ${p.brand} ${p.sku} ${p.category} ${(p.tags || []).join(" ")}`.toLowerCase().includes(needle);
    });

    return sortProducts(list, sort);
  }, [products, tab, cat, stockFilter, query, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const unfiltered = tab === "all" && !cat && !stockFilter && !query && sort === "manual";
  const allShownSelected = shown.length > 0 && shown.every((p) => selected.has(p.id));

  function toggle(id) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function setVisibility(ids, visibility) {
    if (visibility === "deleted" && !(await askConfirm({
      title: `Delete ${ids.length > 1 ? `${ids.length} products` : "this product"}?`,
      message: "They disappear from the store but stay here under \"Deleted\", so you can restore them. Past orders are not affected.",
      confirmLabel: "Delete",
      danger: true,
    }))) return;

    const res = await act("productVisibility", { ids, visibility }, { visible: "Now visible in the store.", draft: "Moved to Draft.", hidden: "Hidden from the store.", deleted: "Moved to Deleted." }[visibility]);
    if (res) {
      setSelected(new Set());
      reload();
    }
  }

  async function purge(p) {
    if (!(await askConfirm({ title: `Delete "${p.name}" forever?`, message: "This removes it permanently. Past orders keep their own copy of the item details.", confirmLabel: "Delete forever", danger: true }))) return;
    if (await act("productPurge", { id: p.id }, "Deleted forever.")) reload();
  }

  async function move(p, dir) {
    const ids = products.map((x) => x.id);
    const from = ids.indexOf(p.id);
    const to = from + dir;
    if (to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    if (await act("productReorder", { ids })) reload();
  }

  function exportCsv() {
    const rows = filtered.map((p) => [
      p.id, p.name, p.brand, p.category, p.subtitle, (p.tags || []).join("|"), p.price, p.oldPrice, can("finance.view") ? p.costPrice : "", p.stock, p.lowStock, p.status, p.visibility, p.sku, p.description,
      p.image, (p.images || []).join("|"), (p.features || []).join("|"), p.alt, p.notes,
    ]);
    downloadFile(`products-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([CSV_COLUMNS, ...rows]));
  }

  const bulkIds = [...selected];

  return (
    <>
      <PageHead title="Products" sub={`${counts.visible} visible · ${counts.draft} draft · ${counts.hidden} hidden · ${counts.deleted} deleted`}>
        <button type="button" className="ad-btn" onClick={reload}>Refresh</button>
        <button type="button" className="ad-btn" onClick={exportCsv}>Export CSV</button>
        {can("products.edit") && <button type="button" className="ad-btn" onClick={() => setImporting(true)}>Import CSV</button>}
        {can("products.edit") && <button type="button" className="ad-btn primary" onClick={() => setEditing(null)}>＋ Add product</button>}
      </PageHead>

      <Tabs
        tabs={[["visible", "Visible", counts.visible], ["draft", "Draft", counts.draft], ["hidden", "Hidden", counts.hidden], ["deleted", "Deleted", counts.deleted], ["all", "All", counts.all]]}
        value={tab}
        onChange={(t) => { setTab(t); setSelected(new Set()); }}
      />

      <div className="ad-toolbar">
        <input type="search" placeholder="Search name, SKU, brand, tag…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {categories.filter((c) => c.visibility !== "deleted").map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          <option value="__none">No category</option>
        </select>
        <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} aria-label="Stock">
          <option value="">Any stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
          {SORTS.map(([id, label]) => <option key={id} value={id}>Sort: {label}</option>)}
        </select>
      </div>

      {bulkIds.length > 0 && can("products.edit") && (
        <div className="ad-note ad-bulkbar">
          <b>{bulkIds.length} selected</b>
          <button type="button" className="ad-btn small primary" onClick={() => setBulk(true)}>Change many at once…</button>
          <button type="button" className="ad-btn small" onClick={() => setVisibility(bulkIds, "visible")}>Show in store</button>
          <button type="button" className="ad-btn small" onClick={() => setVisibility(bulkIds, "draft")}>Make draft</button>
          <button type="button" className="ad-btn small" onClick={() => setVisibility(bulkIds, "hidden")}>Hide</button>
          {can("products.delete") && <button type="button" className="ad-btn small danger" onClick={() => setVisibility(bulkIds, "deleted")}>Delete</button>}
          <button type="button" className="ad-btn small ghost" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : !shown.length ? (
        <Empty>{products.length ? "No products match these filters." : "No products yet. Add your first one!"}</Empty>
      ) : (
        <>
          <div className="ad-tablewrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th style={{ width: 34 }}><input type="checkbox" checked={allShownSelected} onChange={() => setSelected(allShownSelected ? new Set() : new Set(shown.map((p) => p.id)))} aria-label="Select all" /></th>
                  <th>Product</th>
                  <th>Category</th>
                  <th className="num">Price</th>
                  <th className="num">Stock</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => {
                  const vis = p.visibility || "visible";
                  const catRow = categories.find((c) => canon(c.name) === canon(p.category));
                  const catHidden = catRow && catRow.visibility !== "visible";

                  return (
                    <tr key={p.id} className={vis === "deleted" ? "dim" : ""}>
                      <td><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Select ${p.name}`} /></td>
                      <td>
                        <div className="ad-cell">
                          <Thumb src={p.image || p.images?.[0]} />
                          <div>
                            <strong>{p.name}</strong>
                            <small>
                              {[p.brand, p.sku].filter(Boolean).join(" · ") || p.id}
                              {p.videos?.length > 0 ? ` · ▶ ${p.videos.length}` : ""}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {p.category || <span className="ad-muted">—</span>}
                        {catHidden && <small>category {catRow.visibility}</small>}
                      </td>
                      <td className="num">
                        {money(p.price)}
                        {p.oldPrice > p.price && <small style={{ textDecoration: "line-through" }}>{money(p.oldPrice)}</small>}
                      </td>
                      <td className="num">
                        {p.stock <= 0 ? <Badge tone="red">Out</Badge> : p.isLow ? <Badge tone="amber">{p.stock} low</Badge> : p.stock}
                        {p.variants?.length > 0 && <small>{p.variants.length} variants</small>}
                      </td>
                      <td>
                        <Badge tone={VIS_TONE[vis]}>{VIS_LABEL[vis] || vis}</Badge>
                        {p.status === "inactive" && <small>not for sale</small>}
                      </td>
                      <td>
                        <div className="ad-btn-row" style={{ flexWrap: "nowrap", justifyContent: "flex-end" }}>
                          {unfiltered && can("products.edit") && (
                            <span className="ad-order-btns">
                              <button type="button" onClick={() => move(p, -1)} aria-label="Move up">↑</button>
                              <button type="button" onClick={() => move(p, 1)} aria-label="Move down">↓</button>
                            </span>
                          )}
                          {can("products.edit") && <button type="button" className="ad-btn small" onClick={() => setEditing(p)}>Edit</button>}
                          {can("products.edit") && vis !== "deleted" && (
                            <button type="button" className="ad-btn small" title="Make a copy of this product (starts as a Draft)" onClick={() => setEditing({ ...p, __clone: true })}>Clone</button>
                          )}
                          {can("products.edit") && vis === "draft" && <button type="button" className="ad-btn small" onClick={() => setVisibility([p.id], "visible")}>Publish</button>}
                          {can("products.edit") && vis === "visible" && <button type="button" className="ad-btn small" onClick={() => setVisibility([p.id], "hidden")}>Hide</button>}
                          {can("products.edit") && (vis === "hidden" || vis === "deleted") && <button type="button" className="ad-btn small" onClick={() => setVisibility([p.id], "visible")}>{vis === "deleted" ? "Restore" : "Unhide"}</button>}
                          {can("products.delete") && vis !== "deleted" && <button type="button" className="ad-btn small danger" onClick={() => setVisibility([p.id], "deleted")}>Delete</button>}
                          {can("products.delete") && vis === "deleted" && <button type="button" className="ad-btn small danger" onClick={() => purge(p)}>Forever</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager page={page} pages={pages} onPage={setPage} />
          {!unfiltered && can("products.edit") && <p className="ad-muted" style={{ marginTop: 10 }}>To change the store order with ↑ ↓, choose "All", clear the filters and pick "Sort: Store order".</p>}
        </>
      )}

      {editing !== undefined && (
        <ProductEditor
          product={editing}
          categories={categories}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); reload(); }}
        />
      )}
      {importing && <ImportModal onClose={() => setImporting(false)} onDone={() => { setImporting(false); reload(); }} />}
      {bulk && (
        <BulkModal
          ids={bulkIds}
          categories={categories}
          onClose={() => setBulk(false)}
          onDone={() => { setBulk(false); setSelected(new Set()); reload(); }}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* categories                                                           */
/* ------------------------------------------------------------------ */
export function Categories() {
  const { can } = useAdmin();
  const { data, loading, error, reload } = useLoad("categories");
  const [name, setName] = useState("");
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const list = data.categories || [];
  const clash = name.trim() ? list.find((c) => canon(c.name) === canon(name)) : null;
  const editable = can("products.edit");

  async function create(event) {
    event.preventDefault();
    if (!name.trim()) return;

    setBusy(true);
    const res = await act("categoryCreate", { name });
    setBusy(false);

    if (res) {
      toast(res.restored ? `"${res.category.name}" was deleted before - it is back.` : res.existed ? `"${res.category.name}" already exists.` : "Category created.");
      setName("");
      reload();
    }
  }

  async function setVis(c, visibility) {
    if (visibility === "deleted" && !(await askConfirm({
      title: `Delete category "${c.name}"?`,
      message: `The category and its ${c.products} product(s) disappear from the store, but the products are NOT deleted. If you restore the category they come back.`,
      confirmLabel: "Delete category",
      danger: true,
    }))) return;

    if (await act("categoryUpdate", { id: c.id, visibility }, { visible: "Category is visible.", hidden: "Category hidden.", deleted: "Category deleted." }[visibility])) reload();
  }

  async function move(index, dir) {
    const to = index + dir;
    if (to < 0 || to >= list.length) return;
    const ids = list.map((c) => c.id);
    [ids[index], ids[to]] = [ids[to], ids[index]];
    if (await act("categoryReorder", { ids })) reload();
  }

  async function saveEdit() {
    setBusy(true);
    const res = await act("categoryUpdate", { id: edit.id, name: edit.name, blurb: edit.blurb }, "Category saved.");
    setBusy(false);
    if (res) { setEdit(null); reload(); }
  }

  return (
    <>
      <PageHead title="Categories" sub="Shop filters and the Home page category sections follow this list" />

      {editable && (
        <Card title="New category">
          <form className="ad-btn-row" style={{ flexWrap: "nowrap" }} onSubmit={create}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Serums" maxLength={60} />
            <button type="submit" className="ad-btn primary" disabled={busy || !name.trim()}>Create</button>
          </form>
          {clash && <p className="ad-muted" style={{ margin: "8px 0 0" }}>"{clash.name}" already exists (names are not case-sensitive).{clash.visibility === "deleted" ? " It is deleted - creating it again restores it." : ""}</p>}
        </Card>
      )}

      {!list.length ? (
        <Empty>No categories yet. Categories are also created when you type a new one in a product.</Empty>
      ) : (
        <div className="ad-tablewrap">
          <table className="ad-table">
            <thead><tr><th>Name</th><th className="num">Products</th><th className="num">In store</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.map((c, index) => (
                <tr key={c.id} className={c.visibility === "deleted" ? "dim" : ""}>
                  <td>
                    <strong>{c.name}</strong>
                    {c.blurb && <small>{c.blurb}</small>}
                  </td>
                  <td className="num">{c.products}</td>
                  <td className="num">{c.visibility === "visible" ? c.visibleProducts : 0}</td>
                  <td><Badge tone={VIS_TONE[c.visibility]}>{c.visibility}</Badge></td>
                  <td>
                    {editable && (
                      <div className="ad-btn-row" style={{ flexWrap: "nowrap", justifyContent: "flex-end" }}>
                        <span className="ad-order-btns">
                          <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">↑</button>
                          <button type="button" onClick={() => move(index, 1)} disabled={index === list.length - 1} aria-label="Move down">↓</button>
                        </span>
                        <button type="button" className="ad-btn small" onClick={() => setEdit({ ...c })}>Rename</button>
                        {c.visibility === "visible" && <button type="button" className="ad-btn small" onClick={() => setVis(c, "hidden")}>Hide</button>}
                        {c.visibility !== "visible" && <button type="button" className="ad-btn small" onClick={() => setVis(c, "visible")}>{c.visibility === "deleted" ? "Restore" : "Unhide"}</button>}
                        {c.visibility !== "deleted" && <button type="button" className="ad-btn small danger" onClick={() => setVis(c, "deleted")}>Delete</button>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="ad-note" style={{ marginTop: 16 }}>
        <b>How it works:</b> a product shows in the store only when the product <i>and</i> its category are both visible. Hiding or deleting a category never deletes its products.
      </div>

      {edit && (
        <Modal
          title="Edit category"
          onClose={() => setEdit(null)}
          footer={<><button type="button" className="ad-btn ghost" onClick={() => setEdit(null)}>Cancel</button><button type="button" className="ad-btn primary" disabled={busy} onClick={saveEdit}>Save</button></>}
        >
          <div className="ad-form">
            <Field label="Name" hint="Products in this category follow the new name"><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} maxLength={60} /></Field>
            <Field label="Short description (optional)"><input value={edit.blurb || ""} onChange={(e) => setEdit({ ...edit, blurb: e.target.value })} maxLength={200} /></Field>
          </div>
        </Modal>
      )}
    </>
  );
}
