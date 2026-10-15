export default {
  "faq.eyebrow": { default: "{BRAND} HELP CENTER", label: "Top: small heading" },
  "faq.title": {
    default: "Questions,\n*answered beautifully.*",
    label: "Top: big heading",
    kind: "text",
  },
  "faq.text": {
    default:
      "Everything you need to know about ordering, delivery, authenticity and finding the right product for you.",
    label: "Top: paragraph",
    kind: "text",
  },

  "faq.all": { default: "ALL", label: "Tabs: \"all questions\" tab" },

  "faq.items": {
    kind: "list",
    label: "Questions & answers",
    itemLabel: "question",
    hint: "The tabs on the page are made from the Category words. Use {brand} to show the store name.",
    max: 40,
    fields: [
      { key: "category", label: "Category (one word, e.g. DELIVERY)" },
      { key: "question", label: "Question" },
      { key: "answer", label: "Answer", multiline: true },
    ],
    default: [
      {
        category: "ORDERS",
        question: "How can I place an order?",
        answer:
          "Choose your favorite product, add it to your cart, and continue through checkout. If you prefer personal assistance, you can also contact {brand} directly.",
      },
      {
        category: "AUTHENTICITY",
        question: "Are your products authentic?",
        answer:
          "Yes. We focus on sourcing authentic products and maintaining quality throughout the ordering process. Product details and availability are kept as transparent as possible.",
      },
      {
        category: "DELIVERY",
        question: "Do you offer Cash on Delivery?",
        answer:
          "Yes. Cash on Delivery is available in supported metropolitan areas. Availability may vary depending on your delivery location.",
      },
      {
        category: "PICKUP",
        question: "Can I pick up my order?",
        answer:
          "Yes. Pickup is available in selected areas. Contact us before ordering so we can confirm the available pickup location and timing.",
      },
      {
        category: "PRODUCTS",
        question: "Can I ask about a product before ordering?",
        answer:
          "Absolutely. If you have questions about a product, size, availability, fragrance, skincare item, or anything else, feel free to contact us before placing your order.",
      },
      {
        category: "PRODUCTS",
        question: "What if the product I want is out of stock?",
        answer:
          "Some products are restocked regularly. Contact us with the product name and we'll let you know whether it is currently available or when you can expect it back.",
      },
      {
        category: "DELIVERY",
        question: "How long does delivery take?",
        answer:
          "Delivery time depends on your location and the delivery method available for your order. We'll provide the relevant delivery information when your order is confirmed.",
      },
      {
        category: "ORDERS",
        question: "Can I change or cancel my order?",
        answer:
          "If you need to change or cancel an order, contact us as soon as possible. We'll do our best to help before the order is processed or dispatched.",
      },
    ],
  },

  "faq.empty": {
    default: "No questions in this category yet.",
    label: "Message when a tab has no questions",
  },

  "faq.cta.eyebrow": { default: "STILL CURIOUS?", label: "Help card: small heading" },
  "faq.cta.title": { default: "We're happy to\n*help.*", label: "Help card: heading", kind: "text" },
  "faq.cta.text": {
    default: "Didn't find what you were looking for? Reach out to {brand} and we'll be happy to help.",
    label: "Help card: paragraph",
    kind: "text",
  },

  "faq.f.name": { default: "NAME", label: "Help form: name label" },
  "faq.f.phone": { default: "PHONE", label: "Help form: phone label" },
  "faq.f.message": { default: "MESSAGE", label: "Help form: message label" },
  "faq.ph.name": { default: "Your name", label: "Hint inside the name box", inline: false },
  "faq.ph.phone": { default: "01XXXXXXXXX", label: "Hint inside the phone box", inline: false },
  "faq.ph.message": { default: "How can we help?", label: "Hint inside the message box", inline: false },
  "faq.submit": { default: "Send Message", label: "Help form: send button" },
  "faq.sending": { default: "Sending...", label: "Help form: button while sending" },

  "faq.ok.title": { default: "Message received.", label: "After sending: heading" },
  "faq.ok.text": {
    default: "Thank you for contacting {brand}. We'll get back to you as soon as possible.",
    label: "After sending: paragraph",
    kind: "text",
  },
};
