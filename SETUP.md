# PearlSkino BD v4 — Setup guide

## 1. Backend (Google Apps Script) — one time
1. Open your Google Sheet (first tab = the old Google Form responses = Orders) → **Extensions → Apps Script**.
2. Replace everything in the editor with `src/admin/Code.gs`
   (for the **test** sheet use `Code.STAGING.gs`, delivered separately — it keeps test mail/WhatsApp away from real customers and uses separate "PearlSkino STAGING …" Drive folders).
3. Project Settings → set **Time zone = (GMT+06:00) Asia/Dhaka**.
4. Select function **`setupPearlSkino`** → Run → approve the permissions (Sheets, Drive, Mail, external requests).
   It creates/repairs every sheet, **builds the new Customers sheet from your existing orders/accounts** and reports e.g. `Customers: N added`.
5. **Deploy → Manage deployments → ✏ Edit → Version: New version → Deploy**. (Keep the same web-app URL.)
6. Check `…/exec?action=ping` → must show `"version":"4.0.0"`.
7. Log in at `/admin` (username `owner`) and change the password (My password).
8. Admin → Settings → Notifications → **Install / repair automatic jobs** (order-ID trigger + the daily job that makes the backup **and** sends the optional low-stock digest). Abandoned carts need no trigger – they appear in Admin → Abandoned carts as soon as they are older than the wait time you set.

## 2. Notifications
Defaults: email `ammageddonmadmax@gmail.com`, phone `01577100162` (Settings → Notifications).
* **Email alerts**: work out of the box (Gmail of the script owner, ~100/day on free accounts).
* **CallMeBot (free WhatsApp to YOU only)**: save the CallMeBot number, send "I allow callmebot to send me messages", paste the key in Settings → Notifications → Keys, choose channel "CallMeBot". It cannot message customers.
* **Telegram**: create a bot with @BotFather, paste token + your chat ID, choose "Telegram".
* **Meta WhatsApp Cloud API (official)**: Meta app, phone-number ID, permanent token and approved templates (*admin template* 1 variable; *customer template* 3 variables). Then channel "Meta" + customer WhatsApp = "Automatic".
* **Customer WhatsApp** without Meta: "Button" – every order / abandoned cart / back-in-stock request has an *Open WhatsApp* button with the message prefilled.
* Low-stock alerts per product (Products → edit → "Low-stock alert at") + optional daily digest (Settings → Notifications).

## 3. Frontend (GitHub → Vercel)
Copy the project into your repo (`src`, `public`, `api`, `index.html`, `vite.config.js`, `vercel.json`, `package.json`), push; Vercel rebuilds. `npm run build` must pass.
* **`api/` folder** = three tiny Vercel functions (product share cards, sitemap.xml, robots.txt). They read the backend address from the `VITE_API_URL` environment variable (falls back to the production address). On a Vercel *Preview* deployment robots.txt says `Disallow: /` automatically.
* **`vite.config.js`** splits the code into chunks (faster first load). Nothing to do.
* **PWA**: `public/manifest.webmanifest`, `public/sw.js`, `public/icons/*`. The icons were generated from the current logo. If you change the logo in a big way, replace the 4 icon files with new PNGs of the same names and sizes (192, 512, 512 maskable, 180 apple-touch).
* `public/sw.js` only caches built files (`/assets/*`, icons, logo). It never caches API calls, `/admin` or orders; HTML is always network-first.
* **Kill switch** (only if you ever want the PWA gone): replace the whole content of `public/sw.js` with the lines below and deploy. Do not just delete the file (the catch-all rewrite would then answer with `index.html` and phones would keep the old worker).
```js
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll())
      .then((clients) => clients.forEach((c) => c.navigate(c.url)))
  );
});
```
* `index.html` has static share tags for `https://pearlskino-bd.vercel.app` – change it if you move to a custom domain (also Settings → SEO → Website address).

## 4. Daily use
* **Edit texts**: Admin → *Edit storefront (view as visitor)*. Lists/hidden texts: Admin → Site text.
* **Products**: Products → edit → *Photos & videos* tab (Replace / Make main / Remove / Add more / drag to re-order; YouTube/Facebook/Drive links or an uploaded video file). Draft status hides a product until you press Publish. Clone copies a product as a new Draft. Select several products → *Bulk actions* (category, flags, price, status, low-stock alert).
* **Home page islands** (New / Trending / Featured / Deal): Settings → Home page → on/off, how many, and the titles (also editable in storefront edit mode).
* **Customers**: own sheet – deleting orders never deletes customers. Segments (VIP / inactive / new), broadcast offer (email + WhatsApp links), add / delete / restore customer.
* **Orders**: date filter + quick ranges, bulk status, invoice and packing slip (print or Save as PDF, one or many orders).
* **Abandoned carts**: Admin → Abandoned carts → one-click WhatsApp reminder. **Waiting customers**: Inventory → Waiting customers ("Notify me when back").
* **Reports**: top products, repeat-customer rate, area-wise sales, weekdays, categories.
* **Facebook Pixel / Google Analytics**: Settings → SEO & tracking tab (Pixel ID / GA4 ID). Events sent: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase.
