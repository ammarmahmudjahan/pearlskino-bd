/*
 * Shrinks a photo in the browser BEFORE it is uploaded, so uploads are fast
 * and the files stored on Google Drive stay small.
 *   - longest side is limited to `max` pixels
 *   - saved as WebP (JPEG on old browsers that cannot make WebP)
 *   - if `maxKB` is given, the quality / size is lowered until it fits
 */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not process the image."));
    image.src = source;
  });
}

function draw(image, max) {
  const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) throw new Error("Could not process the image.");

  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

function encode(canvas, type, quality) {
  let url = canvas.toDataURL(type, quality);

  /* a browser that cannot make WebP quietly returns PNG - use JPEG instead */
  if (type === "image/webp" && !url.startsWith("data:image/webp")) {
    url = canvas.toDataURL("image/jpeg", quality);
  }

  return url;
}

function kbOf(dataUrl) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return (base64.length * 3) / 4 / 1024;
}

export async function compressImage(
  file,
  { max = 1400, type = "image/webp", quality = 0.84, maxKB = 0 } = {}
) {
  const image = await loadImage(await readFileAsDataUrl(file));

  let side = max;
  let q = quality;
  let result = encode(draw(image, side), type, q);

  if (maxKB > 0) {
    let guard = 0;

    while (kbOf(result) > maxKB && guard < 8) {
      guard += 1;

      if (q > 0.5) q = Math.max(0.5, q - 0.12);
      else side = Math.round(side * 0.82);

      result = encode(draw(image, side), type, q);
    }
  }

  return result;
}

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
