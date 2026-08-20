import { useEffect, useState } from "react";
import { PRODUCTS } from "../data/products";

const STORAGE_KEY = "pearlskino_products";
const API_URL = "http://localhost:3001/api/products";

/*
|--------------------------------------------------------------------------
| Load products
|--------------------------------------------------------------------------
| Priority:
| 1. Local admin server -> src/data/products.js
| 2. Browser localStorage
| 3. Original PRODUCTS fallback
|--------------------------------------------------------------------------
*/

export function useProducts() {
  const [products, setProductsState] = useState(() => {
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

  const [loading, setLoading] = useState(true);

  /*
  |--------------------------------------------------------------------------
  | Load latest products from local server
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error("Failed to load products");
        }

        const data = await response.json();

        if (data.success && data.file) {
          /*
           * The server returns the complete products.js file.
           *
           * We don't directly execute that file in the browser.
           * Instead, we extract the PRODUCTS array from it.
           */

          const match = data.file.match(
            /export const PRODUCTS\s*=\s*(\[[\s\S]*?\]);\s*(?:export const|$)/
          );

          if (match) {
            try {
              const parsedProducts = Function(
                `"use strict"; return (${match[1]})`
              )();

              if (Array.isArray(parsedProducts)) {
                setProductsState(parsedProducts);

                localStorage.setItem(
                  STORAGE_KEY,
                  JSON.stringify(parsedProducts)
                );
              }
            } catch (error) {
              console.error(
                "Could not parse products from server:",
                error
              );
            }
          }
        }
      } catch (error) {
        console.warn(
          "Local product server unavailable. Using local data.",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Update products
  |--------------------------------------------------------------------------
  */

  function setProducts(update) {
    setProductsState((current) => {
      const next =
        typeof update === "function"
          ? update(current)
          : update;

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next)
      );

      return next;
    });
  }

  return [products, setProducts, loading];
}


/*
|--------------------------------------------------------------------------
| Publish products
|--------------------------------------------------------------------------
|
| Sends the current product list to:
|
|     http://localhost:3001/api/products
|
| The local server then updates:
|
|     src/data/products.js
|
|--------------------------------------------------------------------------
*/

export async function publishProducts(products) {
  try {
    const response = await fetch(API_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        products,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || "Failed to publish products"
      );
    }

    /*
     * Keep browser storage synchronized.
     */

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(products)
    );

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error(
      "Publish failed:",
      error
    );

    return {
      success: false,
      error: error.message,
    };
  }
}