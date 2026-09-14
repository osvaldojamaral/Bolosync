import React, { useEffect, useMemo, useRef, useState } from "react";
import { BellRing, Clock3, Mic, Plus, Sparkles } from "lucide-react";
import { useLanguage } from "../services/i18n";

export type ReminderItem = {
  id: string;
  text: string;
  timeLabel: string;
  scheduledFor?: Date;
  done: boolean;
  active: boolean;
  statusText?: string;
};

interface ReminderDashboardProps {
  selectedLanguage: string;
  reminderSeed?: string;
  onReminderSeedConsumed?: () => void;
  onSpeak?: (text: string, language?: string) => void;
}

const createDemoReminders = (): ReminderItem[] => [
  {
    id: "demo-1",
    text: "Take your diabetes medicine in the morning.",
    timeLabel: "Tomorrow 8:00 AM",
    scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 2),
    done: false,
    active: true,
    statusText: "Due soon",
  },
  {
    id: "demo-2",
    text: "Speak to the agriculture officer about fertilizer subsidy.",
    timeLabel: "Today 5:00 PM",
    scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 8),
    done: false,
    active: true,
    statusText: "Due today",
  },
];

const getLanguageMeta = (language: string) => {
  if (language === "pa") return { label: "Punjabi", locale: "pa-IN" };
  if (language === "en") return { label: "English", locale: "en-IN" };
  return { label: "Hindi", locale: "hi-IN" };
};

