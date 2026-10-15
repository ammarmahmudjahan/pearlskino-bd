import { useMemo, useState } from "react";

import { EDIT_MODE_KEY } from "../../config/api";
import { TEXT_GROUPS, TEXTS, parseList, serializeList, textsOfGroup } from "../../content/registry";
import { formatDate } from "../../lib/format";
import { Badge, Empty, ErrorBox, Modal, PageHead, Spinner, act, askConfirm, toast, useDebounced, useLoad } from "../ui";

function openVisitorEditor(path) {
  try {
    localStorage.setItem(EDIT_MODE_KEY, "1");
  } catch {
    /* the link also switches it on */
  }
  window.location.href = `${path || "/"}?pk_edit=1`;
}

/* effective text on the live site for one key */
function livePart(row) {
  return row && row.value !== undefined && row.value !== "" ? row.value : null;
}

function ListField({ def, raw, onChange }) {
  const items = parseList(def, raw);
  const fields = def.fields || [];

  const write = (next) => onChange(serializeList(def, next));
  const setItem = (n, key, value) => write(items.map((item, k) => (k === n ? { ...item, [key]: value } : item)));

  return (
    <div className="ad-subtable">
      {items.map((item, n) => (
        <div className="ad-subrow" key={n} style={{ gridTemplateColumns: "1fr" }}>
          {fields.map((field) => (
            <label className="ad-field" key={field.key}>
              <span>{field.label}</span>
              {field.multiline ? (
                <textarea rows={3} value={item[field.key] || ""} onChange={(e) => setItem(n, field.key, e.target.value)} />
              ) : (
                <input value={item[field.key] || ""} onChange={(e) => setItem(n, field.key, e.target.value)} />
              )}
            </label>
          ))}
          <div className="ad-btn-row">
            <span className="ad-order-btns">
              <button type="button" disabled={n === 0} onClick={() => { const c = [...items]; [c[n - 1], c[n]] = [c[n], c[n - 1]]; write(c); }}>↑</button>
              <button type="button" disabled={n === items.length - 1} onClick={() => { const c = [...items]; [c[n + 1], c[n]] = [c[n], c[n + 1]]; write(c); }}>↓</button>
            </span>
            <button type="button" className="ad-btn small danger" onClick={() => write(items.filter((_, k) => k !== n))}>Remove</button>
          </div>
        </div>
      ))}
      {items.length < (def.max || 40) && (
        <div>
          <button type="button" className="ad-btn small" onClick={() => write([...items, Object.fromEntries(fields.map((f) => [f.key, ""]))])}>
            ＋ Add {def.itemLabel || "item"}
          </button>
        </div>
      )}
    </div>
  );
}

