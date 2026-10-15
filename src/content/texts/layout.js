/* Header menu, footer, bag drawer, the "added to bag" pop-up, small system pages */

export default {
  "nav.home": { default: "Home", label: "Menu: Home" },
  "nav.shop": { default: "Shop", label: "Menu: Shop" },
  "nav.about": { default: "About", label: "Menu: About" },
  "nav.contact": { default: "Contact", label: "Menu: Contact" },
  "nav.faq": { default: "FAQ", label: "Menu: FAQ" },
  "nav.cart": { default: "Cart", label: "Menu: Cart button" },
  "nav.account": { default: "Account", label: "Menu: Account" },
  "nav.track": { default: "Track order", label: "Menu: Track order" },

  "footer.links": { default: "Quick Links", label: "Footer: links heading" },
  "footer.order": { default: "Order", label: "Footer: order heading" },
  "footer.line1": { default: "COD available in metropolitan areas.", label: "Footer: order line 1" },
  "footer.line2": { default: "Pickup available in selected areas.", label: "Footer: order line 2" },
  "footer.connect": { default: "Say hello", label: "Footer: contact heading" },
  "footer.rights": {
    default: "© {year} {brand}. All rights reserved.",
    label: "Footer: copyright line",
    hint: "{year} and {brand} fill in by themselves",
  },

  "drawer.title": { default: "Your Bag", label: "Bag drawer: title" },
  "drawer.emptyTitle": { default: "Your bag is waiting.", label: "Bag drawer: empty heading" },
  "drawer.emptyText": {
    default: "Discover something beautiful and add it to your collection.",
    label: "Bag drawer: empty text",
    kind: "text",
  },
  "drawer.shop": { default: "Explore Collection", label: "Bag drawer: shop button" },
  "drawer.subtotal": { default: "Subtotal", label: "Bag drawer: subtotal label" },
  "drawer.shipping": { default: "Shipping", label: "Bag drawer: shipping label" },
  "drawer.total": { default: "Total", label: "Bag drawer: total label" },
  "drawer.free": { default: "FREE", label: "Bag drawer: free shipping word" },
  "drawer.view": { default: "View Cart", label: "Bag drawer: view cart button" },
  "drawer.checkout": { default: "Checkout", label: "Bag drawer: checkout button" },
  "drawer.freeGap": {
    default: "Add {amount} more for free delivery",
    label: "Bag drawer: free delivery nudge",
    hint: "{amount} fills in the missing amount",
  },

  "toast.title": { default: "Added to your bag", label: "Pop-up: added to bag" },
  "toast.view": { default: "View Cart", label: "Pop-up: view cart button" },
  "toast.continue": { default: "Keep shopping", label: "Pop-up: keep shopping button" },

  "maint.title": { default: "We'll be right back.", label: "Maintenance page: heading" },
  "maint.note": {
    default: "Please check back soon.",
    label: "Maintenance page: extra line",
  },

  "notfound.eyebrow": { default: "PAGE NOT FOUND", label: "404 page: small heading" },
  "notfound.title": { default: "This page wandered off.", label: "404 page: heading" },
  "notfound.text": {
    default: "The page you are looking for does not exist or has moved.",
    label: "404 page: text",
    kind: "text",
  },
  "notfound.button": { default: "Back to home", label: "404 page: button" },

  "search.hint": { default: "Search products…", label: "Search box hint", inline: false },
  "search.none": { default: "No products found", label: "Search: nothing found" },
  "search.all": { default: "See all results", label: "Search: see all results link" },
  "search.open": { default: "Search", label: "Search button label" },

  "fav.prompt.title": { default: "Save it to your favourites", label: "Heart pop-up: heading" },
  "fav.prompt.text": {
    default: "Favourites are kept in your account. Log in or create a free account and we will save this for you.",
    label: "Heart pop-up: paragraph",
    kind: "text",
  },
  "fav.prompt.login": { default: "Log in / Sign up", label: "Heart pop-up: login button" },
  "fav.prompt.later": { default: "Not now", label: "Heart pop-up: dismiss button" },
};
