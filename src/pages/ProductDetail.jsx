import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Heart, Minus, Plus, ShieldCheck, ShoppingBag, Star, Truck } from "lucide-react";
import { findProduct, money, PRODUCTS } from "../data/products";
import { useCart } from "../context/CartContext";
import ProductCard from "../components/ProductCard";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const p = findProduct(id);
  const { addToCart, toggleWishlist, isWishlisted } = useCart();
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);

  if (!p) {
    return (
      <section className="section empty-state">
        <h4>We couldn&rsquo;t find that product.</h4>
        <Link className="btn dark" to="/shop">
          Back to shop
        </Link>
      </section>
    );
  }

  const images = [p.image, p.alt];
  const related = PRODUCTS.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 3);
  const saved = isWishlisted(p.id);

  return (
    <section className="section product-detail">
      <button className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={14} /> Back
      </button>

      <div className="pd-grid">
        <div className="pd-gallery">
          <div className="pd-main-photo">
            <img src={images[img]} alt={p.name} />
          </div>
          <div className="pd-thumbs">
            {images.map((src, i) => (
              <button key={i} className={i === img ? "active" : ""} onClick={() => setImg(i)}>
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="eyebrow">{p.brand}</span>
          <h1 className="pd-title">{p.name}</h1>
          <p className="pd-subtitle">{p.subtitle}</p>
          <div className="pd-rating">
            <Star size={13} fill="currentColor" /> {p.rating} <span>({p.reviews} reviews)</span>
          </div>
          <div className="pd-price">
            {money(p.price)} {p.oldPrice && <del>{money(p.oldPrice)}</del>}
          </div>
          <p className="pd-desc">{p.description}</p>

          {p.notes && (
            <div className="pd-notes">
              <small>SCENT NOTES</small>
              <div>
                {p.notes.map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </div>
            </div>
          )}

          <div className="pd-stock">
            {p.stock <= 10 ? (
              <span className="low">Only {p.stock} left in stock</span>
            ) : (
              <span className="ok">
                <Check size={13} /> In stock
              </span>
            )}
          </div>

          <div className="pd-actions">
            <div className="qty">
              <button onClick={() => setQty((v) => Math.max(1, v - 1))} aria-label="Decrease">
                <Minus size={13} />
              </button>
              {qty}
              <button onClick={() => setQty((v) => v + 1)} aria-label="Increase">
                <Plus size={13} />
              </button>
            </div>
            <button className="btn dark wide" onClick={() => addToCart(p, qty)}>
              <ShoppingBag size={15} /> Add to bag
            </button>
            <button className={`btn glass icon-btn ${saved ? "on" : ""}`} onClick={() => toggleWishlist(p)}>
              <Heart size={15} />
            </button>
          </div>

          <div className="pd-trust">
            <span>
              <ShieldCheck size={15} /> Verified authentic
            </span>
            <span>
              <Truck size={15} /> Nationwide delivery
            </span>
          </div>
        </motion.div>
      </div>

      {related.length > 0 && (
        <div className="related">
          <h3>You may also like</h3>
          <div className="grid">
            {related.map((r, i) => (
              <ProductCard key={r.id} p={r} index={i} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
