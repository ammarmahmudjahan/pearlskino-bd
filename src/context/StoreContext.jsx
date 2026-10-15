import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { apiGet, apiText } from "../lib/api";
import { deliveryRange } from "../lib/delivery";
import { initAnalytics, trackEvent } from "../lib/analytics";

const StoreContext = createContext(null);

const CART_KEY = "pearlskino-cart";
const OLD_WISHLIST_KEY = "pearlskino-wishlist";
const BOOT_CACHE_KEY = "pearlskino_bootstrap_v4";
const LOGO_CACHE_PREFIX = "pearlskino_logo_";

const MAX_QTY_PER_LINE = 20;

export const DEFAULT_SETTINGS = {
  storeName: "PearlSkino BD",
  tagline: "Pearly Glow",
  logoUrl: "",
  logoFileId: "",
  phone: "01577100162",
  email: "ammageddonmadmax@gmail.com",
  storeAddress: "",
  messengerUrl: "",
  messengerEnabled: true,
  whatsappNumber: "",
  whatsappEnabled: true,
  facebookUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  youtubeUrl: "",
  deliveryCharge: 99,
  freeDeliveryThreshold: 0,
  deliveryZones: [],
  codEnabled: true,
  pickupEnabled: true,
  bkashEnabled: false,
  bkashNumber: "",
  bkashType: "Personal",
  bkashInstructions: "",
  minOrderAmount: 0,
  guestCheckout: true,
  accountsEnabled: true,
  reviewsEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: "",
  autoRefreshSeconds: 30,
  homeSections: {
    marquee: true,
    hero: true,
    banners: true,
    flags: true,
    categories: true,
    recent: true,
    reviews: true,
    cta: true,
  },
  homeCategoryLimit: 5,
  homeFlagSections: {
    new: { on: true, limit: 8 },
    trending: { on: true, limit: 8 },
    featured: { on: true, limit: 8 },
    deal: { on: true, limit: 8 },
  },
  urgencyEnabled: true,
  urgencyThreshold: 5,
  freeShipBar: true,
  welcomeCouponCode: "",
  welcomeCouponAuto: true,
  stickyBarEnabled: true,
  recentlyViewedEnabled: true,
  liveSearchEnabled: true,
  relatedEnabled: true,
  togetherEnabled: true,
  stockAlertsEnabled: true,
  abandonedCartsEnabled: true,
  reviewPhotosEnabled: true,
  videoUploadMaxMb: 10,
  siteUrl: "",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  seoImage: "",
  seoIndex: true,
  fbPixelId: "",
  gaMeasurementId: "",
  googleSiteVerification: "",
};

/* ---------------------------------------------------------
   small storage helpers (storage can be blocked)
--------------------------------------------------------- */
function readJson(storage, key, fallback) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

/* ---------------------------------------------------------
   logo
--------------------------------------------------------- */
function sniffMime(base64) {
  if (base64.startsWith("iVBOR")) return "image/png";
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("R0lGO")) return "image/gif";
  if (base64.startsWith("PHN2") || base64.startsWith("PD94")) return "image/svg+xml";
  return "image/webp";
}

function cleanBase64(text) {
  return String(text || "").replace(/^data:[^,]+,/, "").replace(/\s+/g, "");
}

async function loadLogoDataUrl(fileId) {
  if (!fileId) return "";

  const cacheKey = LOGO_CACHE_PREFIX + fileId;

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return cached;
  } catch {
    /* ignore */
  }

  const base64 = cleanBase64(await apiText({ action: "logo", id: fileId, _ts: Date.now() }));

  if (!base64) throw new Error("Store logo is empty.");

  const url = `data:${sniffMime(base64)};base64,${base64}`;

  try {
    /* keep only the newest logo in the cache */
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(LOGO_CACHE_PREFIX) && key !== cacheKey)
      .forEach((key) => sessionStorage.removeItem(key));
    sessionStorage.setItem(cacheKey, url);
  } catch {
    /* ignore */
  }

  return url;
}

/* the favicon follows the uploaded logo (this behaviour is unchanged) */
function applyFavicon(logoDataUrl) {
  if (!logoDataUrl) return;

  document
    .querySelectorAll(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]:not([data-keep]), link[data-pearlskino-favicon]'
    )
    .forEach((link) => link.remove());

  const favicon = document.createElement("link");
  favicon.rel = "icon";
  favicon.type = (logoDataUrl.match(/^data:([^;]+);/) || [])[1] || "image/webp";
  favicon.href = logoDataUrl;
  favicon.setAttribute("data-pearlskino-favicon", "true");
  document.head.appendChild(favicon);
}

