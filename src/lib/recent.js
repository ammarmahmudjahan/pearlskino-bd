/*
 * Recently viewed products - kept only in this browser (no login needed).
 */
const KEY = "pearlskino-recent";
const MAX = 12;

export function readRecent() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list.map(String).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecent(id) {
  const wanted = String(id);

  try {
    const next = [wanted, ...readRecent().filter((item) => item !== wanted)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
