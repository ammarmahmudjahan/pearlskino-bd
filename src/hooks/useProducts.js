import { useEffect, useState } from "react";

import { PRODUCTS } from "../data/products";

/*
|--------------------------------------------------------------------------
| LOCAL ADMIN SERVER
|--------------------------------------------------------------------------
|
| This server exists only on your own computer.
| It is NOT used by the Vercel production website.
|
*/

const API_URL = "http://localhost:3001/api/products";

/*
|--------------------------------------------------------------------------
| ENVIRONMENT
|--------------------------------------------------------------------------
|
| import.meta.env.DEV
|
| true  = npm run dev on your computer
| false = Vercel production build
|
*/

const IS_DEVELOPMENT = import.meta.env.DEV;

/*
|--------------------------------------------------------------------------
| LOAD PRODUCTS
|--------------------------------------------------------------------------
|
| Production:
|   Always use the PRODUCTS bundled into the Vercel build.
|
| Development:
|   Try the local admin server first.
|   If unavailable, use PRODUCTS from products.js.
|
*/

export function useProducts() {
  const [products, setProductsState] = useState(PRODUCTS);

  const [loading, setLoading] = useState(
    IS_DEVELOPMENT
  );

  useEffect(() => {
    /*
    |--------------------------------------------------------------------------
    | PRODUCTION
    |--------------------------------------------------------------------------
    |
    | On Vercel there is no localhost:3001.
    |
    | The correct product data is already bundled into
    | the Vite production build.
    |
    */

    if (!IS_DEVELOPMENT) {
      setProductsState(PRODUCTS);
      setLoading(false);
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | DEVELOPMENT / LOCAL ADMIN
    |--------------------------------------------------------------------------
    */

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

        if (
          !data.success ||
          typeof data.file !== "string"
        ) {
          throw new Error(
            "Invalid product server response"
          );
        }

        /*
        |--------------------------------------------------------------------------
        | Extract PRODUCTS from products.js
        |--------------------------------------------------------------------------
        */

        const match = data.file.match(
          /export\s+const\s+PRODUCTS\s*=\s*(\[[\s\S]*?\])\s*;?\s*(?:export\s+const|$)/
        );

        if (!match) {
          throw new Error(
            "Could not find PRODUCTS array in products.js"
          );
        }

        const parsedProducts = Function(
          `"use strict"; return (${match[1]})`
        )();

        if (!Array.isArray(parsedProducts)) {
          throw new Error(
            "PRODUCTS is not an array."
          );
        }

        if (!cancelled) {
          setProductsState(parsedProducts);
        }

      } catch (error) {
        console.warn(
          "Local product server unavailable. Using products.js.",
          error
        );

        /*
        |--------------------------------------------------------------------------
        | FALLBACK
        |--------------------------------------------------------------------------
        */

        if (!cancelled) {
          setProductsState(PRODUCTS);
        }

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

  /*
  |--------------------------------------------------------------------------
  | UPDATE PRODUCTS
  |--------------------------------------------------------------------------
  |
  | Used by the local admin.
  |
  | We intentionally DO NOT use localStorage.
  |
  */

  function setProducts(update) {
    setProductsState((current) => {
      const next =
        typeof update === "function"
          ? update(current)
          : update;

      return next;
    });
  }

  return [
    products,
    setProducts,
    loading,
  ];
}

/*
|--------------------------------------------------------------------------
| PUBLISH PRODUCTS
|--------------------------------------------------------------------------
|
| The admin sends the complete product array to:
|
|   localhost:3001
|
| The local server writes it to:
|
|   src/data/products.js
|
| After that your Publish All Changes BAT commits
| and pushes the changed file to GitHub.
|
*/

export async function publishProducts(products) {
  if (!Array.isArray(products)) {
    return {
      success: false,
      error: "Products must be an array.",
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Publishing is only possible from the local admin.
  |--------------------------------------------------------------------------
  */

  if (!IS_DEVELOPMENT) {
    return {
      success: false,
      error:
        "Product publishing is only available in local development.",
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