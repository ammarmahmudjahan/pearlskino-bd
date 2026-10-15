import { Link } from "react-router-dom";

import { useSeo } from "../hooks/useSeo";
import T from "../content/T";

export default function About() {
  useSeo({ page: "about" });

  return (
    <main className="about-page">
      {/* =====================================================
          ABOUT HERO
      ===================================================== */}

      <section className="about-hero">
        {/* Decorative pearls */}

        <div className="about-pearl about-pearl-1">✦</div>
        <div className="about-pearl about-pearl-2"></div>
        <div className="about-pearl about-pearl-3"></div>

        <div className="about-sparkle sparkle-1">✦</div>
        <div className="about-sparkle sparkle-2">✧</div>
        <div className="about-sparkle sparkle-3">⋆</div>

        <div className="about-hero-content">
          <T k="about.eyebrow" as="p" className="eyebrow" />

          <T k="about.title" as="h1" />

          <T k="about.text" as="p" className="about-hero-text" />

          <div className="about-hero-line">
            <span></span>
            <i>✦</i>
            <span></span>
          </div>
        </div>
      </section>

      {/* =====================================================
          INTRO
      ===================================================== */}

      <section className="about-intro">
        <div className="about-intro-label">
          <span>01</span>
          <T k="about.intro.label" as="p" />
        </div>

        <div className="about-intro-content">
          <T k="about.intro.title" as="h2" />

          <div className="about-intro-copy">
            <T k="about.intro.p1" as="p" />
            <T k="about.intro.p2" as="p" />
            <T k="about.intro.p3" as="p" />
          </div>
        </div>
      </section>

      {/* =====================================================
          PHILOSOPHY
      ===================================================== */}

      <section className="about-philosophy">
        <div className="about-section-heading">
          <T k="about.phil.eyebrow" as="p" className="eyebrow" />

          <T k="about.phil.title" as="h2" />

          <T k="about.phil.text" as="p" />
        </div>

        <div className="about-values">
          <article className="about-value-card">
            <div className="about-value-number">01</div>
            <div className="about-value-icon">✦</div>
            <T k="about.v1.title" as="h3" />
            <T k="about.v1.text" as="p" />
          </article>

          <article className="about-value-card featured">
            <div className="about-value-number">02</div>
            <div className="about-value-icon">○</div>
            <T k="about.v2.title" as="h3" />
            <T k="about.v2.text" as="p" />
          </article>

          <article className="about-value-card">
            <div className="about-value-number">03</div>
            <div className="about-value-icon">♡</div>
            <T k="about.v3.title" as="h3" />
            <T k="about.v3.text" as="p" />
          </article>
        </div>
      </section>

      {/* =====================================================
          SIGNATURE STATEMENT
      ===================================================== */}

      <section className="about-statement">
        <div className="statement-pearl">
          <span>✦</span>
        </div>

        <T k="about.promise.eyebrow" as="p" className="eyebrow" />

        <T k="about.promise.title" as="h2" />

        <T k="about.promise.text" as="p" />
      </section>

      {/* =====================================================
          BRAND DETAILS
      ===================================================== */}

      <section className="about-details">
        <div className="about-detail">
          <span className="about-detail-symbol">✧</span>

          <div>
            <T k="about.d1.label" as="span" className="about-detail-label" />
            <T k="about.d1.title" as="h3" />
            <T k="about.d1.text" as="p" />
          </div>
        </div>

        <div className="about-detail">
          <span className="about-detail-symbol">‡</span>

          <div>
            <T k="about.d2.label" as="span" className="about-detail-label" />
            <T k="about.d2.title" as="h3" />
            <T k="about.d2.text" as="p" />
          </div>
        </div>

        <div className="about-detail">
          <span className="about-detail-symbol">✦</span>

          <div>
            <T k="about.d3.label" as="span" className="about-detail-label" />
            <T k="about.d3.title" as="h3" />
            <T k="about.d3.text" as="p" />
          </div>
        </div>
      </section>

      {/* =====================================================
          CTA
      ===================================================== */}

      <section className="about-cta">
        <div className="about-cta-glow"></div>

        <T k="about.cta.eyebrow" as="p" className="eyebrow" />

        <T k="about.cta.title" as="h2" />

        <T k="about.cta.text" as="p" />

        <Link to="/shop" className="hero-button">
          <T k="about.cta.button" />
          <span>→</span>
        </Link>
      </section>
    </main>
  );
}
