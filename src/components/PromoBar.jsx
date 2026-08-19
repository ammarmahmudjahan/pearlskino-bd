import React from "react";
import { Sparkles } from "lucide-react";

export default function PromoBar() {
  return (
    <div className="promobar">
      <div className="promobar-track">
        {Array.from({ length: 2 }).map((_, i) => (
          <span key={i} className="promobar-set">
            <Sparkles size={12} /> 100% Authentic Products
            <Sparkles size={12} /> Free Delivery Over ৳2,500
            <Sparkles size={12} /> Nationwide Shipping
            <Sparkles size={12} /> Cash on Delivery in Select Areas
          </span>
        ))}
      </div>
    </div>
  );
}
