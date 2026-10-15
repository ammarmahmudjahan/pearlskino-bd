import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { adminCall } from "../lib/adminApi";

/*
 * Small building blocks shared by every admin page:
 * toast + confirm (these replace the two helpers the old admin forgot to define),
 * modal, fields, toggle, badge, loader hook, image helpers.
 */

/* ---------- who is logged in ---------- */
export const AdminContext = createContext({ user: null, can: () => false, go: () => {} });
export const useAdmin = () => useContext(AdminContext);

/* ---------- toast + confirm: tiny event bus ---------- */
const bus = new EventTarget();

export function toast(message, tone = "ok") {
  bus.dispatchEvent(new CustomEvent("toast", { detail: { message: String(message || ""), tone } }));
}

export function askConfirm(options) {
  const config = typeof options === "string" ? { message: options } : options;

  return new Promise((resolve) => {
    bus.dispatchEvent(new CustomEvent("confirm", { detail: { ...config, resolve } }));
  });
}

/* ask for a short text (for example a cancel reason) */
export function askText(options) {
  return askConfirm({ ...options, input: true });
}

export function Feedback() {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [text, setText] = useState("");
  const seq = useRef(0);

  useEffect(() => {
    function onToast(event) {
      const id = ++seq.current;
      setToasts((list) => [...list.slice(-3), { id, ...event.detail }]);
      window.setTimeout(
        () => setToasts((list) => list.filter((t) => t.id !== id)),
        event.detail.tone === "error" ? 6500 : 3500
      );
    }

    function onConfirm(event) {
      setText(event.detail.initial || "");
      setDialog(event.detail);
    }

    bus.addEventListener("toast", onToast);
    bus.addEventListener("confirm", onConfirm);

    return () => {
      bus.removeEventListener("toast", onToast);
      bus.removeEventListener("confirm", onConfirm);
    };
  }, []);

  function close(value) {
    dialog?.resolve(value);
    setDialog(null);
  }

  const needText = dialog?.input && dialog.required && String(text).trim().length < (dialog.minLength || 3);

  return (
    <>
      <div className="ad-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`ad-toast ${t.tone}`}>
            {t.message}
          </div>
        ))}
      </div>

      {dialog && (
        <div className="ad-overlay" role="dialog" aria-modal="true" onMouseDown={() => close(dialog.input ? null : false)}>
          <div className="ad-dialog" onMouseDown={(event) => event.stopPropagation()}>
            <h3>{dialog.title || "Please confirm"}</h3>
            {dialog.message && <p>{dialog.message}</p>}

            {dialog.input && (
              <textarea
                autoFocus
                rows={3}
                value={text}
                placeholder={dialog.placeholder || ""}
                onChange={(event) => setText(event.target.value)}
              />
            )}

            <div className="ad-dialog-actions">
              <button type="button" className="ad-btn ghost" onClick={() => close(dialog.input ? null : false)}>
                {dialog.cancelLabel || "Cancel"}
              </button>
              <button
                type="button"
                className={`ad-btn ${dialog.danger ? "danger" : "primary"}`}
                disabled={needText}
                onClick={() => close(dialog.input ? text.trim() : true)}
              >
                {dialog.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- layout bits ---------- */
export function PageHead({ title, sub, children }) {
  return (
    <header className="ad-pagehead">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="ad-pagehead-tools">{children}</div>}
    </header>
  );
}

export function Card({ title, sub, actions, children, className = "" }) {
  return (
    <section className={`ad-card ${className}`}>
      {(title || actions) && (
        <div className="ad-card-head">
          <div>
            {title && <h2>{title}</h2>}
            {sub && <p>{sub}</p>}
          </div>
          {actions && <div className="ad-card-tools">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Modal({ title, onClose, children, wide, footer }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose?.();
    }

    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="ad-overlay" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className={`ad-modal${wide ? " wide" : ""}`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="ad-modal-head">
          <h2>{title}</h2>
          <button type="button" className="ad-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="ad-modal-body">{children}</div>
        {footer && <div className="ad-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="ad-tabs" role="tablist">
      {tabs.map(([id, label, count]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          className={value === id ? "on" : ""}
          onClick={() => onChange(id)}
        >
          {label}
          {count !== undefined && count !== null && <em>{count}</em>}
        </button>
      ))}
    </div>
  );
}

export function Badge({ tone = "grey", children }) {
  return <span className={`ad-badge ${tone}`}>{children}</span>;
}

export function Empty({ children }) {
  return <div className="ad-empty">{children}</div>;
}

export function Spinner({ label = "Loading…" }) {
  return (
    <div className="ad-loading">
      <span className="ad-spin" aria-hidden="true"></span>
      {label}
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="ad-errorbox" role="alert">
      <strong>Could not load.</strong> {error}
      {onRetry && (
        <button type="button" className="ad-btn small" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`ad-field ${className}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, hint, disabled }) {
  return (
    <label className={`ad-toggle${disabled ? " disabled" : ""}`}>
      <input type="checkbox" checked={Boolean(checked)} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden="true"></i>
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

export function Stat({ label, value, sub, tone }) {
  return (
    <div className={`ad-stat ${tone || ""}`}>
      <small>{label}</small>
      <strong>{value}</strong>
      {sub && <em>{sub}</em>}
    </div>
  );
}

/* ---------- data loading ---------- */
export function useLoad(action, body, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const bodyRef = useRef(body);
  bodyRef.current = body;

  const load = useCallback(
    async (quiet) => {
      if (!quiet) setState((s) => ({ ...s, loading: true, error: "" }));

      try {
        const data = await adminCall(action, bodyRef.current || {});
        setState({ data, loading: false, error: "" });
        return data;
      } catch (problem) {
        setState((s) => ({ data: quiet ? s.data : null, loading: false, error: problem.message || "Something went wrong." }));
        return null;
      }
    },
    [action]
  );

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, ...deps]);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === "function" ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload: () => load(true), reloadLoud: () => load(false), setData };
}

/* run an action with a toast for the result */
export async function act(action, body, okMessage) {
  try {
    const data = await adminCall(action, body);
    if (okMessage) toast(okMessage);
    return data;
  } catch (problem) {
    toast(problem.message || "Something went wrong.", "error");
    return null;
  }
}

/* ---------- images ---------- */
/* shrinking photos before upload lives in lib/compress.js (shared with the storefront) */
export { readFileAsDataUrl, compressImage, IMAGE_TYPES } from "../lib/compress";

/* ---------- small helpers ---------- */
export function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export const ORDER_STATUSES = ["New", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"];
export const PAYMENT_STATUSES = ["Unpaid", "Pending verification", "Paid", "Refunded"];

export function statusTone(status) {
  return (
    {
      New: "blue",
      Confirmed: "purple",
      Processing: "purple",
      Shipped: "amber",
      Delivered: "green",
      Cancelled: "red",
      Returned: "red",
    }[status] || "grey"
  );
}

export function payTone(status) {
  return { Paid: "green", Unpaid: "grey", "Pending verification": "amber", Refunded: "red" }[status] || "grey";
}

export function StatusPill({ status }) {
  return <Badge tone={statusTone(status)}>{status}</Badge>;
}

export function PayPill({ status }) {
  return <Badge tone={payTone(status)}>{status}</Badge>;
}

export function Pager({ page, pages, onPage }) {
  if (pages <= 1) return null;

  return (
    <div className="ad-pager">
      <button type="button" className="ad-btn small" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        ‹ Prev
      </button>
      <span>
        Page {page} of {pages}
      </span>
      <button type="button" className="ad-btn small" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next ›
      </button>
    </div>
  );
}

/* tiny inline bar chart for revenue/orders */
export function BarChart({ series, field = "revenue", height = 120 }) {
  const values = series.map((s) => Number(s[field]) || 0);
  const top = Math.max(1, ...values);

  return (
    <div className="ad-bars" style={{ height }} role="img" aria-label={`${field} chart`}>
      {series.map((s, index) => (
        <span
          key={`${s.label}-${index}`}
          className="ad-bar"
          title={`${s.label}: ${values[index]}`}
          style={{ height: `${Math.max(2, (values[index] / top) * 100)}%` }}
        />
      ))}
    </div>
  );
}
