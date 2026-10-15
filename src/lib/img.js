/*
|--------------------------------------------------------------------------
| PICTURE SIZES
|--------------------------------------------------------------------------
| Pictures uploaded from the admin live on Google Drive and are served by
| Google's picture servers (lh3.googleusercontent.com). Those servers can
| hand out ANY size of the same picture just by changing the end of the
| address:  ...=w2000  ->  ...=w480-rw   (rw = modern WebP format).
|
| So the shop asks for a small picture for a small card and a big one only
| on the product page. This works for every old and new picture, with no
| extra upload step. Other addresses (for example /products/x.png) are left
| exactly as they are.
*/

const GOOGLE_PICTURE = /^(https:\/\/lh3\.googleusercontent\.com\/d\/[^=?#\s]+)(=[^?#\s]*)?$/;

export function isResizable(url) {
  return GOOGLE_PICTURE.test(String(url || ""));
}

/* the same picture at a given width (pixels) */
export function sized(url, width) {
  const text = String(url || "");
  const match = GOOGLE_PICTURE.exec(text);
  if (!match) return text;
  return `${match[1]}=w${Math.max(48, Math.round(width))}-rw`;
}

/* "url 480w, url 800w" - undefined when the picture cannot be resized */
export function srcSetOf(url, widths) {
  if (!isResizable(url)) return undefined;
  return widths.map((w) => `${sized(url, w)} ${w}w`).join(", ");
}

/* common size sets */
export const CARD_WIDTHS = [320, 480, 720];
export const DETAIL_WIDTHS = [600, 900, 1400];
export const THUMB_WIDTHS = [96, 160];
export const CARD_SIZES = "(max-width: 600px) 46vw, (max-width: 1000px) 30vw, 280px";
export const DETAIL_SIZES = "(max-width: 900px) 94vw, 560px";
export const THUMB_SIZES = "80px";

/* youtube thumbnail of a video id */
export function youtubeThumb(id) {
  return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
}
