"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

// Declare YT on window for TypeScript
interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  isMuted?: () => boolean;
  setPlaybackRate: (rate: number) => void;
  setPlaybackQuality: (quality: string) => void;
  getAvailableQualityLevels: () => string[];
  destroy: () => void;
}

interface YTEvent {
  target: YTPlayerInstance;
  data: number | string;
}

declare global {
  interface Window {
    YT: {
      Player: new (element: HTMLElement | string, options: unknown) => YTPlayerInstance;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export type VideoSourceType = "youtube" | "upload" | "drive" | "hosted" | "other";

interface SpeakUpVideoPlayerProps {
  videoId?: string;
  videoUrl?: string;
  videoSource?: VideoSourceType;
  title?: string;
  poster?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  className?: string;
  watermarkText?: string;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export default function SpeakUpVideoPlayer({
  videoId = "iCvmsMzlF7o",
  videoUrl,
  videoSource = "youtube",
  title = "SpeakUp Executive Masterclass Demo",
  poster = "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80",
  autoPlay = false,
  onEnded,
  className = "",
  watermarkText,
}: SpeakUpVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeTargetRef = useRef<HTMLDivElement>(null);
  const nativeVideoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Determine effective player mode
  const effectiveUrl = videoUrl || "";
  const isDirectVideo =
    videoSource === "upload" ||
    videoSource === "hosted" ||
    /\.(mp4|webm|ogg|mov)(\?|$)/i.test(effectiveUrl) ||
    effectiveUrl.startsWith("/videos/") ||
    effectiveUrl.startsWith("blob:");

  const isDriveVideo =
    videoSource === "drive" ||
    effectiveUrl.includes("drive.google.com");

  // Resolve YouTube ID
  let resolvedYtId = videoId;
  if (!isDirectVideo && !isDriveVideo && effectiveUrl) {
    const match = effectiveUrl.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    if (match) {
      resolvedYtId = match[1];
    } else if (/^[a-zA-Z0-9_-]{11}$/.test(effectiveUrl.trim())) {
      resolvedYtId = effectiveUrl.trim();
    }
  }

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [currentQuality, setCurrentQuality] = useState<string>("auto");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

  // Format seconds to mm:ss
  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return "0:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // Auto-hide controls during playback
  const resetControlsTimeout = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
        setSpeedMenuOpen(false);
        setQualityMenuOpen(false);
      }, 3000);
    }
  }, [isPlaying]);

  // ================= 1. NATIVE HTML5 VIDEO CONTROLS =================
  useEffect(() => {
    if (!isDirectVideo || !nativeVideoRef.current) return;
    const v = nativeVideoRef.current;

    const handleLoadedMetadata = () => {
      setDuration(v.duration || 0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(v.currentTime || 0);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setHasStartedPlaying(true);
      resetControlsTimeout();
    };

    const handlePause = () => {
      setIsPlaying(false);
      setControlsVisible(true);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setControlsVisible(true);
      if (onEnded) onEnded();
    };

    v.addEventListener("loadedmetadata", handleLoadedMetadata);
    v.addEventListener("timeupdate", handleTimeUpdate);
    v.addEventListener("play", handlePlay);
    v.addEventListener("pause", handlePause);
    v.addEventListener("ended", handleEnded);

    return () => {
      v.removeEventListener("loadedmetadata", handleLoadedMetadata);
      v.removeEventListener("timeupdate", handleTimeUpdate);
      v.removeEventListener("play", handlePlay);
      v.removeEventListener("pause", handlePause);
      v.removeEventListener("ended", handleEnded);
    };
  }, [isDirectVideo, onEnded, resetControlsTimeout]);

  // ================= 2. YOUTUBE IFRAME API CONTROLS =================
  useEffect(() => {
    if (isDirectVideo || isDriveVideo) return;
    let isMounted = true;

    const initPlayer = () => {
      if (!isMounted || !window.YT || !window.YT.Player || !iframeTargetRef.current) return;

      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
      }

      try {
        playerRef.current = new window.YT.Player(iframeTargetRef.current, {
          videoId: resolvedYtId,
          playerVars: {
            autoplay: autoPlay ? 1 : 0,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            fs: 0,
            iv_load_policy: 3,
            disablekb: 1,
            playsinline: 1,
            origin: typeof window !== "undefined" ? window.location.origin : "",
          },
          events: {
            onReady: (event: YTEvent) => {
              if (!isMounted) return;
              const dur = event.target.getDuration();
              if (dur) setDuration(dur);
              event.target.setVolume(volume);

              try {
                const qualities = event.target.getAvailableQualityLevels();
                if (Array.isArray(qualities) && qualities.length > 0) {
                  setAvailableQualities(qualities);
                }
              } catch {}

              if (autoPlay) {
                event.target.playVideo();
                setHasStartedPlaying(true);
              }
            },
            onStateChange: (event: YTEvent) => {
              if (!isMounted) return;
              if (event.data === 1) {
                setIsPlaying(true);
                setHasStartedPlaying(true);
                resetControlsTimeout();
              } else if (event.data === 2) {
                setIsPlaying(false);
                setControlsVisible(true);
              } else if (event.data === 0) {
                setIsPlaying(false);
                setControlsVisible(true);
                if (onEnded) onEnded();
              }
            },
            onPlaybackQualityChange: (event: YTEvent) => {
              if (!isMounted) return;
              setCurrentQuality(String(event.data || "auto"));
            },
            onPlaybackRateChange: (event: YTEvent) => {
              if (!isMounted) return;
              setPlaybackSpeed(Number(event.data || 1));
            },
          },
        });
      } catch (err) {
        console.warn("YouTube player initialization note:", err);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      if (!document.getElementById("yt-iframe-api-script")) {
        const tag = document.createElement("script");
        tag.id = "yt-iframe-api-script";
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        initPlayer();
      };
    }

    return () => {
      isMounted = false;
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
      }
    };
  }, [resolvedYtId, autoPlay, onEnded, isDirectVideo, isDriveVideo, resetControlsTimeout, volume]);

  // Polling current time while playing YouTube
  useEffect(() => {
    if (!isDirectVideo && !isDriveVideo && isPlaying) {
      progressTimerRef.current = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          try {
            const cur = playerRef.current.getCurrentTime();
            const dur = playerRef.current.getDuration();
            setCurrentTime(cur);
            if (dur && dur !== duration) setDuration(dur);
          } catch {}
        }
      }, 250);
    } else if (!isDirectVideo && !isDriveVideo) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    }

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isPlaying, duration, isDirectVideo, isDriveVideo]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Play / Pause Toggle
  const togglePlay = () => {
    if (isDirectVideo && nativeVideoRef.current) {
      if (isPlaying) {
        nativeVideoRef.current.pause();
      } else {
        nativeVideoRef.current.play().catch(() => {});
        setHasStartedPlaying(true);
      }
      return;
    }

    if (playerRef.current) {
      try {
        if (isPlaying) {
          playerRef.current.pauseVideo();
        } else {
          playerRef.current.playVideo();
          setHasStartedPlaying(true);
        }
      } catch {}
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);

    if (isDirectVideo && nativeVideoRef.current) {
      nativeVideoRef.current.currentTime = targetTime;
      return;
    }

    if (playerRef.current && playerRef.current.seekTo) {
      try {
        playerRef.current.seekTo(targetTime, true);
      } catch {}
    }
  };

  const handleSeekRelative = (seconds: number) => {
    if (isDirectVideo && nativeVideoRef.current) {
      const cur = nativeVideoRef.current.currentTime;
      const targetTime = Math.max(0, Math.min(duration, cur + seconds));
      nativeVideoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
      return;
    }

    if (!playerRef.current || !playerRef.current.getCurrentTime) return;
    try {
      const cur = playerRef.current.getCurrentTime();
      const targetTime = Math.max(0, Math.min(duration, cur + seconds));
      setCurrentTime(targetTime);
      playerRef.current.seekTo(targetTime, true);
    } catch {}
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
    setIsMuted(newVol === 0);

    if (isDirectVideo && nativeVideoRef.current) {
      nativeVideoRef.current.volume = newVol / 100;
      nativeVideoRef.current.muted = newVol === 0;
      return;
    }

    if (playerRef.current) {
      try {
        playerRef.current.setVolume(newVol);
        if (newVol > 0 && playerRef.current.isMuted && playerRef.current.isMuted()) {
          playerRef.current.unMute();
        }
      } catch {}
    }
  };

  const toggleMute = () => {
    if (isDirectVideo && nativeVideoRef.current) {
      if (isMuted) {
        nativeVideoRef.current.muted = false;
        nativeVideoRef.current.volume = (volume || 50) / 100;
        setIsMuted(false);
      } else {
        nativeVideoRef.current.muted = true;
        setIsMuted(true);
      }
      return;
    }

    if (!playerRef.current) return;
    try {
      if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
        playerRef.current.setVolume(volume || 50);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    } catch {}
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    setSpeedMenuOpen(false);

    if (isDirectVideo && nativeVideoRef.current) {
      nativeVideoRef.current.playbackRate = speed;
      return;
    }

    if (playerRef.current && playerRef.current.setPlaybackRate) {
      try {
        playerRef.current.setPlaybackRate(speed);
      } catch {}
    }
  };

  const changeQuality = (quality: string) => {
    setCurrentQuality(quality);
    setQualityMenuOpen(false);
    if (playerRef.current && playerRef.current.setPlaybackQuality) {
      try {
        playerRef.current.setPlaybackQuality(quality);
      } catch {}
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.warn("Fullscreen request error:", err);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatQualityLabel = (q: string) => {
    switch (q) {
      case "highres":
        return "4K / High Res";
      case "hd1080":
        return "1080p HD";
      case "hd720":
        return "720p HD";
      case "large":
        return "480p";
      case "medium":
        return "360p";
      case "small":
        return "240p";
      case "tiny":
        return "144p";
      case "auto":
      default:
        return "Auto";
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Render Google Drive Embed
  if (isDriveVideo) {
    const driveEmbedUrl = effectiveUrl.includes("/preview")
      ? effectiveUrl
      : effectiveUrl.replace(/\/view(\?.*)?$/, "/preview");

    return (
      <div
        ref={containerRef}
        className={`relative w-full aspect-video bg-[#0a0a0a] rounded-2xl overflow-hidden border border-[var(--surface-border)] shadow-xl ${className}`}
      >
        <iframe
          src={driveEmbedUrl}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen"
          title={title}
        />
        {watermarkText && (
          <div className="absolute top-3.5 right-3.5 z-25 pointer-events-none px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-xs border border-white/10 text-white/70 font-mono text-[10px] tracking-wider select-none shadow-xs">
            {watermarkText}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onMouseEnter={() => setControlsVisible(true)}
      className={`relative w-full aspect-video bg-[#0a0a0a] rounded-2xl overflow-hidden select-none group border border-[var(--surface-border)] shadow-xl ${
        isFullscreen ? "rounded-none max-h-screen flex items-center justify-center border-none" : ""
      } ${className}`}
    >
      {/* Direct Video (HTML5) OR YouTube Embed Container */}
      {isDirectVideo ? (
        <video
          ref={nativeVideoRef}
          src={effectiveUrl}
          poster={poster}
          playsInline
          className="w-full h-full object-contain bg-black"
          onClick={togglePlay}
        />
      ) : (
        <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
          <div
            ref={iframeTargetRef}
            className="w-full h-full pointer-events-auto scale-[1.01] transform origin-center"
          />
        </div>
      )}

      {/* Dynamic Security Watermark Overlay */}
      {watermarkText && (
        <div className="absolute top-3.5 right-3.5 z-25 pointer-events-none px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-xs border border-white/10 text-white/70 font-mono text-[10px] tracking-wider select-none shadow-xs">
          {watermarkText}
        </div>
      )}

      {/* Poster preview before first play (if not direct video which shows its poster natively) */}
      {!isDirectVideo && !hasStartedPlaying && (
        <div
          className="absolute inset-0 bg-cover bg-center flex items-center justify-center z-10"
          style={{ backgroundImage: `url(${poster})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20" />
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Play video"
            className="relative z-20 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/95 dark:bg-[#141416]/95 border-2 border-[#d4af37] text-[#d4af37] flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer group-hover:border-[#e9c349]"
          >
            <span
              className="material-symbols-outlined text-[42px] sm:text-[48px] ml-1"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              play_arrow
            </span>
          </button>
          <div className="absolute bottom-6 left-6 right-6 z-20 text-white flex items-center justify-between">
            <div className="max-w-md">
              <span className="font-display text-[11px] uppercase tracking-[0.2em] text-[#d4af37] font-bold block mb-1">
                SpeakUp Learning Experience
              </span>
              <h3 className="font-display text-lg sm:text-xl font-bold truncate">{title}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Click-to-Play Overlay for YouTube */}
      {!isDirectVideo && hasStartedPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 z-20 cursor-pointer"
          title={isPlaying ? "Click to Pause" : "Click to Play"}
        >
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all">
              <div className="w-20 h-20 rounded-full bg-[#141416]/90 border border-[#d4af37] text-[#d4af37] flex items-center justify-center shadow-2xl hover:scale-105 transition-transform">
                <span
                  className="material-symbols-outlined text-[42px] ml-1"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  play_arrow
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom SpeakUp Control Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 p-4 sm:p-5 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-col gap-2.5 transition-opacity duration-300 ${
          controlsVisible || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrubber Track */}
        <div className="relative group/scrub w-full flex items-center cursor-pointer py-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Seek video position"
            className="w-full h-1.5 sm:h-2 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
            style={{
              background: `linear-gradient(to right, #d4af37 0%, #d4af37 ${progressPercent}%, rgba(255, 255, 255, 0.25) ${progressPercent}%, rgba(255, 255, 255, 0.25) 100%)`,
            }}
          />
        </div>

        {/* Controls Layout */}
        <div className="flex items-center justify-between text-white text-xs gap-3">
          {/* Left Controls: Play/Pause, Rewind, Forward, Volume, Time */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="text-white hover:text-[#d4af37] transition-colors p-1 rounded-md hover:bg-white/10 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]">
                {isPlaying ? "pause" : "play_arrow"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSeekRelative(-10)}
              aria-label="Replay 10 seconds"
              className="text-white/80 hover:text-[#d4af37] transition-colors p-1 rounded-md hover:bg-white/10 cursor-pointer hidden sm:inline-flex"
            >
              <span className="material-symbols-outlined text-[20px]">replay_10</span>
            </button>

            <button
              type="button"
              onClick={() => handleSeekRelative(10)}
              aria-label="Forward 10 seconds"
              className="text-white/80 hover:text-[#d4af37] transition-colors p-1 rounded-md hover:bg-white/10 cursor-pointer hidden sm:inline-flex"
            >
              <span className="material-symbols-outlined text-[20px]">forward_10</span>
            </button>

            {/* Volume & Mute */}
            <div className="flex items-center gap-2 group/vol">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"}
                className="text-white/80 hover:text-[#d4af37] transition-colors p-1 rounded-md hover:bg-white/10 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isMuted || volume === 0
                    ? "volume_off"
                    : volume < 50
                    ? "volume_down"
                    : "volume_up"}
                </span>
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                aria-label="Volume control"
                className="w-14 sm:w-20 h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-[#d4af37] focus:outline-none"
              />
            </div>

            {/* Time Stamp */}
            <div className="font-mono text-[11px] text-white/80 select-none">
              <span>{formatTime(currentTime)}</span>
              <span className="mx-1 text-white/40">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Speed, Quality, Fullscreen */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Speed Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setSpeedMenuOpen(!speedMenuOpen);
                  setQualityMenuOpen(false);
                }}
                className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white font-mono text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Playback Speed"
              >
                <span>{playbackSpeed}x</span>
                <span className="material-symbols-outlined text-[14px]">expand_less</span>
              </button>

              {speedMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-28 bg-[#141416] border border-white/15 rounded-xl shadow-2xl py-1.5 z-40">
                  <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-[#d4af37] font-bold border-b border-white/10 font-display">
                    Speed
                  </div>
                  {SPEED_OPTIONS.map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => changeSpeed(spd)}
                      className={`w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-[#d4af37]/20 flex items-center justify-between cursor-pointer ${
                        playbackSpeed === spd ? "text-[#d4af37] font-bold" : "text-white"
                      }`}
                    >
                      <span>{spd}x</span>
                      {playbackSpeed === spd && (
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quality Menu (if YouTube) */}
            {!isDirectVideo && availableQualities.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setQualityMenuOpen(!qualityMenuOpen);
                    setSpeedMenuOpen(false);
                  }}
                  className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white font-mono text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors hidden sm:inline-flex"
                  title="Quality Selection"
                >
                  <span className="material-symbols-outlined text-[14px]">settings</span>
                  <span>{formatQualityLabel(currentQuality)}</span>
                </button>

                {qualityMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-36 bg-[#141416] border border-white/15 rounded-xl shadow-2xl py-1.5 z-40 max-h-48 overflow-y-auto custom-scroll">
                    <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-[#d4af37] font-bold border-b border-white/10 font-display">
                      Quality
                    </div>
                    {["auto", ...availableQualities].map((qual) => (
                      <button
                        key={qual}
                        type="button"
                        onClick={() => changeQuality(qual)}
                        className={`w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-[#d4af37]/20 flex items-center justify-between cursor-pointer ${
                          currentQuality === qual ? "text-[#d4af37] font-bold" : "text-white"
                        }`}
                      >
                        <span>{formatQualityLabel(qual)}</span>
                        {currentQuality === qual && (
                          <span className="material-symbols-outlined text-[14px]">check</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              className="text-white hover:text-[#d4af37] transition-colors p-1 rounded-md hover:bg-white/10 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">
                {isFullscreen ? "fullscreen_exit" : "fullscreen"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
