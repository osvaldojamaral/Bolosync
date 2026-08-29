import React, { useState } from "react";
import {
  PhoneCall,
  X,
  AlertTriangle,
  HeartPulse,
  ShieldAlert,
  Flame,
  Sprout,
  Users,
  Search,
  Scale,
  Zap,
  ShoppingBag,
  Brain,
  Train,
} from "lucide-react";
import { useLanguage } from "../services/i18n";

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HelplineEntry {
  category: string;
  name: string;
  nameHi: string;
  number: string;
  description: string;
  badgeColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

const HELPLINES: HelplineEntry[] = [
  {
    category: "Emergency",
    name: "National All-in-One Emergency",
    nameHi: "राष्ट्रीय आपातकालीन नंबर (पुलिस, एंबुलेंस, फायर)",
    number: "112",
    description: "24x7 Single emergency response for Police, Fire, Ambulance & Rescue across India.",
    badgeColor: "bg-red-500 text-white",
    icon: ShieldAlert,
  },
  {
    category: "Health",
    name: "Ambulance & Medical Emergency",
    nameHi: "एंबुलेंस व आपातकालीन चिकित्सा",
    number: "108",
    description: "Emergency medical transport, trauma care, and critical patient evacuation.",
    badgeColor: "bg-rose-500 text-white",
    icon: HeartPulse,
  },
  {
    category: "Women",
    name: "Women in Distress Helpline",
    nameHi: "महिला सुरक्षा व घरेलू हिंसा हेल्पलाइन",
    number: "181",
    description: "24x7 confidential help for women facing domestic violence, harassment, or distress.",
    badgeColor: "bg-pink-500 text-white",
    icon: Users,
  },
  {
    category: "Cyber Crime",
    name: "Cyber Financial Fraud Helpline",
    nameHi: "साइबर फ्रॉड व ऑनलाइन ठगी हेल्पलाइन",
    number: "1930",
    description: "Instant reporting to freeze stolen funds in bank accounts and UPI within golden hours.",
    badgeColor: "bg-indigo-600 text-white",
    icon: ShieldAlert,
  },
  {
    category: "Disaster",
    name: "Disaster Management & NDRF",
    nameHi: "आपदा प्रबंधन व बाढ़/तूफान राहत",
    number: "1078",
    description: "National emergency relief for floods, cyclones, landslides, and earthquakes.",
    badgeColor: "bg-amber-600 text-white",
    icon: AlertTriangle,
  },
  {
    category: "Agriculture",
    name: "Kisan Call Centre (KCC)",
    nameHi: "किसान कॉल सेंटर (कृषि व फसल सलाह)",
    number: "1800-180-1551",
    description: "Free agricultural scientist expert consultation in regional languages (6 AM - 10 PM).",
    badgeColor: "bg-emerald-600 text-white",
    icon: Sprout,
  },
  {
    category: "Mental Health",
    name: "Tele-MANAS Mental Health",
    nameHi: "टेली-मानस मानसिक स्वास्थ्य परामर्श",
    number: "14416",
    description: "24x7 free tele-counseling for depression, stress, anxiety, and emotional well-being.",
    badgeColor: "bg-teal-600 text-white",
    icon: Brain,
  },
  {
    category: "Childline",
    name: "Child Protection Helpline",
    nameHi: "चाइल्डलाइन (बच्चों की सुरक्षा व सहायता)",
    number: "1098",
    description: "Emergency support for children in distress, missing minors, and child abuse.",
    badgeColor: "bg-blue-600 text-white",
    icon: Users,
  },
  {
    category: "Senior Citizen",
    name: "Elder Line for Senior Citizens",
    nameHi: "एल्डर लाइन (वरिष्ठ नागरिक हेल्पलाइन)",
    number: "14567",
    description: "Support for neglected elderly, elder abuse, pension queries, and legal rights.",
    badgeColor: "bg-purple-600 text-white",
    icon: Users,
  },
  {
    category: "Legal Aid",
    name: "NALSA Free Legal Aid",
    nameHi: "नालसा मुफ्त कानूनी सहायता हेल्पलाइन",
    number: "15100",
    description: "Free government lawyers, court fee assistance, and legal advice for eligible citizens.",
    badgeColor: "bg-violet-600 text-white",
    icon: Scale,
  },
  {
    category: "Consumer",
    name: "National Consumer Helpline",
    nameHi: "राष्ट्रीय उपभोक्ता हेल्पलाइन",
    number: "1915",
    description: "Register complaints against defective products, unfair trade, and refusal of refunds.",
    badgeColor: "bg-orange-600 text-white",
    icon: ShoppingBag,
  },
  {
    category: "Utility",
    name: "Electricity Outage & Fuse Call",
    nameHi: "बिजली ब्रेकडाउन व फॉल्ट हेल्पलाइन",
    number: "1912",
    description: "Report power outages, transformer breakdown, and billing electrical issues.",
    badgeColor: "bg-yellow-600 text-white",
    icon: Zap,
  },
  {
    category: "Poison",
    name: "AIIMS Poison Control Centre",
    nameHi: "एम्स विष नियंत्रण आपातकालीन केंद्र",
    number: "1800-116-117",
    description: "Emergency medical advice for pesticide poisoning, snake bite, or chemical ingestion.",
    badgeColor: "bg-red-700 text-white",
    icon: HeartPulse,
  },
  {
    category: "Railway",
    name: "Rail Madad Passenger Helpline",
    nameHi: "रेल मदद ऑल-इन-वन सहायता",
    number: "139",
    description: "All-in-one railway assistance for security, medical emergency, and coach cleaning.",
    badgeColor: "bg-blue-700 text-white",
    icon: Train,
  },
];

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [search, setSearch] = useState("");
  const { language, t } = useLanguage();

  const descriptions = {
    en: {
      Emergency: "24x7 emergency response for police, fire, ambulance, and rescue across India.",
      Health: "Emergency medical transport, trauma care, and critical patient evacuation.",
      Women: "Confidential help for women facing domestic violence, harassment, or distress.",
      "Cyber Crime": "Report online fraud quickly to help freeze stolen bank or UPI funds.",
      Disaster: "Emergency relief for floods, cyclones, landslides, and earthquakes.",
      Agriculture: "Free agricultural expert consultation in regional languages.",
      "Mental Health": "Free tele-counselling for stress, anxiety, and emotional distress.",
      Childline: "Emergency support for children in distress, missing children, or abuse.",
      "Senior Citizen": "Support for elder abuse, pensions, neglect, and legal rights.",
      "Legal Aid": "Free legal advice and government lawyer support for eligible citizens.",
      Consumer: "Register complaints about defective products, unfair trade, or refunds.",
      Utility: "Report power outages, transformer faults, and billing issues.",
      Poison: "Emergency advice for pesticide poisoning, snakebite, or chemical ingestion.",
      Railway: "Railway help for security, medical emergencies, and coach cleaning.",
    },
    hi: {
      Emergency: "पूरे भारत में पुलिस, अग्निशमन, एम्बुलेंस और बचाव के लिए 24 घंटे आपातकालीन सहायता।",
      Health: "आपातकालीन एम्बुलेंस, चिकित्सा सहायता और गंभीर मरीजों को अस्पताल पहुँचाने की सेवा।",
      Women: "घरेलू हिंसा, उत्पीड़न या संकट का सामना कर रही महिलाओं के लिए गोपनीय सहायता।",
      "Cyber Crime": "ऑनलाइन धोखाधड़ी की तुरंत शिकायत करें और चोरी हुए बैंक या UPI पैसे रोकने में मदद लें।",
      Disaster: "बाढ़, चक्रवात, भूस्खलन और भूकंप के लिए आपातकालीन राहत।",
      Agriculture: "क्षेत्रीय भाषाओं में कृषि विशेषज्ञों से निःशुल्क सलाह।",
      "Mental Health": "तनाव, चिंता और मानसिक परेशानी के लिए निःशुल्क टेली-परामर्श।",
      Childline: "संकट, गुमशुदगी या उत्पीड़न झेल रहे बच्चों के लिए आपातकालीन सहायता।",
      "Senior Citizen": "बुजुर्गों के उत्पीड़न, पेंशन, उपेक्षा और कानूनी अधिकारों में सहायता।",
      "Legal Aid": "पात्र नागरिकों के लिए निःशुल्क कानूनी सलाह और सरकारी वकील।",
      Consumer: "खराब उत्पाद, अनुचित व्यापार या रिफंड से जुड़ी शिकायत दर्ज करें।",
      Utility: "बिजली कटौती, ट्रांसफॉर्मर खराबी और बिलिंग समस्या की शिकायत करें।",
      Poison: "कीटनाशक, साँप के काटने या रसायन निगलने पर आपातकालीन चिकित्सा सलाह।",
      Railway: "सुरक्षा, चिकित्सा आपातकाल और कोच सफाई के लिए रेलवे सहायता।",
    },
    pa: {
      Emergency: "ਪੂਰੇ ਭਾਰਤ ਵਿੱਚ ਪੁਲਿਸ, ਅੱਗ ਬੁਝਾਊ, ਐਂਬੂਲੈਂਸ ਅਤੇ ਬਚਾਅ ਲਈ 24 ਘੰਟੇ ਐਮਰਜੈਂਸੀ ਸਹਾਇਤਾ।",
      Health: "ਐਮਰਜੈਂਸੀ ਐਂਬੂਲੈਂਸ, ਮੈਡੀਕਲ ਸਹਾਇਤਾ ਅਤੇ ਗੰਭੀਰ ਮਰੀਜ਼ਾਂ ਨੂੰ ਹਸਪਤਾਲ ਪਹੁੰਚਾਉਣ ਦੀ ਸੇਵਾ।",
      Women: "ਘਰੇਲੂ ਹਿੰਸਾ, ਪਰੇਸ਼ਾਨੀ ਜਾਂ ਸੰਕਟ ਦਾ ਸਾਹਮਣਾ ਕਰ ਰਹੀਆਂ ਔਰਤਾਂ ਲਈ ਗੁਪਤ ਸਹਾਇਤਾ।",
      "Cyber Crime": "ਆਨਲਾਈਨ ਧੋਖਾਧੜੀ ਦੀ ਤੁਰੰਤ ਰਿਪੋਰਟ ਕਰੋ ਅਤੇ ਚੋਰੀ ਹੋਏ ਬੈਂਕ ਜਾਂ UPI ਪੈਸੇ ਰੋਕਣ ਵਿੱਚ ਮਦਦ ਲਵੋ।",
      Disaster: "ਹੜ੍ਹਾਂ, ਚੱਕਰਵਾਤ, ਭੂਸਖਲਨ ਅਤੇ ਭੂਚਾਲ ਲਈ ਐਮਰਜੈਂਸੀ ਰਾਹਤ।",
      Agriculture: "ਖੇਤਰੀ ਭਾਸ਼ਾਵਾਂ ਵਿੱਚ ਖੇਤੀ ਮਾਹਿਰਾਂ ਤੋਂ ਮੁਫ਼ਤ ਸਲਾਹ।",
      "Mental Health": "ਤਣਾਅ, ਚਿੰਤਾ ਅਤੇ ਮਾਨਸਿਕ ਪਰੇਸ਼ਾਨੀ ਲਈ ਮੁਫ਼ਤ ਟੈਲੀ-ਕਾਊਂਸਲਿੰਗ।",
      Childline: "ਸੰਕਟ, ਗੁੰਮਸ਼ੁਦਗੀ ਜਾਂ ਸ਼ੋਸ਼ਣ ਦਾ ਸਾਹਮਣਾ ਕਰ ਰਹੇ ਬੱਚਿਆਂ ਲਈ ਐਮਰਜੈਂਸੀ ਸਹਾਇਤਾ।",
      "Senior Citizen": "ਬਜ਼ੁਰਗਾਂ ਨਾਲ ਦੁਰਵਿਵਹਾਰ, ਪੈਨਸ਼ਨ, ਅਣਗਹਿਲੀ ਅਤੇ ਕਾਨੂੰਨੀ ਹੱਕਾਂ ਲਈ ਸਹਾਇਤਾ।",
      "Legal Aid": "ਯੋਗ ਨਾਗਰਿਕਾਂ ਲਈ ਮੁਫ਼ਤ ਕਾਨੂੰਨੀ ਸਲਾਹ ਅਤੇ ਸਰਕਾਰੀ ਵਕੀਲ ਦੀ ਸਹਾਇਤਾ।",
      Consumer: "ਖਰਾਬ ਉਤਪਾਦ, ਗਲਤ ਵਪਾਰ ਜਾਂ ਰਿਫੰਡ ਬਾਰੇ ਸ਼ਿਕਾਇਤ ਦਰਜ ਕਰੋ।",
      Utility: "ਬਿਜਲੀ ਬੰਦ, ਟ੍ਰਾਂਸਫਾਰਮਰ ਖਰਾਬੀ ਅਤੇ ਬਿਲਿੰਗ ਸਮੱਸਿਆ ਦੀ ਰਿਪੋਰਟ ਕਰੋ।",
      Poison: "ਕੀਟਨਾਸ਼ਕ, ਸੱਪ ਦੇ ਡੰਗ ਜਾਂ ਰਸਾਇਣ ਨਿਗਲਣ ਲਈ ਐਮਰਜੈਂਸੀ ਡਾਕਟਰੀ ਸਲਾਹ।",
      Railway: "ਸੁਰੱਖਿਆ, ਮੈਡੀਕਲ ਐਮਰਜੈਂਸੀ ਅਤੇ ਕੋਚ ਸਫਾਈ ਲਈ ਰੇਲਵੇ ਸਹਾਇਤਾ।",
    },
  }[language] as Record<string, string>;

  if (!isOpen) return null;

  const filtered = HELPLINES.filter((h) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      h.name.toLowerCase().includes(q) ||
      h.nameHi.toLowerCase().includes(q) ||
      h.number.includes(q) ||
      h.category.toLowerCase().includes(q)
    );
  });

  return (
    <div
      id="emergency-helpline-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="emergency-helpline-modal-content"
        className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-xs">
              <PhoneCall className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">
                  {t("emergencyTitle")}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-red-700 uppercase tracking-wide">
                  {t("offlineReady")}
                </span>
              </div>
              <p className="text-xs text-red-100 mt-0.5">
                {t("emergencySubtitle")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Search */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t("searchHelplines")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Helpline List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {filtered.map((item, idx) => {
            const Icon = item.icon;
            const primaryNumber = item.number.split("/")[0].trim();

            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-900 transition-all shadow-2xs group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-100 dark:border-red-900/60 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                        {item.name}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {descriptions[item.category] || item.description}
                    </p>
                  </div>
                </div>

                <a
                  href={`tel:${primaryNumber}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs sm:text-sm shrink-0 shadow-xs transition-all"
                  title={`${t("call")} ${item.number}`}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>{item.number}</span>
                </a>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
                  {t("noHelplines")}
            </div>
          )}
        </div>

        {/* Footer info note */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between shrink-0">
          <span>* {t("offlineNote")}</span>
          <button
            type="button"
            onClick={onClose}
            className="font-semibold text-slate-700 dark:text-slate-300 hover:underline text-xs"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
};
