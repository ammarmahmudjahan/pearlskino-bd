import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useStore } from "../context/StoreContext";
import { useCustomer } from "../context/CustomerContext";
import { apiGet } from "../lib/api";
import { formatDate } from "../lib/format";
import { compressImage } from "../lib/compress";
import { sized } from "../lib/img";
import T, { useText } from "../content/T";
import Img from "./Img";
import { CameraIcon, CloseIcon } from "./Icons";

const MAX_PHOTOS = 3;

export function Stars({ value, size = 16 }) {
  return (
    <span className="stars" style={{ fontSize: size }} role="img" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(value) ? "on" : ""}>
          ★
        </span>
      ))}
    </span>
  );
}

/* a customer's review photo, opened large */
function Lightbox({ src, onClose }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="pk-lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <button type="button" className="pk-lightbox-close" onClick={onClose} aria-label="Close">
        <CloseIcon size={22} />
      </button>
      <img src={sized(src, 1400)} alt="" onClick={(event) => event.stopPropagation()} />
    </div>
  );
}

/* =========================================================
   REVIEWS  (list + form with photos)
========================================================= */
export default function ProductReviews({ product }) {
  const { storeSettings } = useStore();
  const { loggedIn, submitReview } = useCustomer();
  const [data, setData] = useState({ reviews: [], count: 0, average: 0 });
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [trap, setTrap] = useState("");
  const [photos, setPhotos] = useState([]);
  const [zoom, setZoom] = useState("");
  const [state, setState] = useState({ busy: false, error: "", done: "" });
  const picker = useRef(null);
  const titleHint = useText("product.reviews.titleHint");
  const bodyHint = useText("product.reviews.bodyHint");

  const photosOn = storeSettings.reviewPhotosEnabled !== false;

  useEffect(() => {
    let cancelled = false;

    setData({ reviews: [], count: 0, average: 0 });

    apiGet({ action: "reviews", productId: product.id })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [product.id]);

  async function addPhotos(event) {
    const files = Array.from(event.target.files || []).slice(0, MAX_PHOTOS - photos.length);
    event.target.value = "";

    if (!files.length) return;

    setState((s) => ({ ...s, error: "", busy: true }));

    try {
      /* shrunk on the phone first: a few hundred KB each, not several MB */
      const ready = await Promise.all(
        files.map((file) => compressImage(file, { max: 1000, quality: 0.8, maxKB: 380 }))
      );
      setPhotos((current) => [...current, ...ready].slice(0, MAX_PHOTOS));
      setState((s) => ({ ...s, busy: false }));
    } catch (error) {
      setState((s) => ({ ...s, busy: false, error: error?.message || "Could not use that photo." }));
    }
  }

  async function send(event) {
    event.preventDefault();

    if (!rating) {
      setState({ busy: false, error: "Please choose a star rating.", done: "" });
      return;
    }

    setState({ busy: true, error: "", done: "" });

    try {
      const result = await submitReview({
        productId: product.id,
        rating,
        title,
        body,
        hp: trap,
        photos: photosOn ? photos : [],
      });
      setRating(0);
      setTitle("");
      setBody("");
      setPhotos([]);
      setState({ busy: false, error: "", done: result.status === "approved" ? "live" : "pending" });
    } catch (error) {
      setState({ busy: false, error: error?.message || "Could not send the review.", done: "" });
    }
  }

  if (storeSettings.reviewsEnabled === false) return null;

  return (
    <section className="product-section product-reviews" id="reviews">
      <div className="product-section-head">
        <T k="product.reviews.title" as="h2" />

        {data.count > 0 && (
          <div className="product-rating-summary">
            <Stars value={data.average} />
            <strong>{data.average}</strong>
            <span>
              {data.count === 1 ? (
                <T k="product.reviews.count1" />
              ) : (
                <T k="product.reviews.count" vars={{ count: data.count }} />
              )}
            </span>
          </div>
        )}
      </div>

      {data.reviews.length === 0 ? (
        <T k="product.reviews.empty" as="p" className="product-muted" />
      ) : (
        <div className="review-list">
          {data.reviews.map((review) => (
            <article className="review" key={review.id}>
              <div className="review-top">
                <Stars value={review.rating} size={14} />
                <strong>{review.title}</strong>
              </div>
              <p>{review.body}</p>

              {review.photos?.length > 0 && (
                <div className="review-photos">
                  {review.photos.map((photo) => (
                    <button type="button" key={photo} onClick={() => setZoom(photo)} aria-label="Open photo">
                      <Img src={photo} alt="" widths={[120, 200]} sizes="72px" width="72" height="72" />
                    </button>
                  ))}
                </div>
              )}

              <small>
                {review.name} · {formatDate(review.created)}
                {review.verified && (
                  <span className="review-verified">
                    <T k="product.reviews.verified" />
                  </span>
                )}
              </small>
              {review.reply && (
                <div className="review-reply">
                  <b>
                    <T k="product.reviews.reply" />
                  </b>
                  <p>{review.reply}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="review-form-wrap">
        {!loggedIn ? (
          <Link className="product-link" to={`/account?next=${encodeURIComponent(`/product/${product.id}`)}`}>
            <T k="product.reviews.login" />
          </Link>
        ) : state.done ? (
          <p className="form-success" role="status">
            <T k={state.done === "live" ? "product.reviews.thanksLive" : "product.reviews.thanks"} />
          </p>
        ) : (
          <form className="review-form" onSubmit={send}>
            <T k="product.reviews.write" as="h3" />

            <div className="review-stars-input" role="radiogroup" aria-label="Your rating">
              <T k="product.reviews.rating" as="span" className="review-label" />
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  className={n <= rating ? "on" : ""}
                  onClick={() => setRating(n)}
                >
                  ★
                </button>
              ))}
            </div>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={titleHint}
              aria-label={titleHint}
              maxLength={80}
            />
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={bodyHint}
              aria-label={bodyHint}
              rows={4}
              maxLength={1200}
              required
            />

            {photosOn && (
              <div className="review-photo-field">
                <div className="review-photo-row">
                  {photos.map((photo, index) => (
                    <span className="review-photo-preview" key={photo.slice(-24) + index}>
                      <img src={photo} alt="" />
                      <button
                        type="button"
                        onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                        aria-label="Remove photo"
                      >
                        <CloseIcon size={12} />
                      </button>
                    </span>
                  ))}

                  {photos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      className="review-photo-add"
                      onClick={() => picker.current?.click()}
                      disabled={state.busy}
                    >
                      <CameraIcon size={20} />
                      <T k="product.reviews.photoAdd" as="span" />
                    </button>
                  )}
                </div>

                <input
                  ref={picker}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  hidden
                  onChange={addPhotos}
                />

                <T k="product.reviews.photoHint" as="small" className="review-photo-hint" />
              </div>
            )}

            {/* spam trap: people never see this */}
            <input
              className="hp-field"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={trap}
              onChange={(event) => setTrap(event.target.value)}
            />

            {state.error && (
              <p className="form-error" role="alert">
                {state.error}
              </p>
            )}

            <button type="submit" className="hero-button" disabled={state.busy}>
              <T k="product.reviews.submit" />
            </button>
          </form>
        )}
      </div>

      {zoom && <Lightbox src={zoom} onClose={() => setZoom("")} />}
    </section>
  );
}
