import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ShoppingBag, Star } from "lucide-react";
import { money } from "../data/products";
import { useCart } from "../context/CartContext";

export default function ProductCard({ p, index = 0 }) {
  const { addToCart, toggleWishlist, isWishlisted } = useCart();
  const saved = isWishlisted(p.id);

  return (
    <motion.article
      className="product"
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3) }}
    >
      <Link to={`/product/${p.id}`} className="photo">
        <img src={p.image} alt={p.name} loading="lazy" />
        <img className="alt" src={p.alt} alt="" loading="lazy" />
        <div className="badges">
          <span className="tagset">
            {p.oldPrice && <b className="sale-badge">SALE</b>}
            {p.stock <= 10 && <b className="low-badge">LOW STOCK</b>}
          </span>
          <button
            className={`wish ${saved ? "on" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              toggleWishlist(p);
            }}
            aria-label="Save to wishlist"
          >
            <Heart size={14} />
          </button>
        </div>
        <button
          className="quickadd"
          onClick={(e) => {
            e.preventDefault();
            addToCart(p);
          }}
        >
          <ShoppingBag size={14} /> Add to bag
        </button>
      </Link>
      <div className="pinfo">
        <div>
          <small>{p.brand}</small>
          <h3>
            <Link to={`/product/${p.id}`}>{p.name}</Link>
          </h3>
          <p>{p.subtitle}</p>
        </div>
        <strong>
          {money(p.price)} {p.oldPrice && <del>{money(p.oldPrice)}</del>}
        </strong>
        <span className="rating">
          <Star size={11} fill="currentColor" /> {p.rating} <em>({p.reviews})</em>
        </span>
      </div>
    </motion.article>
  );
}
