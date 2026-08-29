import React from "react";
import {
  Mic,
  Phone,
  Globe,
  Languages,
  PhoneCall,
} from "lucide-react";
import { useLanguage } from "../services/i18n";

export type NavTab = "assistant" | "conversation" | "ivr" | "knowledge";

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  onOpenEmergency?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedLanguage,
  setSelectedLanguage,
  onOpenEmergency,
}) => {
  const { t } = useLanguage();

  return (
    <header id="main-navbar" className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Branding */}
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

          {/* Center Navigation Tabs */}
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

          </nav>

          {/* Right Section: Emergency Helpline Button + Language Selector */}
          <div className="flex items-center gap-2">
            {/* Red Emergency Helpline Button */}
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

            {/* Language Selector */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-2xs">
              <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <select
                id="language-select-dropdown"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer text-xs max-w-[130px] sm:max-w-none"
              >
                <option value="auto">🌐 {t("autoDetect")}</option>
                <option value="hi">🇮🇳 {t("hindi")}</option>
                <option value="pa">🇮🇳 {t("punjabi")}</option>
                <option value="en">🇮🇳 {t("englishIndian")}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
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
        </div>
      </div>
    </header>
  );
};


