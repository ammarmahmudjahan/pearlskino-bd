/*
|--------------------------------------------------------------------------
| THE LIST OF EVERY EDITABLE TEXT
|--------------------------------------------------------------------------
| Each file in ./texts/ describes the texts of one page. A text is:
|
|   "home.hero.title": {
|     default: "Your glow,\n*your story.*",   // what shows until you change it
|     label:   "Hero heading",                 // name shown in the editor
|     kind:    "line" | "text" | "list",       // one line / paragraph / repeating items
|     inline:  false,                          // optional: only editable in
|                                              //   Admin > Site Text (placeholders, etc.)
|   }
|
| To make a NEW text editable, add it here and use <T k="that.key" /> on the
| page. Nothing else is needed - it appears in Admin > Site Text by itself.
*/

import layout from "./texts/layout";
import home from "./texts/home";
import shop from "./texts/shop";
import product from "./texts/product";
import cart from "./texts/cart";
import checkout from "./texts/checkout";
import about from "./texts/about";
import contact from "./texts/contact";
import faq from "./texts/faq";
import account from "./texts/account";
import track from "./texts/track";
import seo from "./texts/seo";

export const TEXT_GROUPS = [
  { id: "layout", label: "Header, footer & bag drawer", path: "/", file: layout },
  { id: "home", label: "Home page", path: "/", file: home },
  { id: "shop", label: "Shop page", path: "/shop", file: shop },
  { id: "product", label: "Product page", path: "/shop", file: product },
  { id: "cart", label: "Bag page", path: "/cart", file: cart },
  { id: "checkout", label: "Checkout & thank-you", path: "/checkout", file: checkout },
  { id: "about", label: "About page", path: "/about", file: about },
  { id: "contact", label: "Contact page", path: "/contact", file: contact },
  { id: "faq", label: "FAQ page", path: "/faq", file: faq },
  { id: "account", label: "Account & login", path: "/account", file: account },
  { id: "track", label: "Order tracking", path: "/track", file: track },
  { id: "seo", label: "Search engines & sharing (page titles)", path: null, file: seo },
];

export const TEXTS = {};

TEXT_GROUPS.forEach((group) => {
  Object.entries(group.file).forEach(([key, def]) => {
    TEXTS[key] = { kind: "line", ...def, group: group.id };
  });
});

export function textsOfGroup(groupId) {
  return Object.entries(TEXTS)
    .filter(([, def]) => def.group === groupId)
    .map(([key, def]) => ({ key, ...def }));
}

/* a list text is stored as JSON; this reads it safely */
export function parseList(def, raw) {
  if (Array.isArray(raw)) return raw;

  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => item && typeof item === "object")
          .map((item) => {
            const clean = {};
            (def.fields || []).forEach((field) => {
              clean[field.key] = String(item[field.key] ?? "");
            });
            return clean;
          });
      }
    } catch {
      /* fall back to the default below */
    }
  }

  return def.default;
}

export function serializeList(def, items) {
  const fields = def.fields || [];

  return JSON.stringify(
    items
      .map((item) => {
        const clean = {};
        fields.forEach((field) => {
          clean[field.key] = String(item[field.key] ?? "").trim();
        });
        return clean;
      })
      .filter((item) => fields.some((field) => item[field.key]))
  );
}
