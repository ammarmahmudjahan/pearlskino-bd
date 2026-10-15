import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";
import "./v4.css";

import { StoreProvider } from "./context/StoreContext";
import { CustomerProvider } from "./context/CustomerContext";
import ContentProvider from "./content/ContentProvider";

/*
 * Order matters:
 *   StoreProvider    shop settings, products, bag, favourites
 *   CustomerProvider the customer's login (needs the store)
 *   ContentProvider  editable texts + owner edit mode (needs the store)
 */
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <StoreProvider>
      <CustomerProvider>
        <ContentProvider>
          <App />
        </ContentProvider>
      </CustomerProvider>
    </StoreProvider>
  </React.StrictMode>
);

/*
 * Installable app + faster repeat visits (production only).
 * The service worker (public/sw.js) keeps the shell and pictures in the
 * phone's cache. It never touches the shop's data or the admin panel.
 */
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
