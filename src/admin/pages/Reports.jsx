import { useState } from "react";

import { downloadFile, money, toCsv } from "../../lib/format";
import { BarChart, Card, ErrorBox, PageHead, Spinner, Stat, Tabs, useAdmin, useLoad } from "../ui";

function day(offset) {
  const d = new Date(Date.now() - offset * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Reports() {
  const { can } = useAdmin();
  const [from, setFrom] = useState(day(29));
  const [to, setTo] = useState(day(0));
  const [groupBy, setGroupBy] = useState("day");
  const { data, loading, error, reload } = useLoad("report", { from, to, groupBy }, [from, to, groupBy]);

  const finance = can("finance.view");
  const r = data?.report;

  function exportCsv() {
    if (!r) return;
    downloadFile(`report-${from}_${to}.csv`, toCsv([["Period", "Orders", "Revenue", "Profit"], ...(r.series || []).map((s) => [s.label, s.orders, s.revenue, s.profit])]));
  }

  function preset(days) {
    setFrom(day(days - 1));
    setTo(day(0));
  }

  const hbars = (items, name, value, format = (v) => v) => {
    const top = Math.max(1, ...items.map((i) => Number(value(i)) || 0));
    return items.map((i) => (
      <div className="ad-hbar" key={name(i)}>
        <span>{name(i)}</span>
        <i style={{ width: `${((Number(value(i)) || 0) / top) * 100}%` }} />
        <b>{format(value(i))}</b>
      </div>
    ));
  };

  return (
    <>
      <PageHead title="Reports" sub="Sales in any date range">
        <button type="button" className="ad-btn" onClick={exportCsv} disabled={!r}>Export CSV</button>
      </PageHead>

      <div className="ad-toolbar">
        <Tabs tabs={[["7", "7 days"], ["30", "30 days"], ["90", "90 days"]]} value="" onChange={(d) => preset(Number(d))} />
        <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={{ maxWidth: 160 }} />
        <span>→</span>
        <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} style={{ maxWidth: 160 }} />
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
          <option value="day">By day</option>
          <option value="month">By month</option>
        </select>
      </div>

      {loading ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : (
        <>
          <div className="ad-stats">
            <Stat label="Orders" value={r.totals.orders} sub={`${r.totals.delivered} delivered`} />
            <Stat label="Revenue (not cancelled)" value={money(r.totals.revenue)} sub={`avg ${money(r.averageOrder)}`} />
            <Stat label="Delivered revenue" value={money(r.totals.deliveredRevenue)} />
            <Stat label="Cancelled / returned" value={`${r.totals.cancelled} / ${r.totals.returned}`} />
            <Stat label="Discounts given" value={money(r.totals.discount)} />
            <Stat label="Units sold" value={r.totals.units} />
            {finance && <Stat label="Profit" value={money(r.totals.profit)} sub={r.totals.noCostOrders ? `${r.totals.noCostOrders} orders have no cost price` : "from cost prices"} />}
            {finance && <Stat label="Refunds" value={money(r.totals.refunds)} />}
            <Stat label="Repeat customers" value={`${r.repeat?.rate ?? 0}%`} sub={`${r.repeat?.repeatBuyers ?? 0} of ${r.repeat?.buyers ?? 0} buyers ordered 2+ times`} />
            <Stat label="Cancel / return rate" value={`${r.cancelRate ?? 0}%`} />
            <Stat label="Items per order" value={r.itemsPerOrder ?? 0} />
          </div>

          <Card title="Revenue over time"><BarChart series={r.series || []} field="revenue" height={170} /></Card>

          <div className="ad-grid c2">
            <Card title="Best sellers">
              {(r.best || []).length ? hbars(r.best, (b) => b.name, (b) => b.qty) : <div className="ad-empty">No sales.</div>}
            </Card>
            <Card title="Orders by status">
              {hbars(Object.entries(r.status || {}), (e) => e[0], (e) => e[1])}
            </Card>
            <Card title="Payment methods">
              {hbars(Object.entries(r.payment || {}), (e) => e[0], (e) => e[1])}
            </Card>
            <Card title="Top products by sales (৳)">
              {(r.bestByRevenue || []).length ? hbars(r.bestByRevenue, (b) => b.name, (b) => b.revenue, money) : <div className="ad-empty">No sales.</div>}
            </Card>
            <Card title="Sales by category (৳)">
              {(r.categories || []).length ? hbars(r.categories, (c) => c.category, (c) => c.revenue, money) : <div className="ad-empty">No sales.</div>}
            </Card>
            <Card title="Top areas by orders">
              {(r.areas || []).length ? hbars(r.areas.slice(0, 8), (a) => a.area || "—", (a) => a.orders) : <div className="ad-empty">No data.</div>}
            </Card>
            <Card title="Top areas by sales (৳)">
              {(r.areasByRevenue || []).length ? hbars(r.areasByRevenue.slice(0, 8), (a) => a.area || "—", (a) => a.revenue, money) : <div className="ad-empty">No data.</div>}
            </Card>
            <Card title="Busiest days of the week">
              {(r.weekdays || []).length ? hbars(r.weekdays, (w) => w.label, (w) => w.orders) : <div className="ad-empty">No data.</div>}
            </Card>
            <Card title="Coupons used">
              {(r.coupons || []).length ? hbars(r.coupons, (c) => c.code, (c) => c.orders) : <div className="ad-empty">No coupons used.</div>}
            </Card>
            <Card title="Customers">
              <div className="ad-stats" style={{ marginBottom: 0 }}>
                <Stat label="New" value={r.customers?.new ?? 0} />
                <Stat label="Returning" value={r.customers?.returning ?? 0} />
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
