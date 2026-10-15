import { useState } from "react";

import { sized, srcSetOf, CARD_WIDTHS, CARD_SIZES } from "../lib/img";

/*
 * One picture component for the whole shop.
 *   - asks Google for the right SIZE (small cards get small pictures)
 *   - width / height reserve the space, so the page never jumps
 *   - lazy loading unless priority (the first big picture on a page)
 *   - if the resized address ever fails, it falls back to the original
 */
export default function Img({
  src,
  alt = "",
  widths = CARD_WIDTHS,
  sizes = CARD_SIZES,
  width,
  height,
  priority = false,
  className,
  ...rest
}) {
  const [failed, setFailed] = useState(false);

  if (!src) return null;

  const resized = !failed && srcSetOf(src, widths);
  const fallbackWidth = widths[Math.min(1, widths.length - 1)];

  return (
    <img
      className={className}
      src={failed ? src : sized(src, fallbackWidth)}
      srcSet={resized || undefined}
      sizes={resized ? sizes : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
