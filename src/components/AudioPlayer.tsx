import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles } from "lucide-react";

interface AudioPlayerProps {
  textToSpeak: string;
  languageCode?: string; // "hi" | "pa" | "en"
  audioUrl?: string; // Backend audio URL or data URL
  autoPlay?: boolean;
  onEnded?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  textToSpeak,
  languageCode = "hi",
  audioUrl,
  autoPlay = false,
  onEnded,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const hasTriggeredAutoPlay = useRef(false);

  const isBrowserSpeech = !audioUrl || audioUrl.trim().length === 0;

  // Setup Browser Speech Synthesis
  const playBrowserSpeech = () => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    speechUtteranceRef.current = utterance;

    // Pick best matching Indian voice
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voices.find((v) => {
      const lang = v.lang.toLowerCase();
      if (languageCode === "pa") return lang.includes("pa") || lang.includes("punjab");
      if (languageCode === "hi") return lang.includes("hi") || lang.includes("hindi");
      if (languageCode === "en") return lang.includes("en-in") || lang.includes("indian");
      return false;
    });

    if (!selectedVoice && languageCode === "hi") {
      selectedVoice = voices.find((v) => v.lang.startsWith("hi"));
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.lang = languageCode === "pa" ? "pa-IN" : languageCode === "en" ? "en-IN" : "hi-IN";
    utterance.rate = playbackRate;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setProgress(100);
      onEnded?.();
    };

    utterance.onerror = (e) => {
      console.warn("Speech synthesis error:", e);
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopBrowserSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  // Toggle playback
  const togglePlay = () => {
    if (isBrowserSpeech) {
      if (isPlaying) {
        stopBrowserSpeech();
      } else {
        playBrowserSpeech();
      }
    } else if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((err) => {
          console.warn("Audio playback failed, falling back to speech synthesis:", err);
          playBrowserSpeech();
        });
      }
    }
  };

  const restartAudio = () => {
    if (isBrowserSpeech) {
      stopBrowserSpeech();
      playBrowserSpeech();
    } else if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [0.8, 1.0, 1.2];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const newRate = rates[nextIndex];
    setPlaybackRate(newRate);

    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
    if (isBrowserSpeech && isPlaying) {
      stopBrowserSpeech();
      playBrowserSpeech();
    }
  };

  // Auto-play effect once loaded
  useEffect(() => {
    if (autoPlay && !hasTriggeredAutoPlay.current && textToSpeak) {
      hasTriggeredAutoPlay.current = true;
      const timer = setTimeout(() => {
        if (!isBrowserSpeech && audioRef.current) {
          audioRef.current.play().catch(() => {
            // If browser autoplay policy blocks audio element, try speech synthesis or wait for user touch
            playBrowserSpeech();
          });
        } else {
          playBrowserSpeech();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, textToSpeak, audioUrl]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div
      id="audio-player-container"
      className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
    >
      {/* Audio element for URL-based audio */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            onEnded?.();
          }}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
              const dur = audioRef.current.duration || 1;
              setDuration(dur);
              setProgress((audioRef.current.currentTime / dur) * 100);
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration);
            }
          }}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        {/* Play / Pause Main Action */}
        <button
          id="audio-player-play-btn"
          type="button"
          onClick={togglePlay}
          className={`flex items-center justify-center w-11 h-11 rounded-full text-white shadow-xs transition-transform active:scale-95 ${
            isPlaying
              ? "bg-amber-600 hover:bg-amber-700 ring-4 ring-amber-200 dark:ring-amber-900/40"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
          title={isPlaying ? "Pause voice (रोकें)" : "Listen to answer (आवाज सुनें)"}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Dynamic Voice Waveform Bars */}
        <div className="flex-1 flex items-center gap-1 h-8 px-2 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          {[40, 75, 55, 90, 60, 30, 85, 45, 95, 70, 50, 80, 65, 35, 90, 50, 75].map(
            (height, i) => (
              <div
                key={i}
                className={`flex-1 rounded-full transition-all duration-200 ${
                  isPlaying
                    ? "bg-indigo-500 animate-pulse"
                    : "bg-slate-200 dark:bg-slate-800"
                }`}
                style={{
                  height: isPlaying ? `${Math.max(20, (height * ((i % 3) + 1)) % 100)}%` : "25%",
                  animationDelay: `${i * 60}ms`,
                }}
              />
            )
          )}
        </div>

        {/* Speed / Rate Toggle */}
        <button
          id="audio-player-speed-btn"
          type="button"
          onClick={cyclePlaybackRate}
          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          title="Playback speed"
        >
          {playbackRate}x
        </button>

        {/* Restart Button */}
        <button
          id="audio-player-restart-btn"
          type="button"
          onClick={restartAudio}
          className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          title="Replay from start (दोबारा सुनें)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Voice engine info badge */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          {audioUrl ? "ElevenLabs Multilingual Speech" : "BoloSync Regional Voice Output"}
        </span>
        <span>
          {isPlaying ? "Speaking aloud..." : "Tap play to listen"}
        </span>
      </div>
    </div>
  );
};
