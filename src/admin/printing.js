import { formatDate, money } from "../lib/format";
import { toast } from "./ui";

/*
 * Printable invoices and packing slips.
 *   mode "invoice" : prices, discount, delivery, total, shop footer line
 *   mode "slip"    : what to put in the parcel + where it goes - no prices,
 *                    with tick boxes, and the amount to collect for COD
 * Works for one order or many (each order starts on a new page).
 * It prints through a hidden frame, so pop-up blockers never get in the way.
 */

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const nl = (value) => esc(value).replace(/\n/g, "<br>");

function collectAmount(order) {
  const cod = /cash/i.test(order.payment || "") || /cod/i.test(order.payment || "");
  const paid = /paid/i.test(order.paymentStatus || "") && !/unpaid/i.test(order.paymentStatus || "");
  return cod && !paid ? Number(order.total) || 0 : 0;
}

function shipTo(order) {
  return `<div class="blk">
    <h4>Ship to</h4>
    <p><b>${esc(order.name)}</b><br>${esc(order.phone)}${order.whatsapp && order.whatsapp !== order.phone ? ` / ${esc(order.whatsapp)}` : ""}<br>${nl(order.address)}${order.area ? `<br>${esc(order.area)}` : ""}</p>
  </div>`;
}

function invoicePage(order, info) {
  const rows = (order.items || [])
    .map(
      (i, n) => `<tr><td>${n + 1}</td><td>${esc(i.name)}${i.variant ? ` <small>(${esc(i.variant)})</small>` : ""}</td><td class="c">${i.qty}</td><td class="r">${money(i.price)}</td><td class="r">${money(i.price * i.qty)}</td></tr>`
    )
    .join("");

  return `<section class="page">
    <header>
      <div><h1>${esc(info.storeName || "Store")}</h1>
        <p class="m">${[info.address, info.phone, info.email].filter(Boolean).map(esc).join(" · ")}</p></div>
      <div class="r"><h2>INVOICE</h2><p><b>${esc(order.orderId)}</b><br>${esc(formatDate(order.timestamp, true))}</p></div>
    </header>

    <div class="two">
      ${shipTo(order)}
      <div class="blk"><h4>Payment &amp; delivery</h4>
        <p>${esc(order.payment)} - <b>${esc(order.paymentStatus)}</b><br>${esc(order.delivery)}${order.trackingCode ? `<br>Tracking: <b>${esc(order.trackingCode)}</b>` : ""}</p></div>
    </div>

    <table><thead><tr><th style="width:28px">#</th><th>Item</th><th class="c">Qty</th><th class="r">Price</th><th class="r">Total</th></tr></thead><tbody>${rows}</tbody></table>

    <div class="sum">
      <div><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
      ${Number(order.discount) > 0 ? `<div><span>Discount${order.coupon ? ` (${esc(order.coupon)})` : ""}</span><span>- ${money(order.discount)}</span></div>` : ""}
      <div><span>Delivery</span><span>${Number(order.deliveryCharge) > 0 ? money(order.deliveryCharge) : "Free"}</span></div>
      <div class="t"><span>Total</span><span>${money(order.total)}</span></div>
    </div>

    ${order.note ? `<p class="note"><b>Customer note:</b> ${nl(order.note)}</p>` : ""}
    ${info.footer ? `<p class="foot">${nl(info.footer)}</p>` : ""}
  </section>`;
}

