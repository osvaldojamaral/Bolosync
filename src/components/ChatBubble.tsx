import React, { useState } from "react";
import {
  Volume2,
  PhoneCall,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Share2,
  Check,
} from "lucide-react";
import { ChatMessage } from "../types";
import { DomainBadge } from "./DomainBadge";
import { AudioPlayer } from "./AudioPlayer";
import { useLanguage } from "../services/i18n";

interface ChatBubbleProps {
  message: ChatMessage;
  onHelplineClick?: (helpline: string) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  onHelplineClick,
}) => {
  const { language, t } = useLanguage();
  const [showEnglishTranslation, setShowEnglishTranslation] = useState(false);
  const [showLatencyDetails, setShowLatencyDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const isUser = message.sender === "user";

  const handleCopyText = () => {
    const text = isUser
      ? message.transcript || ""
      : message.answerText || "";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div
        id={`user-message-${message.id}`}
        className="flex flex-col items-end my-3 max-w-2xl ml-auto px-2"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {message.languageName || t("userQuery")}
          </span>
          <span className="text-[10px] text-slate-400">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="bg-gradient-to-r from-indigo-600 to-blue-700 text-white p-4 rounded-2xl rounded-tr-xs shadow-xs max-w-full">
          <p className="text-base sm:text-lg font-medium leading-relaxed">
            "{message.transcript}"
          </p>

          {/* If audio blob exists */}
          {message.audioBlobUrl && (
            <div className="mt-2.5 pt-2 border-t border-indigo-400/40">
              <audio controls src={message.audioBlobUrl} className="h-8 w-full max-w-xs" />
            </div>
          )}

          {/* English translation note if not in English */}
          {message.translatedQuery && message.detectedLanguage !== "en" && (
            <p className="mt-1 text-xs text-indigo-100 italic">
              {t("translatedForRag")}: "{message.translatedQuery}"
            </p>
          )}
        </div>
      </div>
    );
  }

  // Assistant Response Bubble
  return (
    <div
      id={`assistant-message-${message.id}`}
      className="flex flex-col items-start my-4 max-w-3xl mr-auto px-2 w-full"
    >
      <div className="flex items-center justify-between w-full mb-1.5 px-1">
        <div className="flex items-center gap-2">
          {message.isNavigation ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <Volume2 className="w-3.5 h-3.5" />
              <span>{t("voiceNavigation")} ({message.commandType || t("command")})</span>
            </span>
          ) : (
            message.domain && message.domain !== "general" && (
              <DomainBadge domain={message.domain} size="md" />
            )
          )}
          {message.confidence && !message.isNavigation && (
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-slate-700/60">
              {Math.round(message.confidence * 100)}% {t("match")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyText}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 text-xs flex items-center gap-1"
            title={t("copyAnswer")}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
          </button>
          <span className="text-[10px] text-slate-400">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* Main Content Box */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-xs p-5 shadow-xs transition-all">
        {/* Native Spoken Answer Text */}
        <div className="mb-4">
          <p className="text-lg sm:text-xl font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
            {message.answerText}
          </p>
        </div>

        {/* Inline Voice Audio Player */}
        {message.answerText && (
          <div className="mb-4">
            <AudioPlayer
              textToSpeak={message.answerText}
              languageCode={message.detectedLanguage || "hi"}
              audioUrl={message.answerAudioUrl}
              autoPlay={true}
            />
          </div>
        )}

        {/* Medical / Health Safety Disclaimer */}
        {message.domain === "health" && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <span className="font-semibold">{t("healthNotice")} </span>
              {message.disclaimer ||
                "यह केवल घरेलू मार्गदर्शन व प्राथमिक उपचार है। गंभीर स्थिति में तुरंत निकटतम प्राथमिक स्वास्थ्य केंद्र (PHC) या डॉक्टर से संपर्क करें।"}
            </div>
          </div>
        )}

        {/* Footer Actions: Helpline + English toggle + Pipeline latency */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Official Helpline Button */}
          {message.helpline ? (
            <a
              href={`tel:${message.helpline.split("/")[0].trim()}`}
              id={`call-helpline-${message.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t("helpline")}: {message.helpline}</span>
            </a>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {/* View English Translation Toggle */}
            {message.answerTextEn && language !== "en" && (
              <button
                type="button"
                onClick={() => setShowEnglishTranslation(!showEnglishTranslation)}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded-md transition-colors"
              >
                <span>{t("englishText")}</span>
                {showEnglishTranslation ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            {/* Pipeline Latency Inspector Toggle */}
            {message.latencyBreakdown && (
              <button
                type="button"
                onClick={() => setShowLatencyDetails(!showLatencyDetails)}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-colors"
                title="Inspect pipeline round-trip latency"
              >
                <Cpu className="w-3 h-3 text-indigo-500" />
                <span>{message.latencyBreakdown.total_ms}ms</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible English Answer Panel */}
        {showEnglishTranslation && message.answerTextEn && (
          <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <span className="font-semibold text-xs text-slate-500 block mb-1">
              {t("englishTranslation")}:
            </span>
            <p>{message.answerTextEn}</p>
          </div>
        )}

        {/* Collapsible Latency Breakdown Panel */}
        {showLatencyDetails && message.latencyBreakdown && (
          <div className="mt-3 p-3 bg-slate-950 text-slate-100 rounded-xl text-xs space-y-1.5 font-mono border border-slate-800">
            <div className="font-semibold text-indigo-400 flex items-center justify-between pb-1 border-b border-slate-800">
              <span>BoloSync Pipeline Telemetry</span>
              <span>Total: {message.latencyBreakdown.total_ms}ms</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">1. STT Whisper/Gemini</span>
                <span className="font-bold text-emerald-400">{message.latencyBreakdown.stt_ms}ms</span>
              </div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">2. Translation In</span>
                <span className="font-bold text-emerald-400">{message.latencyBreakdown.translate_in_ms}ms</span>
              </div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">3. RAG + Gemini</span>
                <span className="font-bold text-emerald-400">{message.latencyBreakdown.rag_ms}ms</span>
              </div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">4. Translation + TTS</span>
                <span className="font-bold text-emerald-400">
                  {message.latencyBreakdown.translate_out_ms + message.latencyBreakdown.tts_ms}ms
                </span>
              </div>
            </div>
            {message.sources && message.sources.length > 0 && (
              <div className="pt-1 text-[11px] text-slate-300">
                <span className="text-slate-400">Knowledge Citations: </span>
                {message.sources.map((s) => s.title).join(", ")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
