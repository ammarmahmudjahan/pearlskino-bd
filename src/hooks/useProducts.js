import { useEffect, useState } from "react";
import { PRODUCTS } from "../data/products";

const STORAGE_KEY = "pearlskino_products";
const API_URL = "http://localhost:3001/api/products";

/* =========================================================
   PARSE PRODUCTS FILE
========================================================= */

function extractProductsFromFile(file) {
  if (!file || typeof file !== "string") {
    return null;
  }

  const match = file.match(
    /export\s+const\s+PRODUCTS\s*=\s*(\[[\s\S]*?\])\s*;?\s*(?:export\s+const|$)/
  );

  if (!match) {
    console.warn(
      "Could not find PRODUCTS array in products.js"
    );

    return null;
  }

  try {
    const parsed = Function(
      `"use strict"; return (${match[1]})`
    )();

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error(
      "Could not parse products from server:",
      error
    );

    return null;
  }
}


/* =========================================================
   LOAD PRODUCTS
========================================================= */

export function useProducts() {
  const [products, setProductsState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (error) {
        console.warn(
          "Could not read saved products:",
          error
        );
      }
    }

    return PRODUCTS;
  });

  const [loading, setLoading] = useState(true);


  /* =======================================================
     LOAD FROM LOCAL ADMIN SERVER
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error(
            `Server returned ${response.status}`
          );
        }

        const data = await response.json();

        if (!data.success || !data.file) {
          throw new Error(
            "Invalid product server response"
          );
        }

        const parsedProducts =
          extractProductsFromFile(data.file);

        if (
          !cancelled &&
          Array.isArray(parsedProducts)
        ) {
          setProductsState(parsedProducts);

          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(parsedProducts)
          );
        }
      } catch (error) {
        console.warn(
          "Local product server unavailable. Using local data.",
          error
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);


  /* =======================================================
     UPDATE PRODUCTS
  ======================================================= */

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


  return [
    products,
    setProducts,
    loading,
  ];
}


/* =========================================================
   PUBLISH PRODUCTS
========================================================= */

export async function publishProducts(products) {
  if (!Array.isArray(products)) {
    return {
      success: false,
      error: "Products must be an array.",
    };
  }

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
        data.error ||
        `Publish failed with status ${response.status}`
      );
    }

    /* Keep browser storage synchronized */

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(products)
    );

    console.log(
      "PearlSkino products published successfully."
    );

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error(
      "PearlSkino product publishing failed:",
      error
    );

    return {
      success: false,
      error:
        error?.message ||
        "Unknown publishing error.",
    };
  }
}