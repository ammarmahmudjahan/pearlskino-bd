import React, { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/**
 * The site's signature motif — a luminous iridescent sphere with a rotating
 * sheen and orbiting moons. Reused in the hero (large, parallax-reactive),
 * and small elsewhere (loading state, section dividers) to keep the brand
 * mark consistent throughout.
 */
export default function PearlOrb({ size = 420, parallax = true, className = "" }) {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });
  const rotateX = useTransform(sy, [-1, 1], [10, -10]);
  const rotateY = useTransform(sx, [-1, 1], [-10, 10]);

  useEffect(() => {
    if (!parallax) return;
    function onMove(e) {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      mx.set(Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width * 1.4))));
      my.set(Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height * 1.4))));
    }
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [parallax, mx, my]);

  return (
    <motion.div
      ref={ref}
      className={`pearl-orb ${className}`}
      style={{ width: size, height: size, rotateX: parallax ? rotateX : 0, rotateY: parallax ? rotateY : 0 }}
    >
      <div className="pearl-orb-glow" />
      <div className="pearl-orb-core">
        <div className="pearl-orb-sheen" />
      </div>
      <div className="pearl-orb-ring pearl-orb-ring-a" />
      <div className="pearl-orb-ring pearl-orb-ring-b" />
      <span className="pearl-moon pearl-moon-a" />
      <span className="pearl-moon pearl-moon-b" />
      <span className="pearl-moon pearl-moon-c" />
    </motion.div>
  );
}
