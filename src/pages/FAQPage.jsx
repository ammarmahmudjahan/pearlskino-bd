import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import SectionHeading from "../components/SectionHeading";
import { FAQ } from "../data/site";

export default function FAQPage() {
  const [open, setOpen] = useState(0);

  return (
    <section className="section faq-page">
      <SectionHeading eyebrow="Questions, answered" title="Everything you need to know." align="center" />
      <div className="faq-list">
        {FAQ.map((f, i) => (
          <div key={i} className="faq-item">
            <button onClick={() => setOpen(open === i ? -1 : i)}>
              {f.q}
              <ChevronDown size={16} style={{ transform: open === i ? "rotate(180deg)" : "none" }} />
            </button>
            {open === i && <p>{f.a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
