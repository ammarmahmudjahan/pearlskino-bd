export function money(value) {
  const n = Math.round(Number(value) || 0);
  return `৳${n.toLocaleString("en-US")}`;
}

export function number(value) {
  return (Number(value) || 0).toLocaleString("en-US");
}

/* the backend sends "yyyy-MM-dd HH:mm:ss" in the store's time zone */
export function parseStamp(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(
    String(value || "")
  );

  if (!m) return null;

  return new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4] || 0),
    Number(m[5] || 0),
    Number(m[6] || 0)
  );
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function formatDate(value, withTime = false) {
  const d = parseStamp(value);
  if (!d) return String(value || "");

  const day = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  if (!withTime) return day;

  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;

  return `${day}, ${h}:${String(d.getMinutes()).padStart(2, "0")} ${ampm}`;
}

export function timeAgo(value) {
  const d = parseStamp(value);
  if (!d) return "";

  const seconds = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)} d ago`;
  return formatDate(value);
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function normalizePhone(value) {
  let p = String(value || "").replace(/[\s()-]/g, "");
  if (p.startsWith("+880")) p = `0${p.slice(4)}`;
  else if (/^880\d{10}$/.test(p)) p = `0${p.slice(3)}`;
  else if (/^\d{10}$/.test(p)) p = `0${p}`;
  return p;
}

export function isBdMobile(value) {
  return /^01[3-9]\d{8}$/.test(normalizePhone(value));
}

export function whatsappLink(number, text) {
  let p = normalizePhone(number);
  if (!p) return "";
  if (p.startsWith("0")) p = `880${p.slice(1)}`;
  p = p.replace(/\D/g, "");
  return `https://wa.me/${p}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/* a cell that starts with = + - @ can run as a formula in Excel / Sheets */
export function csvSafe(value) {
  const s = String(value ?? "");
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export function toCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => `"${csvSafe(cell).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\r\n");
}

export function downloadFile(name, text, type = "text/csv;charset=utf-8") {
  const blob = new Blob(["﻿", text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* tiny CSV parser (quotes, commas, new lines) for product import */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const s = String(text || "").replace(/^﻿/, "");

  for (let i = 0; i < s.length; i++) {
    const c = s[i];

    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }

  row.push(cell);
  if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}
