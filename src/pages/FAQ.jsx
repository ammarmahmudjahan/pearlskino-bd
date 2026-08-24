import React, { useState } from "react";

const faqs = [
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
];

const categories = ["ALL", "ORDERS", "DELIVERY", "PRODUCTS", "AUTHENTICITY"];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);
  const [activeCategory, setActiveCategory] = useState("ALL");

  const filteredFaqs =
    activeCategory === "ALL"
      ? faqs
      : faqs.filter((faq) => faq.category === activeCategory);

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <main
      className="page"
      style={{
        minHeight: "100vh",
        overflow: "hidden",
      }}
    >
      {/* =====================================================
          HERO
      ===================================================== */}

      <section
        className="page-hero"
        style={{
          position: "relative",
          paddingBottom: "55px",
        }}
      >
        {/* Decorative pearls */}

        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: "150px",
            height: "150px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 32% 28%, #ffffff 0%, #f8eaf2 25%, #ddd1e8 60%, #c9bfd8 100%)",
            opacity: 0.42,
            filter: "blur(1px)",
            right: "7%",
            top: "10%",
            pointerEvents: "none",
          }}
        />

        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: "55px",
            height: "55px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 30% 25%, #ffffff, #f3dce9 45%, #d7cce2 100%)",
            opacity: 0.55,
            left: "8%",
            bottom: "8%",
            pointerEvents: "none",
          }}
        />

        <span
          className="eyebrow"
          style={{
            position: "relative",
            zIndex: 1,
          }}
        >
            <div className="faq-hero-logo">
  <img
    src="/logo.png"
    alt={brand}
  />
