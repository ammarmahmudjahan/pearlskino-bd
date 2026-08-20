import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="home">

      <section className="hero">

        <div className="pearl pearl-1"></div>
        <div className="pearl pearl-2"></div>
        <div className="pearl pearl-3"></div>


        <div className="hero-content">

          <p className="eyebrow">
            PEARLSKINO BD
          </p>


          <h1>
            Your glow,
            <br />
            <span>your story.</span>
          </h1>


          <p className="hero-text">
            Discover carefully selected skincare and fragrances
            designed to make every day feel a little more beautiful.
          </p>


          <div className="hero-buttons">

            <Link
              to="/shop"
              className="hero-button"
            >
              Explore Collection
            </Link>


            <Link
              to="/about"
              className="hero-button secondary"
            >
              Our Story
            </Link>

          </div>

        </div>

      </section>


      <section className="intro">

        <p className="eyebrow">
          CURATED WITH CARE
        </p>


        <h2>
          Beauty that feels like you.
        </h2>


        <p>
          Premium skincare, beautiful fragrances and everyday essentials —
          thoughtfully selected for PearlSkino BD.
        </p>

      </section>

    </main>
  );
}