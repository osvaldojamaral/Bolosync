import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Send,
  Volume2,
  VolumeX,
  ArrowLeftRight,
  Sparkles,
  Radio,
  Pause,
  Trash2,
  Languages,
  Check,
  Share2,
  Clock,
  MessageSquare,
  Sparkle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ConversationMessage } from "../types";
import { sendConversationAudio, sendConversationText } from "../services/api";
import { useLanguage } from "../services/i18n";

const INITIAL_CONVERSATION: ConversationMessage[] = [
  {
    id: "init-1",
    timestamp: new Date(Date.now() - 120000).toISOString(),
    speaker: "person_a",
    speakerName: "Farmer / Citizen (वक्ता 1)",
    originalText: "नमस्ते सर, मेरी गेहूं की फसल की पत्तियों पर पीले रंग का पाउडर दिख रहा है। मुझे क्या स्प्रे करना चाहिए?",
    originalLanguage: "hi",
    originalLanguageName: "Hindi (हिंदी)",
    translatedText: "Hello Sir, I see yellow powder on the leaves of my wheat crop. What spray should I use?",
    targetLanguage: "en",
    targetLanguageName: "English",
    ttsProvider: "browser_speech",
    latencyMs: 380,
  },
  {
    id: "init-2",
    timestamp: new Date(Date.now() - 60000).toISOString(),
    speaker: "person_b",
    speakerName: "Agriculture Specialist (वक्ता 2)",
    originalText: "This looks like Wheat Yellow Rust. Spray Propiconazole 25% EC at 200 ml mixed in 200 liters of water per acre immediately.",
    originalLanguage: "en",
    originalLanguageName: "English",
    translatedText: "यह गेहूं का पीला रतुआ (Yellow Rust) लग रहा है। तुरंत प्रति एकड़ 200 लीटर पानी में 200 मिली प्रोपिकोनाज़ोल 25% EC मिलाकर छिड़काव करें।",
    targetLanguage: "hi",
    targetLanguageName: "Hindi (हिंदी)",
    ttsProvider: "browser_speech",
    latencyMs: 410,
  },
];

