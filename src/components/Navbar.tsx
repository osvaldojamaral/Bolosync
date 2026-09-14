import React, { useEffect, useRef, useState } from "react";
import {
  Mic,
  Phone,
  Globe,
  Languages,
  PhoneCall,
  ChevronDown,
  Check,
  Clock3,
} from "lucide-react";
import { useLanguage } from "../services/i18n";

export type NavTab = "assistant" | "conversation" | "translator" | "ivr" | "reminder" | "knowledge";

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  selectedLanguage: string;
  onLanguageSelected: (lang: "hi" | "pa" | "en") => void;
  onOpenLanguagePicker: () => void;
  onOpenEmergency?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedLanguage,
  onLanguageSelected,
  onOpenLanguagePicker,
  onOpenEmergency,
}) => {
  const { t } = useLanguage();
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement | null>(null);
  const languageLabel = selectedLanguage === "hi"
    ? t("hindi")
    : selectedLanguage === "pa"
      ? t("punjabi")
      : selectedLanguage === "en"
        ? t("englishIndian")
        : t("autoDetect");

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!languageMenuRef.current?.contains(event.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <header id="main-navbar" className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          <div
            id="navbar-brand-logo"
            className="flex items-center gap-2.5 cursor-pointer select-none"
            onClick={() => setActiveTab("assistant")}
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-emerald-500 text-white shadow-sm ring-1 ring-indigo-500/20">
              <Mic className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              BoloSync
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              id="nav-tab-assistant"
              type="button"
              onClick={() => setActiveTab("assistant")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "assistant"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-600"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{t("voiceAssistant")}</span>
            </button>

            <button
              id="nav-tab-conversation"
              type="button"
              onClick={() => setActiveTab("conversation")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "conversation"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-600"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Languages className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="flex items-center gap-1">
                {t("conversationBridge")}
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </span>
            </button>

            <button
              id="nav-tab-translator"
              type="button"
              onClick={() => setActiveTab("translator")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "translator"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-600"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Languages className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              <span>Translator</span>
            </button>

            <button
              id="nav-tab-ivr"
              type="button"
              onClick={() => setActiveTab("ivr")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "ivr"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-600"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{t("ivr")}</span>
            </button>

            <button
              id="nav-tab-reminder"
              type="button"
              onClick={() => setActiveTab("reminder")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "reminder"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-600"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Clock3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{t("reminderDashboard")}</span>
            </button>

          </nav>

          <div className="flex items-center gap-2">
            <button
              id="emergency-helpline-top-btn"
              type="button"
              onClick={onOpenEmergency}
              className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all ring-2 ring-red-200 dark:ring-red-950"
              title="Emergency Helplines (112, 108, 1930, 181, Kisan 1551)"
            >
              <PhoneCall className="w-3.5 h-3.5 text-white animate-pulse" />
              <span className="hidden sm:inline">{t("emergency")}</span>
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
            </button>

            <div ref={languageMenuRef} className="relative">
              <button
                id="language-picker-trigger"
                type="button"
                onClick={() => setIsLanguageMenuOpen((open) => !open)}
                className="group flex max-w-[180px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs shadow-2xs transition-colors hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/40"
                title={t("changeLanguage")}
                aria-expanded={isLanguageMenuOpen}
              >
                <Globe className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <span className="truncate font-bold text-slate-800 dark:text-slate-200">{languageLabel}</span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${isLanguageMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {isLanguageMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="border-b border-slate-100 px-3 pb-2 pt-1 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Choose your language</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Select a language for the whole app</p>
                  </div>
                  {([
                    { code: "hi", native: "हिंदी", english: "Hindi", flag: "🇮🇳" },
                    { code: "pa", native: "ਪੰਜਾਬੀ", english: "Punjabi", flag: "🇮🇳" },
                    { code: "en", native: "English", english: "Indian English", flag: "🇮🇳" },
                  ] as const).map((option) => {
                    const selected = selectedLanguage === option.code;
                    return (
                      <button
                        key={option.code}
                        type="button"
                        onClick={() => {
                          onLanguageSelected(option.code);
                          setIsLanguageMenuOpen(false);
                        }}
                        className={`mt-1 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${selected ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" : "border-transparent hover:border-indigo-300 hover:bg-indigo-50 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40"}`}
                      >
                        <span className="text-xl">{option.flag}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">{option.native}</span>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400">{option.english}</span>
                        </span>
                        {selected && <Check className="h-4 w-4 text-emerald-600" />}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLanguageMenuOpen(false);
                      onOpenLanguagePicker();
                    }}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-950"
                  >
                    <Mic className="h-3.5 w-3.5" />
                    Choose by voice
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-200 dark:border-slate-800 text-xs overflow-x-auto no-scrollbar gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("assistant")}
            className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap ${
              activeTab === "assistant"
                ? "text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950"
                : "text-slate-500"
            }`}
          >
            {t("voiceAssistant")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("conversation")}
            className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap ${
              activeTab === "conversation"
                ? "text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950"
                : "text-slate-500"
            }`}
          >
            {t("conversationBridge")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ivr")}
            className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap ${
              activeTab === "ivr"
                ? "text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950"
                : "text-slate-500"
            }`}
          >
            {t("ivr")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reminder")}
            className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap ${
              activeTab === "reminder"
                ? "text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950"
                : "text-slate-500"
            }`}
          >
            {t("reminderDashboard")}
          </button>
        </div>
      </div>
    </header>
  );
};