function HistoryModal({ textKey, onClose, onReverted }) {
  const { data, loading, error } = useLoad("contentHistory", { key: textKey, limit: 30 });

  async function revert(entry) {
    if (await act("contentRevert", { id: entry.id }, "Old text loaded as a draft. Publish it to use it.")) onReverted();
  }

  return (
    <Modal title={`History: ${TEXTS[textKey]?.label || textKey}`} onClose={onClose}>
      {loading ? <Spinner /> : error ? <ErrorBox error={error} /> : !(data.items || []).length ? <Empty>No published changes yet.</Empty> : (
        <div className="ad-grid">
          {data.items.map((h) => (
            <div key={h.id} className="ad-textitem">
              <header><strong>{formatDate(h.time, true)}</strong><code>{h.actor}</code></header>
              <div className="ad-muted" style={{ whiteSpace: "pre-wrap", maxHeight: 90, overflow: "auto" }}>Before: {h.oldValue || "(default)"}</div>
              <div style={{ whiteSpace: "pre-wrap", maxHeight: 90, overflow: "auto" }}>After: {h.newValue || "(default)"}</div>
              <button type="button" className="ad-btn small" style={{ marginTop: 8 }} onClick={() => revert(h)}>Use the "before" text</button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export default function SiteText() {
  const { data, loading, error, reload } = useLoad("content");
  const [group, setGroup] = useState(TEXT_GROUPS[0].id);
  const [q, setQ] = useState("");
  const [work, setWork] = useState({}); // key -> string | null(reset)
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState("");
  const query = useDebounced(q);

  const rows = useMemo(() => Object.fromEntries((data?.items || []).map((r) => [r.key, r])), [data]);
  const drafts = (data?.items || []).filter((r) => r.draft !== null || r.reset);

  /* what the field shows right now */
  function shown(key) {
    if (key in work) return work[key];
    const row = rows[key];
    if (row?.reset) return null;
    if (row && row.draft !== null && row.draft !== undefined) return row.draft;
    return livePart(row);
  }

  function setValue(key, value) {
    setWork((w) => ({ ...w, [key]: value }));
  }

  const dirtyKeys = Object.keys(work);

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle) {
      return Object.entries(TEXTS)
        .filter(([key, def]) => `${key} ${def.label} ${typeof def.default === "string" ? def.default : ""}`.toLowerCase().includes(needle))
        .map(([key, def]) => ({ key, ...def }))
        .slice(0, 80);
    }
    return textsOfGroup(group);
  }, [group, query]);

  async function saveDraft() {
    if (!dirtyKeys.length) return null;
    setBusy(true);
    const res = await act("contentDraft", { changes: Object.fromEntries(dirtyKeys.map((k) => [k, work[k]])) });
    setBusy(false);
    if (res) {
      setWork({});
      await reload();
    }
    return res;
  }

  async function publish() {
    if (dirtyKeys.length) {
      const saved = await saveDraft();
      if (!saved) return;
    }
    setBusy(true);
    const res = await act("contentPublish", {}, null);
    setBusy(false);
    if (res) {
      toast(`Published ${res.published} text${res.published === 1 ? "" : "s"}. Visitors see it within a minute.`);
      try { localStorage.setItem("pearlskino-content-updated", String(Date.now())); } catch { /* ignore */ }
      reload();
    }
  }

  async function discard() {
    if (!(await askConfirm({ title: "Throw away all unpublished changes?", confirmLabel: "Discard", danger: true }))) return;
    setBusy(true);
    const res = await act("contentDiscard", {}, "Drafts discarded.");
    setBusy(false);
    if (res) { setWork({}); reload(); }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const pendingCount = drafts.length + dirtyKeys.filter((k) => !drafts.some((d) => d.key === k)).length;
  const current = TEXT_GROUPS.find((g) => g.id === group);

  return (
    <>
      <PageHead title="Site text" sub="Every heading, paragraph, button and message on the storefront. Changes stay private as drafts until you press Publish.">
        <button type="button" className="ad-btn primary" onClick={() => openVisitorEditor("/")}>✎ Edit while viewing the site</button>
      </PageHead>

      <div className="ad-note" style={{ marginBottom: 14 }}>
        Tip: "Edit while viewing the site" opens your store exactly as a customer sees it - click any text to change it. Use this page when you want to see all texts of a page in one list, or to edit texts that only appear after an action (error messages, order-tracking lines, form placeholders…).
      </div>

      <div className="ad-toolbar">
        <input type="search" placeholder="Search all texts…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="grow" />
        {pendingCount > 0 && <Badge tone="amber">{pendingCount} unpublished</Badge>}
      </div>

      <div className="ad-split" style={{ gridTemplateColumns: "230px minmax(0,1fr)" }}>
        <nav className="ad-card" style={{ padding: 10, position: "sticky", top: 14 }} aria-label="Pages">
          {TEXT_GROUPS.map((g) => {
            const keys = textsOfGroup(g.id).map((t) => t.key);
            const n = keys.filter((k) => k in work || rows[k]?.draft !== null && rows[k]?.draft !== undefined || rows[k]?.reset).length;
            return (
              <button
                key={g.id}
                type="button"
                className={`ad-btn ghost small`}
                style={{ width: "100%", justifyContent: "space-between", background: g.id === group && !query ? "var(--accent-soft)" : "transparent", marginBottom: 2 }}
                onClick={() => { setGroup(g.id); setQ(""); }}
              >
                <span style={{ textAlign: "left", whiteSpace: "normal" }}>{g.label}</span>
                {n > 0 && <Badge tone="amber">{n}</Badge>}
              </button>
            );
          })}
        </nav>

        <div>
          {!query && current?.path && (
            <div className="ad-btn-row" style={{ marginBottom: 12 }}>
              <button type="button" className="ad-btn small" onClick={() => openVisitorEditor(current.path)}>✎ Edit {current.label} on the live page</button>
            </div>
          )}

          <div className="ad-textlist">
            {list.map((def) => {
              const key = def.key;
              const value = shown(key);
              const isDefault = value === null;
              const dirty = key in work;
              const hasDraft = rows[key]?.draft !== null && rows[key]?.draft !== undefined;
              const raw = isDefault ? "" : value;

              return (
                <div key={key} className={`ad-textitem${dirty || hasDraft ? " changed" : ""}`}>
                  <header>
                    <strong>{def.label}</strong>
                    <span className="ad-btn-row">
                      {hasDraft && !dirty && <Badge tone="amber">draft</Badge>}
                      {dirty && <Badge tone="purple">edited</Badge>}
                      {livePart(rows[key]) !== null && <Badge tone="green">customised</Badge>}
                      <code>{key}</code>
                    </span>
                  </header>

                  {def.hint && <p className="ad-muted" style={{ margin: "0 0 8px", fontSize: 12 }}>{def.hint}</p>}

                  {def.kind === "list" ? (
                    <ListField def={def} raw={isDefault ? serializeList(def, def.default) : raw} onChange={(v) => setValue(key, v)} />
                  ) : def.kind === "text" || String(def.default || "").length > 90 || String(def.default || "").includes("\n") ? (
                    <textarea rows={Math.min(8, Math.max(2, String(isDefault ? def.default : raw).split("\n").length + 1))} value={isDefault ? def.default : raw} onChange={(e) => setValue(key, e.target.value)} />
                  ) : (
                    <input value={isDefault ? def.default : raw} onChange={(e) => setValue(key, e.target.value)} />
                  )}

                  <div className="ad-btn-row" style={{ marginTop: 8 }}>
                    {!isDefault && <button type="button" className="ad-btn small" onClick={() => setValue(key, null)}>Reset to original</button>}
                    {dirty && <button type="button" className="ad-btn small ghost" onClick={() => setWork((w) => { const n = { ...w }; delete n[key]; return n; })}>Undo</button>}
                    {rows[key] && <button type="button" className="ad-btn small ghost" onClick={() => setHistory(key)}>History</button>}
                  </div>
                </div>
              );
            })}
            {!list.length && <Empty>No texts found.</Empty>}
          </div>
        </div>
      </div>

      <div className="ad-savebar">
        <span>{dirtyKeys.length ? `${dirtyKeys.length} edited text${dirtyKeys.length === 1 ? "" : "s"} not saved yet` : drafts.length ? `${drafts.length} saved draft${drafts.length === 1 ? "" : "s"} waiting to be published` : "Everything is published."}</span>
        <span className="ad-btn-row">
          <button type="button" className="ad-btn small" disabled={busy || !dirtyKeys.length} onClick={saveDraft}>Save draft</button>
          <button type="button" className="ad-btn small" disabled={busy || (!drafts.length && !dirtyKeys.length)} onClick={discard}>Discard</button>
          <button type="button" className="ad-btn small primary" disabled={busy || (!drafts.length && !dirtyKeys.length)} onClick={publish}>Publish</button>
        </span>
      </div>

      {history && <HistoryModal textKey={history} onClose={() => setHistory("")} onReverted={() => { setHistory(""); reload(); }} />}
    </>
  );
}
