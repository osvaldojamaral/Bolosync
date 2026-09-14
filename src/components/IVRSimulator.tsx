import React, { useState, useRef } from "react";
import {
  Phone,
  PhoneOff,
  Volume2,
  Mic,
  Radio,
  Send,
  PhoneCall,
} from "lucide-react";
import { sendVoiceQueryAudio, sendVoiceQueryText, VoiceQueryContext } from "../services/api";

export const IVRSimulator: React.FC = () => {
  const [callState, setCallState] = useState<"idle" | "calling" | "connected">("idle");
  const [selectedLang, setSelectedLang] = useState<"hi" | "pa" | "en">("hi");
  const [callDuration, setCallDuration] = useState(0);
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [ivrAnswer, setIvrAnswer] = useState<string | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [manualQuery, setManualQuery] = useState("");
  const [currentTopic, setCurrentTopic] = useState("home");
  const [previousTopic, setPreviousTopic] = useState("home");
  const [pendingAction, setPendingAction] = useState<VoiceQueryContext["pendingAction"]>(null);
  const [conversationContext, setConversationContext] = useState("");

  const durationTimerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const liveTranscriptRef = useRef("");
  const handledTranscriptRef = useRef("");
  const confirmationHandledRef = useRef(false);
  const audioFallbackHandledRef = useRef(false);
  const pendingActionRef = useRef<VoiceQueryContext["pendingAction"]>(null);

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

  const menuLabels = {
    hi: ["योजनाएँ", "स्वास्थ्य", "खेती"],
    pa: ["ਸਕੀਮਾਂ", "ਸਿਹਤ", "ਖੇਤੀਬਾੜੀ"],
    en: ["Schemes", "Health", "Farming"],
  }[selectedLang];

  const setPendingCall = (action: VoiceQueryContext["pendingAction"]) => {
    pendingActionRef.current = action;
    setPendingAction(action);
  };

  const getIntroductoryPrompt = () => {
    const intro = {
      hi: "नमस्ते। आप बोलोसिंक एआई सहायक से जुड़े हैं। मैं आपकी बात सुनकर योजनाओं, स्वास्थ्य, खेती और जरूरी हेल्पलाइन में मदद करूंगी। आप सीधे बोलकर अपना सवाल या आदेश बताइए।",
      pa: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ। ਤੁਸੀਂ ਬੋਲੋਸਿੰਕ ਏਆਈ ਸਹਾਇਕ ਨਾਲ ਜੁੜੇ ਹੋ। ਮੈਂ ਤੁਹਾਡੀ ਗੱਲ ਸੁਣ ਕੇ ਸਕੀਮਾਂ, ਸਿਹਤ, ਖੇਤੀਬਾੜੀ ਅਤੇ ਜ਼ਰੂਰੀ ਹੈਲਪਲਾਈਨ ਵਿੱਚ ਮਦਦ ਕਰਾਂਗੀ। ਆਪਣਾ ਸਵਾਲ ਜਾਂ ਹੁਕਮ ਸਿੱਧਾ ਬੋਲੋ।",
      en: "Hello. You are now connected to BoloSync, your AI voice assistant. I can listen and help with government schemes, health, farming, and urgent helplines. Speak your question or command naturally, and I will guide you step by step.",
    }[selectedLang];
    return intro;
  };

  const startCall = async () => {
    setCallState("calling");
    setIvrAnswer(null);
    setLiveTranscript("");
    liveTranscriptRef.current = "";
    handledTranscriptRef.current = "";
    confirmationHandledRef.current = false;
    setCurrentTopic("home");
    setPreviousTopic("home");
    setPendingCall(null);
    setConversationContext("");

    setTimeout(() => {
      setCallState("connected");
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      const opening = getIntroductoryPrompt();
      setSystemPrompt(opening);
      speakAloud(opening);
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
    stopMediaCapture();
    setIsListening(false);
    setCallState("idle");
    setCallDuration(0);
    setIvrAnswer(null);
    setPendingCall(null);
    setConversationContext("");
  };

  const stopMediaCapture = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const handleAudioFallback = async (audioBlob: Blob) => {
    if (audioFallbackHandledRef.current || audioBlob.size < 400) return;
    audioFallbackHandledRef.current = true;
    setIsProcessingVoice(true);

    try {
      const response = await sendVoiceQueryAudio(audioBlob, selectedLang, {
        currentTopic,
        pendingAction: pendingActionRef.current,
        lastSpokenAnswer: ivrAnswer || systemPrompt,
        conversationContext,
      });
      setManualQuery(response.transcript);
      setLiveTranscript(response.transcript);
      setIvrAnswer(response.answer_text);

      if (response.command_type === "confirm_yes" && response.target_helpline) {
        const number = response.target_helpline.number.split("/")[0].trim();
        setPendingCall(null);
        speakAloud(response.answer_text);
        window.location.href = `tel:${number}`;
      } else if (response.command_type === "confirm_no") {
        setPendingCall(null);
        speakAloud(response.answer_text);
      } else {
        if (response.command_type === "call_helpline" && response.target_helpline) {
          setPendingCall({
            type: "call",
            helpline: response.target_helpline.number,
            name: response.target_helpline.name,
          });
        }
        speakAloud(response.answer_text);
      }
    } catch (error) {
      console.error("IVR audio fallback error:", error);
      setLiveTranscript("No speech was understood. Please try again.");
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    stopMediaCapture();
  };

  const startListening = async () => {
    if (callState !== "connected" || isProcessingVoice || isListening) return;

    liveTranscriptRef.current = "";
    handledTranscriptRef.current = "";
    confirmationHandledRef.current = false;
    setLiveTranscript("");
    setManualQuery("");

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      audioFallbackHandledRef.current = false;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        if (!handledTranscriptRef.current) void handleAudioFallback(audioBlob);
      };
      recorder.start(100);
      mediaRecorderRef.current = recorder;
    } catch (error) {
      console.error("Microphone access error:", error);
      setLiveTranscript("Microphone access is required. Please allow microphone permissions.");
      return;
    }

    if (!SpeechRecognition) {
      setIsListening(true);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = selectedLang === "pa" ? "pa-IN" : selectedLang === "en" ? "en-IN" : "hi-IN";
    recognition.onstart = () => {
      setIsListening(true);
      setLiveTranscript("");
      setManualQuery("");
      liveTranscriptRef.current = "";
      handledTranscriptRef.current = "";
      confirmationHandledRef.current = false;
    };
    recognition.onresult = (event: any) => {
      const latestResult = event.results[event.results.length - 1];
      const latestTranscript = latestResult?.[0]?.transcript?.trim() || "";
      setLiveTranscript(latestTranscript);
      setManualQuery(latestTranscript);
      liveTranscriptRef.current = latestTranscript;
      if (
        pendingActionRef.current &&
        !confirmationHandledRef.current &&
        isVoiceConfirmation(latestTranscript)
      ) {
        confirmationHandledRef.current = true;
        handledTranscriptRef.current = latestTranscript;
        setIsListening(false);
        recognition.abort();
        stopMediaCapture();
        void handleSimulateCallerVoice(latestTranscript);
        return;
      }
      if (event.results[event.results.length - 1].isFinal) {
        const finalText = latestTranscript;
        handledTranscriptRef.current = finalText;
        stopMediaCapture();
        void handleSimulateCallerVoice(finalText);
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
      stopMediaCapture();
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      const finalText = liveTranscriptRef.current.trim();
      if (!confirmationHandledRef.current && finalText && handledTranscriptRef.current !== finalText) {
        handledTranscriptRef.current = finalText;
        void handleSimulateCallerVoice(finalText);
      } else if (!handledTranscriptRef.current) {
        stopMediaCapture();
      }
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

  const normalizeVoiceText = (text: string) =>
    text.trim().toLowerCase().replace(/[.!?,;:]+/g, "").replace(/\s+/g, " ");

  const isVoiceConfirmation = (text: string) => {
    const normalized = normalizeVoiceText(text);
    return /\b(yes|yeah|yep|sure|proceed|okay|ok|confirm|call|sim|yes please|yes connect|haan|han|ha|यस|येस|हाँ|हां|जी हाँ|जी हां|ਹਾਂ|ਹਾਂਜੀ|no|nope|cancel|stop|dont|don't|do not|नहीं|नहीं चाहिए|ना|मत करो|कैंसल|ਨਹੀਂ|ਨਾ)\b/i.test(normalized);
  };

  const getEmergencyNumber = (text: string) =>
    text.match(/(?:call|dial|phone|ring|contact|कॉल|फोन|मिलाओ|ਕਾਲ|ਫੋਨ)\s*(?:number|नंबर|ਨੰਬਰ)?\s*(112|108|100|101|181|1930)\b/i)?.[1];

  const getCallConfirmation = (number: string) => {
    const names: Record<string, string> = {
      "112": "National Emergency Helpline",
      "108": "National Emergency Ambulance",
      "100": "Police Emergency",
      "101": "Fire Emergency",
      "181": "Women Helpline",
      "1930": "National Cyber Crime Helpline",
    };
    const name = names[number] || "helpline";
    return selectedLang === "hi"
      ? `${name} ${number} पर कॉल की जाएगी। क्या मैं अभी डायल करूं? कृपया हाँ या नहीं बोलें।`
      : selectedLang === "pa"
        ? `${name} ${number} 'ਤੇ ਕਾਲ ਕੀਤੀ ਜਾਵੇਗੀ। ਕੀ ਮੈਂ ਹੁਣੇ ਡਾਇਲ ਕਰਾਂ? ਕਿਰਪਾ ਕਰਕੇ ਹਾਂ ਜਾਂ ਨਹੀਂ ਬੋਲੋ।`
        : `I can connect you to ${name} at ${number}. Shall I dial it now? Please say yes or no.`;
  };

  const handleKeypadPress = async (key: string) => {
    if (callState !== "connected") return;

    const topicForMenu: Record<string, string> = { "1": "scheme", "2": "health", "3": "farming" };
    if (topicForMenu[key]) {
      setPreviousTopic(currentTopic);
      setCurrentTopic(topicForMenu[key]);
    }

    const prompts: Record<string, Record<string, string>> = {
      hi: {
        "1": "आपने सरकारी योजनाएं चुनी हैं। अपना सवाल बोलें, मैं आपकी मदद करूंगी।",
        "2": "प्राथमिक स्वास्थ्य और घरेलू प्राथमिक उपचार के लिए अपनी समस्या बोलें।",
        "3": "फसल सलाह, कीट नियंत्रण या खाद के बारे में अपनी फसल का नाम बोलें।",
      },
      pa: {
        "1": "ਤੁਸੀਂ ਸਰਕਾਰੀ ਸਕੀਮਾਂ ਚੁਣੀਆਂ ਹਨ। ਆਪਣਾ ਸਵਾਲ ਬੋਲੋ, ਮੈਂ ਤੁਹਾਡੀ ਮਦਦ ਕਰਾਂਗੀ।",
        "2": "ਸਿਹਤ ਸਲਾਹ ਅਤੇ ਮੁੱਢਲੀ ਸਹਾਇਤਾ ਲਈ ਆਪਣੀ ਸਮੱਸਿਆ ਦੱਸੋ।",
        "3": "ਫ਼ਸਲ ਸਲਾਹ, ਕੀਟ ਪ੍ਰਬੰਧਨ ਲਈ ਆਪਣੀ ਫ਼ਸਲ ਦਾ ਨਾਮ ਬੋਲੋ।",
      },
      en: {
        "1": "You selected government schemes. Speak your question and I will help you.",
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
    setManualQuery(queryText);

    const normalizedQuery = normalizeVoiceText(queryText);
    const emergencyNumber = getEmergencyNumber(queryText);
    const saysYes = /^(yes|yess|yeah|yep|sure|proceed|ok|okay|confirm|call|please call|yes i do|yes connect|sim|haan|han|ha)(\s|$)/i.test(normalizedQuery) || /^(हाँ|हां|हाँ करो|हां करो|जी हाँ|जी हां|करो|कॉल करो|ਹਾਂ|ਹਾਂਜੀ|ਹਾਂ ਕਰੋ|ਕਰੋ|ਕਾਲ ਕਰੋ)$/i.test(normalizedQuery);
    const saysNo = /^(no|no please|nope|cancel|stop|dont|don't|do not)(\s|$)/i.test(normalizedQuery) || /^(नहीं|नहीं चाहिए|ना|मत करो|कैंसल|ਕੈਂਸਲ|ਨਹੀਂ|ਨਾ|ਨਾ ਕਰੋ)$/i.test(normalizedQuery);

    // Handle telephone commands locally so a stale or unavailable RAG response
    // can never replace the confirmation step for a voice caller.
    if (emergencyNumber) {
      const action = {
        type: "call",
        helpline: emergencyNumber,
        name: emergencyNumber === "112" ? "National Emergency Helpline" : "Emergency Helpline",
      };
      setPendingCall(action);
      const confirmation = getCallConfirmation(emergencyNumber);
      setIvrAnswer(confirmation);
      setConversationContext((previous) => `${previous}\nCaller: ${queryText}\nIVR: ${confirmation}`.trim().slice(-6000));
      speakAloud(confirmation);
      return;
    }

    const activePendingAction = pendingActionRef.current;
    if (activePendingAction && (saysYes || saysNo)) {
      if (saysNo) {
        const cancelled = selectedLang === "en" ? "Call cancelled. You can ask another question." : selectedLang === "pa" ? "ਕਾਲ ਰੱਦ ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ। ਤੁਸੀਂ ਹੋਰ ਸਵਾਲ ਪੁੱਛ ਸਕਦੇ ਹੋ।" : "कॉल रद्द कर दी गई है। आप कोई और सवाल पूछ सकते हैं।";
        setPendingCall(null);
        setIvrAnswer(cancelled);
        speakAloud(cancelled);
        return;
      }

      const number = activePendingAction.helpline;
      const connecting = selectedLang === "en" ? `Connecting you now to ${activePendingAction.name} at ${number}.` : selectedLang === "pa" ? `ਹੁਣੇ ${activePendingAction.name} ${number} ਨਾਲ ਜੋੜਿਆ ਜਾ ਰਿਹਾ ਹੈ।` : `अब आपको ${activePendingAction.name}, नंबर ${number} से जोड़ा जा रहा है।`;
      setPendingCall(null);
      setIvrAnswer(connecting);
      speakAloud(connecting);
      window.location.href = `tel:${number}`;
      return;
    }

    setIsProcessingVoice(true);

    try {
      const context: VoiceQueryContext = {
        currentTopic,
        pendingAction,
        lastSpokenAnswer: ivrAnswer || systemPrompt,
        conversationContext,
      };
      const response = await sendVoiceQueryText(queryText, selectedLang, context);
      setIvrAnswer(response.answer_text);
      setConversationContext((previous) =>
        `${previous}\nUser: ${queryText}\nAssistant: ${response.answer_text}`.trim().slice(-6000)
      );

      if (response.is_navigation) {
        if (response.command_type === "call_helpline" && response.target_helpline) {
          setPendingCall({
            type: "call",
            helpline: response.target_helpline.number,
            name: response.target_helpline.name,
          });
        } else if (response.command_type === "confirm_yes" && response.target_helpline) {
          const number = response.target_helpline.number.split("/")[0].trim();
          setPendingCall(null);
          window.location.href = `tel:${number}`;
        } else if (response.command_type === "confirm_no") {
          setPendingCall(null);
        } else if (response.command_type === "start_over") {
          setCurrentTopic("home");
          setPendingCall(null);
        } else if (response.command_type === "go_back") {
          setCurrentTopic(previousTopic || "home");
        } else if (response.command_type === "topic" && response.topic) {
          setPreviousTopic(currentTopic);
          setCurrentTopic(response.topic);
        }
      } else if (response.domain && response.domain !== "general") {
        setPreviousTopic(currentTopic);
        setCurrentTopic(response.domain);
      }
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

  const submitManualQuery = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = manualQuery.trim();
    if (!query) return;
    setManualQuery("");
    void handleSimulateCallerVoice(query);
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div id="ivr-simulator-container" className="w-full max-w-4xl mx-auto p-2 sm:p-4 md:p-6 space-y-3 sm:space-y-4 overflow-hidden">
      {/* Overview Banner */}
      <div className="p-3 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xs border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
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
          <div className="w-full max-w-sm bg-slate-900 text-slate-100 rounded-3xl p-3 sm:p-6 border-4 border-slate-800 shadow-2xl space-y-4 sm:space-y-5">
            {/* Phone Screen Display */}
            <div className="p-3 sm:p-4 bg-slate-950 rounded-2xl border border-slate-800 min-h-[120px] sm:min-h-[140px] flex flex-col justify-between text-center">
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
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
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
                  className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl transition-all active:scale-90 ${
                    callState === "connected"
                      ? "bg-slate-800 hover:bg-slate-700 text-white cursor-pointer active:bg-indigo-600"
                      : "bg-slate-800/50 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  <span className="text-lg sm:text-xl font-bold">{key.num}</span>
                  {key.label && (
                    <span className="text-[8px] text-slate-400 font-mono">
                      {key.label}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Call / Hangup Actions */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 pt-1 sm:pt-2">
              {callState === "idle" ? (
                <button
                  type="button"
                  onClick={startCall}
                  className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-transform active:scale-95"
                  title="Dial 1800-BOLO-SYNC"
                >
                  <Phone className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={endCall}
                  className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-transform active:scale-95 animate-pulse"
                  title="End Call"
                >
                  <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Conversation */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-5 shadow-xs space-y-3 sm:space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Mic className="w-4 h-4 text-emerald-600" />
              {uiText.speakTitle}
            </h3>

            <button
              type="button"
              onClick={() => (isListening ? stopListening() : void startListening())}
              disabled={callState !== "connected" || isProcessingVoice}
              className={`w-full flex items-center justify-center gap-2 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-bold transition-all ${
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

            <form onSubmit={submitManualQuery} className="flex gap-2">
              <input
                type="text"
                value={manualQuery}
                onChange={(event) => setManualQuery(event.target.value)}
                disabled={callState !== "connected" || isProcessingVoice}
                placeholder={selectedLang === "en" ? "Type or speak a question or command" : selectedLang === "pa" ? "ਸਵਾਲ ਜਾਂ ਕਮਾਂਡ ਬੋਲੋ ਜਾਂ ਲਿਖੋ" : "सवाल या कमांड बोलें या लिखें"}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={callState !== "connected" || isProcessingVoice || !manualQuery.trim()}
                className="flex items-center justify-center rounded-xl bg-emerald-600 px-2.5 sm:px-3 text-white transition-colors hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400"
                title={selectedLang === "en" ? "Send command" : "भेजें"}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>

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
                {pendingAction && (
                  <a
                    href={`tel:${pendingAction.helpline}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rose-500"
                  >
                    <PhoneCall className="h-4 w-4" />
                    <span>{selectedLang === "en" ? `Call ${pendingAction.helpline}` : selectedLang === "pa" ? `ਕਾਲ ${pendingAction.helpline}` : `कॉल ${pendingAction.helpline}`}</span>
                  </a>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
