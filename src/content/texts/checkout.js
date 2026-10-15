export default {
  "checkout.eyebrow": { default: "{BRAND} - CHECKOUT", label: "Top: small heading" },
  "checkout.hero.title": { default: "Almost\n*yours.*", label: "Top: big heading", kind: "text" },
  "checkout.hero.text": {
    default: "A few little details,\nand we'll take care of the rest.",
    label: "Top: paragraph",
    kind: "text",
  },
  "checkout.item": { default: "ITEM", label: "Top: counter word (one)" },
  "checkout.items": { default: "ITEMS", label: "Top: counter word (many)" },

  "checkout.details.eyebrow": { default: "YOUR DETAILS", label: "Form: small heading" },
  "checkout.details.title": { default: "Tell us where\n*to find you.*", label: "Form: heading", kind: "text" },

  "checkout.login.text": {
    default: "Have an account? Log in to fill in your details and follow your orders.",
    label: "Form: login suggestion",
    kind: "text",
  },
  "checkout.login.link": { default: "Log in", label: "Form: login link" },
  "checkout.saved": { default: "Use a saved address", label: "Form: saved address picker" },

  "checkout.f.name": { default: "Full Name", label: "Field: name" },
  "checkout.f.phone": { default: "Phone Number", label: "Field: phone" },
  "checkout.f.email": { default: "Email Address", label: "Field: email" },
  "checkout.f.whatsapp": { default: "WhatsApp Number", label: "Field: WhatsApp" },
  "checkout.f.address": { default: "Delivery Address", label: "Field: address" },
  "checkout.f.area": { default: "Area", label: "Field: area" },
  "checkout.f.zone": { default: "Delivery Zone", label: "Field: delivery zone" },
  "checkout.f.delivery": { default: "Delivery", label: "Field: delivery method" },
  "checkout.f.payment": { default: "Payment", label: "Field: payment method" },
  "checkout.f.coupon": { default: "Coupon Code", label: "Field: coupon" },
  "checkout.f.note": { default: "A Little Note", label: "Field: note" },
  "checkout.optional": { default: "OPTIONAL", label: "Tag: optional" },

  "checkout.ph.name": { default: "Your name", label: "Hint inside the name box", inline: false },
  "checkout.ph.phone": { default: "01XXXXXXXXX", label: "Hint inside the phone box", inline: false },
  "checkout.ph.email": { default: "you@example.com", label: "Hint inside the email box", inline: false },
  "checkout.ph.whatsapp": { default: "01XXXXXXXXX", label: "Hint inside the WhatsApp box", inline: false },
  "checkout.ph.address": {
    default: "House, road, building or landmark...",
    label: "Hint inside the address box",
    inline: false,
  },
  "checkout.ph.area": { default: "e.g. GEC, Chattogram", label: "Hint inside the area box", inline: false },
  "checkout.ph.coupon": { default: "Enter code", label: "Hint inside the coupon box", inline: false },
  "checkout.ph.note": {
    default: "Anything you'd like us to know?",
    label: "Hint inside the note box",
    inline: false,
  },

  "checkout.whatsapp.hint": {
    default: "Optional. We can send order updates here. Leave empty if you prefer a call.",
    label: "WhatsApp: helper text",
    kind: "text",
  },
  "checkout.whatsapp.same": { default: "Same as my phone number", label: "WhatsApp: same-number checkbox" },

  "checkout.opt.home": { default: "Home Delivery", label: "Option: home delivery" },
  "checkout.opt.pickup": { default: "Pickup", label: "Option: pickup" },
  "checkout.opt.cod": { default: "Cash on Delivery", label: "Option: cash on delivery" },
  "checkout.opt.payPickup": { default: "Pay at pickup", label: "Option: pay when you pick up" },
  "checkout.opt.bkash": { default: "bKash", label: "Option: bKash" },
  "checkout.opt.none": {
    default: "No payment method is available right now. Please contact us to order.",
    label: "Message: no payment method",
    kind: "text",
  },

  "checkout.bkash.title": { default: "Pay with bKash", label: "bKash: heading" },
  "checkout.bkash.send": {
    default: "Send {amount} to {number} ({type} account), then enter the details below.",
    label: "bKash: instruction line",
    kind: "text",
    hint: "{amount}, {number} and {type} fill in by themselves",
  },
  "checkout.bkash.trx": { default: "bKash Transaction ID", label: "bKash: transaction ID field" },
  "checkout.bkash.sender": { default: "bKash number you paid from", label: "bKash: sender number field" },
  "checkout.bkash.verify": {
    default: "We check every bKash payment before your order is shipped.",
    label: "bKash: reassurance",
    kind: "text",
  },

  "checkout.coupon.apply": { default: "Apply", label: "Coupon: apply button" },
  "checkout.coupon.remove": { default: "Remove", label: "Coupon: remove button" },
  "checkout.coupon.applied": {
    default: "Coupon {code} applied",
    label: "Coupon: applied message",
    hint: "{code} fills in the code",
  },
  "checkout.coupon.freeShip": { default: "Free delivery with this coupon", label: "Coupon: free delivery message" },

  "checkout.submit": { default: "Place My Order", label: "Submit button" },
  "checkout.submitting": { default: "Sending your order...", label: "Submit button while sending" },
  "checkout.submitNote": {
    default: "By placing your order, you confirm that the information provided is correct.",
    label: "Note under the submit button",
    kind: "text",
  },

  "checkout.summary.eyebrow": { default: "02 - YOUR COLLECTION", label: "Summary: small heading" },
  "checkout.summary.title": { default: "A little\n*beauty.*", label: "Summary: heading", kind: "text" },
  "checkout.summary.subtotal": { default: "Subtotal", label: "Summary: subtotal" },
  "checkout.summary.discount": { default: "Discount", label: "Summary: discount" },
  "checkout.summary.delivery": { default: "Delivery", label: "Summary: delivery" },
  "checkout.summary.complimentary": { default: "Complimentary", label: "Summary: free delivery word" },
  "checkout.summary.total": { default: "TOTAL", label: "Summary: total" },
  "checkout.summary.totalNote": { default: "Your order", label: "Summary: under total" },
  "checkout.summary.freeNote": {
    default: "Your order qualifies for complimentary delivery.",
    label: "Summary: free delivery note",
    kind: "text",
  },
  "checkout.summary.chargeNote": {
    default: "Delivery is calculated based on your order location.",
    label: "Summary: delivery charge note",
    kind: "text",
  },
  "checkout.summary.trust": {
    default: "Carefully packed\nBeautifully delivered",
    label: "Summary: bottom line",
    kind: "text",
  },
  "checkout.back": { default: "Back to your collection", label: "Back link" },
  "checkout.bottom": { default: "{brand} - Beauty, thoughtfully selected.", label: "Bottom line" },

  "checkout.problem.soldout": {
    default: "Some items in your bag are no longer available. Please remove them to continue.",
    label: "Message: sold-out items in the bag",
    kind: "text",
  },
  "checkout.problem.fix": { default: "Go to bag", label: "Message: link to the bag" },

  "checkout.empty.eyebrow": { default: "{BRAND} - YOUR BAG", label: "Empty bag: small heading" },
  "checkout.empty.title": { default: "Nothing to\n*complete yet.*", label: "Empty bag: heading", kind: "text" },
  "checkout.empty.text": {
    default:
      "Your beauty collection is waiting. Explore the shop and choose something that feels perfectly yours.",
    label: "Empty bag: paragraph",
    kind: "text",
  },
  "checkout.empty.button": { default: "Discover the Collection", label: "Empty bag: button" },

  "checkout.ok.eyebrow": { default: "{BRAND} - ORDER CONFIRMED", label: "Thank-you page: small heading" },
  "checkout.ok.title": { default: "It's officially\n*yours.*", label: "Thank-you page: big heading", kind: "text" },
  "checkout.ok.subtitle": {
    default: "Your order has\n*been received.*",
    label: "Thank-you page: second heading",
    kind: "text",
  },
  "checkout.ok.copy": {
    default:
      "Thank you for choosing {brand}. We've received your order details and will contact you shortly to confirm everything before delivery.",
    label: "Thank-you page: paragraph",
    kind: "text",
  },
  "checkout.ok.orderId": { default: "Order number", label: "Thank-you page: order number label" },
  "checkout.ok.total": { default: "Total to pay", label: "Thank-you page: total label" },
  "checkout.ok.bkash": {
    default: "We will verify your bKash payment and confirm your order shortly.",
    label: "Thank-you page: bKash line",
    kind: "text",
  },
  "checkout.ok.track": { default: "Track my order", label: "Thank-you page: track button" },
  "checkout.ok.account": {
    default: "Create an account to keep all your orders in one place.",
    label: "Thank-you page: account suggestion",
    kind: "text",
  },
  "checkout.ok.accountLink": { default: "Create account", label: "Thank-you page: account link" },
  "checkout.ok.note": { default: "Carefully packed - Beautifully delivered", label: "Thank-you page: note" },
  "checkout.ok.button": { default: "Continue Exploring", label: "Thank-you page: button" },
};
