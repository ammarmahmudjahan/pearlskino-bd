import { money, timeAgo } from "../../lib/format";
import { BarChart, Card, ErrorBox, PageHead, Spinner, Stat, StatusPill, useAdmin, useLoad } from "../ui";

export default function Dashboard() {
  const { go, can } = useAdmin();
  const { data, loading, error, reload } = useLoad("dashboard");

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const d = data;
  const finance = can("finance.view");
  const statusOrder = ["New", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"];
  const series = d.series || [];
  const totalRevenue = series.reduce((s, x) => s + (Number(x.revenue) || 0), 0);
  const totalOrders = series.reduce((s, x) => s + (Number(x.orders) || 0), 0);

  return (
    <>
      <PageHead title="Dashboard" sub="How the store is doing right now">
        <button type="button" className="ad-btn" onClick={reload}>
          Refresh
        </button>
      </PageHead>

      <div className="ad-stats">
        <Stat label="Orders today" value={d.today?.orders ?? 0} sub={money(d.today?.revenue)} />
        <Stat label="Orders this month" value={d.month?.orders ?? 0} sub={money(d.month?.revenue)} />
        {finance && <Stat label="Profit this month" value={money(d.month?.profit)} sub="where cost price is set" />}
        <div className="ad-stat link" onClick={() => go("orders")}>
          <small>New orders waiting</small>
          <strong>{d.counts?.New || 0}</strong>
          <em>open orders</em>
        </div>
        <div className={`ad-stat link ${d.pendingPayments ? "warn" : ""}`} onClick={() => go("orders")}>
          <small>Payments to verify</small>
          <strong>{d.pendingPayments || 0}</strong>
          <em>bKash etc.</em>
        </div>
        <div className={`ad-stat link ${d.lowStock?.length ? "bad" : ""}`} onClick={() => go("inventory")}>
          <small>Low stock items</small>
          <strong>{d.lowStock?.length || 0}</strong>
          <em>need restock</em>
        </div>
      </div>

      <div className="ad-stats">
        <div className="ad-stat link" onClick={() => go("returns")}>
          <small>Open returns</small>
          <strong>{d.openReturns || 0}</strong>
        </div>
        <div className="ad-stat link" onClick={() => go("messages")}>
          <small>New messages</small>
          <strong>{d.newMessages || 0}</strong>
        </div>
        <div className="ad-stat link" onClick={() => go("reviews")}>
          <small>Reviews to approve</small>
          <strong>{d.pendingReviews || 0}</strong>
        </div>
        {can("customers.view") && (
          <div className={`ad-stat link ${d.abandonedOpen ? "warn" : ""}`} onClick={() => go("abandoned")}>
            <small>Abandoned carts</small>
            <strong>{d.abandonedOpen || 0}</strong>
            <em>to follow up</em>
          </div>
        )}
        {can("inventory.view") && (
          <div className={`ad-stat link ${d.stockAlertsWaiting ? "warn" : ""}`} onClick={() => go("inventory", { tab: "alerts" })}>
            <small>Waiting for restock</small>
            <strong>{d.stockAlertsWaiting || 0}</strong>
            <em>customers asked to be told</em>
          </div>
        )}
        <div className="ad-stat">
          <small>Repeat customers</small>
          <strong>{d.repeatRate ?? 0}%</strong>
          <em>of buyers, last 30 days</em>
        </div>
      </div>

      {d.warnings?.notifications && (
        <div className="ad-note warn" style={{ marginBottom: 18 }}>
          Order alerts are not set up yet.{" "}
          <button type="button" className="ad-btn small" onClick={() => go("settings")}>
            Open Settings → Notifications
          </button>
        </div>
      )}

      <div className="ad-split">
        <div>
          <Card title="Last 30 days" sub={`${totalOrders} orders · ${money(totalRevenue)}`}>
            <BarChart series={series} field="revenue" height={150} />
          </Card>

          <Card title="Recent orders" actions={<button type="button" className="ad-btn small" onClick={() => go("orders")}>All orders</button>}>
            {d.recent?.length ? (
              <div className="ad-tablewrap">
                <table className="ad-table">
                  <tbody>
                    {d.recent.map((o) => (
                      <tr key={o.orderId} className="click" onClick={() => go("orders", { open: o.orderId })}>
                        <td>
                          <strong>{o.orderId}</strong>
                          <small>{o.name}</small>
                        </td>
                        <td>
                          <StatusPill status={o.status} />
                        </td>
                        <td className="num">
                          {money(o.total)}
                          <small>{timeAgo(o.timestamp)}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="ad-empty">No orders yet.</div>
            )}
          </Card>
        </div>

        <div>
          <Card title="Orders by status">
            {statusOrder.map((s) => (
              <div className="ad-hbar" key={s}>
                <span>{s}</span>
                <i style={{ width: `${Math.min(100, ((d.counts?.[s] || 0) / Math.max(1, ...Object.values(d.counts || {}))) * 100)}%` }} />
                <b>{d.counts?.[s] || 0}</b>
              </div>
            ))}
          </Card>

          <Card title="Best sellers">
            {d.best?.length ? (
              <table className="ad-table">
                <tbody>
                  {d.best.map((b) => (
                    <tr key={b.id || b.name}>
                      <td>{b.name}</td>
                      <td className="num">{b.qty} sold</td>
                      <td className="num">{money(b.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="ad-empty">Nothing sold yet.</div>
            )}
          </Card>

          {d.lowStock?.length > 0 && (
            <Card title="Running low" actions={<button type="button" className="ad-btn small" onClick={() => go("inventory")}>Manage</button>}>
              <table className="ad-table">
                <tbody>
                  {d.lowStock.slice(0, 8).map((i) => (
                    <tr key={`${i.productId}-${i.variantId}`}>
                      <td>
                        {i.name}
                        {i.variant && <small>{i.variant}</small>}
                      </td>
                      <td className="num">
                        <b>{i.stock}</b> left
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
