
import React from "react";
import { Link } from "react-router-dom";

export default function About() {
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

          {/* BRAND LOGO */}

          <div className="about-hero-logo">
            <img
              src="/logo.png"
              alt="PearlSkino BD"
            />
          </div>


          <p className="eyebrow">
            THE PEARLSKINO STORY
          </p>


          <h1>
            Beauty should feel
            <br />
            <em>beautiful.</em>
          </h1>


          <p className="about-hero-text">
            PearlSkino BD is a curated beauty and fragrance
            destination created for people who believe that
            the little details make all the difference.
          </p>


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
          <p>OUR BEGINNING</p>
        </div>

        <div className="about-intro-content">

          <h2>
            More than a store.
            <br />
            <em>A feeling.</em>
          </h2>

          <div className="about-intro-copy">

            <p>
              PearlSkino BD began with a simple idea:
              discovering something beautiful should never
              feel ordinary.
            </p>

            <p>
              We curate fragrances and beauty essentials
              with attention to authenticity, quality and
              the experience they create.
            </p>

            <p>
              Every product is chosen with the intention of
              helping you find something that feels
              uniquely yours.
            </p>

          </div>

        </div>

      </section>


      {/* =====================================================
          PHILOSOPHY
      ===================================================== */}

      <section className="about-philosophy">

        <div className="about-section-heading">

          <p className="eyebrow">
            OUR PHILOSOPHY
          </p>

          <h2>
            Curated with
            <br />
            <em>intention.</em>
          </h2>

          <p>
            We keep things thoughtful, simple and personal.
          </p>

        </div>


        <div className="about-values">

          <article className="about-value-card">

            <div className="about-value-number">
              01
            </div>

            <div className="about-value-icon">
              ✦
            </div>

            <h3>
              Authentic
            </h3>

            <p>
              We believe beauty begins with trust.
              Authentic products and honest presentation
              are at the heart of PearlSkino.
            </p>

          </article>


          <article className="about-value-card featured">

            <div className="about-value-number">
              02
            </div>

            <div className="about-value-icon">
              ◌
            </div>

            <h3>
              Curated
            </h3>

            <p>
              Instead of endless choices, we focus on
              products worth discovering — selected for
              character, quality and everyday appeal.
            </p>

          </article>


          <article className="about-value-card">

            <div className="about-value-number">
              03
            </div>

            <div className="about-value-icon">
              ♡
            </div>

            <h3>
              Personal
            </h3>

            <p>
              Your fragrance and beauty routine should
              reflect you. We want every discovery to feel
              personal and memorable.
            </p>

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

        <p className="eyebrow">
          THE PEARLSKINO PROMISE
        </p>

        <h2>
          Find something
          <br />
          <em>worth keeping.</em>
        </h2>

        <p>
          From the first impression to the final detail,
          we want your PearlSkino experience to feel
          effortless, elegant and distinctly yours.
        </p>

      </section>


      {/* =====================================================
          BRAND DETAILS
      ===================================================== */}

      <section className="about-details">

        <div className="about-detail">

          <span className="about-detail-symbol">
            ✧
          </span>

          <div>
            <span className="about-detail-label">
              BEAUTY
            </span>

            <h3>
              Everyday elegance
            </h3>

            <p>
              Beautiful products that fit naturally
              into your everyday life.
            </p>
          </div>

        </div>


        <div className="about-detail">

          <span className="about-detail-symbol">
            ◇
          </span>

          <div>
            <span className="about-detail-label">
              FRAGRANCE
            </span>

            <h3>
              Scents with character
            </h3>

            <p>
              Fragrances selected to help you discover
              something that feels like you.
            </p>
          </div>

        </div>


        <div className="about-detail">

          <span className="about-detail-symbol">
            ✦
          </span>

          <div>
            <span className="about-detail-label">
              EXPERIENCE
            </span>

            <h3>
              Thoughtfully yours
            </h3>

            <p>
              A shopping experience designed around
              simplicity, beauty and trust.
            </p>
          </div>

        </div>

      </section>


      {/* =====================================================
          CTA
      ===================================================== */}

      <section className="about-cta">

        <div className="about-cta-glow"></div>

        <p className="eyebrow">
          YOUR NEXT DISCOVERY
        </p>

        <h2>
          Something beautiful
          <br />
          <em>is waiting.</em>
        </h2>

        <p>
          Explore our collection and discover your
          next favorite.
        </p>

        <Link
          to="/shop"
          className="hero-button"
        >
          Explore Collection
          <span>→</span>
        </Link>

      </section>

    </main>
  );
}
