import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useProducts } from "../hooks/useProducts";
import storeSettingsSource from "../config/storeSettings.json";

const StoreContext = createContext(null);

const CART_KEY = "pearlskino-cart";
const WISHLIST_KEY = "pearlskino-wishlist";

export function StoreProvider({ children }) {

  /* =========================================================
   ADMIN STORE SETTINGS
========================================================= */

  const DEFAULT_STORE_SETTINGS = {
    deliveryCharge: 80,
    freeDeliveryThreshold: 2500,
    codEnabled: true,
    pickupEnabled: true,
  };


  const [storeSettings, setStoreSettings] = useState(
    DEFAULT_STORE_SETTINGS
  );


  useEffect(() => {

    setStoreSettings({
      ...DEFAULT_STORE_SETTINGS,
      ...storeSettingsSource,
    });

  }, []);


/* =========================
     PRODUCTS
  ========================== */

  const [products] = useProducts();

  /* =========================
     CART
  ========================== */

  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(CART_KEY) || "[]"
      );
    } catch {
      return [];
    }
  });

  /* =========================
     WISHLIST
  ========================== */

  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(WISHLIST_KEY) || "[]"
      );
    } catch {
      return [];
    }
  });

  /* =========================
     CART NOTIFICATION
  ========================== */

  const [cartNotice, setCartNotice] = useState(null);

  /* =========================
     SAVE CART
  ========================== */

  useEffect(() => {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify(cart)
    );
  }, [cart]);

  /* =========================
     SAVE WISHLIST
  ========================== */

  useEffect(() => {
    localStorage.setItem(
      WISHLIST_KEY,
      JSON.stringify(wishlist)
    );
  }, [wishlist]);

  /* =========================
     ADD TO CART
  ========================== */

  function addToCart(id, quantity = 1) {
    const product = products.find(
      (item) =>
        String(item.id) === String(id)
    );

    if (!product) return;

    const stock = Number(
      product.stock || 0
    );

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
          qty: Math.min(
            quantity,
            stock
          ),
        },
      ];
    });

    /* =========================
       SHOW PREMIUM CART NOTICE
    ========================== */

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

  /* =========================
     CLOSE CART NOTICE
  ========================== */

  function closeCartNotice() {
    window.clearTimeout(
      window.__pearlskinoCartNoticeTimer
    );

    setCartNotice(null);
  }

  /* =========================
     CHANGE QUANTITY
  ========================== */

  function changeQty(id, delta) {
    setCart((current) =>
      current
        .map((item) => {
          if (
            String(item.id) !==
            String(id)
          ) {
            return item;
          }

          const product =
            products.find(
              (p) =>
                String(p.id) ===
                String(id)
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

  /* =========================
     REMOVE
  ========================== */

  function removeFromCart(id) {
    setCart((current) =>
      current.filter(
        (item) =>
          String(item.id) !==
          String(id)
      )
    );
  }

  /* =========================
     CLEAR CART
  ========================== */

  function clearCart() {
    setCart([]);
  }

  /* =========================
     WISHLIST
  ========================== */

  function toggleWishlist(id) {
    setWishlist((current) => {
      const exists = current.some(
        (item) =>
          String(item.id) ===
          String(id)
      );

      if (exists) {
        return current.filter(
          (item) =>
            String(item.id) !==
            String(id)
        );
      }

      const product = products.find(
        (item) =>
          String(item.id) ===
          String(id)
      );

      return product
        ? [...current, product]
        : current;
    });
  }

  function isWishlisted(id) {
    return wishlist.some(
      (item) =>
        String(item.id) ===
        String(id)
    );
  }

  /* =========================
     CART COUNT
  ========================== */

  const count = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total +
          Number(item.qty || 0),
        0
      ),
    [cart]
  );

  /* =========================
     SUBTOTAL
  ========================== */

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

  /* =========================
     SHIPPING
  ========================== */

  const shipping = subtotal
    ? (
        Number(storeSettings.freeDeliveryThreshold || 0) > 0 &&
        subtotal >= Number(storeSettings.freeDeliveryThreshold)
      )
      ? 0
      : Number(storeSettings.deliveryCharge || 0)
    : 0;

  /* =========================
     TOTAL
  ========================== */

  const total =
    subtotal + shipping;

  /* =========================
     CONTEXT VALUE
  ========================== */

  const value = {
    products,

    cart,
    wishlist,

    count,
    subtotal,
    shipping,
    total,

    storeSettings,
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
    <StoreContext.Provider
      value={value}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context =
    useContext(StoreContext);

  if (!context) {
    throw new Error(
      "useStore must be used inside StoreProvider"
    );
  }

  return context;
}









