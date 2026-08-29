import React, { useState, useRef } from "react";
import {
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  Mic,
  Radio,
} from "lucide-react";
import { dialIVR, sendVoiceQueryText } from "../services/api";

export const IVRSimulator: React.FC = () => {
  const [callState, setCallState] = useState<"idle" | "calling" | "connected">("idle");
  const [selectedLang, setSelectedLang] = useState<"hi" | "pa" | "en">("hi");
  const [activeMenu, setActiveMenu] = useState<string>("1");
  const [callDuration, setCallDuration] = useState(0);
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [spokenQuery, setSpokenQuery] = useState("");
  const [ivrAnswer, setIvrAnswer] = useState<string | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");

  const durationTimerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef("");

  const uiText = {
    hi: {
      title: "1800 IVR", subtitle: "सरल फोन मेनू के ज़रिए आवाज़ सहायता।", call: "कॉल",
      connected: "कॉल जुड़ी है", dialing: "किसान IVR सर्वर से जुड़ रहा है...",
      pressCall: "टोल-फ्री लाइन से जुड़ने के लिए कॉल दबाएँ", speakTitle: "बोलोसिंक से बोलें",
      tapSpeak: "बोलने के लिए दबाएँ", listening: "सुन रहा है...", answer: "IVR आवाज़ में जवाब",
      replay: "दोबारा सुनें", error: "आवाज़ साफ़ नहीं थी। कृपया फिर बोलें।",
    },
    pa: {
      title: "1800 IVR", subtitle: "ਸਧਾਰਨ ਫ਼ੋਨ ਮੀਨੂ ਰਾਹੀਂ ਆਵਾਜ਼ ਸਹਾਇਤਾ।", call: "ਕਾਲ",
      connected: "ਕਾਲ ਜੁੜ ਗਈ ਹੈ", dialing: "ਕਿਸਾਨ IVR ਸਰਵਰ ਨਾਲ ਜੁੜ ਰਿਹਾ ਹੈ...",
      pressCall: "ਟੋਲ-ਫ੍ਰੀ ਲਾਈਨ ਨਾਲ ਜੁੜਨ ਲਈ ਕਾਲ ਦਬਾਓ", speakTitle: "ਬੋਲੋਸਿੰਕ ਨਾਲ ਬੋਲੋ",
      tapSpeak: "ਬੋਲਣ ਲਈ ਦਬਾਓ", listening: "ਸੁਣ ਰਿਹਾ ਹੈ...", answer: "IVR ਆਵਾਜ਼ ਵਿੱਚ ਜਵਾਬ",
      replay: "ਦੁਬਾਰਾ ਸੁਣੋ", error: "ਆਵਾਜ਼ ਸਾਫ਼ ਨਹੀਂ ਸੀ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਬੋਲੋ।",
    },
    en: {
      title: "1800 IVR", subtitle: "Voice support through a simple phone menu.", call: "Call",
      connected: "Call connected", dialing: "Connecting to the Kisan IVR server...",
      pressCall: "Press call to connect to the toll-free line", speakTitle: "Speak to BoloSync",
      tapSpeak: "Tap to speak", listening: "Listening...", answer: "IVR voice answer",
      replay: "Replay", error: "I could not hear you clearly. Please try again.",
    },
  }[selectedLang];

  const sampleQuestions = {
    hi: [
      "पीएम किसान योजना में बैंक खाता कैसे जोड़ें?",
      "लू लगने पर मरीज को क्या देना चाहिए?",
      "सरसों में चेपा कीड़े का क्या इलाज है?",
    ],
    pa: [
      "ਪੀਐੱਮ ਕਿਸਾਨ ਯੋਜਨਾ ਵਿੱਚ ਬੈਂਕ ਖਾਤਾ ਕਿਵੇਂ ਜੋੜੀਏ?",
      "ਲੂ ਲੱਗਣ 'ਤੇ ਮਰੀਜ਼ ਨੂੰ ਕੀ ਦੇਣਾ ਚਾਹੀਦਾ ਹੈ?",
      "ਸਰਸੋਂ ਵਿੱਚ ਚੇਪਾ ਕੀੜੇ ਦਾ ਕੀ ਇਲਾਜ ਹੈ?",
    ],
    en: [
      "How do I link my bank account to PM-KISAN?",
      "What should I give someone suffering from heatstroke?",
      "How can I treat aphids on mustard plants?",
    ],
  }[selectedLang];

  const menuLabels = {
    hi: ["योजनाएँ", "स्वास्थ्य", "खेती"],
    pa: ["ਸਕੀਮਾਂ", "ਸਿਹਤ", "ਖੇਤੀਬਾੜੀ"],
    en: ["Schemes", "Health", "Farming"],
  }[selectedLang];

  const startCall = async () => {
    setCallState("calling");
    setIvrAnswer(null);
    setSpokenQuery("");
    setLiveTranscript("");
    liveTranscriptRef.current = "";

    setTimeout(async () => {
      setCallState("connected");
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      // Fetch initial menu prompt
      try {
        const data = await dialIVR(selectedLang, "1");
        setSystemPrompt(data.system_voice_prompt);
        speakAloud(data.system_voice_prompt);
      } catch {
        const defaultPrompt =
          selectedLang === "pa"
            ? "ਬੋਲੋਸਿੰਕ ਕਿਸਾਨ ਅਤੇ ਨਾਗਰਿਕ ਹੈਲਪਲਾਈਨ ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ। ਸਰਕਾਰੀ ਸਕੀਮਾਂ ਲਈ 1 ਦਬਾਓ, ਸਿਹਤ ਲਈ 2, ਖੇਤੀਬਾੜੀ ਲਈ 3।"
            : "बोलोसिंक किसान एवं नागरिक हेल्पलाइन में आपका स्वागत है। सरकारी योजनाओं के लिए 1 दबाएं, स्वास्थ्य के लिए 2, फसल सलाह के लिए 3 दबाएं।";
        setSystemPrompt(defaultPrompt);
        speakAloud(defaultPrompt);
      }
    }, 1500);
  };

  const endCall = () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setCallState("idle");
    setCallDuration(0);
    setIvrAnswer(null);
  };

  const startListening = () => {
    if (callState !== "connected" || isProcessingVoice || isListening) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setLiveTranscript("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = selectedLang === "pa" ? "pa-IN" : selectedLang === "en" ? "en-IN" : "hi-IN";
    recognition.onstart = () => {
      setIsListening(true);
      setLiveTranscript("");
    };
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += `${event.results[index][0].transcript} `;
      }
      setLiveTranscript(transcript.trim());
      liveTranscriptRef.current = transcript.trim();
      if (event.results[event.results.length - 1].isFinal) {
        setSpokenQuery(transcript.trim());
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      const finalText = liveTranscriptRef.current.trim();
      if (finalText) handleSimulateCallerVoice(finalText);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      recognitionRef.current = null;
    }
  };

  const speakAloud = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLang === "pa" ? "pa-IN" : selectedLang === "en" ? "en-IN" : "hi-IN";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  const handleKeypadPress = async (key: string) => {
    if (callState !== "connected") return;
    setActiveMenu(key);

    const prompts: Record<string, Record<string, string>> = {
      hi: {
        "1": "सरकारी योजनाओं की जानकारी के लिए कृपया अपनी योजना का नाम बोलें।",
        "2": "प्राथमिक स्वास्थ्य और घरेलू प्राथमिक उपचार के लिए अपनी समस्या बोलें।",
        "3": "फसल सलाह, कीट नियंत्रण या खाद के बारे में अपनी फसल का नाम बोलें।",
      },
      pa: {
        "1": "ਸਰਕਾਰੀ ਸਕੀਮਾਂ ਦੀ ਜਾਣਕਾਰੀ ਲਈ ਆਪਣੀ ਸਕੀਮ ਦਾ ਨਾਮ ਬੋਲੋ।",
        "2": "ਸਿਹਤ ਸਲਾਹ ਅਤੇ ਮੁੱਢਲੀ ਸਹਾਇਤਾ ਲਈ ਆਪਣੀ ਸਮੱਸਿਆ ਦੱਸੋ।",
        "3": "ਫ਼ਸਲ ਸਲਾਹ, ਕੀਟ ਪ੍ਰਬੰਧਨ ਲਈ ਆਪਣੀ ਫ਼ਸਲ ਦਾ ਨਾਮ ਬੋਲੋ।",
      },
      en: {
        "1": "For government welfare schemes, please speak the scheme name.",
        "2": "For basic health guidance and first aid, describe your symptom.",
        "3": "For farming advisories and crop health, speak your crop name.",
      },
    };

    const text = prompts[selectedLang]?.[key] || "कृपया अपनी समस्या बोलें।";
    setSystemPrompt(text);
    speakAloud(text);
  };

  const handleSimulateCallerVoice = async (queryText: string) => {
    if (callState !== "connected") return;
    setSpokenQuery(queryText);
    setIsProcessingVoice(true);

    try {
      const response = await sendVoiceQueryText(queryText, selectedLang);
      setIvrAnswer(response.answer_text);
      speakAloud(response.answer_text);
    } catch (err) {
      console.error("IVR voice query error:", err);
      const fallback = uiText.error;
      setIvrAnswer(fallback);
      speakAloud(fallback);
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div id="ivr-simulator-container" className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
      {/* Overview Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xs border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">
            {uiText.title}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
            {uiText.subtitle}
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400 block uppercase font-mono">{uiText.call}</span>
          <span className="text-base sm:text-lg font-mono font-bold text-indigo-300">
            1800-265-6796
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Interactive Phone Handset UI */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="w-full max-w-sm bg-slate-900 text-slate-100 rounded-3xl p-6 border-4 border-slate-800 shadow-2xl space-y-5">
            {/* Phone Screen Display */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 min-h-[140px] flex flex-col justify-between text-center">
              <div>
                <span className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase">
                  BoloSync Telephony Node
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  1800-BOLO-SYNC
                </h3>
              </div>

              {callState === "connected" ? (
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    {uiText.connected} ({formatDuration(callDuration)})
                  </span>
                  <p className="text-[11px] text-slate-300 line-clamp-2 px-1">
                    {systemPrompt || "Listening to caller..."}
                  </p>
                </div>
              ) : callState === "calling" ? (
                <div className="text-indigo-400 text-xs font-semibold animate-pulse">
                  {uiText.dialing}
                </div>
              ) : (
                <div className="text-slate-500 text-xs">
                  {uiText.pressCall}
                </div>
              )}

              {/* Language Indicator */}
              <div className="flex justify-center gap-2 pt-1 border-t border-slate-800/80">
                {(["hi", "pa", "en"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    disabled={callState !== "idle"}
                    onClick={() => setSelectedLang(l)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                      selectedLang === l
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {l === "hi" ? "हिंदी" : l === "pa" ? "ਪੰਜਾਬੀ" : "ENG"}
                  </button>
                ))}
              </div>
            </div>

            {/* Dialpad Keys 1-9 */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { num: "1", label: menuLabels[0] },
                { num: "2", label: menuLabels[1] },
                { num: "3", label: menuLabels[2] },
                { num: "4", label: "GHI" },
                { num: "5", label: "JKL" },
                { num: "6", label: "MNO" },
                { num: "7", label: "PQRS" },
                { num: "8", label: "TUV" },
                { num: "9", label: "WXYZ" },
                { num: "*", label: "" },
                { num: "0", label: "+" },
                { num: "#", label: "" },
              ].map((key) => (
                <button
                  key={key.num}
                  type="button"
                  onClick={() => handleKeypadPress(key.num)}
                  disabled={callState !== "connected"}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all active:scale-90 ${
                    callState === "connected"
                      ? "bg-slate-800 hover:bg-slate-700 text-white cursor-pointer active:bg-indigo-600"
                      : "bg-slate-800/50 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  <span className="text-xl font-bold">{key.num}</span>
                  {key.label && (
                    <span className="text-[8px] text-slate-400 font-mono">
                      {key.label}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Call / Hangup Actions */}
            <div className="flex items-center justify-center gap-6 pt-2">
              {callState === "idle" ? (
                <button
                  type="button"
                  onClick={startCall}
                  className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-transform active:scale-95"
                  title="Dial 1800-BOLO-SYNC"
                >
                  <Phone className="w-7 h-7 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={endCall}
                  className="flex items-center justify-center w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-transform active:scale-95 animate-pulse"
                  title="End Call"
                >
                  <PhoneOff className="w-7 h-7 fill-current" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Conversation */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Mic className="w-4 h-4 text-emerald-600" />
              {uiText.speakTitle}
            </h3>

            <button
              type="button"
              onClick={startListening}
              disabled={callState !== "connected" || isProcessingVoice}
              className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                isListening
                  ? "bg-rose-600 text-white animate-pulse"
                  : "bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400"
              }`}
            >
              <Mic className="w-4 h-4" />
              {isListening ? uiText.listening : uiText.tapSpeak}
            </button>

            {liveTranscript && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                {liveTranscript}
              </div>
            )}

            <div className="space-y-2">
              {sampleQuestions.map((text, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={callState !== "connected" || isProcessingVoice}
                  onClick={() => handleSimulateCallerVoice(text)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                    callState === "connected"
                      ? "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-indigo-500"
                      : "opacity-60 cursor-not-allowed border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between font-medium text-slate-900 dark:text-slate-100">
                    <span>"{text}"</span>
                  </div>
                </button>
              ))}
            </div>

            {/* In-Call Spoken Response Output */}
            {ivrAnswer && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-600" />
                    {uiText.answer}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakAloud(ivrAnswer)}
                    className="p-1 text-emerald-700 hover:text-emerald-900"
                    title={uiText.replay}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  "{ivrAnswer}"
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
