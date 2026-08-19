import React from "react";
import { motion } from "framer-motion";

export default function SectionHeading({ eyebrow, title, desc, align = "left", children }) {
  return (
    <div className={`section-heading ${align === "center" ? "center" : ""}`}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5 }}
      >
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        {title && <h2>{title}</h2>}
        {desc && <p>{desc}</p>}
      </motion.div>
      {children}
    </div>
  );
}
