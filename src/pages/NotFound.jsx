import { Link } from "react-router-dom";

import { useSeo } from "../hooks/useSeo";
import T from "../content/T";

export default function NotFound() {
  useSeo({ title: "Page not found", noindex: true });

  return (
    <main className="notfound-page page">
      <section className="notfound-card">
        <span className="notfound-orb" aria-hidden="true"></span>

        <T k="notfound.eyebrow" as="p" className="eyebrow" />
        <T k="notfound.title" as="h1" />
        <T k="notfound.text" as="p" />

        <Link to="/" className="hero-button">
          <T k="notfound.button" />
          <span>&#8594;</span>
        </Link>
      </section>
    </main>
  );
}
