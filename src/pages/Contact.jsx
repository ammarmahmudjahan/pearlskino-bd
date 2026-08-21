
import React, { useState } from "react";

import { GOOGLE_FORMS } from "../config/googleForms";
import { submitToGoogleForm } from "../utils/googleForms";

export default function Contact() {
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
          ✦
        </span>

        <span className="contact-sparkle contact-sparkle-two">
          ✧
        </span>


        <div className="contact-hero-content">

          {/* BRAND LOGO */}

          <div className="contact-hero-logo">
            <img
              src="/logo.png"
              alt="PearlSkino BD"
            />
          </div>


          <p className="eyebrow">
            PEARLSKINO BD
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
            about PearlSkino BD, feel free to reach out.
          </p>


          <div className="contact-methods">

            <div className="contact-method">

              <div className="contact-method-icon">
                ✦
              </div>

              <div>
                <span>MESSENGER</span>
                <strong>PearlSkino BD</strong>
                <small>Fastest way to reach us</small>
              </div>

            </div>


            <div className="contact-method">

              <div className="contact-method-icon">
                ◇
              </div>

              <div>
                <span>ORDERS</span>
                <strong>Cash on Delivery</strong>
                <small>Available in selected areas</small>
              </div>

            </div>


            <div className="contact-method">

              <div className="contact-method-icon">
                ♡
              </div>

              <div>
                <span>PICKUP</span>
                <strong>Selected Locations</strong>
                <small>Pickup availability may vary</small>
              </div>

            </div>

          </div>

        </div>


        {/* RIGHT SIDE — FORM */}

        <div className="contact-form-card">

          <div className="contact-card-decoration">
            <span>✦</span>
            <span>✧</span>
          </div>

          {!submitted ? (

            <form
              className="contact-form"
              onSubmit={handleSubmit}
            >

              <div className="contact-form-heading">

                <p className="eyebrow">
                  SEND A MESSAGE
                </p>

                <h3>
                  How can we
                  <em> help?</em>
                </h3>

              </div>


              <label>
                <span>Your Name</span>

                <input
                  type="text"
                  name="name"
                  placeholder="Your name"
                  required
                  disabled={sending}
                />
              </label>


              <label>
                <span>Phone Number</span>

                <input
                  type="tel"
                  name="phone"
                  placeholder="01XXXXXXXXX"
                  required
                  disabled={sending}
                />
              </label>


              <label>
                <span>Your Message</span>

                <textarea
                  name="message"
                  rows="5"
                  placeholder="Tell us what you're looking for..."
                  required
                  disabled={sending}
                />
              </label>


              <button
                type="submit"
                className="contact-submit"
                disabled={sending}
              >
                {sending
                  ? "Sending..."
                  : "Send Message"}

                <span>
                  {sending ? "…" : "→"}
                </span>
              </button>

            </form>

          ) : (

            <div className="contact-success">

              <div className="contact-success-pearl">
                ✦
              </div>

              <p className="eyebrow">
                MESSAGE RECEIVED
              </p>

              <h3>
                Thank you.
                <br />
                <em>We'll be in touch.</em>
              </h3>

              <p>
                Your message has been received.
                We appreciate you reaching out to
                PearlSkino BD.
              </p>

              <button
                type="button"
                className="contact-reset"
                onClick={() => setSubmitted(false)}
              >
                Send Another Message
              </button>

            </div>

          )}

        </div>

      </section>


      {/* =====================================================
          EXPERIENCE STRIP
      ===================================================== */}

      <section className="contact-experience">

        <div className="contact-experience-heading">

          <p className="eyebrow">
            THE PEARLSKINO EXPERIENCE
          </p>

          <h2>
            Thoughtful from
            <br />
            <em>start to finish.</em>
          </h2>

        </div>


        <div className="contact-experience-grid">

          <div>
            <span>01</span>
            <h3>Ask freely.</h3>
            <p>
              Not sure which fragrance suits you?
              We're happy to help you explore.
            </p>
          </div>

          <div>
            <span>02</span>
            <h3>Choose confidently.</h3>
            <p>
              We focus on carefully selected products
              and a straightforward shopping experience.
            </p>
          </div>

          <div>
            <span>03</span>
            <h3>Enjoy beautifully.</h3>
            <p>
              From discovery to delivery, every detail
              should feel effortless.
            </p>
          </div>

        </div>

      </section>


      {/* =====================================================
          FINAL CTA
      ===================================================== */}

      <section className="contact-final">

        <div className="contact-final-pearl">
          <span>✦</span>
        </div>

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
          Explore Collection
          <span>→</span>
        </a>

      </section>

    </main>
  );
}
