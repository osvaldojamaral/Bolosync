import React, { useEffect, useRef, useState } from "react";
import { Mic, Sparkles, Volume2, Activity } from "lucide-react";

interface LiveModeBubbleProps {
  isActive: boolean;
  onToggle: (next: boolean) => void;
  onCommand: (transcript: string) => Promise<void> | void;
  statusText?: string;
  language?: string;
}

export const LiveModeBubble: React.FC<LiveModeBubbleProps> = ({
  isActive,
  onToggle,
  onCommand,
  statusText,
  language = "hi",
}) => {
  const recognitionRef = useRef<any>(null);
  const lastCommandRef = useRef<string>("");
  const lastCommandAtRef = useRef<number>(0);
  const sessionIdRef = useRef<number>(0);
  const [transcript, setTranscript] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const stopListening = () => {
    sessionIdRef.current += 1;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setTranscript("");
    setError(null);
    lastCommandRef.current = "";
    lastCommandAtRef.current = 0;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const startListening = () => {
    if (typeof window === "undefined") return;
    if (recognitionRef.current) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    setError(null);

    try {
      const currentSession = ++sessionIdRef.current;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = language === "pa" ? "pa-IN" : language === "en" ? "en-IN" : "hi-IN";

      recognition.onresult = (event: any) => {
        if (currentSession !== sessionIdRef.current) return;
        const newestResult = event.results[event.resultIndex ?? event.results.length - 1];
        const latestChunk = newestResult?.[0]?.transcript?.trim() || "";

        if (!latestChunk) return;

        const compactText = latestChunk.replace(/\s+/g, " ").trim();
        setTranscript(compactText);

        const isFinal = Boolean(newestResult?.isFinal);
        if (isFinal) {
          const clean = compactText;
          const now = Date.now();
          const isDuplicateWithinCooldown =
            clean === lastCommandRef.current && now - lastCommandAtRef.current < 2000;

          if (clean && !isDuplicateWithinCooldown) {
            lastCommandRef.current = clean;
            lastCommandAtRef.current = now;
            void onCommand(clean);
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (currentSession !== sessionIdRef.current) return;
        const code = event?.error;
        if (code === "not-allowed") {
          setError("Microphone permission is required for Live Mode.");
        } else if (code === "no-speech") {
          setError(null);
        }
      };

      recognition.onend = () => {
        if (currentSession !== sessionIdRef.current) return;
        recognitionRef.current = null;
        if (isActive) {
          try {
            setTimeout(() => {
              if (isActive && currentSession === sessionIdRef.current && !recognitionRef.current) {
                startListening();
              }
            }, 10);
          } catch {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setError("Unable to start Live Mode microphone.");
    }
  };

  useEffect(() => {
    if (isActive) {
      startListening();
    } else {
      stopListening();
      lastCommandRef.current = "";
    }

    return () => {
      stopListening();
    };
  }, [isActive, language]);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {isActive && (
        <div className="max-w-xs rounded-2xl border border-indigo-200 bg-white/95 p-3 shadow-2xl backdrop-blur-md dark:border-indigo-800 dark:bg-slate-900/95">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">
            <Activity className="h-3.5 w-3.5 animate-pulse" />
            Live AI
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
            <Volume2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="truncate">{transcript || statusText || (language === "pa" ? "ਆਵਾਜ਼ ਕਮਾਂਡ ਦੀ ਉਡੀਕ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ..." : language === "en" ? "Listening for a voice command..." : "आवाज़ कमांड की प्रतीक्षा है...")}</span>
          </div>

          {error && (
            <div className="mt-2 text-[11px] text-rose-600 dark:text-rose-400">{error}</div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => onToggle(!isActive)}
        className={`group relative flex items-center justify-center rounded-full shadow-xl transition-all active:scale-95 ${
          isActive
            ? "h-16 w-16 bg-gradient-to-r from-rose-600 to-orange-500 text-white ring-4 ring-rose-500/20"
            : "h-16 w-16 bg-gradient-to-r from-indigo-600 to-emerald-600 text-white ring-4 ring-indigo-500/20 hover:scale-[1.02]"
        }`}
        aria-label={isActive ? "Turn off Live Mode" : "Turn on Live Mode"}
        title={isActive ? "Turn off Live Mode" : "Turn on Live Mode"}
      >
        <span className={`absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${isActive ? "bg-white animate-pulse" : "bg-emerald-300"}`} />
        <Mic className="h-5 w-5 relative z-10" />
        <Sparkles className="absolute right-2 top-2 h-3.5 w-3.5 opacity-80" />
      </button>
    </div>
  );
};
