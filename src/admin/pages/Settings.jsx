import { useEffect, useState } from "react";

import { apiText } from "../../lib/api";
import { formatDate } from "../../lib/format";
import { useStore } from "../../context/StoreContext";
import {
  Badge,
  Card,
  Empty,
  ErrorBox,
  Field,
  IMAGE_TYPES,
  PageHead,
  Spinner,
  Tabs,
  Toggle,
  act,
  askConfirm,
  compressImage,
  toast,
  useAdmin,
  useLoad,
} from "../ui";
import { adminCall } from "../../lib/adminApi";

const STATUSES = ["New", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"];
const LOGO_KEYS = ["logoUrl", "logoFileId", "logoFileName"];

const FLAG_ISLANDS = [
  ["new", "New arrivals", "Products badged New"],
  ["trending", "Trending now", "Products badged Trending"],
  ["featured", "Our favourites", "Products badged Featured"],
  ["deal", "Special deals", "Products badged Deal"],
];

const SECRET_INFO = {
  CALLMEBOT_APIKEY: { label: "CallMeBot API key", help: "From the CallMeBot WhatsApp bot (see the guide on the Notifications tab).", group: "callmebot" },
  TELEGRAM_BOT_TOKEN: { label: "Telegram bot token", help: "From @BotFather.", group: "telegram" },
  TELEGRAM_CHAT_ID: { label: "Telegram chat ID", help: "Your own chat ID (message @userinfobot).", group: "telegram" },
  META_WA_TOKEN: { label: "Meta access token", help: "Permanent token from your Meta app (System user).", group: "meta" },
  META_WA_PHONE_ID: { label: "Meta phone-number ID", help: "WhatsApp Manager → API setup.", group: "meta" },
  META_WA_LANG: { label: "Template language code", help: "e.g. en or en_US - must match your approved template.", group: "meta" },
  META_WA_TEMPLATE_ADMIN: { label: "Admin alert template name", help: "Approved template with 1 text variable.", group: "meta" },
  META_WA_TEMPLATE_CUSTOMER: { label: "Customer update template name", help: "Approved template with 3 variables: first name, order ID, message.", group: "meta" },
};

/* ---------- logo ---------- */
function Branding({ settings, onLogo }) {
  const store = useStore();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!settings.logoFileId) return setPreview(settings.logoUrl || "/logo.png");
      try {
        const base64 = (await apiText({ action: "logo", id: settings.logoFileId, _ts: Date.now() })).trim();
        if (!cancelled && base64) setPreview(`data:image/webp;base64,${base64}`);
      } catch {
        if (!cancelled) setPreview(store.settings.logoDataUrl || settings.logoUrl || "/logo.png");
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.logoFileId]);

  async function upload(file) {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return toast("Please upload a PNG, JPG/JPEG, or WebP logo.", "error");

    setBusy(true);
    try {
      /* same as before: shrink to max 512px WebP so the logo loads fast */
      const image = await compressImage(file, { max: 512, type: "image/webp", quality: 0.82 });
      const res = await adminCall("uploadLogo", { image, mimeType: "image/webp" });

      onLogo({ logoUrl: res.url || "", logoFileId: res.fileId || "", logoFileName: res.fileName || "" });
      setPreview(image);

      /* tell the storefront (this tab and other tabs) so the favicon follows the logo */
      window.dispatchEvent(new CustomEvent("pearlskino-settings-updated"));
      try { localStorage.setItem("pearlskino-settings-updated", String(Date.now())); } catch { /* ignore */ }

      toast("Logo uploaded. The favicon now uses it too.");
    } catch (problem) {
      toast(`Logo upload failed. ${problem.message || ""}`, "error");
    }
    setBusy(false);
  }

  return (
    <Card title="Logo & favicon" sub="One picture is used for the header, the footer, the admin and the browser-tab icon.">
      <div className="ad-cell" style={{ gap: 18, flexWrap: "wrap" }}>
        <img src={preview || "/logo.png"} alt="Current logo" style={{ width: 96, height: 96, objectFit: "contain", borderRadius: 16, background: "#f6f0f8", border: "1px solid var(--line)" }} />
        <div>
          <label className="ad-btn primary" style={{ cursor: busy ? "wait" : "pointer" }}>
            {busy ? "Uploading…" : "Upload new logo"}
            <input type="file" hidden accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <p className="ad-muted" style={{ margin: "8px 0 0" }}>PNG, JPG or WebP. A square picture with a transparent background looks best. Saved right away (no need to press Save).</p>
        </div>
      </div>
    </Card>
  );
}

