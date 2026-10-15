export default {
  "cart.eyebrow": { default: "{BRAND} · YOUR COLLECTION", label: "Heading: small line above the title" },

  "cart.empty.title": { default: "Nothing chosen\n*yet.*", label: "Empty bag: heading", kind: "text" },
  "cart.empty.text": {
    default: "{tagline}",
    label: "Empty bag: line under the heading",
    hint: "{tagline} is your store tagline from Settings",
  },
  "cart.empty.button": { default: "Discover the Collection", label: "Empty bag: button" },

  "cart.hero.title": { default: "A little beauty,\n*all yours.*", label: "Bag: heading", kind: "text" },
  "cart.hero.text": {
    default: "Thoughtfully selected pieces, gathered together for your next beauty moment.",
    label: "Bag: paragraph",
    kind: "text",
  },
  "cart.hero.item": { default: "ITEM", label: "Bag: counter word (one)" },
  "cart.hero.items": { default: "ITEMS", label: "Bag: counter word (many)" },

  "cart.remove": { default: "Remove", label: "Bag: remove link" },
  "cart.soldout": {
    default: "No longer available - please remove it to continue",
    label: "Bag: sold-out warning",
  },
  "cart.pickOption": { default: "Option", label: "Bag: label before the chosen option" },

  "cart.subtotal": { default: "Subtotal", label: "Summary: subtotal" },
  "cart.shipping": { default: "Shipping", label: "Summary: shipping" },
  "cart.total": { default: "Total", label: "Summary: total" },
  "cart.free": { default: "Free", label: "Summary: free shipping word" },
  "cart.from": { default: "from", label: "Summary: \"from\" before a delivery range" },
  "cart.shippingNote": {
    default: "The exact delivery charge is shown at checkout once you choose your area.",
    label: "Summary: delivery note",
    kind: "text",
  },
  "cart.freeGap": {
    default: "Add {amount} more to get free delivery.",
    label: "Summary: free delivery nudge",
    hint: "{amount} fills in the missing amount",
  },
  "cart.minOrder": {
    default: "The minimum order is {amount}.",
    label: "Summary: minimum order warning",
    hint: "{amount} fills in the minimum",
  },
  "cart.checkout": { default: "Proceed to Checkout", label: "Summary: checkout button" },
  "cart.continue": { default: "Continue Shopping", label: "Summary: continue link" },

  "cart.note": { default: "Carefully packed · Beautifully delivered", label: "Bottom note" },

  "cart.ship.progress": {
    default: "Add {amount} more for FREE delivery",
    label: "Free-delivery bar: still to go",
    hint: "{amount} fills in the missing amount",
  },
  "cart.ship.done": { default: "You've unlocked FREE delivery!", label: "Free-delivery bar: reached" },
  "cart.coupon.title": { default: "Have a coupon?", label: "Coupon box: heading" },
  "cart.coupon.hint": { default: "Enter code", label: "Coupon box: code box hint", inline: false },
  "cart.coupon.apply": { default: "Apply", label: "Coupon box: apply button" },
  "cart.coupon.remove": { default: "Remove", label: "Coupon box: remove link" },
  "cart.coupon.applied": {
    default: "{code} applied - you save {amount}",
    label: "Coupon box: applied line",
    hint: "{code} and {amount} fill in by themselves",
  },
  "cart.coupon.freeShip": { default: "{code} applied - free delivery", label: "Coupon box: applied (free delivery)" },
  "cart.coupon.welcome": {
    default: "Welcome gift: use {code} on your first order!",
    label: "Coupon box: first-order offer",
    hint: "{code} fills in your welcome coupon",
  },
  "cart.coupon.note": { default: "The final discount is confirmed at checkout.", label: "Coupon box: note" },
};
