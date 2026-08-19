# PearlSkino BD — Redesign v2

A full visual + structural rebuild of the storefront: dark-luxury "living pearl"
theme (near-black background, gold/rose/violet iridescent glow, an animated
signature "pearl orb" motif), site-wide animated background (drifting aurora
blobs + a canvas sparkle-particle field), and a proper multi-page structure
built with React Router on top of the existing Vite + Tailwind + Framer Motion
+ Express/SSLCOMMERZ stack.

## What's new

- **Pages**: Home, Shop (filter/search/sort), Product Detail, Cart, Checkout,
  Order Status (success/failed/cancelled), About, Contact, FAQ, 404 — routed
  with `react-router-dom` instead of the old single-page + separate
  `checkout.html`.
- **Design system**: Fraunces (display) + Manrope (body) + Space Grotesk
  (labels), full color/spacing tokens in `src/styles.css`.
- **Signature motif**: `src/components/PearlOrb.jsx` — a glowing, cursor-
  reactive orb reused across the hero, About page, and 404.
- **Site-wide animated background**: `src/components/Background.jsx` — fixed
  behind every page, respects `prefers-reduced-motion`.
- **Cart**: moved to React context (`src/context/CartContext.jsx`) with
  wishlist support, still persisted to `localStorage`.
- **Expanded catalog**: `src/data/products.js` now covers 14 products across
  Fragrance, Cleansers, Serums, Moisturizers, Suncare and Body & Soap, using
  the real brands from your lineup (COSRX, CeraVe, Simple, The Ordinary,
  Beauty of Joseon, SKIN1004, AXIS-Y, Deconstruct, Missha, Kojie San,
  3W Clinic, plus your 3 fragrance decants).
- **Checkout**: same SSLCOMMERZ flow, now redirects to `/order-status` instead
  of the old `/?payment=...` home redirect.
- **`vercel.json`** added — required for React Router deep links / refresh to
  work correctly on Vercel's static hosting.

## Setup

```bash
npm install
npm run dev        # frontend on :5173
```

In a second terminal, for the payment backend:

```bash
npm install express cors dotenv    # not yet in package.json — see note below
cp .env.example .env                # fill in SSLCOMMERZ credentials
npm run server                      # backend on :4000
```

> **Note:** `server/index.js` was carried over as-is and still needs
> `express`, `cors`, and `dotenv` installed — they weren't in the original
> `package.json`'s dependencies either, so add them if you haven't already.

## Placeholder imagery

Product photos still use the same Unsplash stock placeholders as the
original build (`src/data/products.js`, top of file). Swap the `IMG` map for
real product photography whenever it's ready — everything else (cards,
gallery, hover states) is already wired to whatever URLs are there.

## Deploying

Same as before (Vercel). The added `vercel.json` rewrites all non-`/api`
routes to `index.html` so client-side routing survives a hard refresh or a
shared link straight to `/product/cosrx`, `/shop?category=suncare`, etc.
