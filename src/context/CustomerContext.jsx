import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { apiPost, ApiError } from "../lib/api";
import { CUSTOMER_TOKEN_KEY } from "../config/api";
import { useStore } from "./StoreContext";

const CustomerContext = createContext(null);

function readSession() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOMER_TOKEN_KEY) || "null");

    if (!parsed || !parsed.token) return null;
    if (parsed.expiresAt && Number(parsed.expiresAt) < Date.now()) return null;

    return parsed;
  } catch {
    return null;
  }
}

function writeSession(session) {
  try {
    if (session) localStorage.setItem(CUSTOMER_TOKEN_KEY, JSON.stringify(session));
    else localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function CustomerProvider({ children }) {
  const { settings, getProduct, products } = useStore();

  const [session, setSession] = useState(readSession);
  const [account, setAccount] = useState(null);
  const [ready, setReady] = useState(!readSession());

  const token = session?.token || "";
  const accountsEnabled = settings.accountsEnabled !== false;

  /* favourites belong to the account: [product ids], saved on the server */
  const [wishlist, setWishlist] = useState([]);
  const [prompt, setPrompt] = useState(null); /* a product waiting for a login */
  const wishlistSynced = useRef(false);
  const lastSaved = useRef("");

  const signOutLocal = useCallback(() => {
    writeSession(null);
    setSession(null);
    setAccount(null);
    setWishlist([]);
    wishlistSynced.current = false;
  }, []);

  /* a call that needs the login; a rejected session logs the customer out */
  const call = useCallback(
    async (action, body = {}, options) => {
      if (!token) throw new ApiError("Please log in first.", "auth");

      try {
        return await apiPost({ action, customerToken: token, ...body }, options);
      } catch (error) {
        if (error instanceof ApiError && error.code === "auth") signOutLocal();
        throw error;
      }
    },
    [token, signOutLocal]
  );

  /* restore the account when the page opens */
  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setReady(true);
      return undefined;
    }

    apiPost({ action: "customerMe", customerToken: token })
      .then((data) => {
        if (!cancelled) setAccount(data.account);
      })
      .catch((error) => {
        if (!cancelled && error instanceof ApiError && error.code === "auth") signOutLocal();
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
    // only when the token itself changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function startSession(data) {
    const next = { token: data.token, expiresAt: Number(data.expiresAt) || 0 };
    writeSession(next);
    wishlistSynced.current = false;
    setSession(next);
    setAccount(data.account);
    return data.account;
  }

  const register = useCallback(async ({ name, phone, email, password, hp }) => {
    const data = await apiPost({
      action: "customerRegister",
      name,
      phone,
      email,
      password,
      hp,
    });
    return startSession(data);
  }, []);

  const login = useCallback(async ({ phone, password }) => {
    const data = await apiPost({ action: "customerLogin", phone, password });
    return startSession(data);
  }, []);

  const logout = useCallback(() => signOutLocal(), [signOutLocal]);

  const updateProfile = useCallback(
    async (patch) => {
      const data = await call("customerUpdate", patch);

      if (data.token) {
        const next = { token: data.token, expiresAt: Number(data.expiresAt) || 0 };
        writeSession(next);
        setSession(next);
      }

      setAccount(data.account);
      return data.account;
    },
    [call]
  );

  const fetchOrders = useCallback(async () => (await call("customerOrders")).orders, [call]);

  const claimOrder = useCallback(
    async (orderId, phone) => (await call("customerClaimOrder", { orderId, phone })).order,
    [call]
  );

  const submitReview = useCallback(
    async ({ productId, rating, title, body, hp, photos }) =>
      call("submitReview", { productId, rating, title, body, hp, photos }, { timeout: 60000 }),
    [call]
  );

  const forgot = useCallback(
    async (phone) => (await apiPost({ action: "customerForgot", phone })).message,
    []
  );

  const reset = useCallback(
    async ({ phone, code, newPassword }) =>
      (await apiPost({ action: "customerReset", phone, code, newPassword })).message,
    []
  );

  /* ---------------------------------------------------------
     favourites (wishlist) - ONLY for people with an account.
     Without a login nothing is saved: the heart asks them to log in
     and, after they do, the product they tapped is added for them.
  --------------------------------------------------------- */
  const PENDING_KEY = "pearlskino-pending-favourite";

  useEffect(() => {
    if (!account || wishlistSynced.current) return;

    wishlistSynced.current = true;

    let ids = (account.wishlist || []).map(String);

    try {
      const pending = sessionStorage.getItem(PENDING_KEY);
      if (pending) {
        sessionStorage.removeItem(PENDING_KEY);
        if (!ids.includes(pending)) ids = [...ids, pending];
      }
    } catch {
      /* ignore */
    }

    lastSaved.current = ids.join(",");
    setWishlist(ids);

    if (ids.length !== (account.wishlist || []).length) {
      call("customerWishlist", { ids }).catch(() => {});
    }
    // run once per login
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  useEffect(() => {
    if (!account || !wishlistSynced.current) return undefined;

    const signature = wishlist.join(",");

    if (signature === lastSaved.current) return undefined;

    const timer = window.setTimeout(() => {
      lastSaved.current = signature;
      call("customerWishlist", { ids: wishlist }).catch(() => {});
    }, 700);

    return () => window.clearTimeout(timer);
  }, [wishlist, account, call]);

  const isWishlisted = useCallback((id) => wishlist.includes(String(id)), [wishlist]);

  /* returns "added" | "removed" | "login" */
  const toggleWishlist = useCallback(
    (id) => {
      const wanted = String(id);

      if (!account) {
        setPrompt({ id: wanted });
        return "login";
      }

      const has = wishlist.includes(wanted);
      setWishlist((current) =>
        current.includes(wanted) ? current.filter((item) => item !== wanted) : [...current, wanted]
      );
      return has ? "removed" : "added";
    },
    [account, wishlist]
  );

  const closePrompt = useCallback(() => setPrompt(null), []);

  /* the product to add after the visitor logs in */
  const rememberPending = useCallback((id) => {
    try {
      sessionStorage.setItem(PENDING_KEY, String(id));
    } catch {
      /* ignore */
    }
  }, []);

  const wishlistProducts = useMemo(
    () => wishlist.map((id) => getProduct(id)).filter(Boolean),
    // products changes when the shop refreshes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wishlist, getProduct, products]
  );

  const value = useMemo(
    () => ({
      account,
      token,
      ready,
      loggedIn: Boolean(account),
      accountsEnabled,
      register,
      login,
      logout,
      updateProfile,
      fetchOrders,
      claimOrder,
      submitReview,
      forgot,
      reset,
      wishlist,
      wishlistProducts,
      isWishlisted,
      toggleWishlist,
      prompt,
      closePrompt,
      rememberPending,
    }),
    [
      account,
      token,
      ready,
      accountsEnabled,
      register,
      login,
      logout,
      updateProfile,
      fetchOrders,
      claimOrder,
      submitReview,
      forgot,
      reset,
      wishlist,
      wishlistProducts,
      isWishlisted,
      toggleWishlist,
      prompt,
      closePrompt,
      rememberPending,
    ]
  );

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export function useCustomer() {
  const context = useContext(CustomerContext);

  if (!context) {
    throw new Error("useCustomer must be used inside CustomerProvider");
  }

  return context;
}
