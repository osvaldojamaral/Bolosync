import React, { useEffect, useRef, useState } from "react";
import { Languages, Mic, Volume2, VolumeX } from "lucide-react";

const supportedLanguages = [
  { code: "en", label: "English", locale: "en-IN" },
  { code: "hi", label: "हिंदी", locale: "hi-IN" },
  { code: "pa", label: "ਪੰਜਾਬੀ", locale: "pa-IN" },
] as const;

const quickTranslationMap: Record<string, { en: string; hi: string; pa: string }> = {
  hello: { en: "Hello", hi: "नमस्ते", pa: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ" },
  hi: { en: "Hi", hi: "नमस्ते", pa: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ" },
  yes: { en: "Yes", hi: "हाँ", pa: "ਹਾਂ" },
  no: { en: "No", hi: "नहीं", pa: "ਨਹੀਂ" },
  okay: { en: "Okay", hi: "ठीक है", pa: "ਠੀਕ ਹੈ" },
  "how are you": { en: "How are you?", hi: "आप कैसे हैं?", pa: "ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?" },
  "thank you": { en: "Thank you", hi: "धन्यवाद", pa: "ਧੰਨਵਾਦ" },
  "can you help me": { en: "Can you help me?", hi: "क्या आप मेरी मदद कर सकते हैं?", pa: "ਕੀ ਤੁਸੀਂ ਮੇਰੀ ਮਦਦ ਕਰ ਸਕਦੇ ਹੋ?" },
  "good morning": { en: "Good morning", hi: "शुभ प्रभात", pa: "ਸ਼ੁਭ ਸਵੇਰ" },
  "good evening": { en: "Good evening", hi: "शुभ संध्या", pa: "ਸ਼ੁਭ ਸ਼ਾਮ" },
  "what is your name": { en: "What is your name?", hi: "आपका नाम क्या है?", pa: "ਤੁਹਾਡਾ ਨਾਮ ਕੀ ਹੈ?" },
  "i need help": { en: "I need help", hi: "मुझे मदद चाहिए", pa: "ਮੈਨੂੰ ਮਦਦ ਦੀ ਲੋੜ ਹੈ" },
  "please help me": { en: "Please help me", hi: "कृपया मेरी मदद करें", pa: "ਕਿਰਪਾ ਕਰਕੇ ਮੇਰੀ ਮਦਦ ਕਰੋ" },
};

const getQuickTranslation = (text: string, sourceLanguage: string, targetLanguage: string) => {
  const clean = text.trim().toLowerCase().replace(/[.!?,]/g, "").trim();
  if (!clean) return null;

  const match = quickTranslationMap[clean];
  if (!match) return null;

  const direct = match[targetLanguage as "en" | "hi" | "pa"];
  if (!direct) return null;

  if (sourceLanguage === targetLanguage) return text.trim();
  return direct;
};

const speakTranslatedText = (text: string, targetLanguage: string) => {
  if (!text.trim() || typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang =
    targetLanguage === "pa" ? "pa-IN" : targetLanguage === "en" ? "en-IN" : "hi-IN";
  utterance.rate = 0.98;
  window.speechSynthesis.speak(utterance);
};

const normalizeLiveSpeechChunk = (value: string) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  const words = normalized.split(" ").filter(Boolean);
  if (words.length <= 12) {
    return normalized;
  }
  return words.slice(-12).join(" ");
};

export const RealTimeTranslator: React.FC = () => {
  const [sourceLanguage, setSourceLanguage] = useState<(typeof supportedLanguages)[number]["code"]>("hi");
  const [targetLanguage, setTargetLanguage] = useState<(typeof supportedLanguages)[number]["code"]>("en");
  const [sourceText, setSourceText] = useState<string>("");
  const [translatedText, setTranslatedText] = useState<string>("");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("Waiting for spoken input...");
  const recognitionRef = useRef<any>(null);
  const lastTextRef = useRef<string>("");
  const lastLiveTextRef = useRef<string>("");
  const liveTranslationTimerRef = useRef<number | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const activeTranslationRequestRef = useRef<number>(0);
  const keepListeningRef = useRef<boolean>(false);
  const isListeningRef = useRef<boolean>(false);
  const sessionIdRef = useRef<number>(0);

  useEffect(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang =
          sourceLanguage === "pa" ? "pa-IN" : sourceLanguage === "en" ? "en-IN" : "hi-IN";
      } catch {}
    }

    return () => {
      keepListeningRef.current = false;
      isListeningRef.current = false;
      sessionIdRef.current += 1;
      if (restartTimerRef.current) {
        window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      recognitionRef.current = null;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [sourceLanguage]);

  const stopListening = () => {
    keepListeningRef.current = false;
    isListeningRef.current = false;
    sessionIdRef.current += 1;

    if (liveTranslationTimerRef.current) {
      window.clearTimeout(liveTranslationTimerRef.current);
      liveTranslationTimerRef.current = null;
    }

    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {}
    }
    recognitionRef.current = null;
    setIsListening(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const translateAndSpeak = async (spokenText: string, shouldSpeak = true) => {
    const clean = spokenText.trim();
    if (!clean) return;

    const requestId = ++activeTranslationRequestRef.current;
    const quickTranslation = getQuickTranslation(clean, sourceLanguage, targetLanguage);

    if (quickTranslation) {
      if (requestId !== activeTranslationRequestRef.current) {
        return;
      }

      setSourceText(clean);
      setTranslatedText(quickTranslation);
      setStatus(
        `Translated from ${supportedLanguages.find((item) => item.code === sourceLanguage)?.label || "Hindi"} to ${supportedLanguages.find((item) => item.code === targetLanguage)?.label || "English"}`
      );

      if (shouldSpeak) {
        speakTranslatedText(quickTranslation, targetLanguage);
      }
      return;
    }

    setSourceText(clean);
    setStatus(shouldSpeak ? "Translating final phrase..." : "Translating live...");

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: clean,
          target_language: targetLanguage,
          source_language: sourceLanguage,
        }),
      });

      if (requestId !== activeTranslationRequestRef.current) {
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Translation failed");
      }

      const nextText = data.translatedText || clean;
      setTranslatedText(nextText);
      setStatus(
        `Translated from ${supportedLanguages.find((item) => item.code === sourceLanguage)?.label || "Hindi"} to ${supportedLanguages.find((item) => item.code === targetLanguage)?.label || "English"}`
      );

      if (shouldSpeak) {
        speakTranslatedText(nextText, targetLanguage);
      }
    } catch (error) {
      if (requestId !== activeTranslationRequestRef.current) {
        return;
      }

      const message = error instanceof Error ? error.message : "Unable to translate.";
      setStatus(message);
    }
  };

  const startListening = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus("Speech recognition is not supported in this browser.");
      return;
    }

    if (recognitionRef.current) {
      return;
    }

    const currentSession = ++sessionIdRef.current;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang =
      sourceLanguage === "pa" ? "pa-IN" : sourceLanguage === "en" ? "en-IN" : "hi-IN";

    const scheduleRestart = () => {
      if (!keepListeningRef.current || !isListeningRef.current || currentSession !== sessionIdRef.current) {
        return;
      }

      if (restartTimerRef.current) {
        window.clearTimeout(restartTimerRef.current);
      }

      restartTimerRef.current = window.setTimeout(() => {
        if (keepListeningRef.current && isListeningRef.current && currentSession === sessionIdRef.current && !recognitionRef.current) {
          startListening();
        }
      }, 40);
    };

    recognition.onresult = (event: any) => {
      if (currentSession !== sessionIdRef.current) return;

      const resultIndex = typeof event.resultIndex === "number" ? event.resultIndex : event.results.length - 1;
      const newestResult = event.results[resultIndex] || event.results[event.results.length - 1];
      const latestChunk = normalizeLiveSpeechChunk(newestResult?.[0]?.transcript || "");

      if (!latestChunk) {
        return;
      }

      const isFinal = Boolean(newestResult?.isFinal);

      if (!isFinal) {
        setSourceText(latestChunk);
        setStatus("Listening and translating live...");

        if (liveTranslationTimerRef.current) {
          window.clearTimeout(liveTranslationTimerRef.current);
        }

        if (latestChunk !== lastLiveTextRef.current) {
          lastLiveTextRef.current = latestChunk;
          liveTranslationTimerRef.current = window.setTimeout(() => {
            if (currentSession === sessionIdRef.current) {
              void translateAndSpeak(latestChunk, false);
            }
          }, 0);
        }

        return;
      }

      const transcript = latestChunk;
      if (transcript !== lastTextRef.current) {
        lastTextRef.current = transcript;
        lastLiveTextRef.current = transcript;
        if (liveTranslationTimerRef.current) {
          window.clearTimeout(liveTranslationTimerRef.current);
          liveTranslationTimerRef.current = null;
        }
        if (currentSession === sessionIdRef.current) {
          void translateAndSpeak(transcript, true);
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (currentSession !== sessionIdRef.current) return;

      if (event?.error === "no-speech" || event?.error === "aborted") {
        setStatus("Listening... continue speaking.");
      } else {
        setStatus("Microphone error. Retrying automatically...");
      }

      if (!keepListeningRef.current) {
        stopListening();
        return;
      }

      scheduleRestart();
    };

    recognition.onend = () => {
      if (currentSession !== sessionIdRef.current) return;
      recognitionRef.current = null;
      if (keepListeningRef.current && isListeningRef.current) {
        scheduleRestart();
      }
    };

    recognition.onstart = () => {
      if (currentSession !== sessionIdRef.current) return;
      isListeningRef.current = true;
      setIsListening(true);
      setStatus("Listening for speech...");
    };

    recognitionRef.current = recognition;
    keepListeningRef.current = true;
    isListeningRef.current = true;
    lastTextRef.current = "";
    lastLiveTextRef.current = "";
    if (liveTranslationTimerRef.current) {
      window.clearTimeout(liveTranslationTimerRef.current);
      liveTranslationTimerRef.current = null;
    }
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    setIsListening(true);
    setStatus("Listening for speech...");
    try {
      recognition.start();
    } catch {
      if (currentSession === sessionIdRef.current) {
        setStatus("Microphone is busy. Retrying...");
        scheduleRestart();
      }
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] max-w-5xl mx-auto w-full relative overflow-hidden">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs mb-3 shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-sm">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Real-time Translator</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Speak in any language and hear it in your selected language.</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
            <Volume2 className="w-3.5 h-3.5" />
            Live Translate
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 flex-1 min-h-0 overflow-y-auto">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                I will speak in
              </label>
              <div className="flex flex-wrap gap-2">
                {supportedLanguages.map((item) => (
                  <button
                    key={`source-${item.code}`}
                    type="button"
                    onClick={() => setSourceLanguage(item.code)}
                    className={`rounded-xl border px-3 py-2 text-sm font-bold transition-all ${
                      sourceLanguage === item.code
                        ? "border-emerald-500 bg-emerald-600 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Translate to
              </label>
              <div className="flex flex-wrap gap-2">
                {supportedLanguages.map((item) => (
                  <button
                    key={`target-${item.code}`}
                    type="button"
                    onClick={() => setTargetLanguage(item.code)}
                    className={`rounded-xl border px-3 py-2 text-sm font-bold transition-all ${
                      targetLanguage === item.code
                        ? "border-indigo-500 bg-indigo-600 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Spoken input
              </div>
              <p className="mt-2 text-base font-medium text-slate-900 dark:text-slate-100">
                {sourceText || "Start speaking to see the live translation here."}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                Translated output
              </div>
              <p className="mt-2 text-base font-medium text-emerald-900 dark:text-emerald-100">
                {translatedText || "The translation will appear here automatically."}
              </p>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/40 p-3 text-sm text-indigo-800 dark:text-indigo-100">
              <strong>Status:</strong> {status}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pb-4">
          <button
            type="button"
            onClick={() => {
              if (isListening) {
                stopListening();
                setStatus("Listening stopped.");
              } else {
                startListening();
              }
            }}
            className={`inline-flex items-center gap-3 rounded-full px-6 py-3 text-base font-bold text-white shadow-lg transition-all ${
              isListening
                ? "bg-gradient-to-r from-rose-600 to-orange-500"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110"
            }`}
          >
            {isListening ? <VolumeX className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            {isListening ? "Stop Listening" : "Start Live Translation"}
          </button>
        </div>
      </div>
    </div>
  );
};