</div>
          {brand.toUpperCase()} HELP CENTER
        </span>

        <h1
          style={{
            position: "relative",
            zIndex: 1,
          }}
        >
          Questions,
          <br />
          <em>answered beautifully.</em>
        </h1>

        <p
          style={{
            maxWidth: "600px",
            margin: "22px auto 0",
            lineHeight: 1.8,
            opacity: 0.72,
            fontSize: "15px",
          }}
        >
          Everything you need to know about ordering, delivery,
          authenticity and finding the right product for you.
        </p>
      </section>

      {/* =====================================================
          CATEGORY FILTER
      ===================================================== */}

      <section
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "10px",
          padding: "0 20px 45px",
        }}
      >
        {categories.map((category) => {
          const active = activeCategory === category;

          return (
            <button
              key={category}
              type="button"
              onClick={() => {
                setActiveCategory(category);
                setOpenIndex(null);
              }}
              style={{
                border: active
                  ? "1px solid rgba(150, 120, 160, 0.35)"
                  : "1px solid rgba(120, 100, 120, 0.14)",
                background: active
                  ? "linear-gradient(135deg, rgba(235,220,238,.85), rgba(248,226,235,.85))"
                  : "rgba(255,255,255,.48)",
                color: "inherit",
                padding: "10px 17px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.12em",
                cursor: "pointer",
                boxShadow: active
                  ? "0 8px 25px rgba(130,105,145,.12)"
                  : "none",
                transition:
                  "all .25s ease",
              }}
            >
              {category}
            </button>
          );
        })}
      </section>

      {/* =====================================================
          FAQ CONTENT
      ===================================================== */}

      <section
        className="faq-list"
        style={{
          maxWidth: "920px",
          margin: "0 auto",
          padding: "0 20px 90px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {filteredFaqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={`${activeCategory}-${index}`}
                className="faq-item"
                style={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: "22px",
                  border: isOpen
                    ? "1px solid rgba(170, 140, 175, .28)"
                    : "1px solid rgba(120, 100, 120, .10)",
                  background: isOpen
                    ? "linear-gradient(135deg, rgba(255,255,255,.78), rgba(248,232,241,.62))"
                    : "rgba(255,255,255,.52)",
                  boxShadow: isOpen
                    ? "0 18px 45px rgba(110,85,120,.10)"
                    : "0 5px 22px rgba(100,80,100,.035)",
                  transition:
                    "all .3s ease",
                }}
              >
                {/* Soft decorative glow */}

                {isOpen && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      width: "120px",
                      height: "120px",
                      borderRadius: "50%",
                      background:
                        "radial-gradient(circle, rgba(220,190,225,.25), transparent 70%)",
                      top: "-55px",
                      right: "-35px",
                      pointerEvents: "none",
                    }}
                  />
                )}

                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  aria-expanded={isOpen}
                  style={{
                    position: "relative",
                    zIndex: 1,
                    width: "100%",
                    display: "grid",
                    gridTemplateColumns:
                      "55px 1fr 42px",
                    alignItems: "center",
                    gap: "14px",
                    padding: "22px 24px",
                    border: "none",
                    background: "transparent",
                    color: "inherit",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  {/* Number */}

                  <span
                    style={{
                      width: "38px",
                      height: "38px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "50%",
                      background: isOpen
                        ? "linear-gradient(135deg, #eadbed, #f4dce8)"
                        : "rgba(235,225,235,.55)",
                      fontSize: "11px",
                      fontWeight: 600,
                      opacity: 0.7,
                    }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  {/* Question */}

                  <span>
                    <small
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        fontSize: "9px",
                        letterSpacing: "0.15em",
                        opacity: 0.48,
                        fontWeight: 600,
                      }}
                    >
                      {faq.category}
                    </small>

                    <strong
                      style={{
                        display: "block",
                        fontSize: "15px",
                        lineHeight: 1.45,
                        fontWeight: 600,
                      }}
                    >
                      {faq.question}
                    </strong>
                  </span>

                  {/* Plus */}

                  <span
                    aria-hidden="true"
                    style={{
                      width: "36px",
                      height: "36px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "50%",
                      border:
                        "1px solid rgba(120,100,120,.12)",
                      background:
                        "rgba(255,255,255,.45)",
                      fontSize: "22px",
                      fontWeight: 300,
                      transform: isOpen
                        ? "rotate(45deg)"
                        : "rotate(0deg)",
                      transition:
                        "transform .3s ease",
                    }}
                  >
                    +
                  </span>
                </button>

                {/* Answer */}

                <div
                  style={{
                    display: "grid",
                    gridTemplateRows: isOpen
                      ? "1fr"
                      : "0fr",
                    transition:
                      "grid-template-rows .35s ease",
                  }}
                >
                  <div
                    style={{
                      overflow: "hidden",
                    }}
                  >
                    <p
                      style={{
                        margin: "0",
                        padding:
                          "0 80px 25px 93px",
                        fontSize: "14px",
                        lineHeight: 1.8,
                        opacity: 0.68,
                      }}
                    >
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================
          BOTTOM CTA
      ===================================================== */}

      <section
        style={{
          maxWidth: "920px",
          margin: "0 auto 80px",
          padding: "0 20px",
        }}
      >
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "30px",
            padding: "55px 30px",
            textAlign: "center",
            background:
              "linear-gradient(135deg, rgba(239,224,240,.72), rgba(249,227,234,.72), rgba(228,237,224,.60))",
            border:
              "1px solid rgba(255,255,255,.75)",
            boxShadow:
              "0 20px 60px rgba(110,85,120,.10)",
          }}
        >
          {/* Decorative sparkle */}

          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "22px",
              right: "35px",
              fontSize: "22px",
              opacity: 0.45,
            }}
          >
            ✦
          </span>

          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: "25px",
              left: "40px",
              fontSize: "13px",
              opacity: 0.35,
            }}
          >
            ✦
          </span>

          <span
            className="eyebrow"
            style={{
              display: "block",
              marginBottom: "14px",
              opacity: 0.6,
            }}
          >
            STILL CURIOUS?
          </span>

          <h2
            style={{
              margin: "0 0 12px",
              fontSize: "clamp(28px, 5vw, 44px)",
              lineHeight: 1.1,
            }}
          >
            We're happy to
            <br />
            <em>help.</em>
          </h2>

          <p
            style={{
              maxWidth: "500px",
              margin: "0 auto 25px",
              fontSize: "14px",
              lineHeight: 1.7,
              opacity: 0.65,
            }}
          >
            Didn't find what you were looking for?
            Reach out to {brand} and we'll be
            happy to help.
          </p>

          <a
            href="https://m.me/pearlskinobd"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "9px",
              padding: "13px 23px",
              borderRadius: "999px",
              background: "rgba(255,255,255,.72)",
              color: "inherit",
              textDecoration: "none",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: ".04em",
              border:
                "1px solid rgba(255,255,255,.8)",
              boxShadow:
                "0 10px 25px rgba(100,80,100,.08)",
            }}
          >
            Contact {brand}
            <span>↗</span>
          </a>
        </div>
      </section>
    </main>
  );
}