function slipPage(order, info) {
  const lines = (order.items || [])
    .map(
      (i) => `<tr><td class="box"><span></span></td><td>${esc(i.name)}${i.variant ? ` <small>(${esc(i.variant)})</small>` : ""}</td><td class="c big">${i.qty}</td></tr>`
    )
    .join("");
  const collect = collectAmount(order);

  return `<section class="page">
    <header>
      <div><h1>${esc(info.storeName || "Store")}</h1><p class="m">Packing slip</p></div>
      <div class="r"><h2>${esc(order.orderId)}</h2><p>${esc(formatDate(order.timestamp, true))}</p></div>
    </header>

    <div class="two">
      ${shipTo(order)}
      <div class="blk"><h4>Delivery</h4><p>${esc(order.delivery)}${order.trackingCode ? `<br>Tracking: <b>${esc(order.trackingCode)}</b>` : ""}</p>
        ${collect > 0 ? `<p class="cod">COLLECT ${money(collect)}</p>` : `<p class="paid">PAID - nothing to collect</p>`}</div>
    </div>

    <table><thead><tr><th style="width:34px">Packed</th><th>Item</th><th class="c" style="width:60px">Qty</th></tr></thead><tbody>${lines}</tbody></table>

    ${order.note ? `<p class="note"><b>Customer note:</b> ${nl(order.note)}</p>` : ""}
    <p class="sign">Packed by: ____________________ &nbsp;&nbsp; Checked by: ____________________</p>
  </section>`;
}

const CSS = `
*{box-sizing:border-box}
body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#2f2933;font-size:13px;line-height:1.45}
.page{padding:26px 30px;page-break-after:always}
.page:last-child{page-break-after:auto}
header{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #9678a7;padding-bottom:12px;margin-bottom:16px}
h1{font-family:Georgia,serif;font-weight:400;font-size:26px;margin:0}
h2{font-family:Georgia,serif;font-weight:400;font-size:22px;margin:0;color:#7f6590}
h4{margin:0 0 4px;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#8a7f8e}
p{margin:0}.m{color:#8a7f8e;font-size:12px;margin-top:4px}.r{text-align:right}.c{text-align:center}
.two{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px}
table{width:100%;border-collapse:collapse;margin:8px 0 14px}
th{background:#f3ecf4;font-size:11px;letter-spacing:.6px;text-transform:uppercase;text-align:left}
th,td{padding:8px 8px;border-bottom:1px solid #e5dce6;vertical-align:top}
th.r,td.r{text-align:right}th.c,td.c{text-align:center}
small{color:#8a7f8e}
.sum{margin-left:auto;width:260px}
.sum div{display:flex;justify-content:space-between;padding:4px 0}
.sum .t{border-top:2px solid #2f2933;margin-top:4px;padding-top:8px;font-size:17px;font-weight:700}
.note{margin:10px 0;padding:8px 10px;background:#faf6fb;border-left:3px solid #9678a7}
.foot{margin-top:22px;text-align:center;color:#8a7f8e;font-style:italic}
.box span{display:inline-block;width:16px;height:16px;border:1.5px solid #2f2933;border-radius:3px}
.big{font-size:20px;font-weight:700}
.cod{margin-top:8px;padding:8px 10px;border:2px solid #2f2933;font-size:18px;font-weight:700;text-align:center}
.paid{margin-top:8px;color:#3f7a52;font-weight:700}
.sign{margin-top:34px;color:#555}
@page{size:A4;margin:10mm}
`;

/* orders: array of order objects from the admin API, info: the "print" block from the API */
export function printOrders(orders, mode, info = {}) {
  const list = (orders || []).filter(Boolean);

  if (!list.length) return toast("Choose at least one order.", "error");

  const pages = list.map((order) => (mode === "slip" ? slipPage(order, info) : invoicePage(order, info))).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${mode === "slip" ? "Packing slips" : "Invoices"}</title><style>${CSS}</style></head><body>${pages}</body></html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";

  const cleanup = () => setTimeout(() => frame.remove(), 1500);
  let printed = false;

  frame.onload = () => {
    if (printed) return;
    printed = true;

    try {
      const win = frame.contentWindow;
      win.focus();
      win.onafterprint = cleanup;
      win.print();
      /* some browsers never fire afterprint - tidy up anyway */
      setTimeout(cleanup, 60000);
    } catch {
      cleanup();
      toast("Could not open the print window.", "error");
    }
  };

  /* content first, then insert: the frame loads exactly once, with the pages in it */
  frame.srcdoc = html;
  document.body.appendChild(frame);
}
