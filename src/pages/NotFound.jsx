import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import PearlOrb from "../components/PearlOrb";

export default function NotFound() {
  return (
    <section className="section not-found">
      <PearlOrb size={160} parallax={false} />
      <span className="eyebrow">404</span>
      <h1>This page slipped away.</h1>
      <p>The page you're looking for doesn't exist, or has moved.</p>
      <Link className="btn dark" to="/">
        Back to home <ArrowRight size={15} />
      </Link>
    </section>
  );
}
