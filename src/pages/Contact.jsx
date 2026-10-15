import { useState } from "react";
import { Link } from "react-router-dom";

import { useStore } from "../context/StoreContext";
import { useCustomer } from "../context/CustomerContext";
import { useContent } from "../content/context";
import { useSeo } from "../hooks/useSeo";
import { sendContact } from "../lib/sendContact";
import T, { useText } from "../content/T";
import EditViewSwitch from "../components/EditViewSwitch";

export default function Contact() {
  const { storeSettings } = useStore();
  const { account } = useCustomer();
  const content = useContent();

  useSeo({ page: "contact" });

  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [trap, setTrap] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [editView, setEditView] = useState("form");

  const ph = {
    name: useText("contact.ph.name"),
    phone: useText("contact.ph.phone"),
    email: useText("contact.ph.email"),
    message: useText("contact.ph.message"),
  };

  const showSent = content.isEditing ? editView === "sent" : sent;

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (sending) return;

    setError("");
    setSending(true);

    try {
      await sendContact({
        name: form.name,
        phone: form.phone || account?.phone || "",
        email: form.email || account?.email || "",
        message: form.message,
        hp: trap,
      });

      setSent(true);
      setForm({ name: "", phone: "", email: "", message: "" });
    } catch (problem) {
      setError(problem.message || "We could not send your message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const s = storeSettings;
  const brand = s.storeName || "PearlSkino BD";

  return (
    <main className="contact-page">
      <section className="contact-hero">
        <div className="contact-orb contact-orb-one"></div>
        <div className="contact-orb contact-orb-two"></div>

        <span className="contact-sparkle contact-sparkle-one">&#10022;</span>
        <span className="contact-sparkle contact-sparkle-two">&#10023;</span>

        <div className="contact-hero-content">
          <T k="contact.eyebrow" as="p" className="eyebrow" />

          <T k="contact.title" as="h1" />

          <T k="contact.text" as="p" />
        </div>
      </section>

      <section className="contact-main">
        <div className="contact-info">
          <div className="contact-section-label">
            <span>01</span>
            <T k="contact.label" as="p" />
          </div>

          <T k="contact.heading" as="h2" />

          <T k="contact.intro" as="p" className="contact-intro" />

          <div className="contact-methods">
            {s.whatsappEnabled && s.whatsappUrl && (
              <div className="contact-social-actions">
                <a
                  href={s.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-social-button whatsapp-button"
                >
                  <span className="contact-social-icon">◉</span>

                  <span className="contact-social-copy">
                    <strong>
                      <T k="contact.wa.title" />
                    </strong>

                    <small>
                      <T k="contact.wa.sub" />
                    </small>
                  </span>

                  <span className="contact-social-arrow">→</span>
                </a>
              </div>
            )}

            {s.messengerEnabled !== false && s.messengerUrl && (
              <a href={s.messengerUrl} target="_blank" rel="noopener noreferrer" className="contact-method contact-method-link">
                <div className="contact-method-icon">&#10022;</div>

                <div>
                  <T k="contact.messenger.tag" as="span" />
                  <strong>{brand}</strong>
                  <T k="contact.messenger.sub" as="small" />
                </div>
              </a>
            )}

            {s.facebookUrl && (
              <a href={s.facebookUrl} target="_blank" rel="noopener noreferrer" className="contact-method contact-method-link">
                <div className="contact-method-icon">f</div>

                <div>
                  <T k="contact.facebook.tag" as="span" />
                  <strong>{brand}</strong>
                  <T k="contact.facebook.sub" as="small" />
                </div>
              </a>
            )}

            {s.instagramUrl && (
              <a href={s.instagramUrl} target="_blank" rel="noopener noreferrer" className="contact-method contact-method-link">
                <div className="contact-method-icon">&#9675;</div>

                <div>
                  <T k="contact.instagram.tag" as="span" />
                  <strong>{brand}</strong>
                  <T k="contact.instagram.sub" as="small" />
                </div>
              </a>
            )}

            {s.codEnabled && (
              <div className="contact-method">
                <div className="contact-method-icon">&#9671;</div>

                <div>
                  <T k="contact.orders.tag" as="span" />
                  <T k="contact.orders.title" as="strong" />
                  <T k="contact.orders.sub" as="small" />
                </div>
              </div>
            )}

            {s.pickupEnabled && (
              <div className="contact-method">
                <div className="contact-method-icon">&#9825;</div>

                <div>
                  <T k="contact.pickup.tag" as="span" />
                  <T k="contact.pickup.title" as="strong" />
                  <T k="contact.pickup.sub" as="small" />
                </div>
              </div>
            )}

            {s.phone && (
              <a href={`tel:${s.phone}`} className="contact-method contact-method-link">
                <div className="contact-method-icon">&#9742;</div>

                <div>
                  <T k="contact.phone.tag" as="span" />
                  <strong>{s.phone}</strong>
                  <T k="contact.phone.sub" as="small" />
                </div>
              </a>
            )}

            {s.email && (
              <a href={`mailto:${s.email}`} className="contact-method contact-method-link">
                <div className="contact-method-icon">&#9993;</div>

                <div>
                  <T k="contact.email.tag" as="span" />
                  <strong>{s.email}</strong>
                  <T k="contact.email.sub" as="small" />
                </div>
              </a>
            )}

            {s.storeAddress && (
              <div className="contact-method">
                <div className="contact-method-icon">&#9906;</div>

                <div>
                  <T k="contact.address.tag" as="span" />
                  <strong>{s.storeAddress}</strong>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ----- message form ----- */}
        <div className="contact-form-card">
          <div className="contact-card-decoration">
            <span>&#10022;</span>
            <span>&#10023;</span>
          </div>

          <EditViewSwitch
            views={[
              ["form", "Message form"],
              ["sent", "After sending"],
            ]}
            value={editView}
            onChange={setEditView}
          />

          {showSent ? (
            <div className="contact-success">
              <div className="contact-success-pearl">&#10022;</div>

              <T k="contact.ok.eyebrow" as="p" className="eyebrow" />

              <T k="contact.ok.title" as="h3" />

              <T k="contact.ok.text" as="p" />

              <button type="button" className="contact-reset" onClick={() => setSent(false)}>
                <T k="contact.ok.again" />
              </button>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit} noValidate>
              <div className="contact-form-heading">
                <T k="contact.form.title" as="h3" />
              </div>

              <label>
                <T k="contact.f.name" as="span" />
                <input
                  name="name"
                  value={form.name}
                  onChange={change}
                  placeholder={ph.name}
                  autoComplete="name"
                  required
                />
              </label>

              <label>
                <T k="contact.f.phone" as="span" />
                <input
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={change}
                  placeholder={ph.phone}
                  autoComplete="tel"
                />
              </label>

              <label>
                <T k="contact.f.email" as="span" />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={change}
                  placeholder={ph.email}
                  autoComplete="email"
                />
              </label>

              <T k="contact.f.hint" as="p" className="contact-hint" />

              <label>
                <T k="contact.f.message" as="span" />
                <textarea
                  name="message"
                  value={form.message}
                  onChange={change}
                  placeholder={ph.message}
                  rows={5}
                  maxLength={2000}
                  required
                />
              </label>

              {/* spam trap: people never see this */}
              <input
                className="hp-field"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={trap}
                onChange={(event) => setTrap(event.target.value)}
              />

              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="contact-submit" disabled={sending}>
                <T k={sending ? "contact.sending" : "contact.submit"} as="span" className="contact-submit-label" />
                <span>&#8594;</span>
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="contact-final">
        <div className="contact-final-pearl">
          <span>&#10022;</span>
        </div>

        <T k="contact.final.eyebrow" as="p" className="eyebrow" />

        <T k="contact.final.title" as="h2" />

        <Link to="/shop" className="hero-button">
          <T k="contact.final.button" />
          <span>&#8594;</span>
        </Link>
      </section>
    </main>
  );
}
