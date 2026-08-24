
import React, { useState } from "react";

import { useStore } from "../context/StoreContext";

import { GOOGLE_FORMS } from "../config/googleForms";
import { submitToGoogleForm } from "../utils/googleForms";

export default function Contact() {
  const { storeSettings } = useStore();

  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (sending) {
      return;
    }

    setSending(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const result = await submitToGoogleForm(
      GOOGLE_FORMS.contact.url,
      {
        [GOOGLE_FORMS.contact.fields.name]:
          formData.get("name"),

        [GOOGLE_FORMS.contact.fields.phone]:
          formData.get("phone"),

        [GOOGLE_FORMS.contact.fields.message]:
          formData.get("message"),
      }
    );

    setSending(false);

    if (result.success) {
      setSubmitted(true);
    } else {
      alert(
        "We couldn't send your message. Please try again."
      );
    }
  }

  return (
    <main className="contact-page">

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="contact-hero">

        <div className="contact-orb contact-orb-one"></div>
        <div className="contact-orb contact-orb-two"></div>

        <span className="contact-sparkle contact-sparkle-one">
          &#10022;
        </span>

        <span className="contact-sparkle contact-sparkle-two">
          &#10023;
        </span>


        <div className="contact-hero-content">

          {/* BRAND LOGO */}

          <div className="contact-hero-logo">
            <img
              src="/logo.png"
              alt={storeSettings.storeName}
            />
          </div>


          <p className="eyebrow">
            {storeSettings.storeName.toUpperCase()} CONNECT
          </p>


          <h1>
            Let's talk
            <br />
            <em>beauty.</em>
          </h1>


          <p>
            Have a question, need help choosing a fragrance,
            or simply want to know more? We'd love to hear
            from you.
          </p>

        </div>

      </section>


      {/* =====================================================
          CONTACT AREA
      ===================================================== */}

      <section className="contact-main">

        <div className="contact-info">

          <div className="contact-section-label">
            <span>01</span>
            <p>GET IN TOUCH</p>
          </div>

          <h2>
            A little
            <br />
            <em>conversation.</em>
          </h2>

          <p className="contact-intro">
            Whether you're looking for your next signature
            scent, checking an order, or simply curious
            about {storeSettings.storeName}, feel free to reach out.
          </p>


          <div className="contact-methods">

                      <div className="contact-social-actions">

            {storeSettings.whatsappEnabled && storeSettings.whatsappNumber && (
              <a
                href={`https://wa.me/${String(
                  storeSettings.whatsappNumber
                ).replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-social-button whatsapp-button"
              >
                <span className="contact-social-icon">
                  ◉
                </span>

                <span className="contact-social-copy">
                  <strong>
                    Chat with us on WhatsApp
                  </strong>

                  <small>
                    Quick support & orders
                  </small>
                </span>

                <span className="contact-social-arrow">
                  →
                </span>
              </a>
            )}

          </div>

<a
              href={storeSettings.messengerUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-method contact-method-link"
            >

              <div className="contact-method-icon">
                &#10022;
              </div>

              <div>
                <span>MESSENGER</span>
                <strong>{storeSettings.storeName}</strong>
                <small>Fastest way to reach us</small>
              </div>

            </a>


            <div className="contact-method">

              <div className="contact-method-icon">
                &#9671;
              </div>

              <div>
                <span>ORDERS</span>
                <strong>Cash on Delivery</strong>
                <small>Available in selected areas</small>
              </div>

            </div>


            <div className="contact-method">

              <div className="contact-method-icon">
                &#9825;
              </div>

              <div>
                <span>PICKUP</span>
                <strong>Selected Locations</strong>
                <small>Pickup availability may vary</small>
              </div>

            </div>


            {storeSettings.phone && (
              <div className="contact-method">

                <div className="contact-method-icon">
                  &#9742;
                </div>

                <div>
                  <span>PHONE</span>
                  <strong>{storeSettings.phone}</strong>
                  <small>Call or message us</small>
                </div>

              </div>
            )}


            {storeSettings.email && (
              <div className="contact-method">

                <div className="contact-method-icon">
                  &#9993;
                </div>

                <div>
                  <span>EMAIL</span>
                  <strong>{storeSettings.email}</strong>
                  <small>Send us an email</small>
                </div>

              </div>
            )}

          </div>

        </div>

      </section>


      {/* =====================================================
          FINAL CTA
      ===================================================== */}

      <section className="contact-final">

        <div className="contact-final-pearl">
          <span>&#10022;</span>
        </div>
          <span>&#10022;</span>
        <p className="eyebrow">
          READY TO DISCOVER?
        </p>

        <h2>
          Your next favorite
          <br />
          <em>might be waiting.</em>
        </h2>

        <a
          href="/shop"
          className="hero-button"
        >
          Explore Collection<span>&#8594;</span>
        </a>

      </section>

    </main>
  );
}



















