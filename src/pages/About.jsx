import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import PearlOrb from "../components/PearlOrb";
import SectionHeading from "../components/SectionHeading";
import { BENEFITS, BRAND_STORY, TESTIMONIALS } from "../data/site";

const rev = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.55 },
};

export default function About() {
  return (
    <>
      <section className="page-hero">
        <motion.div {...rev}>
          <span className="eyebrow">{BRAND_STORY.eyebrow}</span>
          <h1>{BRAND_STORY.heading}</h1>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}>
          <PearlOrb size={200} parallax={false} />
        </motion.div>
      </section>

      <section className="section about-body">
        {BRAND_STORY.paragraphs.map((p, i) => (
          <motion.p key={i} {...rev} transition={{ duration: 0.55, delay: i * 0.08 }}>
            {p}
          </motion.p>
        ))}
      </section>

      <section className="section">
        <SectionHeading eyebrow="Why customers stay" title="What we hold ourselves to." align="center" />
        <div className="benefit-grid">
          {BENEFITS.map((b) => (
            <motion.div key={b.title} className="benefit-card" {...rev}>
              <ShieldCheck size={22} />
              <b>{b.title}</b>
              <small>{b.small}</small>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="center">
          <span className="eyebrow">In their words</span>
          <h2>What Bangladesh is saying.</h2>
        </div>
        <div className="reviews-grid">
          {TESTIMONIALS.map((t, idx) => (
            <motion.div key={idx} className="review" {...rev} transition={{ duration: 0.5, delay: idx * 0.06 }}>
              <div>★★★★★</div>
              <blockquote>&ldquo;{t.quote}&rdquo;</blockquote>
              <small>
                — {t.name}, {t.role}
              </small>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <motion.div {...rev}>
          <h2>Ready to find your routine?</h2>
          <Link className="btn dark" to="/shop">
            Shop the edit <ArrowRight size={15} />
          </Link>
        </motion.div>
      </section>
    </>
  );
}
