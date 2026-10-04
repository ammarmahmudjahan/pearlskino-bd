import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useProducts } from "../hooks/useProducts";

const StoreContext = createContext(null);

const CART_KEY = "pearlskino-cart";
const WISHLIST_KEY = "pearlskino-wishlist";

const SETTINGS_API =
  "https://script.google.com/macros/s/AKfycbzgl2Fr8e17tQXDLvrylxYvFc0XkMhtsTsFOvJxdBwt8c2imYAUHrdx3ovk7rJOD4Eq/exec";

const DEFAULT_STORE_SETTINGS = {
  storeName: "PearlSkino BD",
  tagline: "Pearly Glow",
  phone: "01577100162",
  email: "ammageddonmadmax@gmail.com",
  messengerUrl: "",
  whatsappNumber: "",
  whatsappEnabled: true,
  deliveryCharge: 99,
  freeDeliveryThreshold: 0,
  codEnabled: true,
  pickupEnabled: true,
  lowStockThreshold: 3,
  autoRefreshSeconds: 30,
};

const SETTINGS_REFRESH_MS = 30000;

async function fetchStoreSettings() {
  const response = await fetch(`${SETTINGS_API}?action=storeSettings&_ts=${Date.now()}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Unable to load store settings.");
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Unable to load store settings.");
  }

  const apiSettings = data.settings || {};

  return {
    ...DEFAULT_STORE_SETTINGS,
    ...apiSettings,

    messengerUrl:
      apiSettings.messengerUrl || "",

    whatsappNumber:
      String(
        apiSettings.whatsappNumber ||
        apiSettings.whatsapp ||
        ""
      ).trim(),
    whatsappEnabled:
      apiSettings.whatsappEnabled !== false,
  };
}

const STORE_SETTINGS_CACHE_KEY =
  "pearlskino_store_settings_v1";

function readCachedStoreSettings() {
  try {
    const raw = sessionStorage.getItem(
      STORE_SETTINGS_CACHE_KEY
    );

    if (!raw) {
      return DEFAULT_STORE_SETTINGS;
    }

    const cached = JSON.parse(raw);

    if (!cached || typeof cached !== "object") {
      return DEFAULT_STORE_SETTINGS;
    }

    return {
      ...DEFAULT_STORE_SETTINGS,
      ...cached,
    };
  } catch {
    return DEFAULT_STORE_SETTINGS;
  }
}

function writeCachedStoreSettings(settings) {
  try {
    sessionStorage.setItem(
      STORE_SETTINGS_CACHE_KEY,
      JSON.stringify(settings)
    );
  } catch {
    // Ignore storage errors.
  }
}

async function fetchLogoDataUrl(fileId) {
  if (!fileId) {
    return "";
  }

  const response = await fetch(
    `${SETTINGS_API}?action=logo&id=${encodeURIComponent(fileId)}&_ts=${Date.now()}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("Unable to load store logo.");
  }

  const base64 =
    (await response.text()).trim();

  if (!base64) {
    throw new Error("Store logo is empty.");
  }

  return `data:image/webp;base64,${base64}`;
}
export function StoreProvider({ children }) {
  const [storeSettings, setStoreSettings] =
    useState(null);

  const [settingsLoading, setSettingsLoading] =
    useState(true);
  useEffect(() => {
    const logoDataUrl = storeSettings?.logoDataUrl;

    if (!logoDataUrl) {
      return;
    }

    document
      .querySelectorAll(
        'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"], link[data-pearlskino-favicon]'
      )
      .forEach((link) => link.remove());

    const favicon = document.createElement("link");

    favicon.rel = "icon";
    favicon.type = "image/webp";
    favicon.href = logoDataUrl;

    favicon.setAttribute(
      "data-pearlskino-favicon",
      "true"
    );

    document.head.appendChild(favicon);
  }, [storeSettings?.logoDataUrl]);
  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const settings = await fetchStoreSettings();

        let logoDataUrl = "";

        if (settings.logoFileId) {
          try {
            logoDataUrl = await fetchLogoDataUrl(settings.logoFileId);
          } catch (error) {
            console.error("STORE LOGO LOAD ERROR:", error);
          }
        }

        if (mounted) {
          const finalSettings = {
            ...settings,
            logoDataUrl,
          };

          setStoreSettings(finalSettings);
          writeCachedStoreSettings(finalSettings);
        }
      } catch (error) {
        console.error("STORE SETTINGS LOAD ERROR:", error);
      } finally {
        if (mounted) {
          setSettingsLoading(false);
        }
      }
    }

    loadSettings();

    const interval = window.setInterval(
      loadSettings,
      SETTINGS_REFRESH_MS
    );

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function refreshSettings() {
      fetchStoreSettings().then(async (settings) => {
      let logoDataUrl = "";

      if (settings.logoFileId) {
        try {
          logoDataUrl =
            await fetchLogoDataUrl(
              settings.logoFileId
            );
        } catch (error) {
          console.error(
            "STORE LOGO REFRESH ERROR:",
            error
          );
        }
      }

      const finalSettings = {
        ...settings,
        logoDataUrl,
      };
          setStoreSettings(finalSettings);
          writeCachedStoreSettings(finalSettings);
        })
        .catch((error) => {
          console.error(
            "STORE SETTINGS REFRESH ERROR:",
            error
          );
        });
    }

    function handleSettingsUpdated() {
      refreshSettings();
    }

    function handleStorage(event) {
      if (
        event.key === "pearlskino-settings-updated" &&
        event.newValue
      ) {
        refreshSettings();
      }
    }

    window.addEventListener(
      "pearlskino-settings-updated",
      handleSettingsUpdated
    );

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "pearlskino-settings-updated",
        handleSettingsUpdated
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  const [products] = useProducts();

  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(CART_KEY) || "[]"
      );
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(WISHLIST_KEY) || "[]"
      );
    } catch {
      return [];
    }
  });

  const [cartNotice, setCartNotice] = useState(null);

  useEffect(() => {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify(cart)
    );
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(
      WISHLIST_KEY,
      JSON.stringify(wishlist)
    );
  }, [wishlist]);

  function addToCart(id, quantity = 1) {
    const product = products.find(
      (item) =>
        String(item.id) === String(id)
    );

    if (!product) return;

    const stock = Number(product.stock || 0);

    if (
      product.status === "inactive" ||
      stock <= 0
    ) {
      return;
    }

    setCart((current) => {
      const existing = current.find(
        (item) =>
          String(item.id) === String(id)
      );

      if (existing) {
        const currentQty =
          Number(existing.qty || 1);

        const newQty = Math.min(
          currentQty + quantity,
          stock
        );

        return current.map((item) =>
          String(item.id) === String(id)
            ? {
                ...item,
                ...product,
                qty: newQty,
              }
            : item
        );
      }

      return [
        ...current,
        {
          ...product,
          qty: Math.min(quantity, stock),
        },
      ];
    });

    setCartNotice({
      id: product.id,
      name: product.name,
      brand: product.brand,
      image:
        product.image ||
        product.images?.[0] ||
        "",
      price: product.price,
    });

    window.clearTimeout(
      window.__pearlskinoCartNoticeTimer
    );

    window.__pearlskinoCartNoticeTimer =
      window.setTimeout(() => {
        setCartNotice(null);
      }, 4500);
  }

  function closeCartNotice() {
    window.clearTimeout(
      window.__pearlskinoCartNoticeTimer
    );

    setCartNotice(null);
  }

  function changeQty(id, delta) {
    setCart((current) =>
      current
        .map((item) => {
          if (
            String(item.id) !== String(id)
          ) {
            return item;
          }

          const product = products.find(
            (p) =>
              String(p.id) === String(id)
          );

          const stock = Number(
            product?.stock ??
              item.stock ??
              999999
          );

          const currentQty =
            Number(item.qty || 1);

          const newQty = Math.min(
            stock,
            currentQty + delta
          );

          return {
            ...item,
            qty: newQty,
          };
        })
        .filter(
          (item) =>
            Number(item.qty || 0) > 0
        )
    );
  }

  function removeFromCart(id) {
    setCart((current) =>
      current.filter(
        (item) =>
          String(item.id) !== String(id)
      )
    );
  }

  function clearCart() {
    setCart([]);
  }

  function toggleWishlist(id) {
    setWishlist((current) => {
      const exists = current.some(
        (item) =>
          String(item.id) === String(id)
      );

      if (exists) {
        return current.filter(
          (item) =>
            String(item.id) !== String(id)
        );
      }

      const product = products.find(
        (item) =>
          String(item.id) === String(id)
      );

      return product
        ? [...current, product]
        : current;
    });
  }

  function isWishlisted(id) {
    return wishlist.some(
      (item) =>
        String(item.id) === String(id)
    );
  }

  const count = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total + Number(item.qty || 0),
        0
      ),
    [cart]
  );

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total +
          Number(item.price || 0) *
            Number(item.qty || 0),
        0
      ),
    [cart]
  );

  const activeStoreSettings = storeSettings || DEFAULT_STORE_SETTINGS;

  const shipping = subtotal
    ? Number(
        activeStoreSettings.freeDeliveryThreshold || 0
      ) > 0 &&
      subtotal >=
        Number(
          activeStoreSettings.freeDeliveryThreshold
        )
      ? 0
      : Number(
          activeStoreSettings.deliveryCharge || 0
        )
    : 0;

  const total = subtotal + shipping;

  if (settingsLoading && !storeSettings) {
    return null;
  }

  const value = {
    products,
    cart,
    wishlist,
    count,
    subtotal,
    shipping,
    total,
    storeSettings,
    settingsLoading,
    cartNotice,
    addToCart,
    closeCartNotice,
    changeQty,
    removeFromCart,
    clearCart,
    toggleWishlist,
    isWishlisted,
  };


  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error(
      "useStore must be used inside StoreProvider"
    );
  }

  return context;
}

























