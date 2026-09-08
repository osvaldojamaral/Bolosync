import React, { useState, useEffect, useRef } from "react";
import { Mic, Check, Hand } from "lucide-react";
import { motion } from "motion/react";

interface SpokenLanguageSelectorProps {
  onLanguageSelected: (langCode: "hi" | "pa" | "en") => void;
  onCancel?: () => void;
  isReTrigger?: boolean;
}

interface LanguageOption {
  code: "hi" | "pa" | "en";
  nameNative: string;
  nameEn: string;
  flag: string;
  spokenPrompt: string;
  welcomeResponse: string;
}

const LANGUAGES: LanguageOption[] = [
  {
    code: "hi",
    nameNative: "हिंदी",
    nameEn: "Hindi",
    flag: "🇮🇳",
    spokenPrompt: "हिंदी के लिए बोलें 'हिंदी'...",
    welcomeResponse:
      "ठीक है, मैं हिंदी में बात करूंगी। मैं बोलोसिंक हूं। मैं योजनाओं, स्वास्थ्य, खेती और और भी बहुत कुछ में मदद कर सकती हूं। आप कुछ भी पूछ सकते हैं, या बताइए कि आप क्या जानना चाहते हैं।",
  },
  {
    code: "pa",
    nameNative: "ਪੰਜਾਬੀ",
    nameEn: "Punjabi",
    flag: "🇮🇳",
    spokenPrompt: "ਪੰਜਾਬੀ ਲਈ ਬੋਲੋ 'ਪੰਜਾਬੀ'...",
    welcomeResponse:
      "ਠੀਕ ਹੈ, ਮੈਂ ਪੰਜਾਬੀ ਵਿੱਚ ਗੱਲ ਕਰਾਂਗੀ। ਮੈਂ ਬੋਲੋਸਿੰਕ ਹਾਂ। ਮੈਂ ਸਕੀਮਾਂ, ਸਿਹਤ, ਖੇਤੀਬਾੜੀ ਅਤੇ ਹੋਰ ਕਈ ਵਿਸ਼ਿਆਂ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ। ਤੁਸੀਂ ਕੁਝ ਵੀ ਪੁੱਛ ਸਕਦੇ ਹੋ, ਜਾਂ ਦੱਸੋ ਕਿ ਤੁਸੀਂ ਕੀ ਜਾਣਨਾ ਚਾਹੁੰਦੇ ਹੋ।",
  },
  {
    code: "en",
    nameNative: "English",
    nameEn: "Indian English",
    flag: "🇮🇳",
    spokenPrompt: "For English, say 'English'...",
    welcomeResponse:
      "All right, I will speak in English. I am BoloSync. I can help with government schemes, health, farming, and much more. You can ask anything, or let me know what you would like to explore.",
  },
];

