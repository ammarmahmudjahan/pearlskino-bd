import React, { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!email) return;
    setSent(true);
    setEmail("");
  };

  return (
    <section className="newsletter">
      <div>
        <span className="eyebrow">The PearlSkino Letter</span>
        <h2>A little beauty, delivered.</h2>
        <p>New drops, fragrance finds and quiet little offers. No noise, unsubscribe anytime.</p>
      </div>
      <form onSubmit={submit}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
        />
        <button className="btn dark" type="submit">
          {sent ? (
            <>
              Joined <Check size={15} />
            </>
          ) : (
            <>
              Join the edit <ArrowRight size={15} />
            </>
          )}
        </button>
      </form>
    </section>
  );
}
