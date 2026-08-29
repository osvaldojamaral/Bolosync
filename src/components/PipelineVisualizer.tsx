import React from "react";
import {
  Mic,
  Languages,
  Database,
  BrainCircuit,
  Volume2,
  CheckCircle2,
  Radio,
  Clock,
  ArrowRight,
} from "lucide-react";
import { LatencyBreakdown } from "../types";

interface PipelineVisualizerProps {
  currentStage?: "idle" | "stt" | "translate_in" | "rag" | "translate_out" | "tts" | "completed";
  latency?: LatencyBreakdown;
}

export const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({
  currentStage = "idle",
  latency,
}) => {
  const stages = [
    {
      id: "stt",
      name: "1. Speech-to-Text",
      tech: "Whisper / Gemini Native Audio",
      icon: Mic,
      time: latency?.stt_ms ? `${latency.stt_ms}ms` : null,
    },
    {
      id: "translate_in",
      name: "2. Query Translation",
      tech: "Regional (हिंदी/ਪੰਜਾਬੀ) → English",
      icon: Languages,
      time: latency?.translate_in_ms ? `${latency.translate_in_ms}ms` : null,
    },
    {
      id: "rag",
      name: "3. RAG + Gemini",
      tech: "Vector Chunks + Gemini 3.7 Flash",
      icon: BrainCircuit,
      time: latency?.rag_ms ? `${latency.rag_ms}ms` : null,
    },
    {
      id: "translate_out",
      name: "4. Native Translation",
      tech: "English → Spoken Rural Regional",
      icon: Languages,
      time: latency?.translate_out_ms ? `${latency.translate_out_ms}ms` : null,
    },
    {
      id: "tts",
      name: "5. Speech Synthesis",
      tech: "ElevenLabs / High-Fi Voice",
      icon: Volume2,
      time: latency?.tts_ms ? `${latency.tts_ms}ms` : null,
    },
  ];

  return (
    <div id="pipeline-visualizer-card" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
          <BrainCircuit className="w-4 h-4 text-indigo-600" />
          End-to-End Voice AI Pipeline Architecture
        </h4>

        {latency?.total_ms && (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-mono border border-indigo-200 dark:border-indigo-800">
            <Clock className="w-3 h-3" />
            Total: {latency.total_ms}ms
          </span>
        )}
      </div>

      {/* Pipeline Stages Flow */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {stages.map((st, i) => {
          const Icon = st.icon;
          const isActive = currentStage === st.id;
          const isDone =
            currentStage === "completed" ||
            (stages.findIndex((s) => s.id === currentStage) > i);

          return (
            <div
              key={st.id}
              className={`p-3 rounded-xl border transition-all relative ${
                isActive
                  ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-400 ring-2 ring-indigo-400/20"
                  : isDone
                  ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Icon
                  className={`w-4 h-4 ${
                    isActive
                      ? "text-indigo-600 animate-bounce"
                      : isDone
                      ? "text-emerald-600"
                      : "text-slate-400"
                  }`}
                />
                {st.time ? (
                  <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {st.time}
                  </span>
                ) : isActive ? (
                  <span className="text-[10px] font-semibold text-indigo-600 animate-pulse">
                    Running...
                  </span>
                ) : null}
              </div>

              <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                {st.name}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                {st.tech}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
