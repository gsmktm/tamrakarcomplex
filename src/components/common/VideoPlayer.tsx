import React from "react";

interface VideoPlayerProps {
  url: string;
  title?: string;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, title, className = "" }) => {
  // Simple YouTube/Vimeo embed logic
  const getEmbedUrl = (videoUrl: string) => {
    if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
      const videoId = videoUrl.split("v=")[1] || videoUrl.split("/").pop();
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (videoUrl.includes("vimeo.com")) {
      const videoId = videoUrl.split("/").pop();
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return videoUrl;
  };

  const embedUrl = getEmbedUrl(url);

  return (
    <div className={`aspect-video w-full overflow-hidden rounded-xl bg-slate-100 ${className}`}>
      <iframe
        src={embedUrl}
        title={title || "Video content"}
        className="h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </div>
  );
};
