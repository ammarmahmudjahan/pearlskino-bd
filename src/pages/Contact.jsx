import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, Mail, MapPin, MessageCircle, Share2 } from "lucide-react";
import SectionHeading from "../components/SectionHeading";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <section className="section contact-page">
      <SectionHeading eyebrow="Get in touch" title="We're a message away." desc="Orders are handled via Messenger, but this form reaches the same inbox." />
      <div className="contact-grid">
        <motion.form
          className="checkout-form"
          onSubmit={submit}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <label>
            Name
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Message
            <textarea
              required
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </label>
          <button className="btn dark wide" type="submit">
            {sent ? (
              <>
                Message sent <Check size={15} />
              </>
            ) : (
              "Send message"
            )}
          </button>
        </motion.form>

        <motion.div
          className="contact-cards"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="contact-card">
            <MessageCircle size={18} />
            <b>Messenger</b>
            <small>Fastest way to reach us — order taking happens here.</small>
          </div>
          <div className="contact-card">
            <Mail size={18} />
            <b>hello@pearlskino.bd</b>
            <small>For anything that needs a paper trail.</small>
          </div>
          <div className="contact-card">
            <MapPin size={18} />
            <b>Bangladesh, nationwide</b>
            <small>Free pickup available in selected metropolitan areas.</small>
          </div>
          <div className="contact-social">
            <a href="#" aria-label="Facebook page">
              F
            </a>
            <a href="#" aria-label="Instagram page">
              <Share2 size={15} />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
