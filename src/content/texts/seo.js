/*
 * Page titles and short descriptions for Google, browser tabs and link previews.
 * The HOME page uses Admin > Settings > "Search & sharing" instead.
 * Product pages use the product's own name and description.
 */
export default {
  "seo.shop.title": { default: "Shop | {brand}", label: "Shop page - title" },
  "seo.shop.description": {
    default: "Browse authentic skincare, cosmetics and fragrances at {brand}.",
    label: "Shop page - description",
    kind: "text",
    inline: false,
  },

  "seo.cart.title": { default: "Your bag | {brand}", label: "Bag page - title" },
  "seo.cart.description": {
    default: "Review the items in your bag at {brand}.",
    label: "Bag page - description",
    kind: "text",
    inline: false,
  },

  "seo.checkout.title": { default: "Checkout | {brand}", label: "Checkout page - title" },
  "seo.checkout.description": {
    default: "Complete your order at {brand}.",
    label: "Checkout page - description",
    kind: "text",
    inline: false,
  },

  "seo.about.title": { default: "Our story | {brand}", label: "About page - title" },
  "seo.about.description": {
    default: "Learn about {brand} and how we select authentic skincare and fragrances.",
    label: "About page - description",
    kind: "text",
    inline: false,
  },

  "seo.contact.title": { default: "Contact | {brand}", label: "Contact page - title" },
  "seo.contact.description": {
    default: "Questions about an order, a product or a fragrance? Get in touch with {brand}.",
    label: "Contact page - description",
    kind: "text",
    inline: false,
  },

  "seo.faq.title": { default: "FAQ | {brand}", label: "FAQ page - title" },
  "seo.faq.description": {
    default: "Answers about ordering, delivery, pickup and authenticity at {brand}.",
    label: "FAQ page - description",
    kind: "text",
    inline: false,
  },

  "seo.account.title": { default: "My account | {brand}", label: "Account page - title" },
  "seo.account.description": {
    default: "Log in to follow your orders and save your details at {brand}.",
    label: "Account page - description",
    kind: "text",
    inline: false,
  },

  "seo.track.title": { default: "Track your order | {brand}", label: "Order tracking page - title" },
  "seo.track.description": {
    default: "See where your {brand} order is right now.",
    label: "Order tracking page - description",
    kind: "text",
    inline: false,
  },
};
