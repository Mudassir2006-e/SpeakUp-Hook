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

interface SpeakUpVideoPlayerProps {
  videoId?: string;
  title?: string;
  poster?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  className?: string;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export default function SpeakUpVideoPlayer({
  videoId = "iCvmsMzlF7o",
  title = "SpeakUp Executive Masterclass Demo",
  poster = "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80",
  autoPlay = false,
  onEnded,
  className = "",
}: SpeakUpVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeTargetRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Load YouTube IFrame API
  useEffect(() => {
    let isMounted = true;

    const initPlayer = () => {
      if (!isMounted || !window.YT || !window.YT.Player || !iframeTargetRef.current) return;

      // Clean up previous instance if any
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
      }

      try {
        playerRef.current = new window.YT.Player(iframeTargetRef.current, {
          videoId,
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

              // Extract available quality levels
              try {
                const qualities = event.target.getAvailableQualityLevels();
                if (Array.isArray(qualities) && qualities.length > 0) {
                  setAvailableQualities(qualities);
                }
              } catch {
                // Ignore quality fetch if restricted
              }

              if (autoPlay) {
                event.target.playVideo();
                setHasStartedPlaying(true);
              }
            },
            onStateChange: (event: YTEvent) => {
              if (!isMounted) return;
              // YT.PlayerState: PLAYING = 1, PAUSED = 2, ENDED = 0, BUFFERING = 3
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, autoPlay, onEnded]);

  // Polling current time while playing
  useEffect(() => {
    if (isPlaying) {
      progressTimerRef.current = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          try {
            const cur = playerRef.current.getCurrentTime();
            const dur = playerRef.current.getDuration();
            setCurrentTime(cur);
            if (dur && dur !== duration) setDuration(dur);
          } catch {
            // ignore
          }
        }
      }, 250);
    } else {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    }

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isPlaying, duration]);

  // Listen to fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Controls actions
  const togglePlay = () => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
        setHasStartedPlaying(true);
      }
    } catch {
      // fallback
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (playerRef.current && playerRef.current.seekTo) {
      try {
        playerRef.current.seekTo(targetTime, true);
      } catch {
        // ignore
      }
    }
  };

  const handleSeekRelative = (seconds: number) => {
    if (!playerRef.current || !playerRef.current.getCurrentTime) return;
    try {
      const cur = playerRef.current.getCurrentTime();
      const targetTime = Math.max(0, Math.min(duration, cur + seconds));
      setCurrentTime(targetTime);
      playerRef.current.seekTo(targetTime, true);
    } catch {
      // ignore
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
    if (newVol === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
    if (playerRef.current) {
      try {
        playerRef.current.setVolume(newVol);
        if (newVol > 0 && playerRef.current.isMuted && playerRef.current.isMuted()) {
          playerRef.current.unMute();
        }
      } catch {
        // ignore
      }
    }
  };

  const toggleMute = () => {
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
    } catch {
      // ignore
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    setSpeedMenuOpen(false);
    if (playerRef.current && playerRef.current.setPlaybackRate) {
      try {
        playerRef.current.setPlaybackRate(speed);
      } catch {
        // ignore
      }
    }
  };

  const changeQuality = (quality: string) => {
    setCurrentQuality(quality);
    setQualityMenuOpen(false);
    if (playerRef.current && playerRef.current.setPlaybackQuality) {
      try {
        playerRef.current.setPlaybackQuality(quality);
      } catch {
        // ignore
      }
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

  // Readable quality name
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

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onMouseEnter={() => setControlsVisible(true)}
      className={`relative w-full aspect-video bg-[#0a0a0a] rounded-2xl overflow-hidden select-none group border border-[var(--surface-border)] shadow-xl ${
        isFullscreen ? "rounded-none max-h-screen flex items-center justify-center border-none" : ""
      } ${className}`}
    >
      {/* YouTube IFrame Container */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
        {/* Slightly scaled to hide top YouTube title bar gracefully if rendered by iframe */}
        <div
          ref={iframeTargetRef}
          className="w-full h-full pointer-events-auto scale-[1.01] transform origin-center"
        />
      </div>

      {/* Poster preview before first play if not autoPlay and not ready */}
      {!hasStartedPlaying && (
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
                SpeakUp Studio Masterclass
              </span>
              <h3 className="font-display text-lg sm:text-xl font-bold truncate">{title}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Transparent Click-to-Play Overlay (catches clicks on video area) */}
      {hasStartedPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 z-20 cursor-pointer"
          title={isPlaying ? "Click to Pause" : "Click to Play"}
        >
          {/* Subtle center pause/play flash indicator */}
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
            {/* Play/Pause */}
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

            {/* Replay 10s */}
            <button
              type="button"
              onClick={() => handleSeekRelative(-10)}
              aria-label="Replay 10 seconds"
              className="text-white/80 hover:text-[#d4af37] transition-colors p-1 rounded-md hover:bg-white/10 cursor-pointer hidden sm:inline-flex"
            >
              <span className="material-symbols-outlined text-[20px]">replay_10</span>
            </button>

            {/* Forward 10s */}
            <button
              type="button"
              onClick={() => handleSeekRelative(10)}
              aria-label="Forward 10 seconds"
              className="text-white/80 hover:text-[#d4af37] transition-colors p-1 rounded-md hover:bg-white/10 cursor-pointer hidden sm:inline-flex"
            >
              <span className="material-symbols-outlined text-[20px]">forward_10</span>
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 group/volume relative">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute" : "Mute"}
                className="text-white/90 hover:text-[#d4af37] transition-colors p-1 rounded-md hover:bg-white/10 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px]">
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
                aria-label="Volume level"
                className="w-16 sm:w-20 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#d4af37]"
                style={{
                  background: `linear-gradient(to right, #d4af37 0%, #d4af37 ${
                    isMuted ? 0 : volume
                  }%, rgba(255, 255, 255, 0.25) ${isMuted ? 0 : volume}%, rgba(255, 255, 255, 0.25) 100%)`,
                }}
              />
            </div>

            {/* Time Stamp */}
            <div className="font-display text-[11px] sm:text-xs text-white/80 font-semibold tracking-wider whitespace-nowrap">
              <span>{formatTime(currentTime)}</span>
              <span className="text-white/40 mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Speed, Quality, Fullscreen */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Playback Speed Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setSpeedMenuOpen(!speedMenuOpen);
                  setQualityMenuOpen(false);
                }}
                aria-label="Playback speed"
                className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-[#d4af37] text-white hover:text-[#1a1a1a] font-display font-bold text-[11px] sm:text-xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>{playbackSpeed}×</span>
              </button>

              {speedMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-32 bg-[#141416]/95 border border-[var(--surface-border)] rounded-xl shadow-2xl py-1.5 z-50 backdrop-blur-md animate-in fade-in duration-150">
                  <div className="px-3 py-1 text-[10px] font-display uppercase tracking-widest text-[#d4af37] font-bold border-b border-white/10 mb-1">
                    Playback Speed
                  </div>
                  {SPEED_OPTIONS.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => changeSpeed(rate)}
                      className={`w-full text-left px-3 py-1.5 text-xs font-display flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer ${
                        playbackSpeed === rate
                          ? "text-[#d4af37] font-bold bg-[#d4af37]/10"
                          : "text-white/80"
                      }`}
                    >
                      <span>{rate}×</span>
                      {playbackSpeed === rate && (
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quality Settings Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setQualityMenuOpen(!qualityMenuOpen);
                  setSpeedMenuOpen(false);
                }}
                aria-label="Quality settings"
                className="text-white/80 hover:text-[#d4af37] transition-colors p-1.5 rounded-md hover:bg-white/10 cursor-pointer flex items-center"
              >
                <span className="material-symbols-outlined text-[20px]">settings</span>
              </button>

              {qualityMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-36 bg-[#141416]/95 border border-[var(--surface-border)] rounded-xl shadow-2xl py-1.5 z-50 backdrop-blur-md animate-in fade-in duration-150">
                  <div className="px-3 py-1 text-[10px] font-display uppercase tracking-widest text-[#d4af37] font-bold border-b border-white/10 mb-1">
                    Quality
                  </div>
                  {(availableQualities.length > 0
                    ? availableQualities
                    : ["hd720", "large", "medium", "auto"]
                  ).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => changeQuality(q)}
                      className={`w-full text-left px-3 py-1.5 text-xs font-display flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer ${
                        currentQuality === q
                          ? "text-[#d4af37] font-bold bg-[#d4af37]/10"
                          : "text-white/80"
                      }`}
                    >
                      <span>{formatQualityLabel(q)}</span>
                      {currentQuality === q && (
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              className="text-white/80 hover:text-[#d4af37] transition-colors p-1.5 rounded-md hover:bg-white/10 cursor-pointer flex items-center"
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
