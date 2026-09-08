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

export interface LatencyBreakdown {
  stt_ms: number;
  translate_in_ms: number;
  rag_ms: number;
  translate_out_ms: number;
  tts_ms: number;
  total_ms: number;
}

export interface VoiceQueryResponse {
  id: string;
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
  latency_breakdown: LatencyBreakdown;
  tts_provider: string;
  is_navigation?: boolean;
  command_type?: string;
  topic?: string;
  target_helpline?: { number: string; name: string };
  speech_rate?: number;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  timestamp: string;
  audioBlobUrl?: string;
  transcript?: string;
  detectedLanguage?: string;
  languageName?: string;
  translatedQuery?: string;
  answerText?: string;
  answerTextEn?: string;
  answerAudioUrl?: string;
  domain?: DomainType;
  confidence?: number;
  sources?: Array<{ id: string; title: string; domain: string }>;
  keyPoints?: string[];
  suggestions?: string[];
  helpline?: string;
  disclaimer?: string;
  latencyBreakdown?: LatencyBreakdown;
  ttsProvider?: string;
  isProcessing?: boolean;
  isNavigation?: boolean;
  commandType?: string;
  topic?: string;
  targetHelpline?: { number: string; name: string };
}

export interface KnowledgeItem {
  id: string;
  title: string;
  domain: DomainType;
  target_audience?: string;
  benefits?: string;
  eligibility?: string;
  documents_needed?: string;
  how_to_apply?: string;
  helpline?: string;
  keywords?: string[];
  summary?: string;
  home_action?: string;
  warning_signs?: string;
  disclaimer?: string;
  crop?: string;
  problem?: string;
  advisory?: string;
  organic_method?: string;
}

export interface ConversationMessage {
  id: string;
  timestamp: string;
  speaker: "person_a" | "person_b"; // person_a: Regional (Hindi/Punjabi), person_b: English (or other)
  speakerName: string;
  originalText: string;
  originalLanguage: string;
  originalLanguageName: string;
  translatedText: string;
  targetLanguage: string;
  targetLanguageName: string;
  audioUrl?: string;
  audioBlobUrl?: string;
  ttsProvider?: string;
  latencyMs?: number;
}

export interface ConversationTranslateResponse {
  id: string;
  timestamp: string;
  speaker: "person_a" | "person_b";
  speaker_name: string;
  original_text: string;
  original_language: string;
  original_language_name: string;
  translated_text: string;
  target_language: string;
  target_language_name: string;
  audio_url?: string;
  tts_provider?: string;
  latency_ms: number;
}

