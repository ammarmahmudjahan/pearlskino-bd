import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown, ShieldCheck, Sparkles, Truck } from "lucide-react";
import PearlOrb from "../components/PearlOrb";
import ProductCard from "../components/ProductCard";
import SectionHeading from "../components/SectionHeading";
import Newsletter from "../components/Newsletter";
import { PRODUCTS } from "../data/products";
import { BENEFITS, BRAND_STORY, FAQ, TESTIMONIALS } from "../data/site";

const rev = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.6 },
};

export default function Home() {
  const bestsellers = useMemo(() => PRODUCTS.filter((p) => p.tags.includes("Bestseller")).slice(0, 6), []);
  const [faqOpen, setFaqOpen] = useState(0);
  const [end, setEnd] = useState(Date.now() + 7 * 3600000 + 41 * 60000);

  useEffect(() => {
    const i = setInterval(() => setEnd((x) => Math.max(0, x - 1000)), 1000);
    return () => clearInterval(i);
  }, []);

  const remain = Math.max(0, end - Date.now());
  const hh = String(Math.floor(remain / 3600000)).padStart(2, "0");
  const mm = String(Math.floor((remain % 3600000) / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remain % 60000) / 1000)).padStart(2, "0");

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <motion.div {...rev}>
            <div className="badge">
              <i />
              100% Authentic Products <b>in Bangladesh</b>
            </div>
            <span className="eyebrow">PEARLSKINO BD · BEAUTY &amp; FRAGRANCE EDIT</span>
            <h1>
              Find your <em>signature</em> glow.
            </h1>
            <p>
              Curated skincare and fragrance, sourced with paperwork we can stand behind — and delivered
              across Bangladesh like the serious brand it deserves to be treated as.
            </p>
            <div className="ctas">
              <Link className="btn dark" to="/shop">
                Shop the edit <ArrowRight size={15} />
              </Link>
              <Link className="btn glass" to="/about">
                Our story
              </Link>
            </div>
            <div className="proof">
              <span>
                <ShieldCheck size={15} /> Verified authentic
              </span>
              <span>
                <Truck size={15} /> Nationwide delivery
              </span>
              <span>
                <Sparkles size={15} /> 4.8★ average rating
              </span>
            </div>
          </motion.div>
          <motion.div
            className="hero-orb-wrap"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.15 }}
          >
            <PearlOrb size={440} />
            <div className="hero-floating hero-floating-a">
              <strong>4.9★</strong>
              <small>Centella Ampoule</small>
            </div>
            <div className="hero-floating hero-floating-b">
              <strong>SPF50+</strong>
              <small>Zero white cast</small>
            </div>
          </motion.div>
        </div>
        <button
          className="scroll-hint"
          onClick={() => window.scrollTo({ top: window.innerHeight * 0.86, behavior: "smooth" })}
          aria-label="Scroll down"
        >
          <ChevronDown size={18} />
        </button>
      </section>

      <div className="sale-wrap">
        <motion.div className="sale" {...rev}>
          <div>
            <span className="eyebrow">LIMITED-TIME</span>
            <h3>Buy any 3, unlock a special discount.</h3>
            <p>Mix skincare and fragrance freely — the discount applies automatically at checkout.</p>
          </div>
          <div className="count">
            <div>
              <b>{hh}</b>
              <span>HRS</span>
            </div>
            <div>
              <b>{mm}</b>
              <span>MIN</span>
            </div>
            <div>
              <b>{ss}</b>
              <span>SEC</span>
            </div>
          </div>
          <Link to="/shop" aria-label="Shop the sale">
            <ArrowRight size={16} />
          </Link>
        </motion.div>
      </div>

      <div className="trust">
        {BENEFITS.map((b) => (
          <span key={b.title}>{b.title}</span>
        ))}
      </div>

      <section className="section">
        <SectionHeading
          eyebrow="Shop by category"
          title="Two worlds, one edit."
          desc="Skincare built around real routines, and fragrance decants sized for discovery."
        />
        <div className="categories">
          <Link to="/shop?category=serums" className="category">
            <img src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1000&q=85" alt="Skincare serums" />
            <div>
              <small>Skincare</small>
              <b>Cleansers &amp; serums</b>
              <ArrowRight size={16} />
            </div>
          </Link>
          <Link to="/shop?category=fragrance" className="category">
            <img src="https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1000&q=85" alt="Fragrance decants" />
            <div>
              <small>Fragrance</small>
              <b>Decants</b>
              <ArrowRight size={16} />
            </div>
          </Link>
          <Link to="/shop?category=suncare" className="category">
            <img src="https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=1000&q=85" alt="Suncare" />
            <div>
              <small>Suncare</small>
              <b>SPF, done right</b>
              <ArrowRight size={16} />
            </div>
          </Link>
        </div>
      </section>

      <section className="section">
        <SectionHeading
          eyebrow="Fan favourites"
          title="Bestsellers this month."
          desc="The routines and scents our customers keep reordering."
        >
          <Link className="btn glass heading-link" to="/shop">
            View all <ArrowRight size={14} />
          </Link>
        </SectionHeading>
        <div className="grid">
          {bestsellers.map((p, i) => (
            <ProductCard key={p.id} p={p} index={i} />
          ))}
        </div>
      </section>

      <section className="section story">
        <motion.div className="story-img" {...rev}>
          <img
            src="https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1000&q=85"
            alt="PearlSkino BD curated products"
          />
          <span>
            Curated
            <br />
            since day one
          </span>
        </motion.div>
        <motion.div {...rev}>
          <span className="eyebrow">{BRAND_STORY.eyebrow}</span>
          <h2>{BRAND_STORY.heading}</h2>
          <p>{BRAND_STORY.paragraphs[0]}</p>
          <div className="benefits">
            {BENEFITS.map((b) => (
              <div key={b.title}>
                <ShieldCheck size={17} />
                <b>
                  {b.title}
                  <small>{b.small}</small>
                </b>
              </div>
            ))}
          </div>
          <Link className="btn dark" to="/about" style={{ marginTop: 28 }}>
            Read our full story <ArrowRight size={15} />
          </Link>
        </motion.div>
      </section>

      <section className="section">
        <div className="center">
          <span className="eyebrow">LOVE NOTES</span>
          <h2>From the community.</h2>
        </div>
        <div className="reviews-grid">
          {TESTIMONIALS.slice(0, 3).map((t, idx) => (
            <motion.div key={idx} className="review" {...rev} transition={{ duration: 0.5, delay: idx * 0.08 }}>
              <div>★★★★★</div>
              <blockquote>&ldquo;{t.quote}&rdquo;</blockquote>
              <small>
                — {t.name}, {t.role}
              </small>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="faq" className="section faq">
        <div>
          <span className="eyebrow">QUESTIONS, ANSWERED</span>
          <h2>Need to know?</h2>
          <p>Everything important before your order leaves the PearlSkino studio.</p>
          <Link className="btn glass" to="/faq" style={{ marginTop: 18 }}>
            See full FAQ <ArrowRight size={14} />
          </Link>
        </div>
        <div>
          {FAQ.slice(0, 5).map((f, i) => (
            <div key={i} className="faq-item">
              <button onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}>
                {f.q}
                <ChevronDown size={16} style={{ transform: faqOpen === i ? "rotate(180deg)" : "none" }} />
              </button>
              {faqOpen === i && <p>{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      <Newsletter />
    </>
  );
}
