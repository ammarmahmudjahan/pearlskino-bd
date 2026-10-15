/*
 * The coupon a visitor applied in the cart is remembered in this browser,
 * so it is still there at checkout. Only the CODE is kept - the discount is
 * always worked out again by the server.
 */
const COUPON_KEY = "pearlskino-coupon";
const ORDERED_KEY = "pearlskino-ordered";

export function readSavedCoupon() {
  try {
    const saved = JSON.parse(localStorage.getItem(COUPON_KEY) || "null");
    return saved && saved.code ? { code: String(saved.code), auto: Boolean(saved.auto) } : null;
  } catch {
    return null;
  }
}

export function saveCoupon(code, auto = false) {
  try {
    localStorage.setItem(COUPON_KEY, JSON.stringify({ code: String(code), auto }));
  } catch {
    /* ignore */
  }
}

export function clearSavedCoupon() {
  try {
    localStorage.removeItem(COUPON_KEY);
  } catch {
    /* ignore */
  }
}

/* has this browser ever placed an order? (the welcome coupon is for first orders) */
export function hasOrderedBefore() {
  try {
    return localStorage.getItem(ORDERED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markOrdered() {
  try {
    localStorage.setItem(ORDERED_KEY, "1");
  } catch {
    /* ignore */
  }
}
