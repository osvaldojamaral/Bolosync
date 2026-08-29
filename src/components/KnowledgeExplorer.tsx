import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Search,
  Landmark,
  HeartPulse,
  Sprout,
  GraduationCap,
  Briefcase,
  Wallet,
  Scale,
  Building2,
  CloudRain,
  Sparkles,
  CheckCircle2,
  FileText,
  PhoneCall,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { DomainType, KnowledgeItem } from "../types";
import { fetchKnowledgeBase } from "../services/api";
import { DomainBadge } from "./DomainBadge";

interface KnowledgeExplorerProps {
  onBackToAssistant?: () => void;
}

export const KnowledgeExplorer: React.FC<KnowledgeExplorerProps> = ({
  onBackToAssistant,
}) => {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [activeDomain, setActiveDomain] = useState<DomainType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await fetchKnowledgeBase(
          activeDomain === "all" ? undefined : activeDomain
        );
        setItems(data.items);
        if (data.items.length > 0) {
          setSelectedItem(data.items[0]);
        } else {
          setSelectedItem(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [activeDomain]);

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const str = JSON.stringify(item).toLowerCase();
    return str.includes(q);
  });

  const domainTabs: Array<{ id: DomainType | "all"; label: string }> = [
    { id: "all", label: "All Topics (सभी)" },
    { id: "scheme", label: "🏛️ Schemes" },
    { id: "health", label: "❤️ Health" },
    { id: "farming", label: "🌾 Farming" },
    { id: "education", label: "📚 Education" },
    { id: "employment", label: "💼 Employment" },
    { id: "finance", label: "💰 Finance" },
    { id: "legal", label: "⚖️ Legal Aid" },
    { id: "civic", label: "🏙️ Civic Info" },
    { id: "weather", label: "🌦️ Weather" },
    { id: "general", label: "💬 General" },
  ];

  return (
    <div id="knowledge-explorer-container" className="max-w-6xl mx-auto p-3 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              Curated RAG Knowledge Base (सत्यापित ज्ञानकोश)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Grounded knowledge store used by Gemini across 10 Indian welfare & public service domains.
          </p>
        </div>

        {onBackToAssistant && (
          <button
            type="button"
            onClick={onBackToAssistant}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold hover:bg-indigo-100 transition-colors"
          >
            ← Back to Voice Assistant
          </button>
        )}
      </div>

      {/* Domain Filter Pills Scrollable */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto no-scrollbar">
        {domainTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveDomain(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeDomain === tab.id
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-600 font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by topic, scheme, crop disease, scholarship, legal right, or helpline (e.g., 'PM KISAN', 'NSP', 'UPI', 'Damini', 'ORS')..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-slate-100"
        />
      </div>

      {/* Main Grid: Left list + Right Detail Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Cards List */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedItem(item)}
              className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                selectedItem?.id === item.id
                  ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <DomainBadge domain={item.domain} size="sm" />
                {item.helpline && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    ☎ {item.helpline}
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
                {item.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                {item.benefits || item.advisory || item.summary || item.problem || item.description}
              </p>
            </button>
          ))}

          {filteredItems.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl">
              No knowledge entries found matching "{searchQuery}".
            </div>
          )}
        </div>

        {/* Right Side: Selected Knowledge Detail Card */}
        <div className="lg:col-span-7">
          {selectedItem ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <DomainBadge domain={selectedItem.domain} size="md" />
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                    {selectedItem.title}
                  </h3>
                </div>
                {selectedItem.helpline && (
                  <a
                    href={`tel:${selectedItem.helpline.split("/")[0].trim()}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0"
                  >
                    <PhoneCall className="w-3 h-3" />
                    {selectedItem.helpline}
                  </a>
                )}
              </div>

              {/* General details / benefits */}
              <div className="space-y-3.5 text-xs sm:text-sm">
                {selectedItem.target_audience && (
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Target Beneficiaries: </span>
                    {selectedItem.target_audience}
                  </div>
                )}

                {selectedItem.benefits && (
                  <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/60 rounded-xl">
                    <span className="font-bold text-indigo-900 dark:text-indigo-300 block mb-1">
                      Key Benefits / Coverage / Direct Assistance:
                    </span>
                    <p className="text-indigo-950 dark:text-indigo-200">
                      {selectedItem.benefits}
                    </p>
                  </div>
                )}

                {selectedItem.eligibility && (
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">
                      Eligibility Criteria (पात्रता):
                    </span>
                    <p className="text-slate-600 dark:text-slate-400">
                      {selectedItem.eligibility}
                    </p>
                  </div>
                )}

                {selectedItem.documents_needed && (
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">
                      Required Documents (दस्तावेज):
                    </span>
                    <p className="text-slate-600 dark:text-slate-400">
                      {selectedItem.documents_needed}
                    </p>
                  </div>
                )}

                {selectedItem.how_to_apply && (
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">
                      How to Apply / Take Action (आवेदन / प्रक्रिया):
                    </span>
                    <p className="text-slate-600 dark:text-slate-400">
                      {selectedItem.how_to_apply}
                    </p>
                  </div>
                )}

                {/* Specific Health items */}
                {selectedItem.domain === "health" && selectedItem.home_action && (
                  <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-xl">
                    <span className="font-bold text-emerald-900 dark:text-emerald-300 block mb-1">
                      Home Care & First Aid Action (प्राथमिक उपचार):
                    </span>
                    <p className="text-emerald-950 dark:text-emerald-200">
                      {selectedItem.home_action}
                    </p>
                  </div>
                )}

                {selectedItem.domain === "health" && selectedItem.warning_signs && (
                  <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-xl">
                    <span className="font-bold text-rose-900 dark:text-rose-300 block mb-1">
                      Red Flag Warning Signs (गंभीर लक्षण - तुरंत अस्पताल जाएं):
                    </span>
                    <p className="text-rose-950 dark:text-rose-200">
                      {selectedItem.warning_signs}
                    </p>
                  </div>
                )}

                {/* Specific Farming items */}
                {selectedItem.domain === "farming" && selectedItem.advisory && (
                  <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-xl">
                    <span className="font-bold text-emerald-900 dark:text-emerald-300 block mb-1">
                      Recommended Remedy & Spray Dosage:
                    </span>
                    <p className="text-emerald-950 dark:text-emerald-200">
                      {selectedItem.advisory}
                    </p>
                  </div>
                )}

                {selectedItem.domain === "farming" && selectedItem.organic_method && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">
                      Organic / Zero-Budget Alternative (जैविक उपाय):
                    </span>
                    <p className="text-slate-600 dark:text-slate-400">
                      {selectedItem.organic_method}
                    </p>
                  </div>
                )}

                {selectedItem.disclaimer && (
                  <div className="p-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-lg text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>{selectedItem.disclaimer}</span>
                  </div>
                )}
              </div>

              {/* Keywords Tagging for RAG */}
              {selectedItem.keywords && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Semantic Indexing Keywords:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedItem.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-medium"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              Select a knowledge item on the left to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

