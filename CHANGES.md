# What changed (v3 → v4)

## Backend `src/admin/Code.gs` (v4.0.0, ~6.6k lines)
* **Customers sheet** – customers live in their own table (built automatically from old orders/accounts). Deleting/trashing orders never touches customers; explicit *Delete customer* (with restore). Segments VIP / inactive / new; broadcast offer with dry-run.
* **Media** – up to 5 videos per product (YouTube, Facebook, Drive, uploaded file), review-photo upload, separate Drive folders, image/thumb handling.
* **Speed** – CacheService for public reads, cache is cleared on every save.
* **Shop features** – abandoned carts (+ reminder template), back-in-stock requests (+ auto email when restocked), welcome coupon, bought-together, urgency threshold, free-delivery bar, draft status, product clone, bulk product actions, per-product low-stock + daily digest, invoice / packing-slip data, sitemap + product share data.
* **Reports** – repeat rate, cancel rate, items per order, categories, weekdays, area-wise revenue, best by revenue.
* **Fix**: island limit 1 was silently raised to 2.

## Storefront
* Proper shopping-cart icon; favourites only for logged-in accounts (guest → login prompt → product auto-saved after login).
* Home islands for New / Trending / Featured / Deal with editable titles; recently viewed.
* Image compression everywhere (Google CDN sizes + client-side compression for uploads + smaller logo/embedded image), responsive `srcset`, lazy loading, client data cache (stale-while-revalidate), code splitting, long-cache headers.
* Product page: gallery with ▶ video thumbs, only-N-left, related + bought-together, sticky mobile Add-to-cart bar, out-of-stock badge + *Notify me*, review photos.
* Cart: free-delivery progress bar, coupon box, first-order welcome coupon.
* Header: live search. Track page: progress timeline.
* SEO: per-product title/description/OG share cards (`api/share.js`), `sitemap.xml`, `robots.txt`. PWA: manifest, safe service worker, icons. Facebook Pixel / GA4 events.

## Admin
* Sidebar fully expanded (no inner scrollbar). New Photos & videos manager. Customers, Abandoned carts, Waiting customers pages. Orders date filter / bulk status / print. Product sort, Draft, Clone, Bulk actions. Dashboard + Reports extensions. Review photos in Inbox. New Settings: Home islands, Shop features.

## Files added
`api/*`, `vite.config.js`, `public/manifest.webmanifest`, `public/sw.js`, `public/icons/*`, `src/lib/{img,compress,video,search,recent,couponStore}.js`, `src/hooks/{useCoupon,useTogether,useCatalog}.js`, `src/admin/{MediaManager.jsx,printing.js,pages/Abandoned.jsx}`, `src/v4.css`.
