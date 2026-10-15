import { useRef, useState } from "react";

import { adminCall } from "../lib/adminApi";
import { readFileAsDataUrl, compressImage, IMAGE_TYPES } from "../lib/compress";
import { sized, youtubeThumb } from "../lib/img";
import { useStore } from "../context/StoreContext";
import { toast } from "./ui";

/*
 * Photos + videos of one product, with every action visible as a button:
 *   photos : Replace · Make main · Remove · ‹ › move · drag to reorder · Add more
 *   videos : paste a YouTube / Facebook / Google Drive / .mp4 link, or upload a
 *            small MP4 / WebM file (the size limit is set in Settings)
 * Nothing is saved until the product itself is saved.
 */

const MAX_IMAGES = 10;
const MAX_VIDEOS = 5;

/* same rules the server uses, so the answer is instant */
export function guessVideo(raw) {
  const url = String(raw || "").trim();
  let m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{11})/i.exec(url);
  if (m) return { kind: "youtube", id: m[1], url: `https://www.youtube.com/watch?v=${m[1]}` };
  if (/^https?:\/\/(?:www\.|m\.|web\.)?(?:facebook\.com|fb\.watch)\//i.test(url) && /(video|reel|watch|fb\.watch)/i.test(url)) {
    return { kind: "facebook", id: "", url };
  }
  m = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([A-Za-z0-9_-]{5,})/i.exec(url);
  if (m) return { kind: "drive", id: m[1], url: `https://drive.google.com/file/d/${m[1]}/preview` };
  if (/^https?:\/\/[^\s]+\.(mp4|webm|m4v|mov)(\?[^\s]*)?$/i.test(url)) return { kind: "file", id: "", url };
  return null;
}

const KIND_LABEL = { youtube: "YouTube", facebook: "Facebook", drive: "Google Drive", file: "Video file" };

function videoThumbOf(video) {
  if (video.poster) return video.poster;
  if (video.kind === "youtube" && video.id) return youtubeThumb(video.id);
  return "";
}

