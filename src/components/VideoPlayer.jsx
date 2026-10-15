import { useState } from "react";

import { videoThumb, embedUrl } from "../lib/video";
import T from "../content/T";
import Img from "./Img";
import { PlayIcon } from "./Icons";

/*
 * One product video. YouTube / Facebook / Google Drive videos show a picture
 * with a play button first - the heavy player is only loaded after a tap.
 * A direct .mp4 / .webm file uses the browser's own player.
 */
export default function VideoPlayer({ video, title }) {
  const [playing, setPlaying] = useState(false);
  const thumb = videoThumb(video);

  if (video.kind === "file") {
    return (
      <div className="pk-video">
        <video
          src={video.url}
          poster={thumb || undefined}
          controls
          playsInline
          preload="metadata"
          aria-label={title || video.title || "Product video"}
        />
      </div>
    );
  }

  if (playing) {
    return (
      <div className="pk-video">
        <iframe
          src={embedUrl(video)}
          title={title || video.title || "Product video"}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    );
  }

  return (
    <button type="button" className="pk-video pk-video-cover" onClick={() => setPlaying(true)}>
      {thumb ? <Img src={thumb} alt="" widths={[640, 960]} sizes="(max-width: 900px) 94vw, 560px" /> : null}
      <span className="pk-video-play">
        <PlayIcon size={30} />
        <T k="product.video.play" as="small" />
      </span>
    </button>
  );
}