export const SpokenLanguageSelector: React.FC<SpokenLanguageSelectorProps> = ({
  onLanguageSelected,
  onCancel,
  isReTrigger = false,
}) => {
  const [isListeningForLanguage, setIsListeningForLanguage] = useState<boolean>(false);
  const [detectedSpokenText, setDetectedSpokenText] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<"hi" | "pa" | "en" | null>(null);
  const recognitionRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);
  const selectedLanguageRef = useRef<"hi" | "pa" | "en" | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const selectionRequestRef = useRef<number>(0);

  const playAudioString = async (text: string, langCode: string): Promise<void> => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    await new Promise<void>((resolve) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode === "pa" ? "pa-IN" : langCode === "en" ? "en-IN" : "hi-IN";
      utterance.rate = 0.95;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  };

  const startSpeechRecognitionListener = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setDetectedSpokenText("Speech recognition is not supported in this browser.");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    try {
        const recognizer = new SpeechRecognition();
        recognizer.continuous = false;
        recognizer.interimResults = true;
        recognizer.lang = "en-IN";

        recognizer.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          const spokenText = transcript.trim();
          const clean = spokenText.toLowerCase();
          if (!spokenText) return;
          setDetectedSpokenText(spokenText);

          if (
            clean.includes("हिंदी") ||
            clean.includes("hindi") ||
            clean.includes("हिन्दी") ||
            clean.includes("pehla") ||
            clean === "1"
          ) {
            handleChooseLanguage("hi");
          } else if (
            clean.includes("ਪੰਜਾਬੀ") ||
            clean.includes("punjabi") ||
            clean.includes("panjabi") ||
            clean.includes("dooja") ||
            clean === "2"
          ) {
            handleChooseLanguage("pa");
          } else if (
            clean.includes("english") ||
            clean.includes("अंग्रेजी") ||
            clean.includes("teeja") ||
            clean === "3"
          ) {
            handleChooseLanguage("en");
          }
        };

        recognizer.onerror = () => {
          isListeningRef.current = false;
          setIsListeningForLanguage(false);
          recognitionRef.current = null;
        };

        recognizer.onend = () => {
          isListeningRef.current = false;
          setIsListeningForLanguage(false);
          recognitionRef.current = null;
        };

        recognizer.start();
        recognitionRef.current = recognizer;
        isListeningRef.current = true;
    } catch (e) {
      isListeningRef.current = false;
      setIsListeningForLanguage(false);
      setDetectedSpokenText("Microphone could not start. Please allow microphone access.");
      console.warn("SpeechRecognition init warning:", e);
    }
  };

  const startSpokenPicker = () => {
    if (selectedLanguageRef.current) return;
    setDetectedSpokenText("");
    setIsListeningForLanguage(true);
    startSpeechRecognitionListener();
  };

  const stopSpokenPicker = () => {
    isListeningRef.current = false;
    setIsListeningForLanguage(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      isListeningRef.current = false;
    };
  }, []);

  const handleChooseLanguage = async (langCode: "hi" | "pa" | "en") => {
    if (selectedLanguage === langCode) return;
    selectionRequestRef.current += 1;
    const requestId = selectionRequestRef.current;
    selectedLanguageRef.current = langCode;
    setSelectedLanguage(langCode);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const matched = LANGUAGES.find((l) => l.code === langCode) || LANGUAGES[0];

    try {
      localStorage.setItem("bolosync_spoken_language", langCode);
    } catch {}

    await playAudioString(matched.welcomeResponse, matched.code);

    if (requestId === selectionRequestRef.current) {
      setTimeout(() => onLanguageSelected(langCode), 300);
    }
  };

  return (
    <div
      id="spoken-language-selector-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-2 border-indigo-500/30 bg-white text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-white sm:max-h-[calc(100dvh-2rem)]">
        <div className="relative shrink-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-600 p-4 pb-3 text-center text-white sm:p-6 sm:pb-4">
          <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-lg ring-4 ring-white/30 sm:h-16 sm:w-16 sm:mb-3">
            <Mic className="h-6 w-6 animate-pulse sm:h-8 sm:w-8" />
          </div>

          <h2 className="mb-1 text-xl font-black tracking-tight sm:text-2xl">
            Choose your language
          </h2>
          <p className="text-xs font-medium text-indigo-100 sm:text-sm">
            Tap a language or say its name
          </p>

          {isReTrigger && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="absolute top-4 right-4 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:space-y-4 sm:p-6">
          <div className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-900/60 dark:bg-slate-800/80 sm:p-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center sm:h-16 sm:w-16">
              <motion.div
                aria-hidden="true"
                className="absolute inset-0 rounded-full border-2 border-indigo-400/50"
                animate={{ scale: isListeningForLanguage ? [1, 1.35, 1] : [1, 1.12, 1], opacity: isListeningForLanguage ? [0.8, 0, 0.8] : [0.35, 0, 0.35] }}
                transition={{ repeat: Infinity, duration: isListeningForLanguage ? 1.2 : 2.2, ease: "easeOut" }}
              />
              <motion.div
                aria-hidden="true"
                className="absolute inset-1 rounded-full border border-emerald-400/50"
                animate={{ scale: isListeningForLanguage ? [1, 1.25, 1] : [1, 1.08, 1], opacity: isListeningForLanguage ? [0.7, 0, 0.7] : [0.25, 0, 0.25] }}
                transition={{ repeat: Infinity, duration: isListeningForLanguage ? 1.2 : 2.2, delay: 0.35, ease: "easeOut" }}
              />
              <motion.button
                type="button"
                onClick={isListeningForLanguage ? stopSpokenPicker : startSpokenPicker}
                aria-label={isListeningForLanguage ? "Stop listening" : "Start listening for language"}
                className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-colors hover:bg-indigo-500 active:scale-90"
                animate={{ scale: isListeningForLanguage ? [1, 1.08, 1] : [1, 1.04, 1] }}
                transition={{ repeat: Infinity, duration: isListeningForLanguage ? 0.9 : 1.8, ease: "easeInOut" }}
              >
                <Mic className={`h-6 w-6 ${isListeningForLanguage ? "text-emerald-300" : ""}`} />
              </motion.button>
              {!isListeningForLanguage && (
                <motion.div
                  aria-hidden="true"
                  className="absolute -bottom-1 -right-1 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-md"
                  animate={{ x: [0, -3, 0], y: [0, -3, 0], rotate: [-12, 0, -12] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                >
                  <Hand className="h-4 w-4" />
                </motion.div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {isListeningForLanguage ? "Listening..." : "Click the microphone to speak"}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                {detectedSpokenText || "Say Hindi, Punjabi, or English"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 py-2">
            {[20, 60, 95, 45, 80, 100, 70, 30, 85, 50, 20].map((h, i) => (
              <motion.div
                key={i}
                animate={{
                  height: isListeningForLanguage ? [8, h * 0.4, 8] : 8,
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.8 + (i % 3) * 0.2,
                  ease: "easeInOut",
                }}
                className={`w-1.5 rounded-full ${
                  isListeningForLanguage
                    ? "bg-emerald-500"
                    : "bg-slate-300 dark:bg-slate-700"
                }`}
                style={{ height: "8px" }}
              />
            ))}
          </div>

          <div className="space-y-2.5">
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-400 text-center">
              Visual Options (Tap or Speak)
            </div>

            {LANGUAGES.map((lang) => {
              const isSelected = selectedLanguage === lang.code;

              return (
                <button
                  key={lang.code}
                  type="button"
                  id={`select-spoken-lang-${lang.code}`}
                  onClick={() => handleChooseLanguage(lang.code)}
                  className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border-2 transition-all text-left transform active:scale-98 ${
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-lg scale-[1.02]"
                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:border-indigo-400 text-slate-800 dark:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-2xl sm:text-3xl">{lang.flag}</span>
                    <div>
                      <div className="text-base sm:text-lg font-black leading-tight">
                        {lang.nameNative}
                      </div>
                      <div
                        className={`text-xs ${
                          isSelected
                            ? "text-emerald-100"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {lang.spokenPrompt}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <div className="w-8 h-8 rounded-full bg-white text-emerald-700 flex items-center justify-center font-bold">
                        <Check className="w-5 h-5" />
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2 py-1 bg-slate-200/60 dark:bg-slate-700/60 rounded-lg">
                        Tap
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-center pt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-indigo-500" />
            <span>Say the language name into your microphone</span>
          </div>
        </div>
      </div>
    </div>
  );
};
