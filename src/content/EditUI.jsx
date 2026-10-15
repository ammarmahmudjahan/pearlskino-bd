import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";

import { useContent } from "./context";
import { TEXTS } from "./registry";
import { useStore } from "../context/StoreContext";

/* =========================================================
   WHERE THE POPOVER SITS (next to the text being edited)
========================================================= */
function place(element) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(400, vw - 24);

  if (!element || !element.isConnected) {
    return { left: (vw - width) / 2, top: Math.max(12, vh / 2 - 150), width };
  }

  const rect = element.getBoundingClientRect();
  const left = Math.min(Math.max(12, rect.left), Math.max(12, vw - width - 12));
  const room = vh - rect.bottom;
  const wanted = 320;
  let top = room > wanted + 16 ? rect.bottom + 10 : rect.top - wanted - 10;

  top = Math.min(Math.max(12, top), Math.max(12, vh - 200));

  return { left, top, width };
}

/* =========================================================
   TEXT EDITOR  (click a text on the page)
========================================================= */
export function TextEditor({ textKey, element, onClose }) {
  const content = useContent();
  const def = TEXTS[textKey];
  const [position, setPosition] = useState(() => place(element));
  const panel = useRef(null);
  const field = useRef(null);

  const value = content.getRaw(textKey);
  const text = typeof value === "string" ? value : "";
  const multiline = def?.kind === "text";

  useLayoutEffect(() => {
    if (element) element.classList.add("pk-editing-now");
    return () => element && element.classList.remove("pk-editing-now");
  }, [element]);

  useEffect(() => {
    const update = () => setPosition(place(element));

    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [element]);

  function close() {
    content.settleText(textKey);
    onClose();
  }

  useEffect(() => {
    function onDown(event) {
      if (panel.current && panel.current.contains(event.target)) return;
      content.settleText(textKey);
      onClose();
    }

    function onKey(event) {
      if (event.key === "Escape") {
        content.settleText(textKey);
        onClose();
      }
    }

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
    // the handlers only need the key, not every re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textKey]);

  useEffect(() => {
    field.current?.focus();
    field.current?.select?.();
  }, []);

  if (!def) return null;

  const original = typeof def.default === "string" ? def.default : "";
  const changed = content.isDirty(textKey);

  return createPortal(
    <div
      ref={panel}
      className="pk-popover"
      style={{ left: position.left, top: position.top, width: position.width }}
      role="dialog"
      aria-label={`Edit ${def.label}`}
    >
      <div className="pk-popover-head">
        <div>
          <strong>{def.label}</strong>
          <small>{textKey}</small>
        </div>
        <button type="button" className="pk-x" onClick={close} aria-label="Close editor">
          ×
        </button>
      </div>

      {multiline ? (
        <textarea
          ref={field}
          className="pk-field"
          rows={6}
          value={text}
          onChange={(event) => content.setText(textKey, event.target.value)}
        />
      ) : (
        <textarea
          ref={field}
          className="pk-field"
          rows={2}
          value={text}
          onChange={(event) => content.setText(textKey, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && def.kind === "line") {
              event.preventDefault();
              close();
            }
          }}
        />
      )}

      {!text.trim() && (
        <p className="pk-warn">An empty text is not saved. Type something or press "Use original".</p>
      )}

      <p className="pk-hint">
        <code>*italic*</code> <code>**bold**</code> · Enter = {def.kind === "line" ? "done" : "new line"}
        {def.hint ? ` · ${def.hint}` : ""} · <code>{"{brand}"}</code> = store name
      </p>

      {original && original !== text && (
        <p className="pk-original">
          <span>Original:</span> {original.length > 140 ? `${original.slice(0, 140)}…` : original}
        </p>
      )}

      <div className="pk-popover-actions">
        <button
          type="button"
          className="pk-btn ghost"
          onClick={() => content.resetText(textKey)}
          disabled={!changed && text === original}
        >
          Use original
        </button>
        <button type="button" className="pk-btn primary" onClick={close}>
          Done
        </button>
      </div>
    </div>,
    document.body
  );
}

/* =========================================================
   LIST EDITOR  (announcement strip, FAQ, ...)
========================================================= */
export function ListEditor({ textKey, onClose }) {
  const content = useContent();
  const def = TEXTS[textKey];
  const [items, setItems] = useState(() => content.getList(textKey).map((item) => ({ ...item })));

  const fields = def?.fields || [];
  const max = def?.max || 30;

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!def) return null;

  function commit(next) {
    setItems(next);
    content.setList(textKey, next);
  }

  function change(index, key, value) {
    commit(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  }

  function move(index, step) {
    const target = index + step;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  }

  function remove(index) {
    commit(items.filter((_, i) => i !== index));
  }

  function add() {
    if (items.length >= max) return;
    const blank = {};
    fields.forEach((field) => {
      blank[field.key] = "";
    });
    setItems([...items, blank]);
  }

  function useOriginal() {
    content.resetText(textKey);
    setItems(def.default.map((item) => ({ ...item })));
  }

  return createPortal(
    <div className="pk-modal-wrap" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="pk-modal" role="dialog" aria-label={`Edit ${def.label}`}>
        <div className="pk-popover-head">
          <div>
            <strong>{def.label}</strong>
            <small>{def.hint || "Change, add, remove or re-order the items."}</small>
          </div>
          <button type="button" className="pk-x" onClick={onClose} aria-label="Close editor">
            ×
          </button>
        </div>

        <div className="pk-list">
          {items.map((item, index) => (
            <div className="pk-list-item" key={index}>
              <div className="pk-list-fields">
                {fields.map((field) =>
                  field.multiline ? (
                    <label key={field.key}>
                      <span>{field.label}</span>
                      <textarea
                        className="pk-field"
                        rows={3}
                        value={item[field.key] || ""}
                        onChange={(event) => change(index, field.key, event.target.value)}
                      />
                    </label>
                  ) : (
                    <label key={field.key}>
                      <span>{field.label}</span>
                      <input
                        className="pk-field"
                        value={item[field.key] || ""}
                        onChange={(event) => change(index, field.key, event.target.value)}
                      />
                    </label>
                  )
                )}
              </div>

              <div className="pk-list-tools">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button type="button" onClick={() => remove(index)} aria-label="Remove">
                  ✕
                </button>
              </div>
            </div>
          ))}

          {!items.length && <p className="pk-hint">Nothing here yet. This section stays empty on the site.</p>}
        </div>

        <div className="pk-popover-actions">
          <button type="button" className="pk-btn ghost" onClick={add} disabled={items.length >= max}>
            + Add {def.itemLabel || "item"}
          </button>
          <span className="pk-spacer" />
          <button type="button" className="pk-btn ghost" onClick={useOriginal}>
            Use original
          </button>
          <button type="button" className="pk-btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* =========================================================
   THE BAR AT THE BOTTOM OF THE SCREEN
========================================================= */
const PAGES = [
  ["Home", "/"],
  ["Shop", "/shop"],
  ["About", "/about"],
  ["Contact", "/contact"],
  ["FAQ", "/faq"],
  ["Bag", "/cart"],
  ["Checkout", "/checkout"],
  ["Track order", "/track"],
  ["Account", "/account"],
  ["Maintenance screen", "/maintenance"],
  ["Page not found (404)", "/page-not-found"],
];

export function EditBar() {
  const content = useContent();
  const navigate = useNavigate();
  const location = useLocation();
  const { products } = useStore();
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const confirmTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(confirmTimer.current), []);

  if (content.status !== "on") {
    if (!content.notice) return null;

    return (
      <div className="pk-notice" role="alert">
        <span>{content.notice}</span>
        <button type="button" className="pk-btn primary" onClick={() => navigate("/admin")}>
          Open admin
        </button>
        <button type="button" className="pk-x" onClick={content.clearNotice} aria-label="Dismiss">
          ×
        </button>
      </div>
    );
  }

  const firstProduct = products[0]?.id;
  const pages = firstProduct ? [...PAGES, ["A product", `/product/${firstProduct}`]] : PAGES;
  const current = pages.find(([, path]) => path === location.pathname)?.[1] ||
    (location.pathname.startsWith("/product/") ? `/product/${firstProduct}` : "");

  function ask(kind) {
    setConfirm(kind);
    window.clearTimeout(confirmTimer.current);
    confirmTimer.current = window.setTimeout(() => setConfirm(""), 5000);
  }

  async function doPublish() {
    setConfirm("");
    setMessage("");

    try {
      const count = await content.publish();
      setMessage(count ? `Published ${count} change${count === 1 ? "" : "s"}. They are live now.` : "Nothing to publish.");
    } catch (error) {
      setMessage(error?.message || "Could not publish.");
    }
  }

  async function doDiscard() {
    setConfirm("");
    setMessage("");

    try {
      await content.discard();
      setMessage("Unpublished changes were discarded.");
    } catch (error) {
      setMessage(error?.message || "Could not discard.");
    }
  }

  const statusText = {
    idle: "",
    dirty: "Typing…",
    saving: "Saving…",
    saved: "Draft saved",
    error: content.saveError || "Could not save",
  }[content.saveState];

  return (
    <div className="pk-bar" role="region" aria-label="Storefront editor">
      <div className="pk-bar-row">
        <strong className="pk-bar-title">
          <span aria-hidden="true">✎</span> Editing storefront
        </strong>

        <div className="pk-seg" role="tablist" aria-label="Mode">
          <button
            type="button"
            role="tab"
            aria-selected={!content.preview}
            className={!content.preview ? "on" : ""}
            onClick={() => content.preview && content.togglePreview()}
          >
            Edit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={content.preview}
            className={content.preview ? "on" : ""}
            onClick={() => !content.preview && content.togglePreview()}
          >
            Preview
          </button>
        </div>

        <select
          className="pk-select"
          aria-label="Go to page"
          value={current}
          onChange={(event) => event.target.value && navigate(event.target.value)}
        >
          {!current && <option value="">Go to page…</option>}
          {pages.map(([label, path]) => (
            <option key={path} value={path}>
              {label}
            </option>
          ))}
        </select>

        <span className={`pk-status ${content.saveState}`}>
          {statusText}
          {content.saveState === "error" && (
            <button type="button" className="pk-link" onClick={content.retrySave}>
              Retry
            </button>
          )}
        </span>

        <span className="pk-count">
          {content.draftCount
            ? `${content.draftCount} unpublished change${content.draftCount === 1 ? "" : "s"}`
            : "No unpublished changes"}
        </span>

        {confirm === "discard" ? (
          <button type="button" className="pk-btn danger" onClick={doDiscard}>
            Yes, discard
          </button>
        ) : (
          <button
            type="button"
            className="pk-btn ghost"
            onClick={() => ask("discard")}
            disabled={!content.draftCount || content.busy}
          >
            Discard
          </button>
        )}

        {confirm === "publish" ? (
          <button type="button" className="pk-btn primary" onClick={doPublish}>
            Confirm: go live
          </button>
        ) : (
          <button
            type="button"
            className="pk-btn primary"
            onClick={() => ask("publish")}
            disabled={!content.draftCount || content.busy}
          >
            {content.busy ? "Working…" : "Publish"}
          </button>
        )}

        <button
          type="button"
          className="pk-btn ghost"
          onClick={async () => {
            await content.exitEdit();
            navigate("/admin");
          }}
        >
          Admin
        </button>
        <button
          type="button"
          className="pk-btn ghost"
          onClick={async () => {
            await content.exitEdit();
          }}
        >
          Exit
        </button>
      </div>

      {message && (
        <div className="pk-bar-message" role="status">
          {message}
          <button type="button" className="pk-x" onClick={() => setMessage("")} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
