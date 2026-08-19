import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const KEY = "pearlskino-cart";
const WISH_KEY = "pearlskino-wishlist";

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(WISH_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(WISH_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const addToCart = (product, qty = 1) => {
    setCart((c) => {
      const found = c.find((i) => i.id === product.id);
      if (found) {
        return c.map((i) => (i.id === product.id ? { ...i, qty: i.qty + qty } : i));
      }
      return [...c, { ...product, qty }];
    });
    setToast(`${product.name} added to your bag`);
    setDrawerOpen(true);
  };

  const changeQty = (id, delta) =>
    setCart((c) =>
      c.map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)).filter((i) => i.qty)
    );

  const removeFromCart = (id) => setCart((c) => c.filter((i) => i.id !== id));

  const clearCart = () => setCart([]);

  const toggleWishlist = (product) => {
    setWishlist((w) => {
      const exists = w.some((i) => i.id === product.id);
      if (exists) {
        setToast(`${product.name} removed from wishlist`);
        return w.filter((i) => i.id !== product.id);
      }
      setToast(`${product.name} saved to wishlist`);
      return [...w, product];
    });
  };

  const isWishlisted = (id) => wishlist.some((i) => i.id === id);

  const count = cart.reduce((a, i) => a + i.qty, 0);
  const subtotal = cart.reduce((a, i) => a + i.price * i.qty, 0);
  const shipping = subtotal ? (subtotal >= 2500 ? 0 : 80) : 0;
  const total = subtotal + shipping;

  const value = useMemo(
    () => ({
      cart,
      wishlist,
      drawerOpen,
      setDrawerOpen,
      toast,
      setToast,
      addToCart,
      changeQty,
      removeFromCart,
      clearCart,
      toggleWishlist,
      isWishlisted,
      count,
      subtotal,
      shipping,
      total,
    }),
    [cart, wishlist, drawerOpen, toast, count, subtotal, shipping, total]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