export default function MediaManager({
  images,
  videos,
  onImages,
  onVideos,
  productName,
  onImageRemoved,
  onImageReplaced,
}) {
  const { settings } = useStore();
  const limitMb = Math.max(1, Number(settings.videoUploadMaxMb) || 10);

  const [busy, setBusy] = useState("");
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const addRef = useRef(null);
  const replaceRef = useRef(null);
  const replaceIndex = useRef(-1);
  const videoRef = useRef(null);

  async function uploadOne(file) {
    if (!IMAGE_TYPES.includes(file.type)) throw new Error("Please use PNG, JPG or WebP images.");
    const image = await compressImage(file, { max: 1600, quality: 0.86 });
    const res = await adminCall("uploadProductImage", { image, productName: productName || "product" }, { timeout: 90000 });
    return res.url;
  }

  async function addFiles(files) {
    const list = [...files].slice(0, Math.max(0, MAX_IMAGES - images.length));
    if (!list.length) return;

    setBusy("add");

    try {
      const urls = [];
      for (const file of list) urls.push(await uploadOne(file));
      onImages([...images, ...urls].slice(0, MAX_IMAGES));
      toast(`${urls.length} photo${urls.length > 1 ? "s" : ""} added. Press "Save product" to keep the changes.`);
    } catch (problem) {
      toast(problem.message || "Upload failed.", "error");
    } finally {
      setBusy("");
      if (addRef.current) addRef.current.value = "";
    }
  }

  async function replaceFile(file) {
    const index = replaceIndex.current;
    if (!file || index < 0 || index >= images.length) return;

    setBusy(`replace-${index}`);

    try {
      const url = await uploadOne(file);
      const old = images[index];
      onImages(images.map((src, i) => (i === index ? url : src)));
      onImageReplaced?.(old, url);
      toast("Photo replaced. Press \"Save product\" to keep the change.");
    } catch (problem) {
      toast(problem.message || "Upload failed.", "error");
    } finally {
      setBusy("");
      replaceIndex.current = -1;
      if (replaceRef.current) replaceRef.current.value = "";
    }
  }

  function move(from, to) {
    if (to < 0 || to >= images.length || from === to) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onImages(next);
  }

  function remove(index) {
    const gone = images[index];
    onImages(images.filter((_, i) => i !== index));
    onImageRemoved?.(gone);
  }

  function addImageUrl() {
    const text = imageUrl.trim();
    if (!/^https?:\/\//i.test(text)) return toast("The address must start with https://", "error");
    if (images.length >= MAX_IMAGES) return toast(`You can add up to ${MAX_IMAGES} photos.`, "error");
    onImages([...images, text]);
    setImageUrl("");
  }

  /* ---------- videos ---------- */
  function addVideoLink() {
    const found = guessVideo(videoUrl);

    if (!found) {
      return toast("That link is not supported. Use a YouTube, Facebook or Google Drive link, or a direct .mp4 / .webm link.", "error");
    }
    if (videos.length >= MAX_VIDEOS) return toast(`You can add up to ${MAX_VIDEOS} videos.`, "error");

    onVideos([...videos, { ...found, poster: "", title: "" }]);
    setVideoUrl("");
  }

  async function uploadVideo(file) {
    if (!file) return;

    try {
      if (!/^video\/(mp4|webm|quicktime)$/.test(file.type) && !/\.(mp4|webm|mov)$/i.test(file.name)) {
        throw new Error("Please choose an MP4, WebM or MOV video.");
      }
      if (file.size > limitMb * 1024 * 1024) {
        throw new Error(
          `This video is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${limitMb} MB - use a shorter clip, or paste a YouTube / Facebook link instead.`
        );
      }
      if (videos.length >= MAX_VIDEOS) throw new Error(`You can add up to ${MAX_VIDEOS} videos.`);

      setBusy("video");
      const video = await readFileAsDataUrl(file);
      const res = await adminCall("uploadProductVideo", { video, productName: productName || "product" }, { timeout: 180000 });
      onVideos([...videos, res.video]);
      toast("Video uploaded. Press \"Save product\" to keep it.");
    } catch (problem) {
      toast(problem.message || "Upload failed.", "error");
    } finally {
      setBusy("");
      if (videoRef.current) videoRef.current.value = "";
    }
  }

  function patchVideo(index, patch) {
    onVideos(videos.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function moveVideo(from, to) {
    if (to < 0 || to >= videos.length) return;
    const next = [...videos];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onVideos(next);
  }

  return (
    <div className="ad-media">
      {/* ===================== photos ===================== */}
      <div className="ad-media-head">
        <div>
          <h3>Photos</h3>
          <p className="ad-muted">
            {images.length} of {MAX_IMAGES}. The first photo is the main one - drag a photo to move it, or use the buttons.
          </p>
        </div>

        {images.length < MAX_IMAGES && (
          <button type="button" className="ad-btn primary" disabled={Boolean(busy)} onClick={() => addRef.current?.click()}>
            {busy === "add" ? "Uploading…" : "＋ Add more photos"}
          </button>
        )}
      </div>

      <input ref={addRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => addFiles(e.target.files)} />
      <input ref={replaceRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => replaceFile(e.target.files?.[0])} />

      {images.length === 0 ? (
        <button type="button" className="ad-media-drop" disabled={Boolean(busy)} onClick={() => addRef.current?.click()}>
          <strong>{busy === "add" ? "Uploading…" : "＋ Upload the first photo"}</strong>
          <span>PNG, JPG or WebP. Big photos are made smaller automatically.</span>
        </button>
      ) : (
        <div className="ad-media-grid">
          {images.map((src, n) => (
            <div
              key={`${src}-${n}`}
              className={`ad-media-card${n === 0 ? " main" : ""}${dragOver === n && dragFrom !== null && dragFrom !== n ? " over" : ""}${dragFrom === n ? " dragging" : ""}`}
              draggable={!busy}
              onDragStart={(e) => {
                setDragFrom(n);
                e.dataTransfer.effectAllowed = "move";
                try { e.dataTransfer.setData("text/plain", String(n)); } catch { /* some browsers need this */ }
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(n); }}
              onDragLeave={() => setDragOver((v) => (v === n ? null : v))}
              onDrop={(e) => { e.preventDefault(); if (dragFrom !== null) move(dragFrom, n); setDragFrom(null); setDragOver(null); }}
              onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
            >
              <div className="ad-media-pic">
                <img src={sized(src, 360)} alt="" loading="lazy" draggable={false} />
                {n === 0 && <span className="ad-media-badge">Main photo</span>}
                <span className="ad-media-num">{n + 1}</span>
                {busy === `replace-${n}` && <span className="ad-media-busy">Uploading…</span>}
              </div>

              <div className="ad-media-actions">
                {n > 0 && (
                  <button type="button" className="ad-btn small" onClick={() => move(n, 0)}>★ Make main</button>
                )}
                <button
                  type="button"
                  className="ad-btn small"
                  disabled={Boolean(busy)}
                  onClick={() => { replaceIndex.current = n; replaceRef.current?.click(); }}
                >
                  ⟳ Replace
                </button>
                <button type="button" className="ad-btn small danger" onClick={() => remove(n)}>✕ Remove</button>
              </div>

              <div className="ad-media-arrows">
                <button type="button" disabled={n === 0} onClick={() => move(n, n - 1)} aria-label="Move earlier">‹ Earlier</button>
                <button type="button" disabled={n === images.length - 1} onClick={() => move(n, n + 1)} aria-label="Move later">Later ›</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ad-btn-row ad-media-url">
        <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="…or paste a photo web address (https://…)" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImageUrl(); } }} />
        <button type="button" className="ad-btn" onClick={addImageUrl}>Add address</button>
      </div>

      {/* ===================== videos ===================== */}
      <div className="ad-media-head" style={{ marginTop: 26 }}>
        <div>
          <h3>Videos</h3>
          <p className="ad-muted">
            {videos.length} of {MAX_VIDEOS}. Customers see them in the product gallery with a ▶ picture. YouTube / Facebook videos only load when a customer taps play.
          </p>
        </div>

        {videos.length < MAX_VIDEOS && (
          <button type="button" className="ad-btn" disabled={Boolean(busy)} onClick={() => videoRef.current?.click()}>
            {busy === "video" ? "Uploading video… (please wait)" : `⬆ Upload video (MP4 / WebM, up to ${limitMb} MB)`}
          </button>
        )}
      </div>

      <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" hidden onChange={(e) => uploadVideo(e.target.files?.[0])} />

      {videos.length > 0 && (
        <div className="ad-video-list">
          {videos.map((video, n) => {
            const thumb = videoThumbOf(video);

            return (
              <div className="ad-video-row" key={`${video.kind}-${video.url}-${n}`}>
                <span className="ad-video-thumb">
                  {thumb ? <img src={sized(thumb, 200)} alt="" loading="lazy" /> : <i>▶</i>}
                </span>

                <div className="ad-video-info">
                  <div>
                    <span className="ad-badge purple">{KIND_LABEL[video.kind] || video.kind}</span>{" "}
                    <a href={video.kind === "drive" ? `https://drive.google.com/file/d/${video.id}/view` : video.url} target="_blank" rel="noopener noreferrer">
                      Open ↗
                    </a>
                  </div>
                  <input
                    value={video.title || ""}
                    onChange={(e) => patchVideo(n, { title: e.target.value })}
                    placeholder="Title (optional)"
                    maxLength={80}
                  />
                  {video.kind !== "youtube" && (
                    <input
                      value={video.poster || ""}
                      onChange={(e) => patchVideo(n, { poster: e.target.value })}
                      placeholder="Cover picture web address (optional)"
                    />
                  )}
                </div>

                <div className="ad-video-actions">
                  <button type="button" className="ad-btn small" disabled={n === 0} onClick={() => moveVideo(n, n - 1)}>↑</button>
                  <button type="button" className="ad-btn small" disabled={n === videos.length - 1} onClick={() => moveVideo(n, n + 1)}>↓</button>
                  <button type="button" className="ad-btn small danger" onClick={() => onVideos(videos.filter((_, i) => i !== n))}>✕ Remove</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="ad-btn-row ad-media-url">
        <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Paste a YouTube, Facebook, Google Drive or .mp4 link" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVideoLink(); } }} />
        <button type="button" className="ad-btn" disabled={videos.length >= MAX_VIDEOS} onClick={addVideoLink}>Add video link</button>
      </div>

      <p className="ad-muted" style={{ marginTop: 8 }}>
        Tip: a long video is best put on YouTube (unlisted is fine) and pasted here - it plays smoothly and costs nothing. Uploaded files are for short clips only.
      </p>
    </div>
  );
}
