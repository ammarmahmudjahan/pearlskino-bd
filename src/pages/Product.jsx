
import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import { useProducts } from "../hooks/useProducts";
import { useStore } from "../context/StoreContext";

export default function Product() {
  const { id } = useParams();

  const [products] = useProducts();

  const {
    addToCart,
    cart,
  } = useStore();

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);


  /* =========================
     FIND PRODUCT
  ========================== */

  const product = products.find(
    (item) =>
      String(item.id) === String(id)
  );


  /* =========================
     PRODUCT NOT FOUND
  ========================== */

  if (!product) {
    return (
      <main className="product-page">

        <section className="product-not-found">

          <div className="product-page-brand-logo">
            <img
              src="/logo.png"
              alt="PearlSkino BD"
            />
          </div>

          <p className="eyebrow">
            PEARLSKINO BD
          </p>

          <h1>
            Product not found
          </h1>

          <p>
            This product may have been removed
            or is no longer available.
          </p>

          <Link
            to="/shop"
            className="hero-button"
          >
            ← Back to Shop
          </Link>

        </section>

      </main>
    );
  }


  /* =========================
     PRODUCT DATA
  ========================== */

  const image =
    product.image ||
    product.images?.[0] ||
    "";

  const stock = Math.max(
    0,
    Number(product.stock || 0)
  );

  const unavailable =
    product.status === "inactive" ||
    stock <= 0;


  /* =========================
     EXISTING CART QUANTITY
  ========================== */

  const cartItem = cart.find(
    (item) =>
      String(item.id) ===
      String(product.id)
  );

  const cartQuantity = Number(
    cartItem?.qty || 0
  );


  /* =========================
     RESET QUANTITY WHEN
     PRODUCT CHANGES
  ========================== */

  useEffect(() => {
    setQuantity(1);
    setAdded(false);
  }, [id]);


  /* =========================
     QUANTITY
  ========================== */

  function decreaseQuantity() {
    setQuantity((current) =>
      Math.max(1, current - 1)
    );
  }


  function increaseQuantity() {
    setQuantity((current) =>
      Math.min(
        Math.max(
          1,
          stock - cartQuantity
        ),
        current + 1
      )
    );
  }


  /* =========================
     ADD TO CART
  ========================== */

  function handleAddToCart() {

    if (unavailable) {
      return;
    }


    const remainingStock =
      Math.max(
        0,
        stock - cartQuantity
      );


    if (remainingStock <= 0) {

      setAdded(true);

      setTimeout(() => {
        setAdded(false);
      }, 2200);

      return;
    }


    const amountToAdd =
      Math.min(
        quantity,
        remainingStock
      );


    addToCart(
      product.id,
      amountToAdd
    );


    /* SUCCESS STATE */

    setAdded(true);


    setTimeout(() => {
      setAdded(false);
    }, 2600);


    /* RESET QUANTITY */

    setQuantity(1);
  }


  /* =========================
     RENDER
  ========================== */

  return (
    <main className="product-page">

      <section className="product-detail">


        {/* =========================
            LEFT — PRODUCT IMAGE
        ========================== */}

        <div className="product-detail-image">

          {image ? (

            <img
              src={image}
              alt={product.name}
            />

          ) : (

            <div className="product-no-image">
              ✦
            </div>

          )}

        </div>


        {/* =========================
            RIGHT — INFORMATION
        ========================== */}

        <div className="product-detail-info">

          {/* BRAND LOGO */}

          <div className="product-page-brand-logo">
            <img
              src="/logo.png"
              alt="PearlSkino BD"
            />
          </div>


          {/* BRAND */}

          <p className="product-detail-brand">
            {product.brand ||
              "PEARLSKINO BD"}
          </p>


          {/* CATEGORY */}

          <p className="product-category">
            {product.category ||
              "Beauty"}
          </p>


          {/* NAME */}

          <h1>
            {product.name}
          </h1>


          {/* DESCRIPTION */}

          {product.description && (

            <p className="product-detail-description">
              {product.description}
            </p>

          )}


          {/* PRICE */}

          <div className="product-detail-price">
            ৳
            {Number(
              product.price || 0
            ).toLocaleString()}
          </div>


          {/* STOCK */}

          <div className="product-detail-stock">

            {product.status === "inactive" ? (

              <span className="stock-unavailable">
                Currently unavailable
              </span>

            ) : stock > 0 ? (

              <span className="stock-available">
                ✓ {stock} available
              </span>

            ) : (

              <span className="stock-unavailable">
                Out of stock
              </span>

            )}

          </div>


          {/* =========================
              ALREADY IN CART
          ========================== */}

          {cartQuantity > 0 &&
            !unavailable && (

            <div className="product-cart-status">

              <span>
                ✦
              </span>

              <span>
                {cartQuantity}{" "}
                {cartQuantity === 1
                  ? "item"
                  : "items"}{" "}
                already in your bag
              </span>

              <Link to="/cart">
                View Bag
              </Link>

            </div>

          )}


          {/* =========================
              PURCHASE AREA
          ========================== */}

          {!unavailable && (

            <div className="product-purchase">


              {/* QUANTITY */}

              <div className="quantity-selector">

                <button
                  type="button"
                  onClick={
                    decreaseQuantity
                  }
                  disabled={
                    quantity <= 1
                  }
                  aria-label="Decrease quantity"
                >
                  −
                </button>


                <span>
                  {quantity}
                </span>


                <button
                  type="button"
                  onClick={
                    increaseQuantity
                  }
                  disabled={
                    quantity >=
                    Math.max(
                      1,
                      stock -
                        cartQuantity
                    )
                  }
                  aria-label="Increase quantity"
                >
                  +
                </button>

              </div>


              {/* ADD TO CART */}

              <button
                type="button"
                className={`add-to-cart-button ${
                  added ? "added" : ""
                }`}
                onClick={
                  handleAddToCart
                }
              >

                <span className="cart-icon">
                  {added
                    ? "✓"
                    : "🛒"}
                </span>

                <span>
                  {added
                    ? "Added to Cart"
                    : "Add to Cart"}
                </span>

              </button>

            </div>

          )}


          {/* =========================
              OUT OF STOCK
          ========================== */}

          {unavailable && (

            <button
              type="button"
              className="add-to-cart-button"
              disabled
            >
              {product.status ===
              "inactive"
                ? "Currently Unavailable"
                : "Out of Stock"}
            </button>

          )}


          {/* =========================
              CONTINUE SHOPPING
          ========================== */}

          <Link
            to="/shop"
            className="product-back-link"
          >
            ← Continue Shopping
          </Link>

        </div>

      </section>


      {/* =========================
          SUCCESS POPUP
      ========================== */}

      {added && (

        <div
          className="cart-success-message"
          role="status"
        >

          <div className="cart-success-sparkles">
            <span>✦</span>
            <span>✧</span>
            <span>⋆</span>
          </div>


          <div className="cart-success-icon">
            ✓
          </div>


          <div className="cart-success-content">

            <strong>
              Added to your bag
            </strong>

            <small>
              {product.name}
            </small>

          </div>


          <Link to="/cart">
            View Cart
          </Link>

        </div>

      )}

    </main>
  );
}
