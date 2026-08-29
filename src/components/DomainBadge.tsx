import React from "react";
import {
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
} from "lucide-react";
import { DomainType } from "../types";
import { useLanguage } from "../services/i18n";

interface DomainBadgeProps {
  domain: DomainType;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export const DomainBadge: React.FC<DomainBadgeProps> = ({
  domain,
  size = "md",
  showLabel = true,
}) => {
  const { t } = useLanguage();
  const config: Record<
    DomainType,
    {
      label: string;
      shortLabel: string;
      icon: React.ComponentType<{ className?: string }>;
      bgColor: string;
      dotColor: string;
    }
  > = {
    scheme: {
      label: t("scheme"),
      shortLabel: t("scheme"),
      icon: Landmark,
      bgColor:
        "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60",
      dotColor: "bg-indigo-500",
    },
    health: {
      label: t("health"),
      shortLabel: t("health"),
      icon: HeartPulse,
      bgColor:
        "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
      dotColor: "bg-rose-500",
    },
    farming: {
      label: t("farming"),
      shortLabel: t("farming"),
      icon: Sprout,
      bgColor:
        "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
      dotColor: "bg-emerald-500",
    },
    education: {
      label: t("education"),
      shortLabel: t("education"),
      icon: GraduationCap,
      bgColor:
        "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
      dotColor: "bg-amber-500",
    },
    employment: {
      label: t("employment"),
      shortLabel: t("employment"),
      icon: Briefcase,
      bgColor:
        "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60",
      dotColor: "bg-cyan-500",
    },
    finance: {
      label: t("finance"),
      shortLabel: t("finance"),
      icon: Wallet,
      bgColor:
        "bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800/60",
      dotColor: "bg-teal-500",
    },
    legal: {
      label: t("legal"),
      shortLabel: t("legal"),
      icon: Scale,
      bgColor:
        "bg-violet-50 dark:bg-violet-950/40 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800/60",
      dotColor: "bg-violet-500",
    },
    civic: {
      label: t("civic"),
      shortLabel: t("civic"),
      icon: Building2,
      bgColor:
        "bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800/60",
      dotColor: "bg-sky-500",
    },
    weather: {
      label: t("weather"),
      shortLabel: t("weather"),
      icon: CloudRain,
      bgColor:
        "bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800/60",
      dotColor: "bg-orange-500",
    },
    general: {
      label: t("general"),
      shortLabel: t("general"),
      icon: Sparkles,
      bgColor:
        "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700",
      dotColor: "bg-slate-500",
    },
  };

  const current = config[domain] || config.general;
  const Icon = current.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    md: "px-2.5 py-1 text-xs sm:text-sm gap-1.5",
    lg: "px-3.5 py-1.5 text-sm gap-2",
  };

  return (
    <span
      id={`domain-badge-${domain}`}
      className={`inline-flex items-center font-medium rounded-full border transition-all ${sizeClasses[size]} ${current.bgColor}`}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5"} />
      {showLabel && (
        <span className="whitespace-nowrap font-semibold">
          {size === "sm" ? current.shortLabel : current.label}
        </span>
      )}
    </span>
  );
};
