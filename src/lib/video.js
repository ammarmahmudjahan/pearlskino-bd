import { youtubeThumb } from "./img";

/*
 * Product videos: { kind: "youtube" | "facebook" | "drive" | "file", id, url, poster, title }
 * Nothing from YouTube / Facebook / Google is loaded until the visitor taps play.
 */
export function videoThumb(video) {
  if (video.poster) return video.poster;
  if (video.kind === "youtube" && video.id) return youtubeThumb(video.id);
  return "";
}

export function embedUrl(video) {
  if (video.kind === "youtube") {
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  }

  if (video.kind === "facebook") {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(video.url)}&show_text=false&autoplay=true`;
  }

  if (video.kind === "drive") {
    return `https://drive.google.com/file/d/${encodeURIComponent(video.id)}/preview`;
  }

  return "";
}
