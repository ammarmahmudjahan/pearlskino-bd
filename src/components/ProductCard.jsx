import React from "react";
import { useStore } from "../context/StoreContext";

export default function ProductCard({ product }) {
  const { addToCart } = useStore();

  return (
    <article className="product-card">
      <div className="product-image">
        {product.image ? (
          <img src={product.image} alt={product.name} />
        ) : (
          <div className="product-placeholder">✦</div>
        )}
      </div>

      <div className="product-info">
        <span className="product-category">
          {product.category || "Fragrance"}
        </span>

        <h3>{product.name}</h3>

        {product.description && (
          <p>{product.description}</p>
        )}

        <div className="product-footer">
          <strong>
            {product.price ? `৳${product.price}` : "Message for price"}
          </strong>

          <button onClick={() => addToCart(product)}>
            Add to Cart
          </button>
        </div>
      </div>
    </article>
  );
}