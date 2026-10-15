import { useMemo, useState } from "react";

import { useCustomer } from "../context/CustomerContext";
import { useContent } from "../content/context";
import { useSeo } from "../hooks/useSeo";
import { fillVars, plainText, renderMarkup } from "../lib/markup";
import { sendContact } from "../lib/sendContact";
import T, { useText, useList, ListEditTrigger } from "../content/T";
import EditViewSwitch from "../components/EditViewSwitch";

export default function FAQ() {
  const { account } = useCustomer();
  const content = useContent();

  const allWord = useText("faq.all") || "ALL";
  const items = useList("faq.items").filter((item) => item.question && item.answer);

  const [active, setActive] = useState("");
  const [openIndex, setOpenIndex] = useState(null);

  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [trap, setTrap] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [editView, setEditView] = useState("form");

  const ph = {
    name: useText("faq.ph.name"),
    phone: useText("faq.ph.phone"),
    message: useText("faq.ph.message"),
  };

  /* tabs come from the categories the owner typed */
  const categories = useMemo(() => {
    const seen = [];

    items.forEach((item) => {
      const name = String(item.category || "").trim().toUpperCase();
      if (name && !seen.includes(name)) seen.push(name);
    });

    return seen;
  }, [items]);

  const current = active && categories.includes(active) ? active : "";
  const visible = current
    ? items.filter((item) => String(item.category || "").trim().toUpperCase() === current)
    : items;

  /* Google can show these questions directly in search results */
  const jsonLd = useMemo(
    () =>
      items.length
        ? {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.map((item) => ({
              "@type": "Question",
              name: plainText(item.question, content.baseVars),
              acceptedAnswer: {
                "@type": "Answer",
                text: plainText(item.answer, content.baseVars),
              },
            })),
          }
        : null,
    [items, content.baseVars]
  );

  useSeo({ page: "faq", jsonLd });

  const showSent = content.isEditing ? editView === "sent" : sent;

  function change(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
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
        email: account?.email || "",
        message: form.message,
        hp: trap,
      });

      setSent(true);
      setForm({ name: "", phone: "", message: "" });
    } catch (problem) {
      setError(problem.message || "We could not send your message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="faq-page page">
      <section className="faq-hero">
        <span className="faq-orb faq-orb-one" aria-hidden="true"></span>
        <span className="faq-orb faq-orb-two" aria-hidden="true"></span>

        <T k="faq.eyebrow" as="p" className="eyebrow" />

        <T k="faq.title" as="h1" />

        <T k="faq.text" as="p" className="faq-hero-text" />
      </section>

      <section className="faq-body pk-list-host">
        <ListEditTrigger k="faq.items" label="Edit questions & answers" />

        {categories.length > 1 && (
          <div className="faq-tabs" role="tablist" aria-label="Question categories">
            {["", ...categories].map((name) => {
              const on = current === name;

              return (
                <button
                  key={name || "all"}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  className={`faq-tab${on ? " on" : ""}`}
                  onClick={() => {
                    setActive(name);
                    setOpenIndex(null);
                  }}
                >
                  {name || allWord}
                </button>
              );
            })}
          </div>
        )}

        <div className="faq-list">
          {visible.map((item, index) => {
            const open = openIndex === index;
            const panelId = `faq-panel-${index}`;

            return (
              <div key={`${current}-${index}`} className={`faq-item${open ? " open" : ""}`}>
                <button
                  type="button"
                  className="faq-question"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(open ? null : index)}
                >
                  <span className="faq-num">{String(index + 1).padStart(2, "0")}</span>

                  <span className="faq-question-copy">
                    {item.category && <small>{String(item.category).toUpperCase()}</small>}
                    <strong>{fillVars(item.question, content.baseVars)}</strong>
                  </span>

                  <span className="faq-plus" aria-hidden="true">
                    +
                  </span>
                </button>

                <div className="faq-answer" id={panelId} role="region" aria-hidden={!open}>
                  <div className="faq-answer-clip">
                    <p>{renderMarkup(item.answer, content.baseVars)}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {!visible.length && <T k="faq.empty" as="p" className="faq-empty" />}
        </div>
      </section>

      <section className="faq-cta-wrap">
        <div className="faq-cta">
          <span className="faq-cta-star one" aria-hidden="true">
            &#10022;
          </span>
          <span className="faq-cta-star two" aria-hidden="true">
            &#10022;
          </span>

          <T k="faq.cta.eyebrow" as="p" className="eyebrow" />

          <T k="faq.cta.title" as="h2" />

          <T k="faq.cta.text" as="p" className="faq-cta-text" />

          <EditViewSwitch
            views={[
              ["form", "Help form"],
              ["sent", "After sending"],
            ]}
            value={editView}
            onChange={setEditView}
          />

          {showSent ? (
            <div className="contact-success faq-cta-form">
              <div className="contact-success-pearl">&#10022;</div>

              <T k="faq.ok.title" as="h3" />

              <T k="faq.ok.text" as="p" />
            </div>
          ) : (
            <form className="contact-form faq-cta-form" onSubmit={handleSubmit} noValidate>
              <div className="faq-form-row">
                <label>
                  <T k="faq.f.name" as="span" />
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
                  <T k="faq.f.phone" as="span" />
                  <input
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={change}
                    placeholder={ph.phone}
                    autoComplete="tel"
                    required
                  />
                </label>
              </div>

              <label>
                <T k="faq.f.message" as="span" />
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
                <T k={sending ? "faq.sending" : "faq.submit"} as="span" className="contact-submit-label" />
                <span aria-hidden="true">&#8594;</span>
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
