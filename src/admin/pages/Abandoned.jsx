import { useMemo, useState } from "react";

import { money } from "../../lib/format";
import { Badge, Empty, ErrorBox, PageHead, Spinner, Tabs, act, askConfirm, useAdmin, useLoad } from "../ui";

/* "37 min", "5 h", "2 days" */
function ago(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  const d = Math.round(m / 1440);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

const STATUS_TONE = { open: "amber", contacted: "blue", recovered: "green", dismissed: "grey" };

export default function Abandoned() {
  const { can, refreshBadges } = useAdmin();
  const { data, loading, error, reload } = useLoad("abandoned");
  const [tab, setTab] = useState("followup");
  const editable = can("customers.edit");

  const items = useMemo(() => data?.items || [], [data]);
  const minutes = data?.afterMinutes || 60;

  const groups = useMemo(() => {
    const g = { followup: [], browsing: [], contacted: [], recovered: [], dismissed: [] };
    items.forEach((i) => {
      if (i.status === "open") (i.abandoned ? g.followup : g.browsing).push(i);
      else if (g[i.status]) g[i.status].push(i);
    });
    return g;
  }, [items]);

  const atRisk = useMemo(() => groups.followup.reduce((sum, i) => sum + (Number(i.total) || 0), 0), [groups]);

  async function mark(item, status, message) {
    const res = await act("abandonedUpdate", { id: item.id, status }, message);
    if (res) {
      reload();
      refreshBadges?.();
    }
  }

  async function remove(item) {
    if (!(await askConfirm({ title: "Delete this cart?", message: "It is removed from the list for good.", confirmLabel: "Delete", danger: true }))) return;
    if (await act("abandonedDelete", { id: item.id }, "Deleted.")) {
      reload();
      refreshBadges?.();
    }
  }

  function openWhatsApp(item) {
    /* the link opens in a new tab by itself; we only record that we reached out */
    if (item.status === "open") mark(item, "contacted");
  }

  function mailLink(item) {
    const subject = encodeURIComponent("You left something in your bag");
    const body = encodeURIComponent(item.message || "");
    return `mailto:${item.email}?subject=${subject}&body=${body}`;
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const list = groups[tab] || [];

  return (
    <>
      <PageHead
        title="Abandoned carts"
        sub={`${groups.followup.length} to follow up${atRisk ? ` · ${money(atRisk)} waiting in bags` : ""}`}
      >
        <button type="button" className="ad-btn" onClick={reload}>Refresh</button>
      </PageHead>

      <div className="ad-note" style={{ marginBottom: 14 }}>
        A cart appears here when someone typed their phone or email at checkout, put things in the bag, and did not order for {minutes} minutes. Press <b>WhatsApp</b> to open a ready-made message and just hit Send. If they order later, the cart is marked <b>Recovered</b> automatically.
      </div>

      <Tabs
        tabs={[
          ["followup", "Follow up", groups.followup.length],
          ["browsing", "Still shopping", groups.browsing.length],
          ["contacted", "Contacted", groups.contacted.length],
          ["recovered", "Recovered", groups.recovered.length],
          ["dismissed", "Dismissed", groups.dismissed.length],
        ]}
        value={tab}
        onChange={setTab}
      />

      {!list.length ? (
        <Empty>
          {tab === "followup" ? "Nobody to follow up right now." : tab === "browsing" ? "Nobody is shopping at the moment." : "Nothing here."}
        </Empty>
      ) : (
        <div className="ad-cartlist">
          {list.map((item) => (
            <div className="ad-cart" key={item.id}>
              <div className="ad-cart-who">
                <strong>{item.name || "Visitor"}</strong>
                <small>{[item.phone, item.email].filter(Boolean).join(" · ") || "no contact"}</small>
                <span className="ad-muted">{ago(item.ageMinutes)}</span>
                <Badge tone={STATUS_TONE[item.status]}>{item.status}</Badge>
                {item.contactedAt && item.status === "contacted" && <small>contacted {item.contactedAt.slice(0, 16)}</small>}
              </div>

              <div className="ad-cart-items">
                <ul>
                  {item.items.map((line, n) => (
                    <li key={`${line.id}-${n}`}>
                      {line.name}
                      {line.variant ? <small> - {line.variant}</small> : null} <em>× {line.qty}</em>
                    </li>
                  ))}
                </ul>
                <strong>{money(item.total)}</strong>
              </div>

              <div className="ad-cart-actions">
                {item.waUrl && (
                  <a className="ad-btn wa small" href={item.waUrl} target="_blank" rel="noreferrer" onClick={() => openWhatsApp(item)}>
                    WhatsApp
                  </a>
                )}
                {item.email && (
                  <a className="ad-btn small" href={mailLink(item)} onClick={() => item.status === "open" && mark(item, "contacted")}>
                    Email
                  </a>
                )}
                {item.phone && <a className="ad-btn small" href={`tel:${item.phone}`}>Call</a>}
                {editable && item.status !== "contacted" && item.status !== "recovered" && (
                  <button type="button" className="ad-btn small" onClick={() => mark(item, "contacted", "Marked as contacted.")}>Mark contacted</button>
                )}
                {editable && item.status !== "recovered" && (
                  <button type="button" className="ad-btn small" onClick={() => mark(item, "recovered", "Marked as recovered.")}>Recovered</button>
                )}
                {editable && item.status !== "dismissed" && item.status !== "recovered" && (
                  <button type="button" className="ad-btn small ghost" onClick={() => mark(item, "dismissed", "Dismissed.")}>Dismiss</button>
                )}
                {editable && <button type="button" className="ad-btn small danger" onClick={() => remove(item)}>Delete</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {!items.length && (
        <p className="ad-muted" style={{ marginTop: 14 }}>
          Nothing has been saved yet. Abandoned-cart saving can be switched on or off in Settings → Shop features.
        </p>
      )}
    </>
  );
}
