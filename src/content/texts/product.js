export default {
  "product.back": { default: "← Continue Shopping", label: "Back link" },

  "product.add": { default: "Add to Cart", label: "Add button" },
  "product.added": { default: "Added to Cart", label: "Add button after adding" },
  "product.inactive": { default: "Currently Unavailable", label: "Button when switched off" },
  "product.soldout": { default: "Out of Stock", label: "Button when sold out" },

  "product.stock.ok": {
    default: "✓ {count} available",
    label: "Stock line: in stock",
    hint: "{count} fills in the number left",
  },
  "product.stock.low": {
    default: "Only {count} left",
    label: "Stock line: running low",
    hint: "{count} fills in the number left",
  },
  "product.stock.out": { default: "Out of stock", label: "Stock line: sold out" },
  "product.stock.inactive": { default: "Currently unavailable", label: "Stock line: switched off" },

  "product.inbag.one": { default: "1 item already in your bag", label: "Bag reminder (one)" },
  "product.inbag.many": {
    default: "{count} items already in your bag",
    label: "Bag reminder (many)",
    hint: "{count} fills in the number",
  },
  "product.inbag.link": { default: "View Bag", label: "Bag reminder link" },

  "product.choose": { default: "Choose an option", label: "Option picker: label when none is set" },
  "product.chooseError": { default: "Please choose an option first.", label: "Message: no option chosen" },
  "product.maxError": {
    default: "Your bag already holds the most we can offer of this item.",
    label: "Message: maximum reached",
  },
  "product.optionSoldOut": { default: "sold out", label: "Option picker: sold-out word" },

  "product.save": { default: "Save", label: "Wishlist button" },
  "product.saved": { default: "Saved", label: "Wishlist button when saved" },
  "product.ask": { default: "Ask on WhatsApp", label: "WhatsApp question button" },
  "product.savings": {
    default: "You save {amount}",
    label: "Price: saving line",
    hint: "{amount} fills in the saving",
  },

  "product.features": { default: "Highlights", label: "Section: highlights heading" },
  "product.specs": { default: "Details", label: "Section: details heading" },

  "product.reviews.title": { default: "Reviews", label: "Reviews: heading" },
  "product.reviews.count": {
    default: "{count} reviews",
    label: "Reviews: count (many)",
    hint: "{count} fills in the number",
  },
  "product.reviews.count1": { default: "1 review", label: "Reviews: count (one)" },
  "product.reviews.empty": {
    default: "No reviews yet. Be the first to share your thoughts.",
    label: "Reviews: none yet",
    kind: "text",
  },
  "product.reviews.verified": { default: "Verified purchase", label: "Reviews: verified tag" },
  "product.reviews.reply": { default: "Reply from the store", label: "Reviews: store reply label" },
  "product.reviews.write": { default: "Write a review", label: "Reviews: form heading" },
  "product.reviews.login": { default: "Log in to write a review", label: "Reviews: login link" },
  "product.reviews.rating": { default: "Your rating", label: "Reviews: rating label" },
  "product.reviews.titleHint": { default: "Title (optional)", label: "Reviews: title box hint", inline: false },
  "product.reviews.bodyHint": { default: "How was it for you?", label: "Reviews: text box hint", inline: false },
  "product.reviews.submit": { default: "Send review", label: "Reviews: send button" },
  "product.reviews.thanks": {
    default: "Thank you! Your review will appear once we have checked it.",
    label: "Reviews: thanks (needs approval)",
    kind: "text",
  },
  "product.reviews.thanksLive": { default: "Thank you! Your review is live.", label: "Reviews: thanks (live)" },

  "product.related.eyebrow": { default: "MORE TO LOVE", label: "Related: small heading" },
  "product.related.title": { default: "You may also *like.*", label: "Related: heading" },

  "product.loading": { default: "Loading product...", label: "Loading: heading" },
  "product.loadingText": { default: "Please wait while we load the product details.", label: "Loading: text" },
  "product.nf.title": { default: "Product not found", label: "Not found: heading" },
  "product.nf.text": {
    default: "This product may have been removed or is no longer available.",
    label: "Not found: text",
    kind: "text",
  },
  "product.nf.button": { default: "← Back to Shop", label: "Not found: button" },

  "product.urgency": {
    default: "Hurry - only {count} left!",
    label: "Stock line: last few (urgency)",
    hint: "{count} fills in the number left",
  },
  "product.sticky.add": { default: "Add to Cart", label: "Phone bar: add button" },
  "product.sticky.choose": { default: "Choose option", label: "Phone bar: when an option must be chosen" },
  "product.notify.title": { default: "Tell me when it's back", label: "Back-in-stock: heading" },
  "product.notify.text": {
    default: "Leave your mobile number or email and we will let you know the moment it is available again.",
    label: "Back-in-stock: paragraph",
    kind: "text",
  },
  "product.notify.name": { default: "Your name (optional)", label: "Back-in-stock: name box hint", inline: false },
  "product.notify.contact": { default: "Mobile number or email", label: "Back-in-stock: contact box hint", inline: false },
  "product.notify.button": { default: "Notify me", label: "Back-in-stock: button" },
  "product.notify.done": {
    default: "Done! We will message you as soon as it is back.",
    label: "Back-in-stock: thank-you",
    kind: "text",
  },
  "product.notify.instock": { default: "Good news - it is available again! You can order it now.", label: "Back-in-stock: already available" },
  "product.together.eyebrow": { default: "BOUGHT TOGETHER", label: "Bought together: small heading" },
  "product.together.title": { default: "Customers also *bought.*", label: "Bought together: heading" },
  "product.recent.eyebrow": { default: "YOUR TRAIL", label: "Recently viewed: small heading" },
  "product.recent.title": { default: "Recently *viewed.*", label: "Recently viewed: heading" },
  "product.video.title": { default: "Watch", label: "Videos: heading above the product videos" },
  "product.video.play": { default: "Play video", label: "Videos: play button label" },
  "product.reviews.photoAdd": { default: "Add photos (up to 3)", label: "Reviews: add photos button" },
  "product.reviews.photoHint": { default: "Real photos help other shoppers.", label: "Reviews: photos hint" },
  "product.fav.need": { default: "Log in to save favourites", label: "Heart: tooltip when logged out" },
};