/* ---------------------------------------------------------
   cart storage:  [{ id, variantId, qty }]
   (older versions saved whole product objects - those are converted)
--------------------------------------------------------- */
function readCart() {
  const stored = readJson(localStorage, CART_KEY, []);

  if (!Array.isArray(stored)) return [];

  const merged = new Map();

  stored.forEach((entry) => {
    if (!entry || entry.id === undefined || entry.id === null) return;

    const id = String(entry.id);
    const variantId = String(entry.variantId || "");
    const qty = Math.floor(Number(entry.qty || 0));
    const key = `${id}|${variantId}`;

    if (qty < 1) return;

    merged.set(key, {
      id,
      variantId,
      qty: Math.min(MAX_QTY_PER_LINE, (merged.get(key)?.qty || 0) + qty),
    });
  });

  return [...merged.values()];
}

function lineKeyOf(key) {
  const text = String(key);
  return text.includes("|") ? text : `${text}|`;
}

/* ---------------------------------------------------------
   provider
--------------------------------------------------------- */
export function StoreProvider({ children }) {
  const cachedBoot = useMemo(() => readJson(localStorage, BOOT_CACHE_KEY, null), []);

  const [boot, setBoot] = useState(() =>
    cachedBoot && cachedBoot.data ? cachedBoot.data : null
  );
  const [loaded, setLoaded] = useState(Boolean(cachedBoot && cachedBoot.data));
  const [confirmed, setConfirmed] = useState(false);
  const [loadError, setLoadError] = useState("");

  const versionRef = useRef(cachedBoot?.v || "");
  const inflight = useRef(null);

  const [logoDataUrl, setLogoDataUrl] = useState("");

  const [cartRaw, setCartRaw] = useState(readCart);
  const [cartNotice, setCartNotice] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* ---------------------------------------------------------
     loading the shop data
  --------------------------------------------------------- */
  const refresh = useCallback(async (force = false) => {
    if (inflight.current) return inflight.current;

    const job = (async () => {
      try {
        const data = await apiGet(
          {
            action: "bootstrap",
            v: force ? "" : versionRef.current || "",
            _ts: Date.now(),
          },
          20000
        );

        setLoadError("");

        if (data.unchanged) {
          setConfirmed(true);
          return;
        }

        const next = {
          settings: data.settings || {},
          products: Array.isArray(data.products) ? data.products : [],
          categories: Array.isArray(data.categories) ? data.categories : [],
          banners: Array.isArray(data.banners) ? data.banners : [],
          content: data.content && typeof data.content === "object" ? data.content : {},
          reviews: Array.isArray(data.reviews) ? data.reviews : [],
        };

        versionRef.current = data.v || "";
        setBoot(next);
        setConfirmed(true);
        writeJson(localStorage, BOOT_CACHE_KEY, { v: versionRef.current, data: next });
      } catch (error) {
        console.error("STORE LOAD ERROR:", error);
        setLoadError(error?.message || "Could not load the store.");
      } finally {
        setLoaded(true);
        inflight.current = null;
      }
    })();

    inflight.current = job;
    return job;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const settings = useMemo(
    () => ({ ...DEFAULT_SETTINGS, ...(boot?.settings || {}) }),
    [boot]
  );

  const pollSeconds = Math.max(15, Number(settings.autoRefreshSeconds) || 30);

  /* keep the shop fresh: poll while the tab is visible, refresh on return */
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) refresh();
    }, pollSeconds * 1000);

    function onVisible() {
      if (!document.hidden) refresh();
    }

    function onAdminSaved() {
      refresh(true);
    }

    function onStorage(event) {
      if (event.key === "pearlskino-settings-updated" && event.newValue) refresh(true);
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pearlskino-settings-updated", onAdminSaved);
    window.addEventListener("storage", onStorage);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pearlskino-settings-updated", onAdminSaved);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh, pollSeconds]);

  /* logo + favicon */
  const logoFileId = settings.logoFileId;

  useEffect(() => {
    let cancelled = false;

    if (!logoFileId) {
      setLogoDataUrl("");
      return undefined;
    }

    loadLogoDataUrl(logoFileId)
      .then((url) => {
        if (!cancelled) setLogoDataUrl(url);
      })
      .catch((error) => console.error("STORE LOGO LOAD ERROR:", error));

    return () => {
      cancelled = true;
    };
  }, [logoFileId]);

  useEffect(() => {
    applyFavicon(logoDataUrl);
  }, [logoDataUrl]);

  /* analytics ids come from settings */
  useEffect(() => {
    initAnalytics({
      fbPixelId: settings.fbPixelId,
      gaMeasurementId: settings.gaMeasurementId,
    });
  }, [settings.fbPixelId, settings.gaMeasurementId]);

  /* ---------------------------------------------------------
     catalog
  --------------------------------------------------------- */
  const products = useMemo(() => boot?.products || [], [boot]);
  const categories = useMemo(() => boot?.categories || [], [boot]);

  const productsById = useMemo(() => {
    const map = new Map();
    products.forEach((product) => map.set(String(product.id), product));
    return map;
  }, [products]);

  const getProduct = useCallback((id) => productsById.get(String(id)) || null, [productsById]);

  /* ---------------------------------------------------------
     cart
  --------------------------------------------------------- */
  useEffect(() => {
    writeJson(localStorage, CART_KEY, cartRaw);
  }, [cartRaw]);

  /* favourites now live in the customer's account (the old guest list is dropped) */
  useEffect(() => {
    try {
      localStorage.removeItem(OLD_WISHLIST_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  /* keep the bag in step with other tabs */
  useEffect(() => {
    function onStorage(event) {
      if (event.key === CART_KEY) setCartRaw(readCart());
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const lines = useMemo(() => {
    return cartRaw
      .map((entry) => {
        const product = productsById.get(entry.id);

        if (!product) return null;

        const variant = entry.variantId
          ? product.variants?.find((v) => v.id === entry.variantId) || null
          : null;

        const needsVariant = (product.variants?.length || 0) > 0;
        const missingVariant = needsVariant && !variant;
        const available = variant ? variant.stock : needsVariant ? 0 : product.stock;
        const unitPrice = variant && variant.price !== null && variant.price !== undefined
          ? Number(variant.price)
          : Number(product.price || 0);
        const qty = Math.max(1, Math.min(entry.qty, MAX_QTY_PER_LINE, Math.max(available, 1)));
        const unavailable =
          product.status === "inactive" || missingVariant || available <= 0;

        return {
          key: `${entry.id}|${entry.variantId}`,
          id: entry.id,
          variantId: entry.variantId,
          qty,
          product,
          variant,
          name: product.name,
          brand: product.brand,
          category: product.category,
          variantLabel: variant ? variant.label : "",
          image: (variant && variant.image) || product.image || product.images?.[0] || "",
          price: unitPrice,
          unitPrice,
          oldPrice: product.oldPrice || null,
          stock: available,
          unavailable,
          lineTotal: unavailable ? 0 : unitPrice * qty,
        };
      })
      .filter(Boolean);
  }, [cartRaw, productsById]);

  /* products that were hidden / deleted / removed while sitting in a bag
     are dropped - but only after the shop data came from the server */
  useEffect(() => {
    if (!confirmed || !products.length) return;

    setCartRaw((current) => {
      const next = current.filter((entry) => productsById.has(entry.id));
      return next.length === current.length ? current : next;
    });
  }, [confirmed, products.length, productsById]);

  const count = useMemo(
    () => lines.reduce((total, line) => total + (line.unavailable ? 0 : line.qty), 0),
    [lines]
  );

  const subtotal = useMemo(
    () => lines.reduce((total, line) => total + line.lineTotal, 0),
    [lines]
  );

  const delivery = useMemo(() => deliveryRange(settings, subtotal), [settings, subtotal]);
  const shipping = delivery.min;
  const total = subtotal + shipping;

  const addToCart = useCallback(
    (id, quantity = 1, variantId = "") => {
      const product = productsById.get(String(id));

      if (!product || product.status === "inactive") {
        return { ok: false, reason: "unavailable" };
      }

      const hasVariants = (product.variants?.length || 0) > 0;
      const variant = hasVariants
        ? product.variants.find((v) => v.id === String(variantId)) || null
        : null;

      if (hasVariants && !variant) return { ok: false, reason: "choose" };

      const available = variant ? variant.stock : product.stock;

      if (available <= 0) return { ok: false, reason: "soldout" };

      const key = `${product.id}|${variant ? variant.id : ""}`;
      const existing = cartRaw.find((entry) => `${entry.id}|${entry.variantId}` === key);
      const already = existing ? existing.qty : 0;
      const cap = Math.min(available, MAX_QTY_PER_LINE);

      if (already >= cap) return { ok: false, reason: "max", available: cap };

      const added = Math.min(Math.max(1, Math.floor(Number(quantity) || 1)), cap - already);

      setCartRaw((current) => {
        const hit = current.find((entry) => `${entry.id}|${entry.variantId}` === key);

        if (hit) {
          return current.map((entry) =>
            entry === hit ? { ...entry, qty: Math.min(cap, entry.qty + added) } : entry
          );
        }

        return [
          ...current,
          { id: String(product.id), variantId: variant ? variant.id : "", qty: added },
        ];
      });

      const price = variant && variant.price !== null && variant.price !== undefined
        ? Number(variant.price)
        : Number(product.price || 0);

      setCartNotice({
        id: product.id,
        name: product.name,
        variantLabel: variant ? variant.label : "",
        brand: product.brand,
        image: (variant && variant.image) || product.image || product.images?.[0] || "",
        price,
        stamp: Date.now(),
      });

      window.clearTimeout(window.__pearlskinoCartNoticeTimer);
      window.__pearlskinoCartNoticeTimer = window.setTimeout(() => setCartNotice(null), 4500);

      trackEvent("add_to_cart", {
        value: price * added,
        items: [{ id: product.id, name: product.name, price, qty: added }],
      });

      return { ok: true, added };
    },
    [productsById, cartRaw]
  );

  const closeCartNotice = useCallback(() => {
    window.clearTimeout(window.__pearlskinoCartNoticeTimer);
    setCartNotice(null);
  }, []);

  const setLineQty = useCallback(
    (key, qty) => {
      const wanted = lineKeyOf(key);

      setCartRaw((current) =>
        current
          .map((entry) => {
            if (`${entry.id}|${entry.variantId}` !== wanted) return entry;

            const product = productsById.get(entry.id);
            const variant = entry.variantId
              ? product?.variants?.find((v) => v.id === entry.variantId)
              : null;
            const available = variant ? variant.stock : product ? product.stock : MAX_QTY_PER_LINE;
            const cap = Math.max(1, Math.min(MAX_QTY_PER_LINE, available));

            return { ...entry, qty: Math.min(cap, Math.floor(Number(qty) || 0)) };
          })
          .filter((entry) => entry.qty > 0)
      );
    },
    [productsById]
  );

  const changeQty = useCallback(
    (key, delta) => {
      const wanted = lineKeyOf(key);
      const entry = cartRaw.find((item) => `${item.id}|${item.variantId}` === wanted);

      if (entry) setLineQty(wanted, entry.qty + delta);
    },
    [cartRaw, setLineQty]
  );

  const removeFromCart = useCallback((key) => {
    const wanted = lineKeyOf(key);
    setCartRaw((current) => current.filter((entry) => `${entry.id}|${entry.variantId}` !== wanted));
  }, []);

  const clearCart = useCallback(() => setCartRaw([]), []);

  /* ---------------------------------------------------------
     drawer
  --------------------------------------------------------- */
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  /* the logo is part of the settings object, as before */
  const storeSettings = useMemo(
    () => ({ ...settings, logoDataUrl }),
    [settings, logoDataUrl]
  );

  const value = useMemo(
    () => ({
      /* data */
      settings: storeSettings,
      storeSettings,
      settingsLoading: !loaded,
      loaded,
      confirmed,
      loadError,
      products,
      categories,
      banners: boot?.banners || [],
      content: boot?.content || {},
      featuredReviews: boot?.reviews || [],
      getProduct,
      refresh,
      /* cart */
      cart: lines,
      lines,
      count,
      subtotal,
      shipping,
      delivery,
      total,
      cartNotice,
      closeCartNotice,
      addToCart,
      setLineQty,
      changeQty,
      removeFromCart,
      clearCart,
      /* drawer */
      drawerOpen,
      openDrawer,
      closeDrawer,
    }),
    [
      storeSettings,
      loaded,
      confirmed,
      loadError,
      products,
      categories,
      boot,
      getProduct,
      refresh,
      lines,
      count,
      subtotal,
      shipping,
      delivery,
      total,
      cartNotice,
      closeCartNotice,
      addToCart,
      setLineQty,
      changeQty,
      removeFromCart,
      clearCart,
      drawerOpen,
      openDrawer,
      closeDrawer,
    ]
  );

  /* first visit: keep the loading screen until the first answer */
  if (!loaded) return null;

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error("useStore must be used inside StoreProvider");
  }

  return context;
}