/* ---------- delivery zones ---------- */
function Zones({ zones, onChange }) {
  const set = (n, patch) => onChange(zones.map((z, k) => (k === n ? { ...z, ...patch } : z)));

  return (
    <div className="ad-subtable">
      {zones.map((z, n) => (
        <div className="ad-subrow" key={z.id || n}>
          <Field label="Zone name"><input value={z.name} onChange={(e) => set(n, { name: e.target.value })} placeholder="Inside Chattogram" /></Field>
          <Field label="Charge ৳"><input type="number" min="0" value={z.charge} onChange={(e) => set(n, { charge: e.target.value })} /></Field>
          <Field label="Free above ৳" hint="0 = never free"><input type="number" min="0" value={z.freeThreshold || 0} onChange={(e) => set(n, { freeThreshold: e.target.value })} /></Field>
          <Field label="Areas (comma separated)"><input value={(z.areas || []).join(", ")} onChange={(e) => set(n, { areas: e.target.value.split(",").map((a) => a.trim()).filter(Boolean) })} placeholder="GEC, Khulshi, Nasirabad" /></Field>
          <Field label="Note (shown to customer)"><input value={z.note || ""} onChange={(e) => set(n, { note: e.target.value })} placeholder="1-2 days" /></Field>
          <button type="button" className="ad-btn small danger" onClick={() => onChange(zones.filter((_, k) => k !== n))}>Remove</button>
        </div>
      ))}
      <div>
        <button type="button" className="ad-btn small" onClick={() => onChange([...zones, { id: `z${Date.now().toString(36)}`, name: "", charge: 99, freeThreshold: 0, areas: [], note: "" }])}>＋ Add delivery zone</button>
      </div>
    </div>
  );
}

