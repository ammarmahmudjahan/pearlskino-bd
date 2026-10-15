import { useState } from "react";

import { formatDate, whatsappLink } from "../../lib/format";
import { sized } from "../../lib/img";
import { Badge, Empty, ErrorBox, Modal, PageHead, Spinner, Tabs, act, askConfirm, askText, useLoad } from "../ui";

function Stars({ value }) {
  return (
    <span className="stars" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= value ? "on" : ""}>★</span>)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
export function Reviews() {
  const [tab, setTab] = useState("pending");
  const [photo, setPhoto] = useState("");
  const { data, loading, error, reload } = useLoad("reviews");

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const all = data.reviews || [];
  const count = (s) => all.filter((r) => r.status === s).length;
  const list = tab === "all" ? all : all.filter((r) => r.status === tab);

  async function moderate(r, status) {
    if (await act("reviewModerate", { id: r.id, status }, status === "approved" ? "Review published." : status === "rejected" ? "Review rejected." : "Moved back to pending.")) reload();
  }

  async function reply(r) {
    const text = await askText({ title: "Reply to this review", message: "Shown publicly under the review.", initial: r.reply || "", placeholder: "Thank you for your kind words…" });
    if (text === null) return;
    if (await act("reviewModerate", { id: r.id, status: r.status, reply: text }, "Reply saved.")) reload();
  }

  async function remove(r) {
    if (!(await askConfirm({ title: "Delete this review forever?", confirmLabel: "Delete", danger: true }))) return;
    if (await act("reviewDelete", { id: r.id }, "Review deleted.")) reload();
  }

  return (
    <>
      <PageHead title="Reviews" sub="Customers' reviews appear on product pages only after you approve them (unless auto-approve is on in Settings)" />
      <Tabs tabs={[["pending", "Waiting", count("pending")], ["approved", "Published", count("approved")], ["rejected", "Rejected", count("rejected")], ["all", "All", all.length]]} value={tab} onChange={setTab} />

      {!list.length ? <Empty>Nothing here.</Empty> : (
        <div className="ad-grid">
          {list.map((r) => (
            <div key={r.id} className="ad-card" style={{ margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <Stars value={r.rating} /> <strong>{r.title}</strong>
                  <div className="ad-muted">{r.name} · on <b>{r.product}</b> · {formatDate(r.created)} {r.verified && <Badge tone="green">Verified buyer</Badge>}</div>
                </div>
                <Badge tone={r.status === "approved" ? "green" : r.status === "rejected" ? "red" : "amber"}>{r.status}</Badge>
              </div>
              <p style={{ margin: "10px 0" }}>{r.body}</p>
              {r.photos?.length > 0 && (
                <div className="ad-revphotos">
                  {r.photos.map((src) => (
                    <button key={src} type="button" onClick={() => setPhoto(src)} aria-label="View the photo bigger">
                      <img src={sized(src, 240)} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
              {r.reply && <div className="ad-note"><b>Your reply:</b> {r.reply}</div>}
              <div className="ad-btn-row" style={{ marginTop: 10 }}>
                {r.status !== "approved" && <button type="button" className="ad-btn small primary" onClick={() => moderate(r, "approved")}>Approve</button>}
                {r.status !== "rejected" && <button type="button" className="ad-btn small" onClick={() => moderate(r, "rejected")}>Reject</button>}
                {r.status !== "pending" && <button type="button" className="ad-btn small" onClick={() => moderate(r, "pending")}>Back to waiting</button>}
                <button type="button" className="ad-btn small" onClick={() => reply(r)}>{r.reply ? "Edit reply" : "Reply"}</button>
                <button type="button" className="ad-btn small danger" onClick={() => remove(r)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {photo && (
        <Modal title="Review photo" onClose={() => setPhoto("")}>
          <img src={sized(photo, 1200)} alt="" style={{ display: "block", maxWidth: "100%", margin: "0 auto", borderRadius: 12 }} />
        </Modal>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
export function Messages() {
  const [tab, setTab] = useState("new");
  const { data, loading, error, reload } = useLoad("messages");

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const all = data.messages || [];
  const count = (s) => all.filter((m) => m.status === s).length;
  const list = tab === "all" ? all : all.filter((m) => m.status === tab);

  async function setStatus(m, status) {
    if (await act("messageUpdate", { id: m.id, status })) reload();
  }

  async function addNote(m) {
    const note = await askText({ title: "Private note", initial: m.note || "", placeholder: "What did you do about this?" });
    if (note === null) return;
    if (await act("messageUpdate", { id: m.id, note }, "Note saved.")) reload();
  }

  async function remove(m) {
    if (!(await askConfirm({ title: "Delete this message?", confirmLabel: "Delete", danger: true }))) return;
    if (await act("messageDelete", { id: m.id }, "Deleted.")) reload();
  }

  return (
    <>
      <PageHead title="Messages" sub="From the Contact and FAQ forms" />
      <Tabs tabs={[["new", "New", count("new")], ["read", "Read", count("read")], ["replied", "Replied", count("replied")], ["all", "All", all.length]]} value={tab} onChange={setTab} />

      {!list.length ? <Empty>No messages here.</Empty> : (
        <div className="ad-grid">
          {list.map((m) => (
            <div key={m.id} className="ad-card" style={{ margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <strong>{m.name}</strong>
                  <div className="ad-muted">{[m.phone, m.email].filter(Boolean).join(" · ")} · {formatDate(m.time, true)}</div>
                </div>
                <Badge tone={m.status === "new" ? "blue" : m.status === "replied" ? "green" : "grey"}>{m.status}</Badge>
              </div>
              <p style={{ margin: "10px 0", whiteSpace: "pre-wrap" }}>{m.message}</p>
              {m.note && <div className="ad-note"><b>Note:</b> {m.note}</div>}
              <div className="ad-btn-row" style={{ marginTop: 10 }}>
                {m.phone && <a className="ad-btn small wa" href={whatsappLink(m.phone, "")} target="_blank" rel="noreferrer" onClick={() => setStatus(m, "replied")}>WhatsApp</a>}
                {m.email && <a className="ad-btn small" href={`mailto:${m.email}`} onClick={() => setStatus(m, "replied")}>Email</a>}
                {m.status !== "read" && <button type="button" className="ad-btn small" onClick={() => setStatus(m, "read")}>Mark read</button>}
                {m.status !== "replied" && <button type="button" className="ad-btn small" onClick={() => setStatus(m, "replied")}>Mark replied</button>}
                <button type="button" className="ad-btn small" onClick={() => addNote(m)}>Note</button>
                <button type="button" className="ad-btn small danger" onClick={() => remove(m)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
