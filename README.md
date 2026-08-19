# PearlSkino BD — React E-commerce

Premium React/Vite storefront with Tailwind CSS, Framer Motion, Lucide, filtering, search, cart drawer, quick view, responsive layouts and an SSLCOMMERZ-ready backend.

## Run
npm install
copy .env.example to .env
npm run dev

Frontend: http://localhost:5173
Backend: http://localhost:4000

## Payment
Put SSLCOMMERZ merchant credentials in `.env`. Never expose the store password in frontend code.

For a production launch, add a database, authoritative server-side product prices/inventory, transaction validation/IPN persistence, order management, refunds and shipping rules.

## Catalog
The `PRODUCTS` array in `src/main.jsx` is the catalog source. Replace it with the complete Wix catalog/exported product assets for a pixel-accurate catalog migration.