export const ReminderDashboard: React.FC<ReminderDashboardProps> = ({
  selectedLanguage,
  reminderSeed,
  onReminderSeedConsumed,
  onSpeak,
}) => {
  const { t } = useLanguage();
  const [reminders, setReminders] = useState<ReminderItem[]>(createDemoReminders);
  const [draft, setDraft] = useState<string>("Remind me tomorrow morning to take my blood pressure medicine.");
  const [busy, setBusy] = useState(false);
  const [livePrompt, setLivePrompt] = useState<string>("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const reminderLockRef = useRef<any>(null);
  const [activeReminderId, setActiveReminderId] = useState<string | null>(null);

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      setReminders((prev) =>
        prev.map((item) => {
          if (!item.active || item.done) return item;
          const due = item.scheduledFor ? new Date(item.scheduledFor).getTime() <= Date.now() : false;
          return {
            ...item,
            active: !due,
            statusText: due ? "Reminder due" : "Upcoming",
          };
        })
      );
    }, 30000);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  const dueReminders = useMemo(
    () => reminders.filter((item) => item.active && !item.done),
    [reminders]
  );

  useEffect(() => {
    if (!reminderSeed) return;

    const clean = reminderSeed.trim();
    if (!clean) return;

    const nextItem: ReminderItem = {
      id: `reminder-seeded-${Date.now()}`,
      text: clean,
      timeLabel: "Set by AI",
      scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 12),
      done: false,
      active: true,
      statusText: "Scheduled by AI",
    };

    setReminders((prev) => [nextItem, ...prev]);
    const spoken = `Hello! This is your scheduled reminder. ${clean}.`;
    setLivePrompt(spoken);
    window.speechSynthesis?.cancel();
    onSpeak?.(spoken, selectedLanguage);
    onReminderSeedConsumed?.();
  }, [reminderSeed, selectedLanguage, onSpeak, onReminderSeedConsumed]);

  const addReminder = () => {
    const clean = draft.trim();
    if (!clean) return;

    setBusy(true);

    const nextItem: ReminderItem = {
      id: `reminder-manual-${Date.now()}`,
      text: clean,
      timeLabel: "Set for later",
      scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 12),
      done: false,
      active: true,
      statusText: "Scheduled",
    };

    setReminders((prev) => [nextItem, ...prev]);
    setActiveReminderId(nextItem.id);
    setDraft("");

    const spoken = `Hello! This is your scheduled reminder. ${clean}.`;
    setLivePrompt(spoken);
    onSpeak?.(spoken, selectedLanguage);
    setBusy(false);
  };

  const stopConfirmationListening = () => {
    if (reminderLockRef.current && typeof reminderLockRef.current.stop === "function") {
      try {
        reminderLockRef.current.stop();
      } catch (e) {
        // ignored
      }
    }
    reminderLockRef.current = null;
    setIsListening(false);
  };

  const startConfirmationListening = (item: ReminderItem) => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor || reminderLockRef.current) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = getLanguageMeta(selectedLanguage).locale;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    const finalize = () => {
      stopConfirmationListening();
    };

    const handleTranscript = (transcript: string) => {
      const normalized = (transcript || "")
        .toLowerCase()
        .replace(/[^\w\s\u0C00-\u0C7F\u0900-\u097F]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (!normalized) return false;

      const isYes = /(^|\s)(yes|yeah|yep|done|completed|finished|okay|sure|i did it|i did|i have done|completed it|ya|haan|haanji|ji haan|ho gaya|kar diya|kar liya)(\s|$)/i.test(normalized)
        || /^(h\s*a|ha|haan|हाँ|हां|जी हाँ|जी हां)$/i.test(normalized);
      const isNo = /(^|\s)(no|not yet|later|not done|not completed|not finished|na|nahi|nahin|abhi nahi|baad mein|not now|cancel)(\s|$)/i.test(normalized)
        || /^(nahi|nahin|नहीं|ना|रद्द|अभी नहीं|बाद में|later)(\s|$)/i.test(normalized);

      if (isYes) {
        markDone(item.id);
        return true;
      }

      if (isNo) {
        const followUp =
          selectedLanguage === "pa"
            ? "ਮੈਂ ਤੁਹਾਨੂੰ ਫਿਰ ਸੂਚਨਾ ਦਵਾਂਗਾ।"
            : selectedLanguage === "en"
              ? "I will remind you again later."
              : "मैं आपको फिर याद दिलाऊँगा।";
        setLivePrompt(followUp);
        setPlayingId(null);
        onSpeak?.(followUp, selectedLanguage);
        return true;
      }

      return false;
    };

    recognition.onresult = (event: any) => {
      const transcriptPool: string[] = [];
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const resultText = result?.[0]?.transcript || "";
        if (resultText) {
          const cleaned = resultText.trim();
          if (cleaned) transcriptPool.push(cleaned);
        }
      }

      if (transcriptPool.length === 0) {
        finalize();
        return;
      }

      const finalText = transcriptPool[transcriptPool.length - 1] || "";
      const matched = finalText ? handleTranscript(finalText) : false;

      if (!matched) {
        const retryPrompt =
          selectedLanguage === "pa"
            ? "ਮੈਨੂੰ ਸਮਝ ਨਹੀਂ ਆਇਆ। ਕਿਰਪਾ ਕਰਕੇ ਹਾਂ ਜਾਂ ਨਹੀਂ ਬੋਲੋ।"
            : selectedLanguage === "en"
              ? "I could not understand. Please answer yes or no."
              : "मुझे समझ नहीं आया। कृपया हाँ या नहीं बताइए।";
        setLivePrompt(retryPrompt);
        onSpeak?.(retryPrompt, selectedLanguage);
      }

      finalize();
    };

    recognition.onerror = (event: any) => {
      if (event?.error !== "no-speech") {
        const retryPrompt =
          selectedLanguage === "pa"
            ? "ਮੈਨੂੰ ਤੁਹਾਡੀ ਜਵਾਬ ਸੁਣਿਆ ਨਹੀਂ ਗਿਆ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ ਕਰੋ।"
            : selectedLanguage === "en"
              ? "I could not hear your answer. Please try again."
              : "मुझे आपकी प्रतिक्रिया सुनाई नहीं दी। कृपया दोबारा कोशिश करें।";
        setLivePrompt(retryPrompt);
        onSpeak?.(retryPrompt, selectedLanguage);
      }
      finalize();
    };

    recognition.onend = () => finalize();
    recognition.onstart = () => setIsListening(true);
    reminderLockRef.current = recognition;

    try {
      window.speechSynthesis?.cancel();
      recognition.start();
    } catch (error) {
      finalize();
    }
  };

  const announceReminder = (item: ReminderItem) => {
    setActiveReminderId(item.id);
    setPlayingId(item.id);
    setLivePrompt(`Hello! This is your scheduled reminder. ${item.text}.`);

    const sequence = [
      "Hello! This is your scheduled reminder.",
      item.text,
      "Did you do it? Please answer yes or no.",
    ];

    const speakSequence = (index: number) => {
      if (index >= sequence.length) {
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sequence[index]);
      utterance.lang = getLanguageMeta(selectedLanguage).locale;
      utterance.rate = 0.96;
      utterance.onend = () => {
        if (index < sequence.length - 1) {
          window.setTimeout(() => speakSequence(index + 1), 700);
        } else {
          window.setTimeout(() => startConfirmationListening(item), 300);
        }
      };
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.speak(utterance);
    };

    speakSequence(0);
    window.setTimeout(() => setPlayingId(null), 3500);
  };

  const markDone = (itemId: string) => {
    setReminders((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, done: true, active: false, statusText: "Completed" } : item
      )
    );
    stopConfirmationListening();
    setActiveReminderId(itemId);

    const target = reminders.find((item) => item.id === itemId);
    const spoken = target
      ? `Good. I have marked it done: ${target.text}.`
      : "Good. I have marked the reminder as done.";
    setLivePrompt(spoken);
    window.speechSynthesis?.cancel();
    onSpeak?.(spoken, selectedLanguage);
  };

  const triggerReminder = (item: ReminderItem) => {
    setActiveReminderId(item.id);
    announceReminder(item);
  };

  const selectedReminder = reminders.find((item) => item.id === activeReminderId) || reminders[0] || null;

  return (
    <div className="flex-1 min-h-0 flex flex-col h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] max-w-5xl mx-auto w-full relative overflow-hidden">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs mb-3 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{t("reminderDashboard")}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Select a reminder to hear it and answer by voice.
              </p>
            </div>
          </div>
          <div className="px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
            {dueReminders.length} due
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-3 flex-1 min-h-0 overflow-hidden">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Reminder list</h4>
          </div>

          <div className="mb-3 space-y-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Remind me to call the clinic at 4 PM."
            />
            <button
              type="button"
              onClick={addReminder}
              disabled={busy || !draft.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 disabled:opacity-60"
            >
              <Plus className="w-3.5 h-3.5" />
              {busy ? "Saving..." : "Add reminder"}
            </button>
          </div>

          <div className="space-y-2">
            {reminders.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => triggerReminder(item)}
                className={`w-full rounded-xl border p-3 text-left transition-all ${
                  selectedReminder?.id === item.id
                    ? "border-indigo-400 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/40"
                    : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{item.text}</div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <Clock3 className="w-3.5 h-3.5" />
                      <span>{item.timeLabel}</span>
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                      {item.statusText || "Scheduled"}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {!item.done && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-bold">
                        <Mic className="w-3 h-3" />
                        {playingId === item.id ? "Speaking" : "Notify"}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 overflow-y-auto">
          <div className="space-y-3">
            {selectedReminder ? (
              <>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Selected reminder</div>
                  <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{selectedReminder.text}</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{selectedReminder.timeLabel}</p>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Reminder</div>
                  <p className="mt-2 text-sm text-slate-800 dark:text-slate-100">
                    {livePrompt || `Hello! This is your scheduled reminder. ${selectedReminder.text}.`}
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Question</div>
                  <p className="mt-2 text-sm text-emerald-900 dark:text-emerald-100">
                    Did you do it? Please answer yes or no.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => startConfirmationListening(selectedReminder)}
                  disabled={isListening}
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-xl text-white text-sm font-bold px-4 py-3 shadow-sm transition-all ${
                    isListening
                      ? "bg-emerald-600 cursor-not-allowed"
                      : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110"
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  {isListening ? "Listening..." : "Respond by voice"}
                </button>
              </>
            ) : (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-3 text-sm text-slate-600 dark:text-slate-300">
                Select a reminder from the list to begin.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
