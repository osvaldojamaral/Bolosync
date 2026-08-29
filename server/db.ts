export type DomainType =
  | "scheme"
  | "health"
  | "farming"
  | "education"
  | "employment"
  | "finance"
  | "legal"
  | "civic"
  | "weather"
  | "general";

export interface QueryLog {
  id: string;
  timestamp: string;
  transcript: string;
  detected_language: string;
  language_name: string;
  translated_query: string;
  answer_text: string;
  answer_text_en: string;
  answer_audio_url?: string;
  domain: DomainType;
  confidence: number;
  sources: Array<{ id: string; title: string; domain: string }>;
  key_points?: string[];
  suggestions?: string[];
  helpline?: string;
  disclaimer?: string;
  latency_breakdown: {
    stt_ms: number;
    translate_in_ms: number;
    rag_ms: number;
    translate_out_ms: number;
    tts_ms: number;
    total_ms: number;
  };
  tts_provider: string;
}

export interface VoiceTransaction {
  id: string;
  timestamp: string;
  title: string;
  recipient: string;
  amount_inr: number;
  purpose: string;
  status: "pending" | "confirmed" | "rejected";
  voice_confirmation_phrase: string;
  confirmed_at?: string;
}

export interface IVRCallRecord {
  id: string;
  timestamp: string;
  caller_number: string;
  language: "hi" | "pa" | "en";
  menu_selected: string;
  query_spoken: string;
  bot_response_spoken: string;
  duration_seconds: number;
}

class BoloSyncDatabase {
  private queryLogs: QueryLog[] = [];
  private transactions: VoiceTransaction[] = [];
  private ivrCalls: IVRCallRecord[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Seed a couple of helpful starter query logs
    this.queryLogs.push(
      {
        id: "log-seed-1",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        transcript: "पीएम किसान योजना की ₹2000 की किस्त कब आएगी?",
        detected_language: "hi",
        language_name: "Hindi (हिंदी)",
        translated_query: "When will the ₹2000 installment of PM Kisan scheme arrive?",
        answer_text: "पीएम किसान सम्मान निधि में हर चार महीने में दो हजार रुपये की किस्त सीधे बैंक खाते में भेजी जाती है। यदि आपकी ई-केवाईसी पूरी है तो पोर्टल पर अपना स्टेटस चेक कर सकते हैं।",
        answer_text_en: "Under PM Kisan Samman Nidhi, ₹2,000 is directly transferred to your bank account every four months. Check status on pmkisan.gov.in with eKYC.",
        domain: "scheme",
        confidence: 0.96,
        sources: [{ id: "scheme-pm-kisan", title: "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)", domain: "scheme" }],
        key_points: ["₹6,000 annual benefit in 3 installments", "eKYC is mandatory on pmkisan.gov.in", "Helpline: 155261"],
        helpline: "155261",
        latency_breakdown: {
          stt_ms: 240,
          translate_in_ms: 180,
          rag_ms: 450,
          translate_out_ms: 210,
          tts_ms: 120,
          total_ms: 1200,
        },
        tts_provider: "browser_speech",
      },
      {
        id: "log-seed-2",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        transcript: "ਕਣਕ ਦੇ ਪੀਲੇ ਰਤੂਏ ਦੀ ਰੋਕਥਾਮ ਕਿਵੇਂ ਕਰੀਏ?",
        detected_language: "pa",
        language_name: "Punjabi (ਪੰਜਾਬੀ)",
        translated_query: "How to prevent yellow rust in wheat crop?",
        answer_text: "ਕਣਕ ਵਿੱਚ ਪੀਲੇ ਰਤੂਏ ਦੀ ਸ਼ੁਰੂਆਤ ਹੁੰਦੇ ਹੀ ਟਿਲਟ (ਪ੍ਰੋਪੀਕੋਨਾਜ਼ੋਲ 25% ਈਸੀ) 200 ਮਿ.ਲੀ. ਨੂੰ 200 ਲੀਟਰ ਪਾਣੀ ਵਿੱਚ ਮਿਲਾ ਕੇ ਪ੍ਰਤੀ ਏਕੜ ਛਿੜਕਾਅ ਕਰੋ। ਬੇਲੋੜੀ ਯੂਰੀਆ ਪਾਉਣ ਤੋਂ ਬਚੋ।",
        answer_text_en: "At the first sign of yellow rust in wheat, spray Propiconazole 25% EC (Tilt) @ 200 ml in 200 litres water per acre.",
        domain: "farming",
        confidence: 0.94,
        sources: [{ id: "farming-wheat-yellow-rust", title: "Wheat Yellow Rust Control", domain: "farming" }],
        key_points: ["Spray Tilt (Propiconazole) 200ml/acre", "Avoid excessive nitrogen/urea", "Helpline: 1800-180-1551"],
        helpline: "1800-180-1551",
        latency_breakdown: {
          stt_ms: 260,
          translate_in_ms: 190,
          rag_ms: 430,
          translate_out_ms: 220,
          tts_ms: 110,
          total_ms: 1210,
        },
        tts_provider: "browser_speech",
      }
    );

    // Seed mock transactions
    this.transactions.push(
      {
        id: "txn-101",
        timestamp: new Date().toISOString(),
        title: "IFFCO Nano Urea (2 Bottles)",
        recipient: "Gramin Krishi Seva Kendra, Nabha",
        amount_inr: 450,
        purpose: "Fertilizer purchase for Rabi crop",
        status: "pending",
        voice_confirmation_phrase: "हाँ, भुगतान करो / Yes, confirm payment",
      },
      {
        id: "txn-102",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        title: "Soil Health Testing Lab Fee",
        recipient: "District Agriculture Office, Karnal",
        amount_inr: 50,
        purpose: "Micro-nutrient Soil Card Testing",
        status: "confirmed",
        voice_confirmation_phrase: "हाँ ठीक है",
        confirmed_at: new Date(Date.now() - 7150000).toISOString(),
      }
    );
  }

  public addLog(log: QueryLog): QueryLog {
    this.queryLogs.unshift(log);
    // Keep max 100 in memory
    if (this.queryLogs.length > 100) {
      this.queryLogs.pop();
    }
    return log;
  }

  public getLogs(): QueryLog[] {
    return this.queryLogs;
  }

  public clearLogs(): void {
    this.queryLogs = [];
  }

  public getTransactions(): VoiceTransaction[] {
    return this.transactions;
  }

  public confirmTransaction(id: string): VoiceTransaction | null {
    const txn = this.transactions.find((t) => t.id === id);
    if (txn) {
      txn.status = "confirmed";
      txn.confirmed_at = new Date().toISOString();
      return txn;
    }
    return null;
  }

  public rejectTransaction(id: string): VoiceTransaction | null {
    const txn = this.transactions.find((t) => t.id === id);
    if (txn) {
      txn.status = "rejected";
      return txn;
    }
    return null;
  }

  public addIVRCall(call: IVRCallRecord): IVRCallRecord {
    this.ivrCalls.unshift(call);
    return call;
  }

  public getIVRCalls(): IVRCallRecord[] {
    return this.ivrCalls;
  }
}

export const db = new BoloSyncDatabase();
