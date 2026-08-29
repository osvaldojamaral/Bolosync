import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Sparkles, AlertCircle, Radio, X, Check, RotateCcw, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../services/i18n";

interface VoiceRecorderProps {
  onAudioRecorded: (blob: Blob, browserTranscript?: string) => void;
  isProcessing: boolean;
  selectedLanguage: string; // "hi" | "pa" | "en" | "auto"
  onRepeatLastAnswer?: () => void;
  hasLastAnswer?: boolean;
  isAudioPlaying?: boolean;
  onStopAudio?: () => void;
  onTranscript?: (transcript: string) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onAudioRecorded,
  isProcessing,
  selectedLanguage,
  onRepeatLastAnswer,
  hasLastAnswer = false,
  isAudioPlaying = false,
  onStopAudio,
  onTranscript,
}) => {
  const { t } = useLanguage();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState<"tap" | "hold">("tap");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [browserTranscript, setBrowserTranscript] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordStartTimeRef = useRef<number>(0);
  const speechRecognitionRef = useRef<any>(null);
  const browserTranscriptRef = useRef<string>("");

  const langPromptText = {
    hi: "बोलें: PM-KISAN, खाद, स्वास्थ्य, योजनाएं...",
    pa: "ਬੋਲੋ: ਕਿਸਾਨ ਸਕੀਮਾਂ, ਖਾਦ, ਸਿਹਤ...",
    en: "Speak: Crop subsidy, Ayushman, Schemes...",
    auto: "Speak in Hindi, Punjabi or English...",
  }[selectedLanguage] || "बोलने के लिए माइक दबाएं";

  const startRecording = async () => {
    if (isProcessing) return;
    setPermissionError(null);
    audioChunksRef.current = [];
    browserTranscriptRef.current = "";
    setBrowserTranscript("");
    recordStartTimeRef.current = Date.now();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = selectedLanguage === "pa" ? "pa-IN" : selectedLanguage === "en" ? "en-IN" : "hi-IN";
        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let index = 0; index < event.results.length; index += 1) {
            currentTranscript += `${event.results[index][0].transcript.trim()} `;
          }
          if (currentTranscript.trim()) {
            browserTranscriptRef.current = currentTranscript;
            setBrowserTranscript(currentTranscript.trim());
            onTranscript?.(currentTranscript.trim());
          }
        };
        recognition.onerror = () => {};
        try {
          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch {}
      }

      // Audio analysis for real-time visualizer
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
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();

      // Setup MediaRecorder
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
          const duration = Date.now() - recordStartTimeRef.current;
          const mime = recorder.mimeType || "audio/webm";
          const audioBlob = new Blob(audioChunksRef.current, { type: mime });
          const browserTranscript = browserTranscriptRef.current.trim();

          if (duration < 350 && hasLastAnswer && onRepeatLastAnswer) {
            onRepeatLastAnswer();
          } else if (audioBlob.size > 400) {
            onAudioRecorded(audioBlob, browserTranscript || undefined);
          }
          cleanupAudio();
        }, 200);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access denied or error:", err);
      setPermissionError(
        "Microphone access needed. Please allow permissions in browser."
      );
      cleanupAudio();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    audioChunksRef.current = [];
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    cleanupAudio();
  };

  const cleanupAudio = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
    setAudioLevel(0);
    setBrowserTranscript("");
    onTranscript?.("");
  };

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      id="compact-voice-recorder"
      className="w-full relative transition-all"
    >
      {/* Permission alert if mic denied */}
      {permissionError && (
        <div className="mb-2 flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-xs rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{permissionError}</span>
          <button
            type="button"
            onClick={() => setPermissionError(null)}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* COMPACT SLIM BAR */}
      <div
        className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-2xl border transition-all ${
          isRecording
            ? "bg-slate-950 text-white border-rose-500 shadow-md ring-2 ring-rose-500/20"
            : isProcessing
            ? "bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200"
            : "bg-slate-50 dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200"
        }`}
      >
        {/* Left: Record Button / Status Icon */}
        <div className="flex items-center gap-2.5">
          <button
            id="main-voice-record-btn"
            type="button"
            disabled={isProcessing}
            onMouseDown={recordingMode === "hold" ? startRecording : undefined}
            onMouseUp={recordingMode === "hold" ? stopRecording : undefined}
            onTouchStart={recordingMode === "hold" ? startRecording : undefined}
            onTouchEnd={recordingMode === "hold" ? stopRecording : undefined}
            onClick={
              recordingMode === "tap"
                ? isRecording
                  ? stopRecording
                  : startRecording
                : undefined
            }
            className={`flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl font-bold shadow-xs transition-all transform active:scale-95 shrink-0 ${
              isProcessing
                ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                : isRecording
                ? "bg-rose-600 text-white ring-4 ring-rose-500/30 animate-pulse"
                : "bg-gradient-to-tr from-indigo-600 to-emerald-600 text-white hover:shadow-md hover:scale-105"
            }`}
            title={isRecording ? "Stop recording" : "Click to Speak (बोलें)"}
          >
            {isProcessing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Radio className="w-5 h-5" />
              </motion.div>
            ) : isRecording ? (
              <Square className="w-5 h-5 fill-current" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>

          {/* Text Info / Live Recording Meter */}
          <div className="flex flex-col justify-center">
            {isProcessing ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>{t("transcribing")}</span>
              </div>
            ) : isRecording ? (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span className="text-xs font-bold text-rose-400">
                  {t("listening")} ({formatSeconds(recordingSeconds)})
                </span>
                <span className="text-[11px] text-slate-300 hidden sm:inline">
                  {t("speakClearly")}
                </span>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {t("tapSpeak")}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">
                    {t("voice")}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px] sm:max-w-xs">
                  {browserTranscript || langPromptText}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Center/Right: Equalizer bars when recording OR Action Controls when idle */}
        <div className="flex items-center gap-2">
          {isRecording ? (
            <div className="flex items-center gap-2">
              {/* Sound visualizer level bars */}
              <div className="flex items-center gap-1 px-2 py-1 bg-slate-900 rounded-lg">
                {[15, 50, 85, 60, 30, 95, 70, 40].map((h, idx) => (
                  <div
                    key={idx}
                    className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                    style={{
                      height: `${Math.max(4, (h * audioLevel) / 100)}px`,
                    }}
                  />
                ))}
              </div>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={cancelRecording}
                className="p-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 rounded-lg"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Done / Stop Button */}
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-transform active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {/* Repeat Last Spoken Answer Button for Zero-Literacy Quick Replay */}
              {hasLastAnswer && onRepeatLastAnswer && (
                <button
                  type="button"
                  id="repeat-last-answer-btn"
                  onClick={onRepeatLastAnswer}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 text-xs font-bold transition-all transform active:scale-95 shadow-2xs"
                  title="Repeat what AI said (दोबारा सुनें)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">दोबारा सुनें</span>
                </button>
              )}

              {/* Stop Audio if currently speaking */}
              {isAudioPlaying && onStopAudio && (
                <button
                  type="button"
                  id="stop-audio-playing-btn"
                  onClick={onStopAudio}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 text-xs font-bold transition-all"
                  title="Stop voice (रुकें)"
                >
                  <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                  <span>रुकें</span>
                </button>
              )}

              {/* Compact Mode Switcher (Tap vs Hold) */}
              <div className="hidden sm:flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] text-slate-600 dark:text-slate-400">
                <button
                  type="button"
                  onClick={() => setRecordingMode("tap")}
                  className={`px-2 py-1 rounded-md font-medium transition-all ${
                    recordingMode === "tap"
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-semibold"
                      : "hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  Tap
                </button>
                <button
                  type="button"
                  onClick={() => setRecordingMode("hold")}
                  className={`px-2 py-1 rounded-md font-medium transition-all ${
                    recordingMode === "hold"
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-semibold"
                      : "hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  Hold
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
