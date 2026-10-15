import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useStore } from "../context/StoreContext";
import { apiPost } from "../lib/api";
import { isBdMobile, normalizePhone } from "../lib/format";
import {
  readSavedCoupon,
  saveCoupon,
  clearSavedCoupon,
  hasOrderedBefore,
} from "../lib/couponStore";

/*
 * The coupon box of the cart page.
 *   - a code typed by the visitor is checked by the server and remembered
 *   - the welcome coupon (Admin > Settings) is applied by itself on a first order
 *   - when the cart changes the discount is worked out again
 */
export function useCoupon(phoneText = "") {
  const { lines, settings } = useStore();
  const [state, setState] = useState({ applied: null, busy: false, error: "" });
  const triedWelcome = useRef("");

  const items = useMemo(
    () =>
      lines
        .filter((line) => !line.unavailable)
        .map((line) => ({ id: line.id, variantId: line.variantId, qty: line.qty })),
    [lines]
  );
  const signature = JSON.stringify(items);
  /* with a valid mobile number the server can also check "already used by you" */
  const phone = isBdMobile(normalizePhone(phoneText)) ? normalizePhone(phoneText) : "";

  const welcomeCode = String(settings.welcomeCouponCode || "").trim().toUpperCase();
  const welcomeOffered = Boolean(welcomeCode) && !hasOrderedBefore();

  const check = useCallback(
    async (code, { silent = false, auto = false } = {}) => {
      if (!items.length) return null;

      setState((current) => ({ ...current, busy: true, error: "" }));

      try {
        const result = await apiPost({ action: "validateCoupon", code, items, phone });
        saveCoupon(result.code, auto);
        setState({ applied: result, busy: false, error: "" });
        return result;
      } catch (problem) {
        if (!auto) clearSavedCoupon();
        setState({ applied: null, busy: false, error: silent ? "" : problem.message || "That code did not work." });
        return null;
      }
    },
    [items, phone]
  );

  useEffect(() => {
    if (!items.length) {
      setState({ applied: null, busy: false, error: "" });
      return;
    }

    const saved = readSavedCoupon();

    if (saved) {
      check(saved.code, { silent: true, auto: saved.auto });
      return;
    }

    /* first order: try the welcome coupon once for this cart */
    if (welcomeOffered && settings.welcomeCouponAuto !== false && triedWelcome.current !== signature) {
      triedWelcome.current = signature;
      check(welcomeCode, { silent: true, auto: true });
    }
    // re-run when the cart content (or a valid phone number) changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, phone]);

  const remove = useCallback(() => {
    clearSavedCoupon();
    triedWelcome.current = signature; /* do not bring the welcome coupon straight back */
    setState({ applied: null, busy: false, error: "" });
  }, [signature]);

  return {
    ...state,
    apply: (code) => check(String(code || "").trim().toUpperCase(), { silent: false, auto: false }),
    remove,
    welcomeCode: welcomeOffered ? welcomeCode : "",
  };
}
