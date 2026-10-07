"use client";

import { useState } from "react";
import type { GroupVideo } from "@/content/types/activities";
import { formatDuration, youtubeEmbedUrl, youtubeWatchUrl } from "@/lib/activities/groups";
import { isModifiedClick, NEW_TAB } from "@/lib/shared/links";
import { PlayIcon } from "@/components/ui/icons/media-icons";

/**
 * A video of a group page (design/DESIGN.md §27, 5): the uploaded thumbnail with a play button and the length. A
 * click swaps it for the youtube-nocookie.com player, so nothing loads from YouTube before; without JS (or with a
 * modified click) it opens the video on YouTube.
 */
export function VideoCard({ video }: { video: GroupVideo }) {
  const [playing, setPlaying] = useState(false);
  const length = formatDuration(video.seconds);
  return (
    <li className="flex flex-col gap-2">
      {playing ? (
        <iframe
          src={youtubeEmbedUrl(video.youtubeId)}
          title={video.title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="aspect-video w-full rounded-16 border-0 bg-blue-tint-alt"
        />
      ) : (
        <a
          href={youtubeWatchUrl(video.youtubeId)}
          {...NEW_TAB}
          aria-label={`Přehrát video ${video.title} (${length})`}
          className="group relative flex aspect-video items-center justify-center overflow-hidden rounded-16 bg-blue-tint-alt"
          onClick={(e) => {
            if (isModifiedClick(e)) return;
            e.preventDefault();
            setPlaying(true);
          }}
        >
          <img
            src={video.thumbnail}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:scale-103"
          />
          <span
            aria-hidden="true"
            className="relative flex size-15 items-center justify-center rounded-full bg-scrim-strong text-white"
          >
            <PlayIcon size={28} />
          </span>
          <span
            aria-hidden="true"
            className="absolute right-2.5 bottom-2.5 rounded-6 bg-scrim-strong px-2 py-0.5 text-13 font-bold text-white"
          >
            {length}
          </span>
        </a>
      )}
      <strong className="text-16">{video.title}</strong>
    </li>
  );
}
