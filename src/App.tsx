import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Send,
  Trash2,
  Radio,
  BookOpen,
  PhoneCall,
  X,
  Check,
  Compass,
  ArrowLeft,
} from "lucide-react";
import { motion } from "motion/react";
import { ChatMessage, DomainType, VoiceQueryResponse } from "./types";
import { sendVoiceQueryAudio, sendVoiceQueryText } from "./services/api";
import { Navbar, NavTab } from "./components/Navbar";
import { VoiceRecorder } from "./components/VoiceRecorder";
import { ChatBubble } from "./components/ChatBubble";
import { IVRSimulator } from "./components/IVRSimulator";
import { KnowledgeExplorer } from "./components/KnowledgeExplorer";
import { ConversationBridge } from "./components/ConversationBridge";
import { EmergencyModal } from "./components/EmergencyModal";
import { SpokenLanguageSelector } from "./components/SpokenLanguageSelector";
import { LanguageProvider, translate } from "./services/i18n";

const getActionableHelpline = (query: string, answer: string, helpline?: string) => {
  if (helpline) return helpline;
  const combinedText = `${query} ${answer}`;
  const emergencyMatch = combinedText.match(/\b(112|108|100|101|181|1930)\b/);
  return emergencyMatch?.[1];
};

const getWelcomeMessage = (langCode: string): ChatMessage => {
  const welcomeByLang = {
    hi: "नमस्ते! मैं बोलोसिंक हूँ। मैं योजनाओं, स्वास्थ्य, खेती और सरकारी हेल्पलाइन में आपकी मदद कर सकती हूँ। आप कुछ भी बोलकर पूछ सकते हैं।",
    pa: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਬੋਲੋਸਿੰਕ ਹਾਂ। ਮੈਂ ਸਰਕਾਰੀ ਸਕੀਮਾਂ, ਸਿਹਤ, ਖੇਤੀਬਾੜੀ ਅਤੇ ਹੈਲਪਲਾਈਨਾਂ ਵਿੱਚ ਤੁਹਾਡੀ ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ। ਤੁਸੀਂ ਕੁਝ ਵੀ ਬੋਲ ਕੇ ਪੁੱਛ ਸਕਦੇ ਹੋ।",
    en: "Hello! I am BoloSync. I can help with Government Schemes, Health, Farming, and Helplines. You can ask anything by voice.",
  }[langCode as "hi" | "pa" | "en"] || "Hello! I am BoloSync. You can ask anything by voice.";

  return {
    id: "welcome-msg",
    sender: "assistant",
    timestamp: new Date().toISOString(),
    answerText: welcomeByLang,
    answerTextEn: "Welcome to BoloSync! You can speak in Hindi, Punjabi, or English to get instant spoken guidance.",
    domain: "general",
    confidence: 1.0,
  };
};

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("assistant");
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    try {
      return localStorage.getItem("bolosync_spoken_language") || "hi";
    } catch {
      return "hi";
    }
  });

  const [isSpokenLanguageOpen, setIsSpokenLanguageOpen] = useState<boolean>(() => {
    try {
      return !localStorage.getItem("bolosync_spoken_language");
    } catch {
      return false;
    }
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => [getWelcomeMessage(selectedLanguage)]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pipelineStage, setPipelineStage] = useState<
    "idle" | "stt" | "translate_in" | "rag" | "translate_out" | "tts" | "completed"
  >("idle");
  const [manualText, setManualText] = useState<string>("");
  const [isEmergencyOpen, setIsEmergencyOpen] = useState<boolean>(false);
  const t = (key: Parameters<typeof translate>[1]) => translate(selectedLanguage, key);

  const [currentTopic, setCurrentTopic] = useState<string>("home");
  const [previousTopic, setPreviousTopic] = useState<string>("home");
  const [pendingAction, setPendingAction] = useState<{
    type: string;
    helpline: string;
    name: string;
    prompt: string;
  } | null>(null);
  const [lastSpokenText, setLastSpokenText] = useState<string>(() => getWelcomeMessage(selectedLanguage).answerText || "");
  const [lastSpokenAudioUrl, setLastSpokenAudioUrl] = useState<string>("");
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getConversationContext = () =>
    [
      `Current topic: ${currentTopic}`,
      pendingAction ? `Pending action: ${pendingAction.name} (${pendingAction.helpline})` : "No pending action",
      ...messages.slice(-12).map((message) => {
        const speaker = message.sender === "user" ? "User" : "Assistant";
        const text = message.sender === "user" ? message.transcript : message.answerText;
        return `${speaker}: ${(text || "").slice(0, 500)}`;
      }),
    ]
      .join("\n");

  useEffect(() => {
    if (activeTab === "assistant") {
      scrollToBottom();
    }
  }, [messages, activeTab, isProcessing]);

  const playSpokenResponse = (
    text: string,
    langCode: string = "hi",
    audioUrl?: string,
    rate: number = 1.0
  ) => {
    stopAudioPlayback();
    setLastSpokenText(text);

    if (audioUrl && audioPlayerRef.current) {
      setLastSpokenAudioUrl(audioUrl);
      setIsAudioPlaying(true);
      audioPlayerRef.current.src = audioUrl;
      audioPlayerRef.current.playbackRate = rate;
      audioPlayerRef.current.onended = () => setIsAudioPlaying(false);
      audioPlayerRef.current.onerror = () => {
        // fallback to speech synthesis
        fallbackSpeechSynthesis(text, langCode, rate);
      };
      audioPlayerRef.current.play().catch(() => {
        fallbackSpeechSynthesis(text, langCode, rate);
      });
    } else {
      fallbackSpeechSynthesis(text, langCode, rate);
    }
  };

  const fallbackSpeechSynthesis = (text: string, langCode: string, rate: number = 1.0) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode === "pa" ? "pa-IN" : langCode === "en" ? "en-IN" : "hi-IN";
      utterance.rate = rate;
      utterance.onend = () => setIsAudioPlaying(false);
      utterance.onerror = () => setIsAudioPlaying(false);
      setIsAudioPlaying(true);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsAudioPlaying(false);
    }
  };

  const stopAudioPlayback = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsAudioPlaying(false);
  };

  const repeatLastSpokenAnswer = () => {
    if (lastSpokenAudioUrl || lastSpokenText) {
      playSpokenResponse(lastSpokenText, selectedLanguage, lastSpokenAudioUrl, 1.0);
    }
  };

  const handleAudioRecorded = async (audioBlob: Blob, browserTranscript?: string) => {
    if (browserTranscript) {
      await handleSendTextQuery(
        browserTranscript,
        selectedLanguage === "auto" ? undefined : selectedLanguage
      );
      return;
    }

    const audioBlobUrl = URL.createObjectURL(audioBlob);
    const tempUserMsgId = `user-${Date.now()}`;

    const userMsg: ChatMessage = {
      id: tempUserMsgId,
      sender: "user",
      timestamp: new Date().toISOString(),
      audioBlobUrl,
      transcript: "🎙️ Spoken audio query (Transcribing...)",
      detectedLanguage: selectedLanguage === "auto" ? "hi" : selectedLanguage,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);
    setPipelineStage("stt");

    try {
      const forcedLang = selectedLanguage === "auto" ? undefined : selectedLanguage;
      const res: VoiceQueryResponse = await sendVoiceQueryAudio(audioBlob, forcedLang, {
        currentTopic,
        pendingAction,
        lastSpokenAnswer: lastSpokenText,
        conversationContext: getConversationContext(),
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempUserMsgId
            ? {
                ...m,
                transcript: res.transcript,
                detectedLanguage: res.detected_language,
                languageName: res.language_name,
                translatedQuery: res.translated_query,
              }
            : m
        )
      );

      if (res.is_navigation) {
        handleNavigationCommandResult(res);
      } else {
        const assistantMsg: ChatMessage = {
          id: res.id,
          sender: "assistant",
          timestamp: new Date().toISOString(),
          transcript: res.transcript,
          detectedLanguage: res.detected_language,
          languageName: res.language_name,
          translatedQuery: res.translated_query,
          answerText: res.answer_text,
          answerTextEn: res.answer_text_en,
          answerAudioUrl: res.answer_audio_url,
          domain: res.domain,
          confidence: res.confidence,
          sources: res.sources,
          keyPoints: res.key_points,
          suggestions: res.suggestions,
          helpline: getActionableHelpline(res.transcript, res.answer_text, res.helpline),
          disclaimer: res.disclaimer,
          latencyBreakdown: res.latency_breakdown,
          ttsProvider: res.tts_provider,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setPipelineStage("completed");

        playSpokenResponse(res.answer_text, res.detected_language, res.answer_audio_url, 1.0);
      }
    } catch (err: any) {
      console.error("Audio pipeline error:", err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        timestamp: new Date().toISOString(),
        answerText: "माफ कीजिए, आपकी आवाज ठीक से समझ नहीं आई। कृपया शांत जगह से दोबारा बोलें।",
        answerTextEn: "Sorry, I could not clearly understand the audio. Please try speaking again from a quiet place.",
        domain: "general",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNavigationCommandResult = (res: VoiceQueryResponse) => {
    const cmd = res.command_type;

    if (cmd === "change_language") {
      setIsSpokenLanguageOpen(true);
    } else if (cmd === "call_helpline" && res.target_helpline) {
      setPendingAction({
        type: "call",
        helpline: res.target_helpline.number,
        name: res.target_helpline.name,
        prompt: res.answer_text,
      });
    } else if (cmd === "confirm_yes") {
      if (pendingAction && pendingAction.helpline) {
        const number = pendingAction.helpline.split("/")[0].trim();
        window.location.href = `tel:${number}`;
        setPendingAction(null);
      }
    } else if (cmd === "confirm_no") {
      setPendingAction(null);
    } else if (cmd === "topic" && res.topic) {
      setPreviousTopic(currentTopic);
      setCurrentTopic(res.topic);
    } else if (cmd === "go_back") {
      setCurrentTopic(previousTopic || "home");
    } else if (cmd === "start_over") {
      setCurrentTopic("home");
      setPendingAction(null);
    } else if (cmd === "stop") {
      stopAudioPlayback();
    }

    const assistantMsg: ChatMessage = {
      id: res.id,
      sender: "assistant",
      timestamp: new Date().toISOString(),
      transcript: res.transcript,
      detectedLanguage: res.detected_language,
      languageName: res.language_name,
      translatedQuery: res.translated_query,
      answerText: res.answer_text,
      answerTextEn: res.answer_text_en,
      answerAudioUrl: res.answer_audio_url,
      domain: (res.topic as DomainType) || res.domain || "general",
      confidence: 0.99,
      keyPoints: res.key_points,
      helpline: res.helpline,
      latencyBreakdown: res.latency_breakdown,
      ttsProvider: res.tts_provider,
      isNavigation: true,
      commandType: cmd,
      topic: res.topic,
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setPipelineStage("completed");

    playSpokenResponse(
      res.answer_text,
      res.detected_language,
      res.answer_audio_url,
      res.speech_rate || 1.0
    );
  };

  const handleSendTextQuery = async (queryText: string, lang?: string) => {
    const clean = queryText.trim();
    if (!clean || isProcessing) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      timestamp: new Date().toISOString(),
      transcript: clean,
      detectedLanguage: lang || (selectedLanguage === "auto" ? "hi" : selectedLanguage),
    };

    setMessages((prev) => [...prev, userMsg]);
    setManualText("");
    setIsProcessing(true);
    setPipelineStage("rag");

    try {
      const forcedLang = lang || (selectedLanguage === "auto" ? undefined : selectedLanguage);
      const res = await sendVoiceQueryText(clean, forcedLang, {
        currentTopic,
        pendingAction,
        lastSpokenAnswer: lastSpokenText,
        conversationContext: getConversationContext(),
      });

      if (res.is_navigation) {
        handleNavigationCommandResult(res);
      } else {
        const assistantMsg: ChatMessage = {
          id: res.id,
          sender: "assistant",
          timestamp: new Date().toISOString(),
          transcript: res.transcript,
          detectedLanguage: res.detected_language,
          languageName: res.language_name,
          translatedQuery: res.translated_query,
          answerText: res.answer_text,
          answerTextEn: res.answer_text_en,
          answerAudioUrl: res.answer_audio_url,
          domain: res.domain,
          confidence: res.confidence,
          sources: res.sources,
          keyPoints: res.key_points,
          suggestions: res.suggestions,
          helpline: getActionableHelpline(clean, res.answer_text, res.helpline),
          disclaimer: res.disclaimer,
          latencyBreakdown: res.latency_breakdown,
          ttsProvider: res.tts_provider,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setPipelineStage("completed");

        playSpokenResponse(res.answer_text, res.detected_language, res.answer_audio_url, 1.0);
      }
    } catch (err) {
      console.error("Text query error:", err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        timestamp: new Date().toISOString(),
        answerText: "प्रश्न का उत्तर प्राप्त करने में त्रुटि हुई। कृपया पुनः प्रयास करें।",
        answerTextEn: "Error processing your request. Please try again.",
        domain: "general",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLanguageSelectedFromPicker = (langCode: "hi" | "pa" | "en") => {
    setSelectedLanguage(langCode);
    setIsSpokenLanguageOpen(false);

    const welcomeMessage = { ...getWelcomeMessage(langCode), id: `welcome-${Date.now()}` };
    setMessages([welcomeMessage]);
    setLastSpokenText(welcomeMessage.answerText || "");
  };

  const clearChat = () => {
    const welcomeMessage = { ...getWelcomeMessage(selectedLanguage), id: `welcome-${Date.now()}` };
    setMessages([welcomeMessage]);
    setLastSpokenText(welcomeMessage.answerText || "");
    setCurrentTopic("home");
    setPendingAction(null);
    stopAudioPlayback();
  };

  return (
    <LanguageProvider language={selectedLanguage}>
      <div
        id="bolosync-app"
        className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-600 selection:text-white"
      >
      <audio ref={audioPlayerRef} className="hidden" />

      {isSpokenLanguageOpen && (
        <SpokenLanguageSelector
          onLanguageSelected={handleLanguageSelectedFromPicker}
          onCancel={() => setIsSpokenLanguageOpen(false)}
          isReTrigger={Boolean(localStorage.getItem("bolosync_spoken_language"))}
        />
      )}

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedLanguage={selectedLanguage}
        onLanguageSelected={handleLanguageSelectedFromPicker}
        onOpenLanguagePicker={() => setIsSpokenLanguageOpen(true)}
        onOpenEmergency={() => setIsEmergencyOpen(true)}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-3 flex flex-col min-h-0">
        {activeTab === "conversation" ? (
          <ConversationBridge />
        ) : activeTab === "ivr" ? (
          <IVRSimulator />
        ) : activeTab === "knowledge" ? (
          <KnowledgeExplorer onBackToAssistant={() => setActiveTab("assistant")} />
        ) : (
          <div className="flex-1 min-h-0 max-h-[calc(100vh-5.5rem)] flex flex-col h-[calc(100vh-5.5rem)] max-w-5xl mx-auto w-full relative overflow-hidden">
            <div className="relative z-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-xs mb-2.5 shrink-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    <Compass className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                    <span>
                      {currentTopic === "home"
                        ? t("mainMenu")
                        : currentTopic.toUpperCase()}
                    </span>
                  </span>

                  {currentTopic !== "home" && (
                    <button
                      type="button"
                      onClick={() => setCurrentTopic("home")}
                      className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>{t("backHome")}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                  <button
                    id="open-spoken-language-picker-btn"
                    type="button"
                    onClick={() => setIsSpokenLanguageOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition-colors"
                    title={t("changeLanguage")}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{t("changeLanguage")}</span>
                  </button>

                  <button
                    id="secondary-knowledge-base-btn"
                    type="button"
                    onClick={() => setActiveTab("knowledge")}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 transition-colors"
                    title={t("knowledge")}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="hidden sm:inline">{t("knowledge")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={clearChat}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title={t("clearHistory")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t("clear")}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Pending Action Confirmation Banner (for real-world actions like call) */}
            {pendingAction && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-2.5 p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-500 text-amber-950 dark:text-amber-100 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 animate-bounce">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      {t("voiceConfirmation")}
                    </div>
                    <div className="text-sm font-semibold">
                      {selectedLanguage === "en"
                        ? `Call ${pendingAction.name} (${pendingAction.helpline}) now?`
                        : selectedLanguage === "pa"
                          ? `${pendingAction.name} (${pendingAction.helpline}) 'ਤੇ ਹੁਣੇ ਕਾਲ ਕਰੀਏ?`
                          : `${pendingAction.name} (${pendingAction.helpline}) पर अभी कॉल करें?`}
                    </div>
                    <div className="text-xs text-amber-800 dark:text-amber-200">
                      {t("sayYesNo")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    id="confirm-call-yes-btn"
                    onClick={() => {
                      const number = pendingAction.helpline.split("/")[0].trim();
                      window.location.href = `tel:${number}`;
                      setPendingAction(null);
                    }}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>{t("yesCall")}</span>
                  </button>
                  <button
                    type="button"
                    id="confirm-call-no-btn"
                    onClick={() => setPendingAction(null)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shadow-md active:scale-95"
                  >
                    <X className="w-4 h-4" />
                    <span>{t("cancel")}</span>
                  </button>
                </div>
              </motion.div>
            )}

            <div
              id="voice-chat-stream-container"
              className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 py-2 space-y-3 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/60 mb-2.5"
            >
              {messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}

              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-xs max-w-md shadow-xs"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 animate-spin border border-indigo-200 dark:border-indigo-800">
                    <Radio className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                      {t("processing")}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {pipelineStage === "stt"
                        ? t("transcribingRegional")
                        : pipelineStage === "rag"
                        ? t("routingDomain")
                        : t("creatingVoice")}
                    </span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div
              id="assistant-fixed-bottom-dock"
              className="relative z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-lg shrink-0 space-y-2"
            >
              <VoiceRecorder
                onAudioRecorded={handleAudioRecorded}
                isProcessing={isProcessing}
                selectedLanguage={selectedLanguage}
                onRepeatLastAnswer={repeatLastSpokenAnswer}
                hasLastAnswer={Boolean(lastSpokenText)}
                isAudioPlaying={isAudioPlaying}
                onStopAudio={stopAudioPlayback}
              />

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendTextQuery(manualText);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder={t("typeOrAsk")}
                  disabled={isProcessing}
                  className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                />
                <button
                  type="submit"
                  disabled={!manualText.trim() || isProcessing}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-transform active:scale-95 shrink-0 shadow-2xs"
                  title={t("sendQuery")}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      <EmergencyModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
      />

      </div>
    </LanguageProvider>
  );
}

