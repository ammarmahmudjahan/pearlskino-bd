import { useEffect, useState } from "react";
import { PRODUCTS } from "../data/products";

const STORAGE_KEY = "pearlskino_products";

export function useProducts() {
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return PRODUCTS;
      }
    }

    return PRODUCTS;
  });

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(products)
    );
  }, [products]);

  return [products, setProducts];
}