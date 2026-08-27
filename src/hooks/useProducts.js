import { useEffect, useState } from "react";

import { PRODUCTS } from "../data/products";

/*
|--------------------------------------------------------------------------
| PEARLSKINO PRODUCT API
|--------------------------------------------------------------------------
|
| This is the SAME Google Apps Script Web App already used
| for Store Settings, Orders, and Customers.
|
| Products now live in a "Products" sheet in that same
| Google Sheet, so there is no local server, no git push,
| and no rebuild involved. The admin panel talks to this
| URL directly, from any device, and the storefront reads
| from it on every page load.
|
*/

const API_URL =
  "https://script.google.com/macros/s/AKfycbzgl2Fr8e17tQXDLvrylxYvFc0XkMhtsTsFOvJxdBwt8c2imYAUHrdx3ovk7rJOD4Eq/exec";

/*
|--------------------------------------------------------------------------
| ADMIN TOKEN
|--------------------------------------------------------------------------
|
| Same localStorage key the admin login already uses
| (see src/admin/Admin.jsx -> ADMIN_TOKEN_KEY).
|
*/

const ADMIN_TOKEN_KEY = "pearlskino_admin_token";

function getStoredAdminToken() {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
  } catch (error) {
    return "";
  }
}

/*
|--------------------------------------------------------------------------
| LOAD PRODUCTS
|--------------------------------------------------------------------------
|
| Always fetch the live catalog from the Apps Script API,
| for both the storefront and the admin panel, in both
| development and production.
|
| If the request fails (offline, API down, etc.) we fall
| back to the bundled PRODUCTS in src/data/products.js so
| the shop never renders completely empty.
|
*/

export function useProducts() {
  const [products, setProductsState] = useState(PRODUCTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const response = await fetch(
          `${API_URL}?action=products`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Server returned ${response.status}`
          );
        }

        const data = await response.json();

        if (!data.success || !Array.isArray(data.products)) {
          throw new Error(
            "Invalid product API response"
          );
        }

        if (!cancelled) {
          /*
           * An empty catalog (brand new Products sheet
           * that hasn't been seeded yet) falls back to
           * the bundled list instead of showing nothing.
           */
          setProductsState(
            data.products.length > 0
              ? data.products
              : PRODUCTS
          );
        }

      } catch (error) {
        console.warn(
          "Live product API unavailable. Using bundled products.js.",
          error
        );

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
  | LOCAL STATE UPDATE
  |--------------------------------------------------------------------------
  |
  | Used by the admin panel for optimistic UI updates
  | before/while publishProducts() persists the change.
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

  return [products, setProducts, loading];
}

/*
|--------------------------------------------------------------------------
| PUBLISH PRODUCTS
|--------------------------------------------------------------------------
|
| The admin sends the COMPLETE product array to the Apps
| Script API, which overwrites the "Products" sheet in one
| shot. No local server, no git, no rebuild — the storefront
| picks it up the next time it fetches ?action=products.
|
*/

export async function publishProducts(products) {
  if (!Array.isArray(products)) {
    return {
      success: false,
      error: "Products must be an array.",
    };
  }

  const token = getStoredAdminToken();

  if (!token) {
    return {
      success: false,
      error: "Admin session is missing. Please log in again.",
    };
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",

      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },

      body: JSON.stringify({
        action: "updateProducts",
        token,
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

    console.log("PearlSkino products published successfully.");

    return {
      success: true,
      data,
    };

  } catch (error) {
    console.error("PearlSkino product publishing failed:", error);

    return {
      success: false,
      error: error?.message || "Unknown publishing error.",
    };
  }
}

/*
|--------------------------------------------------------------------------
| UPLOAD PRODUCT IMAGE
|--------------------------------------------------------------------------
|
| Sends a base64 image (from "Upload from PC", which also
| works for a phone's camera/gallery picker) to the Apps
| Script API. The API stores it in a Google Drive folder
| and returns a public, hotlinkable URL — which is what
| gets saved as the product's `image` field.
|
| The plain "paste an image URL" option in ProductManager
| still works exactly as before and does not call this.
|
*/

export async function uploadProductImage(dataUrl, fileName, mimeType) {
  if (!dataUrl) {
    return {
      success: false,
      error: "No image data provided.",
    };
  }

  const token = getStoredAdminToken();

  if (!token) {
    return {
      success: false,
      error: "Admin session is missing. Please log in again.",
    };
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",

      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },

      body: JSON.stringify({
        action: "uploadProductImage",
        token,
        image: dataUrl,
        fileName,
        mimeType,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error ||
          `Image upload failed with status ${response.status}`
      );
    }

    return {
      success: true,
      url: data.url,
    };

  } catch (error) {
    console.error("PearlSkino image upload failed:", error);

    return {
      success: false,
      error: error?.message || "Unknown upload error.",
    };
  }
}
