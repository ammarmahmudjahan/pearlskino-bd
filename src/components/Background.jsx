import React, { useEffect, useRef } from "react";

/**
 * Fixed, full-viewport, pointer-events:none layer that sits behind the
 * whole app. Two effects stacked:
 *  1. Three slow-drifting blurred "aurora" blobs (pure CSS) in gold / rose / violet
 *  2. A canvas sparkle field — fine drifting particles that twinkle, like
 *     suspended pearl dust. Density is intentionally low so it reads as
 *     ambient atmosphere, not noise.
 */
export default function Background() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;
    let particles = [];
    let w = 0;
    let h = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((w * h) / 22000);
      particles = Array.from({ length: count }, () => spawn());
    }

    function spawn(fromBottom = false) {
      return {
        x: Math.random() * w,
        y: fromBottom ? h + 10 : Math.random() * h,
        r: Math.random() * 1.6 + 0.4,
        speed: Math.random() * 0.18 + 0.04,
        drift: (Math.random() - 0.5) * 0.15,
        alpha: Math.random() * 0.5 + 0.15,
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() > 0.55 ? "212,175,120" : Math.random() > 0.5 ? "226,166,181" : "166,139,214",
      };
    }

    function tick(t) {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.y -= p.speed;
        p.x += p.drift;
        const tw = 0.5 + 0.5 * Math.sin(t / 900 + p.phase);
        if (p.y < -10) Object.assign(p, spawn(true));
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.hue},${(p.alpha * tw).toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener("resize", resize);
    if (!reduced) {
      raf = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.hue},${p.alpha})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="bg-layer" aria-hidden="true">
      <div className="aurora aurora-a" />
      <div className="aurora aurora-b" />
      <div className="aurora aurora-c" />
      <canvas ref={canvasRef} className="sparkle-canvas" />
      <div className="vignette" />
      <div className="grain" />
    </div>
  );
}
