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
  PhoneCall,
  AlertTriangle,
  ArrowLeft,
  Database,
  Filter,
  SearchX,
  Layers,
} from "lucide-react";
import { DomainType, KnowledgeItem } from "../types";
import { fetchKnowledgeBase } from "../services/api";
import { DomainBadge } from "./DomainBadge";

interface KnowledgeExplorerProps {
  onBackToAssistant?: () => void;
}

const domainTabs: Array<{
  id: DomainType | "all";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "all", label: "All topics", icon: Layers },
  { id: "scheme", label: "Schemes", icon: Landmark },
  { id: "health", label: "Health", icon: HeartPulse },
  { id: "farming", label: "Farming", icon: Sprout },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "employment", label: "Employment", icon: Briefcase },
  { id: "finance", label: "Finance", icon: Wallet },
  { id: "legal", label: "Legal aid", icon: Scale },
  { id: "civic", label: "Civic", icon: Building2 },
  { id: "weather", label: "Weather", icon: CloudRain },
  { id: "general", label: "General", icon: BookOpen },
];

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

  const activeTab = domainTabs.find((tab) => tab.id === activeDomain) || domainTabs[0];
  const getItemSummary = (item: KnowledgeItem) =>
    item.benefits || item.advisory || item.summary || item.problem || "Verified public-service guidance.";

  return (
    <div id="knowledge-explorer-container" className="mx-auto max-w-6xl space-y-4 p-3 sm:p-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Database className="h-5 w-5" />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em]">BoloSync knowledge</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-100 sm:text-3xl">
            Verified public-service guidance
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Browse the evidence used to ground answers across welfare, health, farming and civic services.
          </p>
        </div>
        {onBackToAssistant && (
          <button
            type="button"
            onClick={onBackToAssistant}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-600 dark:hover:text-indigo-300 sm:self-auto"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voice Assistant
          </button>
        )}
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="border-l-2 border-indigo-500 pl-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Entries</p>
          <p className="mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100">{items.length}</p>
        </div>
        <div className="border-l-2 border-emerald-500 pl-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Showing</p>
          <p className="mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100">{filteredItems.length}</p>
        </div>
        <div className="border-l-2 border-amber-500 pl-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Topic</p>
          <p className="mt-0.5 truncate text-xl font-bold text-slate-900 dark:text-slate-100">{activeTab.label}</p>
        </div>
        <div className="border-l-2 border-slate-400 pl-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</p>
          <p className="mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100">{isLoading ? "Loading" : "Ready"}</p>
        </div>
      </section>

      <section className="space-y-3 border-y border-slate-200 py-4 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Filter className="h-3.5 w-3.5" />
          Browse by topic
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {domainTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveDomain(tab.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                  activeDomain === tab.id
                    ? "border-indigo-500 bg-indigo-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-600 dark:hover:text-indigo-300"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search schemes, symptoms, crops, services or helplines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.5fr)]">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Knowledge entries</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Select an entry to inspect its evidence.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              {filteredItems.length}
            </span>
          </div>
          <div className="max-h-[640px] space-y-1.5 overflow-y-auto pr-1">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900" />
              ))
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className={`w-full border-l-4 p-3 text-left transition-colors ${
                    selectedItem?.id === item.id
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
                      : "border-transparent bg-slate-50 hover:border-slate-300 hover:bg-white dark:bg-slate-900/60 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <DomainBadge domain={item.domain} size="sm" />
                    {item.helpline && <span className="shrink-0 text-[10px] font-mono text-slate-400">{item.helpline}</span>}
                  </div>
                  <h4 className="line-clamp-1 text-sm font-bold text-slate-900 dark:text-slate-100">{item.title}</h4>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{getItemSummary(item)}</p>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 py-12 text-center dark:border-slate-700">
                <SearchX className="mb-2 h-7 w-7 text-slate-400" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No entries found</p>
                <p className="mt-1 text-xs text-slate-500">Try another search term or topic.</p>
              </div>
            )}
          </div>
        </section>

        <section className="min-w-0">
          {selectedItem ? (
            <div className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 pb-4 dark:border-slate-800">
                <div>
                  <DomainBadge domain={selectedItem.domain} size="md" />
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                    {selectedItem.title}
                  </h3>
                </div>
                {selectedItem.helpline && (
                  <a
                    href={`tel:${selectedItem.helpline.split("/")[0].trim()}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-500 dark:border-emerald-700"
                  >
                    <PhoneCall className="w-3 h-3" />
                    {selectedItem.helpline}
                  </a>
                )}
              </div>

              <div className="space-y-4 p-5 text-xs sm:text-sm">
                {selectedItem.target_audience && (
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Target beneficiaries: </span>
                    {selectedItem.target_audience}
                  </div>
                )}

                {selectedItem.benefits && (
                  <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/60 rounded-xl">
                    <span className="font-bold text-indigo-900 dark:text-indigo-300 block mb-1">
                      Benefits and coverage
                    </span>
                    <p className="text-indigo-950 dark:text-indigo-200">
                      {selectedItem.benefits}
                    </p>
                  </div>
                )}

                {selectedItem.eligibility && (
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">
                      Eligibility criteria
                    </span>
                    <p className="text-slate-600 dark:text-slate-400">
                      {selectedItem.eligibility}
                    </p>
                  </div>
                )}

                {selectedItem.documents_needed && (
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">
                      Required documents
                    </span>
                    <p className="text-slate-600 dark:text-slate-400">
                      {selectedItem.documents_needed}
                    </p>
                  </div>
                )}

                {selectedItem.how_to_apply && (
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">
                      How to apply
                    </span>
                    <p className="text-slate-600 dark:text-slate-400">
                      {selectedItem.how_to_apply}
                    </p>
                  </div>
                )}

                {selectedItem.domain === "health" && selectedItem.home_action && (
                  <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-xl">
                    <span className="font-bold text-emerald-900 dark:text-emerald-300 block mb-1">
                      Home care and first aid
                    </span>
                    <p className="text-emerald-950 dark:text-emerald-200">
                      {selectedItem.home_action}
                    </p>
                  </div>
                )}

                {selectedItem.domain === "health" && selectedItem.warning_signs && (
                  <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-xl">
                    <span className="font-bold text-rose-900 dark:text-rose-300 block mb-1">
                      Warning signs
                    </span>
                    <p className="text-rose-950 dark:text-rose-200">
                      {selectedItem.warning_signs}
                    </p>
                  </div>
                )}

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
                      Organic alternative
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

              {selectedItem.keywords && (
                <div className="border-t border-slate-100 p-5 dark:border-slate-800">
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
            <div className="flex min-h-64 items-center justify-center border border-dashed border-slate-300 p-12 text-center text-slate-400 dark:border-slate-700">
              Select a knowledge item on the left to view details.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

