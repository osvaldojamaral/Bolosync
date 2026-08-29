import React, { useState } from "react";
import {
  History,
  X,
  Volume2,
  VolumeX,
  CheckCircle2,
  Clock,
  Radio,
  WifiOff,
  Sparkles,
} from "lucide-react";
import { ChatMessage } from "../types";
import { DomainBadge } from "./DomainBadge";

interface QueryHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
}

export const QueryHistoryModal: React.FC<QueryHistoryModalProps> = ({
  isOpen,
  onClose,
  messages,
}) => {
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null);

  if (!isOpen) return null;

  // Filter assistant messages that have answers
  const answeredQueries = messages
    .filter((m) => m.sender === "assistant" && m.answerText && m.id !== "welcome-msg")
    .reverse()
    .slice(0, 20);

  const handlePlayAudio = (id: string, audioUrl?: string, text?: string) => {
    if (audioObj) {
      audioObj.pause();
      setAudioObj(null);
    }
    window.speechSynthesis?.cancel();

    if (playingAudioId === id) {
      setPlayingAudioId(null);
      return;
    }

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        setPlayingAudioId(null);
        setAudioObj(null);
      };
      audio.onerror = () => {
        setPlayingAudioId(null);
        setAudioObj(null);
      };
      audio.play().catch(() => {});
      setAudioObj(audio);
      setPlayingAudioId(id);
    } else if (text && "speechSynthesis" in window) {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "hi-IN";
      utter.onend = () => setPlayingAudioId(null);
      utter.onerror = () => setPlayingAudioId(null);
      window.speechSynthesis.speak(utter);
      setPlayingAudioId(id);
    }
  };

  return (
    <div
      id="query-history-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => {
        if (audioObj) audioObj.pause();
        window.speechSynthesis?.cancel();
        onClose();
      }}
    >
      <div
        id="query-history-modal-content"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-slate-900 text-white shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">Recent Spoken Queries History</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Cached in Session
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                पिछले पूछे गए प्रश्नों और वॉयस उत्तरों का ऑफलाइन संग्रह ({answeredQueries.length} available)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (audioObj) audioObj.pause();
              window.speechSynthesis?.cancel();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of past queries */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {answeredQueries.map((msg, idx) => {
            const isPlaying = playingAudioId === msg.id;

            return (
              <div
                key={msg.id || idx}
                className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-2"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <DomainBadge domain={msg.domain || "general"} size="sm" />
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Offline Replay Ready
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* User Query Question */}
                {msg.transcript && (
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-start gap-1.5">
                    <span className="text-indigo-600 font-bold">Q:</span>
                    <span>{msg.transcript}</span>
                  </div>
                )}

                {/* Spoken Answer */}
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  {msg.answerText}
                </p>

                {/* Actions: Audio Replay Button */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    {msg.latencyBreakdown && (
                      <span>Latency: {msg.latencyBreakdown.total_ms}ms</span>
                    )}
                    {msg.helpline && (
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        ☎ {msg.helpline}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePlayAudio(msg.id, msg.answerAudioUrl, msg.answerText)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      isPlaying
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800"
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Listen Again (पुनः सुनें)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {answeredQueries.length === 0 && (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <History className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium">No previous voice queries recorded in this session.</p>
              <p className="text-xs text-slate-400">Speak or type a query using the mic or sample queries below.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between shrink-0">
          <span>* Queries and synthesized speech are cached locally for offline playback during your session.</span>
          <button
            type="button"
            onClick={() => {
              if (audioObj) audioObj.pause();
              window.speechSynthesis?.cancel();
              onClose();
            }}
            className="font-semibold text-slate-700 dark:text-slate-300 hover:underline text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