/* ---------- notifications ---------- */
function Notifications({ s, set, secrets, channelReady, triggers, reload }) {
  const { can } = useAdmin();
  const [secretEdits, setSecretEdits] = useState({});
  const [testPhone, setTestPhone] = useState("");
  const log = useLoad("notificationLog", { limit: 40 });
  const [busy, setBusy] = useState("");

  async function saveSecrets() {
    setBusy("secrets");
    const res = await act("secretsSave", { secrets: secretEdits }, "Keys saved.");
    setBusy("");
    if (res) { setSecretEdits({}); reload(); }
  }

  async function test(target) {
    setBusy(target);
    try {
      const res = await adminCall("notificationsTest", { target, phone: testPhone });
      if (res.success) toast(res.message || "Sent.");
      else toast(res.error || "Failed.", "error");
    } catch (problem) {
      toast(problem.message, "error");
    }
    setBusy("");
    log.reload();
  }

  async function install() {
    setBusy("triggers");
    const res = await act("triggersInstall", {}, "Automatic jobs installed.");
    setBusy("");
    if (res) reload();
  }

  const statuses = s.customerNotifyStatuses || [];
  const templates = s.waTemplates || {};

  return (
    <>
      <Card title="1. Alerts to you (admin)">
        <div className="ad-form">
          <Toggle checked={s.notifyOnNewOrder} onChange={(v) => set("notifyOnNewOrder", v)} label="Alert me for every new order" />
          <Toggle checked={s.notifyOnLowStock} onChange={(v) => set("notifyOnLowStock", v)} label="Alert me when a product runs low" />
          <Toggle checked={s.notifyLowStockDigest !== false} onChange={(v) => set("notifyLowStockDigest", v)} label="Also send me one daily low-stock summary" hint="One short message each morning listing everything that is low or sold out" />
          <div className="ad-row">
            <Toggle checked={s.notifyEmailEnabled} onChange={(v) => set("notifyEmailEnabled", v)} label="Send alert emails" />
            <Field label="Email address(es)" hint="Separate several with commas"><input value={s.notifyEmailTo} onChange={(e) => set("notifyEmailTo", e.target.value)} /></Field>
          </div>
          <div className="ad-row">
            <Field label="Phone alert channel">
              <select value={s.notifyChannel} onChange={(e) => set("notifyChannel", e.target.value)}>
                <option value="none">None</option>
                <option value="callmebot">WhatsApp via CallMeBot (free)</option>
                <option value="telegram">Telegram bot (free)</option>
                <option value="meta">WhatsApp Cloud API (Meta, official)</option>
              </select>
            </Field>
            <Field label="Your WhatsApp number" hint="01577100162 style"><input type="tel" value={s.notifyPhone} onChange={(e) => set("notifyPhone", e.target.value)} /></Field>
          </div>
          <div className="ad-btn-row">
            <Badge tone={channelReady.callmebot ? "green" : "grey"}>CallMeBot {channelReady.callmebot ? "ready" : "not set"}</Badge>
            <Badge tone={channelReady.telegram ? "green" : "grey"}>Telegram {channelReady.telegram ? "ready" : "not set"}</Badge>
            <Badge tone={channelReady.meta ? "green" : "grey"}>Meta admin {channelReady.meta ? "ready" : "not set"}</Badge>
            <Badge tone={channelReady.metaCustomer ? "green" : "grey"}>Meta customer {channelReady.metaCustomer ? "ready" : "not set"}</Badge>
          </div>
          {can("notifications.test") && (
            <div className="ad-btn-row">
              <button type="button" className="ad-btn small" disabled={busy === "email"} onClick={() => test("email")}>Send test email</button>
              <button type="button" className="ad-btn small" disabled={busy === "channel"} onClick={() => test("channel")}>Send test phone alert</button>
            </div>
          )}
          <p className="ad-muted" style={{ margin: 0 }}>Save the settings first, then test.</p>
        </div>
      </Card>

      <Card title="2. Updates to your customers">
        <div className="ad-form">
          <Toggle checked={s.customerEmailEnabled} onChange={(v) => set("customerEmailEnabled", v)} label="Email the customer (only if they gave an email)" hint="Order confirmation + status updates" />
          <Field label="WhatsApp updates to customers">
            <select value={s.customerWhatsappMode} onChange={(e) => set("customerWhatsappMode", e.target.value)}>
              <option value="off">Off</option>
              <option value="button">Button - I press "Open WhatsApp" on the order (works for everyone, free)</option>
              <option value="auto">Automatic - sent by the Meta WhatsApp API (needs Meta setup)</option>
            </select>
          </Field>
          <div>
            <div className="ad-field"><span>Tell the customer when an order becomes…</span></div>
            <div className="ad-btn-row" style={{ marginTop: 6 }}>
              {STATUSES.map((st) => (
                <Toggle key={st} checked={statuses.includes(st)} onChange={(on) => set("customerNotifyStatuses", on ? [...statuses, st] : statuses.filter((x) => x !== st))} label={st} />
              ))}
            </div>
          </div>
          <Field label="Sender name on emails"><input value={s.emailSenderName} onChange={(e) => set("emailSenderName", e.target.value)} /></Field>
          <p className="ad-muted" style={{ margin: 0 }}>The customer's WhatsApp number is optional at checkout. If they leave it empty, their order phone number is used for the WhatsApp button.</p>
        </div>
      </Card>

      <Card title="3. WhatsApp message wording" sub="Used by the WhatsApp button. Placeholders: {name} {orderId} {total} {trackUrl} {store}">
        <div className="ad-form">
          {STATUSES.map((st) => (
            <Field key={st} label={st}>
              <textarea rows={2} value={templates[st] || ""} onChange={(e) => set("waTemplates", { ...templates, [st]: e.target.value })} />
            </Field>
          ))}
        </div>
      </Card>

      {can("settings.secrets") && secrets && (
        <Card title="4. Keys & tokens" sub="Stored privately in Google Script Properties - never shown again after saving.">
          <details style={{ marginBottom: 12 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>What is CallMeBot? (easiest free option)</summary>
            <div className="ad-note" style={{ marginTop: 8 }}>
              CallMeBot is a free, unofficial WhatsApp helper that sends messages <b>to your own number only</b> - perfect for "new order" alerts to you. Setup: (1) save the number shown at callmebot.com/blog/free-api-whatsapp-messages as a contact, (2) send it the text "I allow callmebot to send me messages" from WhatsApp, (3) it replies with your API key - paste it below and choose "WhatsApp via CallMeBot". It cannot message your customers; for that use the WhatsApp button, or the official Meta WhatsApp Cloud API (template messages, business verification needed).
            </div>
          </details>

          <div className="ad-form">
            {Object.entries(SECRET_INFO).map(([key, info]) => {
              const st = secrets[key] || {};
              return (
                <Field key={key} label={`${info.label} ${st.set ? "✓" : ""}`} hint={info.help}>
                  <input
                    type={st.value !== undefined ? "text" : "password"}
                    autoComplete="off"
                    value={secretEdits[key] ?? (st.value !== undefined ? st.value : "")}
                    placeholder={st.set ? `saved (${st.hint || "set"}) - type to replace, clear + save to remove` : "not set"}
                    onChange={(e) => setSecretEdits((v) => ({ ...v, [key]: e.target.value }))}
                  />
                </Field>
              );
            })}
            <div><button type="button" className="ad-btn primary" disabled={busy === "secrets" || !Object.keys(secretEdits).length} onClick={saveSecrets}>Save keys</button></div>
            {can("notifications.test") && (
              <div className="ad-btn-row">
                <input type="tel" placeholder="Phone for the customer-template test" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} style={{ maxWidth: 260 }} />
                <button type="button" className="ad-btn small" disabled={busy === "customerWhatsApp"} onClick={() => test("customerWhatsApp")}>Test customer WhatsApp template</button>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card title="5. Automatic jobs" sub="Order IDs for Google-Form orders, the daily backup.">
        <div className="ad-btn-row" style={{ marginBottom: 10 }}>
          <Badge tone={triggers?.formSubmit ? "green" : "amber"}>Form-order alerts {triggers?.formSubmit ? "on" : "off"}</Badge>
          <Badge tone={triggers?.daily ? "green" : "amber"}>Daily backup {triggers?.daily ? "on" : "off"}</Badge>
        </div>
        {can("backups.run") && <button type="button" className="ad-btn" disabled={busy === "triggers"} onClick={install}>Install / repair automatic jobs</button>}
        <p className="ad-muted">Google will ask you to approve permissions the first time.</p>
      </Card>

      <Card title="Recent alert log" actions={<button type="button" className="ad-btn small" onClick={log.reload}>Refresh</button>}>
        {log.loading ? <Spinner /> : !(log.data?.items || []).length ? <Empty>Nothing sent yet.</Empty> : (
          <div className="ad-tablewrap">
            <table className="ad-table">
              <thead><tr><th>When</th><th>Channel</th><th>To</th><th>Event</th><th>Result</th></tr></thead>
              <tbody>
                {log.data.items.map((l, n) => (
                  <tr key={n}>
                    <td>{formatDate(l.time, true)}</td>
                    <td>{l.channel}</td>
                    <td>{l.to}</td>
                    <td>{l.event}{l.ref && <small>{l.ref}</small>}</td>
                    <td><Badge tone={l.status === "ok" || l.status === "sent" ? "green" : "red"}>{l.status}</Badge>{l.detail && <small>{l.detail}</small>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

/* ---------- page ---------- */
export default function Settings() {
  const { go } = useAdmin();
  const { data, loading, error, reload } = useLoad("settings");
  const [s, setS] = useState(null);
  const [tab, setTab] = useState("store");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data && !s) setS({ ...data.settings });
  }, [data, s]);

  if (loading || (data && !s)) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const set = (key, value) => {
    setS((cur) => ({ ...cur, [key]: value }));
    setDirty(true);
  };
  const setHome = (key, value) => set("homeSections", { ...(s.homeSections || {}), [key]: value });
  const text = (key, props = {}) => <input value={s[key] ?? ""} onChange={(e) => set(key, e.target.value)} {...props} />;
  const flagSections = s.homeFlagSections || {};
  const setFlag = (id, patch) => set("homeFlagSections", { ...flagSections, [id]: { on: true, limit: 8, ...(flagSections[id] || {}), ...patch } });

  async function save() {
    const payload = { ...s };
    LOGO_KEYS.forEach((k) => delete payload[k]);
    payload.deliveryZones = (s.deliveryZones || []).filter((z) => String(z.name).trim()).map((z) => ({ ...z, charge: Number(z.charge) || 0, freeThreshold: Number(z.freeThreshold) || 0 }));

    setBusy(true);
    const res = await act("settingsSave", { settings: payload }, "Settings saved. The store updates within a minute.");
    setBusy(false);

    if (res) {
      setDirty(false);
      window.dispatchEvent(new CustomEvent("pearlskino-settings-updated"));
      try { localStorage.setItem("pearlskino-settings-updated", String(Date.now())); } catch { /* ignore */ }
    }
  }

  async function confirmMaintenance(on) {
    if (on && !(await askConfirm({ title: "Close the store for visitors?", message: "Customers will see the maintenance message. You can still log in and use the admin and the storefront editor.", confirmLabel: "Turn on" }))) return;
    set("maintenanceMode", on);
  }

  const home = s.homeSections || {};

  return (
    <>
      <PageHead title="Settings" sub={`Store version ${data.version || ""}`} />
      <Tabs
        tabs={[["store", "Store & contact"], ["delivery", "Delivery"], ["payment", "Payment"], ["orders", "Orders & accounts"], ["home", "Home page"], ["features", "Shop features"], ["seo", "SEO & tracking"], ["notify", "Notifications"]]}
        value={tab}
        onChange={setTab}
      />

      {tab === "store" && (
        <>
          <Branding settings={s} onLogo={(logo) => setS((cur) => ({ ...cur, ...logo }))} />
          <Card title="Store">
            <div className="ad-form">
              <div className="ad-row">
                <Field label="Store name">{text("storeName")}</Field>
                <Field label="Tagline">{text("tagline")}</Field>
              </div>
              <Toggle checked={s.maintenanceMode} onChange={confirmMaintenance} label="Maintenance mode" hint="Visitors see a 'back soon' screen" />
              {s.maintenanceMode && <Field label="Maintenance message"><textarea rows={2} value={s.maintenanceMessage} onChange={(e) => set("maintenanceMessage", e.target.value)} /></Field>}
            </div>
          </Card>
          <Card title="Contact details">
            <div className="ad-form">
              <div className="ad-row">
                <Field label="Phone">{text("phone", { type: "tel" })}</Field>
                <Field label="Public email">{text("email", { type: "email" })}</Field>
              </div>
              <Field label="Store address (optional)"><textarea rows={2} value={s.storeAddress} onChange={(e) => set("storeAddress", e.target.value)} /></Field>
              <div className="ad-row">
                <Toggle checked={s.whatsappEnabled} onChange={(v) => set("whatsappEnabled", v)} label="Show WhatsApp chat button" />
                <Field label="WhatsApp number">{text("whatsappNumber", { type: "tel" })}</Field>
              </div>
              <div className="ad-row">
                <Toggle checked={s.messengerEnabled} onChange={(v) => set("messengerEnabled", v)} label="Show Messenger chat button" />
                <Field label="Messenger link" hint="https://m.me/yourpage">{text("messengerUrl")}</Field>
              </div>
            </div>
          </Card>
          <Card title="Social links" sub="Icons appear in the footer when a link is filled in.">
            <div className="ad-row">
              <Field label="Facebook page">{text("facebookUrl", { placeholder: "https://facebook.com/…" })}</Field>
              <Field label="Instagram">{text("instagramUrl", { placeholder: "https://instagram.com/…" })}</Field>
              <Field label="TikTok">{text("tiktokUrl", { placeholder: "https://tiktok.com/@…" })}</Field>
              <Field label="YouTube">{text("youtubeUrl", { placeholder: "https://youtube.com/…" })}</Field>
            </div>
          </Card>
        </>
      )}

      {tab === "delivery" && (
        <Card title="Delivery charges">
          <div className="ad-form">
            <div className="ad-row">
              <Field label="Standard delivery charge ৳">{text("deliveryCharge", { type: "number", min: 0 })}</Field>
              <Field label="Free delivery above ৳" hint="0 = never free">{text("freeDeliveryThreshold", { type: "number", min: 0 })}</Field>
            </div>
            <div>
              <strong>Delivery zones (optional)</strong>
              <p className="ad-muted" style={{ margin: "4px 0 10px" }}>If you add zones, customers pick their zone at checkout and the zone's charge is used instead of the standard one.</p>
              <Zones zones={s.deliveryZones || []} onChange={(z) => set("deliveryZones", z)} />
            </div>
          </div>
        </Card>
      )}

      {tab === "payment" && (
        <Card title="Payment options">
          <div className="ad-form">
            <Toggle checked={s.codEnabled} onChange={(v) => set("codEnabled", v)} label="Cash on delivery" />
            <Toggle checked={s.pickupEnabled} onChange={(v) => set("pickupEnabled", v)} label="Store pickup" />
            <Toggle checked={s.bkashEnabled} onChange={(v) => set("bkashEnabled", v)} label="bKash payment" hint="Customer sends money and enters the TrxID; you verify it in the order" />
            {s.bkashEnabled && (
              <>
                <div className="ad-row">
                  <Field label="bKash number">{text("bkashNumber", { type: "tel" })}</Field>
                  <Field label="Account type">
                    <select value={s.bkashType} onChange={(e) => set("bkashType", e.target.value)}><option>Personal</option><option>Merchant</option><option>Agent</option></select>
                  </Field>
                </div>
                <Field label="Instructions shown to the customer"><textarea rows={3} value={s.bkashInstructions} onChange={(e) => set("bkashInstructions", e.target.value)} /></Field>
              </>
            )}
          </div>
        </Card>
      )}

      {tab === "orders" && (
        <Card title="Orders, accounts & reviews">
          <div className="ad-form">
            <Field label="Minimum order amount ৳" hint="0 = no minimum">{text("minOrderAmount", { type: "number", min: 0 })}</Field>
            <Toggle checked={s.guestCheckout} onChange={(v) => set("guestCheckout", v)} label="Allow guest checkout" hint="Off = customers must log in to order" />
            <Toggle checked={s.accountsEnabled} onChange={(v) => set("accountsEnabled", v)} label="Customer accounts" hint="Login, order history, wishlist, saved address" />
            <Toggle checked={s.reviewsEnabled} onChange={(v) => set("reviewsEnabled", v)} label="Product reviews" />
            <Toggle checked={s.reviewsAutoApprove} onChange={(v) => set("reviewsAutoApprove", v)} label="Publish reviews automatically" hint="Off = you approve each review first (recommended)" />
            <div className="ad-row">
              <Field label="Low-stock level (all products)" hint="A product can have its own level in the editor">{text("lowStockThreshold", { type: "number", min: 0 })}</Field>
              <Field label="Store auto-refresh (seconds)" hint="How often open pages check for changes">{text("autoRefreshSeconds", { type: "number", min: 10 })}</Field>
            </div>
          </div>
        </Card>
      )}

      {tab === "home" && (
        <>
          <Card title="Home page sections" sub="Turn sections on or off. Their texts are in Site text → Home page.">
            <div className="ad-form">
              {[["marquee", "Scrolling announcement strip"], ["hero", "Hero (big top section)"], ["banners", "Offer banners"], ["flags", "New / Trending / Featured / Deals rows (set below)"], ["categories", "Category sections with products"], ["recent", "\"Recently viewed\" row (only for visitors who looked at products)"], ["reviews", "Customer reviews"], ["cta", "Closing call-to-action"]].map(([id, label]) => (
                <Toggle key={id} checked={home[id] !== false} onChange={(v) => setHome(id, v)} label={label} />
              ))}
              <Field label="Products shown per category on Home" hint="The first visible products of each visible category">{text("homeCategoryLimit", { type: "number", min: 1, max: 12 })}</Field>
            </div>
          </Card>

          <Card title="New / Trending / Featured / Deals rows" sub="Each row shows the products you gave that badge in the product editor. A row with no products stays hidden by itself.">
            <div className="ad-subtable">
              {FLAG_ISLANDS.map(([id, title, hint]) => {
                const cur = flagSections[id] || { on: true, limit: 8 };
                return (
                  <div className="ad-subrow" key={id}>
                    <Toggle checked={cur.on !== false} onChange={(v) => setFlag(id, { on: v })} label={title} hint={hint} />
                    <Field label="How many to show" hint="1 - 24">
                      <input type="number" min="1" max="24" value={cur.limit ?? 8} onChange={(e) => setFlag(id, { limit: e.target.value })} />
                    </Field>
                  </div>
                );
              })}
            </div>
            <div className="ad-btn-row" style={{ marginTop: 12 }}>
              <button type="button" className="ad-btn" onClick={() => go("text")}>Change the row headings (Site text) →</button>
              <span className="ad-muted">Or use "Edit storefront" and click a heading on the live Home page.</span>
            </div>
          </Card>
        </>
      )}

      {tab === "features" && (
        <>
          <Card title="Product page & browsing" sub="Small helpers that make buying easier. Each one can be switched off.">
            <div className="ad-form">
              <Toggle checked={s.liveSearchEnabled !== false} onChange={(v) => set("liveSearchEnabled", v)} label="Live search suggestions" hint="Products appear while the customer types in the search box" />
              <Toggle checked={s.relatedEnabled !== false} onChange={(v) => set("relatedEnabled", v)} label="Related products" hint="'You may also like' on every product page" />
              <Toggle checked={s.togetherEnabled !== false} onChange={(v) => set("togetherEnabled", v)} label="Bought together" hint="Shows products other customers ordered with this one" />
              <Toggle checked={s.recentlyViewedEnabled !== false} onChange={(v) => set("recentlyViewedEnabled", v)} label="Recently viewed products" hint="Remembered on the visitor's own phone only" />
              <Toggle checked={s.stickyBarEnabled !== false} onChange={(v) => set("stickyBarEnabled", v)} label="Sticky Add-to-cart bar on phones" hint="Stays at the bottom while the customer scrolls a product page" />
              <div className="ad-row">
                <Toggle checked={s.urgencyEnabled !== false} onChange={(v) => set("urgencyEnabled", v)} label="'Only N left' message" hint="Shown when stock is running low" />
                <Field label="Show it when stock is at or below">{text("urgencyThreshold", { type: "number", min: 1, max: 50 })}</Field>
              </div>
              <Toggle checked={s.reviewPhotosEnabled !== false} onChange={(v) => set("reviewPhotosEnabled", v)} label="Customers can add photos to reviews" hint="Up to 3 small photos per review; you still approve each review" />
              <Toggle checked={s.stockAlertsEnabled !== false} onChange={(v) => set("stockAlertsEnabled", v)} label="'Notify me when it is back' on sold-out products" hint="You see the requests in Inventory → Waiting customers" />
            </div>
          </Card>

          <Card title="Cart & coupons">
            <div className="ad-form">
              <Toggle checked={s.freeShipBar !== false} onChange={(v) => set("freeShipBar", v)} label="Free-delivery progress bar" hint="Needs 'Free delivery above' to be set in the Delivery tab" />
              <div className="ad-row">
                <Field label="Welcome coupon code" hint="Make this coupon first under Coupons (e.g. WELCOME10). Leave empty for none.">
                  <input value={s.welcomeCouponCode ?? ""} onChange={(e) => set("welcomeCouponCode", e.target.value.toUpperCase().replace(/\s+/g, ""))} placeholder="WELCOME10" maxLength={30} />
                </Field>
                <Toggle checked={s.welcomeCouponAuto !== false} onChange={(v) => set("welcomeCouponAuto", v)} label="Apply it automatically on a first order" hint="Customers who ordered before never see it" />
              </div>
            </div>
          </Card>

          <Card title="Abandoned carts">
            <div className="ad-form">
              <Toggle checked={s.abandonedCartsEnabled !== false} onChange={(v) => set("abandonedCartsEnabled", v)} label="Save carts that were not finished" hint="Only when the visitor typed a phone or email at checkout. Shown in Sales → Abandoned carts." />
              <Field label="Count a cart as abandoned after (minutes)">{text("abandonedMinutes", { type: "number", min: 5, max: 10080 })}</Field>
              <Field label="WhatsApp message" hint="{name} {store} {items} {link}">
                <textarea rows={3} value={s.abandonedTemplate ?? ""} onChange={(e) => set("abandonedTemplate", e.target.value)} maxLength={600} />
              </Field>
            </div>
          </Card>

          <Card title="Restock messages & videos">
            <div className="ad-form">
              <Field label="'Back in stock' WhatsApp message" hint="{name} {product} {store} {link}">
                <textarea rows={3} value={s.restockTemplate ?? ""} onChange={(e) => set("restockTemplate", e.target.value)} maxLength={600} />
              </Field>
              <Field label="Biggest video you can upload (MB)" hint="Short clips only (up to 12 MB). For long videos paste a YouTube or Facebook link in the product instead.">
                {text("videoUploadMaxMb", { type: "number", min: 1, max: 12 })}
              </Field>
            </div>
          </Card>

          <Card title="Customer groups" sub="Used by the groups on the Customers page and by 'Send an offer'.">
            <div className="ad-form">
              <div className="ad-row">
                <Field label="VIP: spent at least ৳" hint="0 = ignore this rule">{text("vipMinSpent", { type: "number", min: 0 })}</Field>
                <Field label="VIP: or at least this many orders" hint="0 = ignore this rule">{text("vipMinOrders", { type: "number", min: 0 })}</Field>
                <Field label="Inactive: no order for (days)">{text("inactiveDays", { type: "number", min: 1 })}</Field>
              </div>
            </div>
          </Card>

          <Card title="Printed invoices">
            <div className="ad-form">
              <Field label="Line at the bottom of every invoice" hint="Printed from the order page or from the Orders list">
                <textarea rows={2} value={s.invoiceFooter ?? ""} onChange={(e) => set("invoiceFooter", e.target.value)} maxLength={300} />
              </Field>
            </div>
          </Card>
        </>
      )}

      {tab === "seo" && (
        <Card title="Search engines & tracking" sub="Page-specific titles/descriptions are in Site text → Search engines & sharing.">
          <div className="ad-form">
            <Field label="Website address" hint="Used in share links, e.g. https://pearlskino-bd.vercel.app">{text("siteUrl")}</Field>
            <Field label="Home page title">{text("seoTitle")}</Field>
            <Field label="Home page description"><textarea rows={3} value={s.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} /></Field>
            <Field label="Keywords (comma separated)">{text("seoKeywords")}</Field>
            <Field label="Share picture (web address)" hint="Shown when the site is shared on Facebook/WhatsApp. 1200×630 works best.">{text("seoImage")}</Field>
            <Toggle checked={s.seoIndex} onChange={(v) => set("seoIndex", v)} label="Allow Google to list the site" hint="Turn off while you are still building" />
            <div className="ad-row">
              <Field label="Facebook Pixel ID">{text("fbPixelId")}</Field>
              <Field label="Google Analytics ID" hint="G-XXXXXXXXXX">{text("gaMeasurementId")}</Field>
              <Field label="Google Search Console code">{text("googleSiteVerification")}</Field>
            </div>
          </div>
        </Card>
      )}

      {tab === "notify" && data.secrets !== undefined && (
        <Notifications s={s} set={set} secrets={data.secrets} channelReady={data.channelReady || {}} triggers={data.triggers} reload={reload} />
      )}

      <div className="ad-savebar">
        <span>{dirty ? "You have unsaved changes." : "All changes saved."}</span>
        <button type="button" className="ad-btn primary" disabled={busy || !dirty} onClick={save}>{busy ? "Saving…" : "Save settings"}</button>
      </div>
    </>
  );
}
