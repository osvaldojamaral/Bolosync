import {
  KnowledgeItem,
  VoiceQueryResponse,
  ConversationTranslateResponse,
} from "../types";

/**
 * Helper to safely parse JSON responses or throw a clear, informative error
 */
async function parseJsonResponse<T>(res: Response, defaultErrorMsg: string): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let errorMsg = `${defaultErrorMsg} (Status ${res.status})`;
    try {
      if (text.startsWith("{")) {
        const json = JSON.parse(text);
        if (json.error) errorMsg = json.error;
        if (json.details) errorMsg += ` - ${json.details}`;
      }
    } catch {
      // ignore JSON parse error for error body
    }
    throw new Error(errorMsg);
  }

  try {
    return JSON.parse(text) as T;
  } catch (err: any) {
    console.error("Failed to parse JSON response:", text.slice(0, 300));
    throw new Error(
      `Received invalid response from server. Please verify the server is running and try again.`
    );
  }
}

export interface VoiceQueryContext {
  currentTopic?: string;
  pendingAction?: { type: string; helpline: string; name: string } | null;
  lastSpokenAnswer?: string;
  conversationContext?: string;
}

/**
 * Send recorded audio blob to backend voice pipeline
 */
export async function sendVoiceQueryAudio(
  audioBlob: Blob,
  forcedLanguage?: string,
  context?: VoiceQueryContext
): Promise<VoiceQueryResponse> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "user-recording.webm");
  if (forcedLanguage) {
    formData.append("forced_language", forcedLanguage);
  }
  if (context?.currentTopic) {
    formData.append("current_topic", context.currentTopic);
  }
  if (context?.pendingAction) {
    formData.append("pending_action", JSON.stringify(context.pendingAction));
  }
  if (context?.lastSpokenAnswer) {
    formData.append("last_spoken_answer", context.lastSpokenAnswer);
  }
  if (context?.conversationContext) {
    formData.append("conversation_context", context.conversationContext);
  }

  const response = await fetch("/api/voice-query", {
    method: "POST",
    body: formData,
  });

  return parseJsonResponse<VoiceQueryResponse>(
    response,
    "Voice query processing failed"
  );
}

/**
 * Send text query to backend pipeline
 */
export async function sendVoiceQueryText(
  text: string,
  forcedLanguage?: string,
  context?: VoiceQueryContext
): Promise<VoiceQueryResponse> {
  const response = await fetch("/api/voice-query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query_text: text,
      forced_language: forcedLanguage,
      current_topic: context?.currentTopic,
      pending_action: context?.pendingAction,
      last_spoken_answer: context?.lastSpokenAnswer,
      conversation_context: context?.conversationContext,
    }),
  });

  return parseJsonResponse<VoiceQueryResponse>(
    response,
    "Text query processing failed"
  );
}

/**
 * Fetch knowledge base items
 */
export async function fetchKnowledgeBase(
  domain?: string
): Promise<{ total: number; items: KnowledgeItem[] }> {
  const url = domain
    ? `/api/knowledge-base?domain=${domain}`
    : "/api/knowledge-base";
  const res = await fetch(url);
  return parseJsonResponse<{ total: number; items: KnowledgeItem[] }>(
    res,
    "Failed to fetch knowledge base"
  );
}

/**
 * Dial IVR Simulator
 */
export async function dialIVR(
  language: string,
  menuOption: string,
  query?: string
): Promise<any> {
  const res = await fetch("/api/ivr/dial", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, menuOption, query }),
  });
  return parseJsonResponse<any>(res, "Failed to dial IVR");
}

/**
 * 2-Way Live Conversation: Send voice audio for real-time speech translation & TTS synthesis
 */
export async function sendConversationAudio(
  audioBlob: Blob,
  options: {
    speaker?: "person_a" | "person_b";
    speakerName?: string;
    sourceLanguage?: string;
    targetLanguage?: string;
    transcript?: string;
    skipTts?: boolean;
  }
): Promise<ConversationTranslateResponse> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "conv-voice.webm");
  if (options.speaker) formData.append("speaker", options.speaker);
  if (options.speakerName) formData.append("speaker_name", options.speakerName);
  if (options.sourceLanguage) formData.append("source_language", options.sourceLanguage);
  if (options.targetLanguage) formData.append("target_language", options.targetLanguage);
  if (options.transcript) formData.append("text", options.transcript);
  formData.append("skip_tts", String(Boolean(options.skipTts)));

  const res = await fetch("/api/translate-conversation", {
    method: "POST",
    body: formData,
  });

  return parseJsonResponse<ConversationTranslateResponse>(
    res,
    "Conversation speech translation failed"
  );
}

/**
 * 2-Way Live Conversation: Send text for real-time translation & TTS synthesis
 */
export async function sendConversationText(
  text: string,
  options: {
    speaker?: "person_a" | "person_b";
    speakerName?: string;
    sourceLanguage?: string;
    targetLanguage?: string;
    skipTts?: boolean;
  }
): Promise<ConversationTranslateResponse> {
  const res = await fetch("/api/translate-conversation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      speaker: options.speaker,
      speaker_name: options.speakerName,
      source_language: options.sourceLanguage,
      target_language: options.targetLanguage,
      skip_tts: Boolean(options.skipTts),
    }),
  });

  return parseJsonResponse<ConversationTranslateResponse>(
    res,
    "Conversation text translation failed"
  );
}

/**
 * Direct Text Translation helper
 */
export async function translateDirectText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<{ translatedText: string; sourceLanguage: string; targetLanguage: string }> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      target_language: targetLanguage,
      source_language: sourceLanguage,
    }),
  });

  return parseJsonResponse<{ translatedText: string; sourceLanguage: string; targetLanguage: string }>(
    res,
    "Translation failed"
  );
}

