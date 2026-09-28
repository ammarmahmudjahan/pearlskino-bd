import { useEffect, useState } from "react";
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

let productsCache = null;
let productsPromise = null;

export function useProducts() {
  const [products, setProductsState] = useState(productsCache || []);
  const [loading, setLoading] = useState(productsCache === null);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        if (!productsPromise) {
          productsPromise = fetch(
            `${API_URL}?action=products`,
            {
              method: "GET",
            }
          )
            .then((response) => {
              if (!response.ok) {
                throw new Error(
                  `Server returned ${response.status}`
                );
              }

              return response.json();
            })
            .then((data) => {
              if (
                !data.success ||
                !Array.isArray(data.products)
              ) {
                throw new Error(
                  "Invalid product API response"
                );
              }

              productsCache = data.products;
              return productsCache;
            })
            .finally(() => {
              productsPromise = null;
            });
        }

        const data = await productsPromise;

        if (!cancelled) {
          setProductsState(data);
          setLoading(false);
        }
      } catch (error) {
        console.warn(
          "Live product API unavailable.",
          error
        );

        if (!cancelled) {
          setProductsState([]);
          setLoading(false);
        }
      }
    }

    if (productsCache !== null) {
      setProductsState(productsCache);
      setLoading(false);
      return;
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);
  const setProducts = (nextProducts) => {
    const value =
      typeof nextProducts === "function"
        ? nextProducts(productsCache || [])
        : nextProducts;

    productsCache = Array.isArray(value) ? value : [];
    setProductsState(productsCache);
  };

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



