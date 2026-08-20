import React from "react";

const faqs = [
  {
    question: "Are your products authentic?",
    answer:
      "Yes. We focus on sourcing authentic products and maintaining quality throughout the ordering process.",
  },
  {
    question: "Do you offer Cash on Delivery?",
    answer:
      "Yes. COD is available in supported metropolitan areas.",
  },
  {
    question: "Can I pick up my order?",
    answer:
      "Pickup is available in selected areas. Contact us to confirm availability.",
  },
  {
    question: "How can I place an order?",
    answer:
      "Choose your product, add it to your cart, and proceed through checkout. You can also contact us directly.",
  },
  {
    question: "Can I ask about a product before ordering?",
    answer:
      "Absolutely. Contact PearlSkino BD and we'll help you with availability and product details.",
  },
];

export default function FAQ() {
  return (
    <main className="page">
      <section className="page-hero">
        <span className="eyebrow">HELP CENTER</span>

        <h1>
          Frequently asked
          <br />
          <em>questions.</em>
        </h1>
      </section>

      <section className="faq-list">
        {faqs.map((faq, index) => (
          <details key={index} className="faq-item">
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </section>
    </main>
  );
}