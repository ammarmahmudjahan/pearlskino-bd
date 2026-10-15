import { TEXTS } from "../content/registry";
import T from "../content/T";
import { formatDate } from "../lib/format";

/*
 * Small pieces shared by the order tracking page and the account page.
 * Status names, status lines and payment states are all editable texts
 * (Admin > Site Text > "Order tracking").
 */

export const PROGRESS_STEPS = ["New", "Confirmed", "Processing", "Shipped", "Delivered"];
export const DEAD_STATUSES = ["Cancelled", "Returned"];

function statusKey(status) {
  return `track.status.${String(status || "").toLowerCase()}`;
}

export function StatusName({ status }) {
  const key = statusKey(status);

  if (!TEXTS[key]) return <>{status}</>;

  return <T k={key} />;
}

export function StatusNote({ status, className }) {
  const key = `track.note.${String(status || "").toLowerCase()}`;

  if (!TEXTS[key]) return null;

  return <T k={key} as="p" className={className} />;
}

export function PaymentState({ value }) {
  const map = {
    Unpaid: "unpaid",
    "Pending verification": "pending",
    Paid: "paid",
    Refunded: "refunded",
  };
  const key = map[value] ? `track.pay.${map[value]}` : "";

  if (!key || !TEXTS[key]) return <>{value}</>;

  return <T k={key} />;
}

export function StatusBadge({ status }) {
  const tone = DEAD_STATUSES.includes(status)
    ? "dead"
    : status === "Delivered"
      ? "done"
      : status === "Shipped"
        ? "going"
        : "open";

  return (
    <span className={`order-badge ${tone}`}>
      <StatusName status={status} />
    </span>
  );
}

/* New -> Confirmed -> Processing -> Shipped -> Delivered */
export function OrderProgress({ status, timeline }) {
  if (DEAD_STATUSES.includes(status)) {
    return (
      <div className="order-progress-dead">
        <StatusBadge status={status} />
      </div>
    );
  }

  const current = Math.max(0, PROGRESS_STEPS.indexOf(status));

  /* the day each step was reached (when the order's history is available) */
  const reached = {};
  (Array.isArray(timeline) ? timeline : []).forEach((entry) => {
    if (entry && entry.status && !reached[entry.status]) reached[entry.status] = entry.time;
  });

  return (
    <ol className="order-progress" aria-label="Order progress">
      {PROGRESS_STEPS.map((step, index) => (
        <li
          key={step}
          className={index < current ? "done" : index === current ? "current" : ""}
          aria-current={index === current ? "step" : undefined}
        >
          <span className="order-progress-dot" aria-hidden="true">
            {index < current ? "✓" : index + 1}
          </span>
          <span className="order-progress-label">
            <StatusName status={step} />
            {reached[step] && index <= current && (
              <small className="order-progress-date">{formatDate(reached[step])}</small>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function OrderTimeline({ timeline }) {
  const list = Array.isArray(timeline) ? [...timeline].reverse() : [];

  if (!list.length) return null;

  return (
    <ol className="order-timeline">
      {list.map((entry, index) => (
        <li key={`${entry.time}-${index}`} className={index === 0 ? "latest" : ""}>
          <span className="order-timeline-dot" aria-hidden="true"></span>

          <div>
            <strong>
              <StatusName status={entry.status} />
            </strong>
            <small>{formatDate(entry.time, true)}</small>
            {entry.note && <p>{entry.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