export const ConversationBridge: React.FC = () => {
  const { t } = useLanguage();

  const [personALang, setPersonALang] = useState<string>("hi");
  const [personBLang, setPersonBLang] = useState<string>("en");
  const [messages, setMessages] = useState<ConversationMessage[]>(INITIAL_CONVERSATION);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeRecordingSpeaker, setActiveRecordingSpeaker] = useState<"person_a" | "person_b" | null>(null);
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [autoPlayAudio, setAutoPlayAudio] = useState<boolean>(true);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [activeInputSpeaker, setActiveInputSpeaker] = useState<"person_a" | "person_b">("person_a");
  const [manualText, setManualText] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef<string>("");
  const timerIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Pre-fetch browser voices for smooth immediate playback
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      const onVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      };
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing, interimTranscript]);

  const cleanupAudio = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
      speechRecognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
    setActiveRecordingSpeaker(null);
    setRecordingSeconds(0);
    setAudioLevel(0);
    setInterimTranscript("");
  };

  // Start recording with dual MediaRecorder + browser SpeechRecognition
  const startRecording = async (speaker: "person_a" | "person_b") => {
    if (isProcessing) return;
    cleanupAudio();
    setActiveRecordingSpeaker(speaker);
    audioChunksRef.current = [];
    liveTranscriptRef.current = "";
    setInterimTranscript("");

    const langCode = speaker === "person_a" ? personALang : personBLang;
    const speechLang = langCode === "pa" ? "pa-IN" : langCode === "en" ? "en-IN" : "hi-IN";

    // 1. Initialize Browser Speech Recognition if supported
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = speechLang;

        recognition.onresult = (event: any) => {
          let currentText = "";
          for (let i = 0; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript;
          }
          if (currentText.trim()) {
            liveTranscriptRef.current = currentText.trim();
            setInterimTranscript(currentText.trim());
          }
        };

        recognition.onerror = (e: any) => {
          console.warn("Browser speech recognition notice:", e?.error);
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
      } catch (e) {
        console.warn("SpeechRecognition init skipped:", e);
      }
    }

    // 2. Start Audio Stream & MediaRecorder
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          setAudioLevel(Math.min(100, Math.round((sum / dataArray.length / 128) * 100)));
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();

      const options = { mimeType: "audio/webm;codecs=opus" };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        setTimeout(() => {
          const mime = recorder.mimeType || "audio/webm";
          const audioBlob = new Blob(audioChunksRef.current, { type: mime });
          const capturedTranscript = liveTranscriptRef.current.trim();
          processRecordedAudio(audioBlob, speaker, capturedTranscript);
          cleanupAudio();
        }, 200);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Recording start error:", err);
      cleanupAudio();
    }
  };

  const stopRecording = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      cleanupAudio();
    }
  };

  // Process recorded audio submission
  const processRecordedAudio = async (
    audioBlob: Blob,
    speaker: "person_a" | "person_b",
    capturedTranscript?: string
  ) => {
    setIsProcessing(true);
    const audioBlobUrl = audioBlob.size > 200 ? URL.createObjectURL(audioBlob) : undefined;
    const sourceLang = speaker === "person_a" ? personALang : personBLang;
    const targetLang = speaker === "person_a" ? personBLang : personALang;
    const speakerName =
      speaker === "person_a"
        ? personALang === "hi"
          ? "Person 1 (हिंदी)"
          : personALang === "pa"
          ? "Person 1 (ਪੰਜਾਬੀ)"
          : "Person 1 (Regional)"
        : personBLang === "en"
        ? "Person 2 (English)"
        : "Person 2 (Target)";

    try {
      const res = await sendConversationAudio(audioBlob, {
        speaker,
        speakerName,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        transcript: capturedTranscript || undefined,
      });

      const newMsg: ConversationMessage = {
        id: res.id,
        timestamp: res.timestamp,
        speaker: res.speaker,
        speakerName: res.speaker_name,
        originalText: res.original_text,
        originalLanguage: res.original_language,
        originalLanguageName: res.original_language_name,
        translatedText: res.translated_text,
        targetLanguage: res.target_language,
        targetLanguageName: res.target_language_name,
        audioUrl: res.audio_url,
        audioBlobUrl,
        ttsProvider: res.tts_provider,
        latencyMs: res.latency_ms,
      };

      setMessages((prev) => [...prev, newMsg]);

      if (autoPlayAudio) {
        playTranslatedSpeech(res.translated_text, res.target_language, res.id, res.audio_url);
      }
    } catch (err: any) {
      console.error("Conversation translation failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process manual text submission
  const handleSendText = async () => {
    const clean = manualText.trim();
    if (!clean || isProcessing) return;

    setIsProcessing(true);
    setManualText("");

    const speaker = activeInputSpeaker;
    const sourceLang = speaker === "person_a" ? personALang : personBLang;
    const targetLang = speaker === "person_a" ? personBLang : personALang;
    const speakerName =
      speaker === "person_a"
        ? personALang === "hi"
          ? "Person 1 (हिंदी)"
          : personALang === "pa"
          ? "Person 1 (ਪੰਜਾਬੀ)"
          : "Person 1 (Regional)"
        : personBLang === "en"
        ? "Person 2 (English)"
        : "Person 2 (Target)";

    try {
      const res = await sendConversationText(clean, {
        speaker,
        speakerName,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
      });

      const newMsg: ConversationMessage = {
        id: res.id,
        timestamp: res.timestamp,
        speaker: res.speaker,
        speakerName: res.speaker_name,
        originalText: res.original_text,
        originalLanguage: res.original_language,
        originalLanguageName: res.original_language_name,
        translatedText: res.translated_text,
        targetLanguage: res.target_language,
        targetLanguageName: res.target_language_name,
        audioUrl: res.audio_url,
        ttsProvider: res.tts_provider,
        latencyMs: res.latency_ms,
      };

      setMessages((prev) => [...prev, newMsg]);

      if (autoPlayAudio) {
        playTranslatedSpeech(res.translated_text, res.target_language, res.id, res.audio_url);
      }
    } catch (err: any) {
      console.error("Text conversation failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Play spoken translation
  const playTranslatedSpeech = (
    text: string,
    langCode: string,
    msgId: string,
    audioUrl?: string
  ) => {
    // 1. If currently playing this specific message, pause/stop it
    if (playingMessageId === msgId) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setPlayingMessageId(null);
      return;
    }

    // 2. Stop any ongoing playback first
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setPlayingMessageId(msgId);

    // 3. If high-fidelity server TTS audio stream/data URL is provided
    if (audioUrl && audioUrl.startsWith("data:audio")) {
      try {
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;

        audio.onended = () => {
          if (activeAudioRef.current === audio) {
            activeAudioRef.current = null;
            setPlayingMessageId(null);
          }
        };

        audio.onerror = () => {
          activeAudioRef.current = null;
          fallbackBrowserSpeech(text, langCode, msgId);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn("Audio autoplay notice:", err);
            fallbackBrowserSpeech(text, langCode, msgId);
          });
        }
        return;
      } catch (err) {
        console.warn("Audio element initialization warning:", err);
      }
    }

    // 4. Native Browser Speech Synthesis Fallback
    fallbackBrowserSpeech(text, langCode, msgId);
  };

  const fallbackBrowserSpeech = (text: string, langCode: string, msgId: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setPlayingMessageId(null);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      activeUtteranceRef.current = utterance;

      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = voices.find((v) => {
        const l = v.lang.toLowerCase();
        if (langCode === "pa") return l.includes("pa") || l.includes("punjab");
        if (langCode === "hi") return l.includes("hi") || l.includes("hindi");
        if (langCode === "en") return l.includes("en-in") || l.includes("en-gb") || l.includes("en-us");
        return false;
      });

      if (!selectedVoice && langCode === "hi") {
        selectedVoice = voices.find((v) => v.lang.startsWith("hi"));
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.lang = langCode === "pa" ? "pa-IN" : langCode === "en" ? "en-IN" : "hi-IN";
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        activeUtteranceRef.current = null;
        setPlayingMessageId(null);
      };

      utterance.onerror = (e) => {
        console.warn("Speech synthesis notice:", e);
        activeUtteranceRef.current = null;
        setPlayingMessageId(null);
      };

      // Slight timeout prevents browser synthesis race conditions
      setTimeout(() => {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.resume();
          window.speechSynthesis.speak(utterance);
        }
      }, 50);
    } catch (err) {
      console.warn("Browser speech synthesis error:", err);
      setPlayingMessageId(null);
    }
  };

  const swapLanguages = () => {
    setPersonALang(personBLang);
    setPersonBLang(personALang);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getLangLabel = (code: string) => {
    switch (code) {
      case "hi":
        return "🇮🇳 Hindi (हिंदी)";
      case "pa":
        return "🇮🇳 Punjabi (ਪੰਜਾਬੀ)";
      case "en":
        return "🇬🇧 English";
      case "bn":
        return "🇮🇳 Bengali (বাংলা)";
      case "mr":
        return "🇮🇳 Marathi (मराठी)";
      default:
        return code.toUpperCase();
    }
  };

  return (
    <div id="conversation-bridge-container" className="flex-1 min-h-0 flex flex-col h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] max-w-5xl mx-auto w-full relative overflow-hidden">
      {/* Top Header & Language Selector Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-xs mb-2.5 shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/80 dark:border-indigo-800 shrink-0">
              <Languages className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {t("conversationTitle")}
                </h2>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                  {t("active")}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t("conversationBridge")}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setAutoPlayAudio(!autoPlayAudio)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                autoPlayAudio
                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
              }`}
              title="Toggle automatic speech playback of translation"
            >
              {autoPlayAudio ? <Volume2 className="w-3.5 h-3.5 text-indigo-600" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{t("autoVoice")} {autoPlayAudio ? "ON" : "OFF"}</span>
            </button>

            <button
              type="button"
              onClick={() => setMessages([])}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-900"
              title="Clear conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Language Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-11 gap-1.5 items-center mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Person 1 Language (Default Hindi/Regional) */}
          <div className="sm:col-span-5 flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
              {t("person1")}:
            </span>
            <select
              value={personALang}
              onChange={(e) => setPersonALang(e.target.value)}
              className="flex-1 bg-transparent text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
              <option value="hi">🇮🇳 Hindi (हिंदी)</option>
              <option value="pa">🇮🇳 Punjabi (ਪੰਜਾਬੀ)</option>
              <option value="bn">🇮🇳 Bengali (বাংলা)</option>
              <option value="mr">🇮🇳 Marathi (मराठी)</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>

          {/* Swap Button */}
          <div className="sm:col-span-1 flex justify-center">
            <button
              type="button"
              onClick={swapLanguages}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 transition-all active:scale-95 border border-slate-200 dark:border-slate-700 shadow-2xs"
              title="Swap Languages"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Person 2 Language (Default English) */}
          <div className="sm:col-span-5 flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
              {t("person2")}:
            </span>
            <select
              value={personBLang}
              onChange={(e) => setPersonBLang(e.target.value)}
              className="flex-1 bg-transparent text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
              <option value="en">🇬🇧 English</option>
              <option value="hi">🇮🇳 Hindi (हिंदी)</option>
              <option value="pa">🇮🇳 Punjabi (ਪੰਜਾਬੀ)</option>
              <option value="bn">🇮🇳 Bengali (বাংলা)</option>
              <option value="mr">🇮🇳 Marathi (मराठी)</option>
            </select>
          </div>
        </div>

      </div>

      {activeRecordingSpeaker && interimTranscript && (
        <div className="mb-2 rounded-xl border border-emerald-300/50 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          <span className="mr-2 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
            Live
          </span>
          {interimTranscript}
        </div>
      )}

      {/* Main Conversation Stream */}
      <div
        id="conversation-messages-stream"
        className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 py-2 space-y-2.5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/60 mb-2.5"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center mb-3 border border-indigo-100 dark:border-indigo-900">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200">
              {t("readyTranslation")}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
              {t("speakClearly")}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isPersonA = msg.speaker === "person_a";
            const isPlayingThis = playingMessageId === msg.id;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${isPersonA ? "items-start" : "items-end"}`}
              >
                <div
                  className={`w-full max-w-2xl rounded-2xl p-4 border transition-all ${
                    isPersonA
                      ? "bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/60 rounded-tl-xs shadow-xs"
                      : "bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/60 rounded-tr-xs shadow-xs"
                  }`}
                >
                  {/* Speaker Header */}
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          isPersonA ? "bg-indigo-600" : "bg-emerald-600"
                        }`}
                      >
                        {isPersonA ? "1" : "2"}
                      </div>
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {msg.speakerName || (isPersonA ? "Person 1" : "Person 2")}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                        {msg.originalLanguageName} ➔ {msg.targetLanguageName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.translatedText)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 text-xs"
                        title="Copy translated text"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {msg.latencyMs && (
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {msg.latencyMs}ms
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Original Spoken Section */}
                  <div className="mb-3">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                      {t("originalSpoken")} ({msg.originalLanguageName}):
                    </span>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                      "{msg.originalText}"
                    </p>
                  </div>

                  {/* Translated Output Section */}
                  <div
                    className={`p-3 rounded-xl border ${
                      isPersonA
                        ? "bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/40 text-indigo-950 dark:text-indigo-100"
                        : "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40 text-emerald-950 dark:text-emerald-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        {t("translatedFor")} {isPersonA ? t("person2") : t("person1")} ({msg.targetLanguageName}):
                      </span>

                      {/* Listen Button */}
                      <button
                        type="button"
                        onClick={() =>
                          playTranslatedSpeech(
                            msg.translatedText,
                            msg.targetLanguage,
                            msg.id,
                            msg.audioUrl
                          )
                        }
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-transform active:scale-95 shadow-2xs ${
                          isPlayingThis
                            ? "bg-amber-500 text-white animate-pulse"
                            : isPersonA
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                        title="Listen to translated speech"
                      >
                        {isPlayingThis ? (
                          <>
                            <Pause className="w-3 h-3" />
                            <span>Speaking...</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Listen (सुनें)</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-sm font-semibold leading-relaxed">
                      "{msg.translatedText}"
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}

        {/* Active Processing Indicator */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md shadow-xs"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center animate-spin">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                Translating & Synthesizing Speech...
              </span>
              <span className="text-[11px] text-slate-500">
                Natural Indian Spoken Translation + Regional Voice
              </span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* FIXED BOTTOM SECTION: Voice Recording Hub & Text Input */}
      <div
        id="conversation-bottom-fixed-dock"
        className="relative z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-lg shrink-0 space-y-2"
      >
        {/* Live Audio Visualizer / Interim Transcript when recording */}
        {activeRecordingSpeaker && (
          <div className="p-2 bg-slate-950 text-white rounded-xl flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-rose-400">
                  Listening to {activeRecordingSpeaker === "person_a" ? "Person 1" : "Person 2"} ({recordingSeconds}s)...
                </span>
                {interimTranscript && (
                  <p className="text-[11px] text-slate-200 font-medium truncate italic">
                    "{interimTranscript}"
                  </p>
                )}
              </div>
            </div>

            {/* Level Bars & Stop Action */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-0.5">
                {[15, 45, 80, 60, 30, 90, 70, 40].map((h, idx) => (
                  <div
                    key={idx}
                    className="w-1 bg-indigo-400 rounded-full transition-all duration-75"
                    style={{
                      height: `${Math.max(3, (h * audioLevel) / 100)}px`,
                    }}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={stopRecording}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-transform active:scale-95"
              >
                Stop
              </button>
            </div>
          </div>
        )}

        {/* Dual Speaker Voice Recording Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {/* Person 1 Record Button */}
          <button
            type="button"
            onClick={() => {
              if (activeRecordingSpeaker === "person_a") {
                stopRecording();
              } else {
                startRecording("person_a");
              }
            }}
            disabled={isProcessing || (activeRecordingSpeaker !== null && activeRecordingSpeaker !== "person_a")}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all active:scale-98 ${
              activeRecordingSpeaker === "person_a"
                ? "bg-rose-500 text-white border-rose-600 ring-2 ring-rose-300 dark:ring-rose-950"
                : "bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border-indigo-300 dark:border-indigo-800 text-indigo-950 dark:text-indigo-100"
            }`}
          >
            <div className="flex items-center gap-2 text-left truncate">
              <div
                className={`p-1.5 rounded-lg shrink-0 ${
                  activeRecordingSpeaker === "person_a"
                    ? "bg-white text-rose-600 animate-bounce"
                    : "bg-indigo-600 text-white"
                }`}
              >
                <Mic className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="text-xs font-bold block truncate">
                  {activeRecordingSpeaker === "person_a" ? "Listening..." : "P1 (बोलें)"}
                </span>
                <span className="text-[10px] opacity-75 truncate block">
                  {getLangLabel(personALang)}
                </span>
              </div>
            </div>

            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-200/50 dark:bg-indigo-900/60 shrink-0 ml-1">
              {activeRecordingSpeaker === "person_a" ? "Stop" : "Mic"}
            </span>
          </button>

          {/* Person 2 Record Button */}
          <button
            type="button"
            onClick={() => {
              if (activeRecordingSpeaker === "person_b") {
                stopRecording();
              } else {
                startRecording("person_b");
              }
            }}
            disabled={isProcessing || (activeRecordingSpeaker !== null && activeRecordingSpeaker !== "person_b")}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all active:scale-98 ${
              activeRecordingSpeaker === "person_b"
                ? "bg-rose-500 text-white border-rose-600 ring-2 ring-rose-300 dark:ring-rose-950"
                : "bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100"
            }`}
          >
            <div className="flex items-center gap-2 text-left truncate">
              <div
                className={`p-1.5 rounded-lg shrink-0 ${
                  activeRecordingSpeaker === "person_b"
                    ? "bg-white text-rose-600 animate-bounce"
                    : "bg-emerald-600 text-white"
                }`}
              >
                <Mic className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="text-xs font-bold block truncate">
                  {activeRecordingSpeaker === "person_b" ? "Listening..." : "P2 (Speak)"}
                </span>
                <span className="text-[10px] opacity-75 truncate block">
                  {getLangLabel(personBLang)}
                </span>
              </div>
            </div>

            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-200/50 dark:bg-emerald-900/60 shrink-0 ml-1">
              {activeRecordingSpeaker === "person_b" ? "Stop" : "Mic"}
            </span>
          </button>
        </div>

        {/* Text Input Fallback Bar with Speaker Switcher */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendText();
          }}
          className="flex items-center gap-2"
        >
          {/* Speaker Selector Toggle */}
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setActiveInputSpeaker("person_a")}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${
                activeInputSpeaker === "person_a"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              P1 ({personALang.toUpperCase()})
            </button>
            <button
              type="button"
              onClick={() => setActiveInputSpeaker("person_b")}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${
                activeInputSpeaker === "person_b"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              P2 ({personBLang.toUpperCase()})
            </button>
          </div>

          <input
            type="text"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder={
              activeInputSpeaker === "person_a"
                ? `Type message as Person 1 (${getLangLabel(personALang)})...`
                : `Type message as Person 2 (${getLangLabel(personBLang)})...`
            }
            disabled={isProcessing || activeRecordingSpeaker !== null}
            className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100"
          />

          <button
            type="submit"
            disabled={!manualText.trim() || isProcessing}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-transform active:scale-95 shrink-0 shadow-2xs"
            title="Send Translation"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
