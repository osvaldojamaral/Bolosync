import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db, QueryLog } from "./server/db.js";
import { getAllKnowledgeItems, generateRAGAnswer } from "./server/services/rag.js";
import { transcribeAudio } from "./server/services/stt.js";
import { translateText } from "./server/services/translate.js";
import { generateSpeechAudio } from "./server/services/tts.js";
import { checkNavigationIntent } from "./server/services/navigation.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ extended: true, limit: "30mb" }));

  // 1. Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "BoloSync Voice Pipeline API",
      models: {
        stt: process.env.OPENAI_API_KEY ? "OpenAI Whisper + Gemini Multimodal" : "Gemini Multimodal Audio (gemini-3.7-flash)",
        rag: "Gemini 3.7 Flash + Local Curated Knowledge Base",
        tts: process.env.ELEVENLABS_API_KEY ? "ElevenLabs Multilingual v2" : "Browser Web Speech API + Gemini Native Speech",
      },
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Core Voice Query Pipeline Handler (supports both /voice-query and /api/voice-query)
  const handleVoiceQuery = async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    let sttTime = 0;
    let translateInTime = 0;
    let ragTime = 0;
    let translateOutTime = 0;
    let ttsTime = 0;

    try {
        const conversationContext = String(req.body?.conversation_context || "").slice(0, 6000);
        let audioBuffer: Buffer | null = null;
      let mimeType = "audio/webm";
      let manualTextQuery = "";
      let forcedLang = "";

      // Check if file was uploaded via multipart/form-data
      if (req.file) {
        audioBuffer = req.file.buffer;
        mimeType = req.file.mimetype || "audio/webm";
      } else if (req.body?.audio_base64) {
        // Audio uploaded as base64 string
        audioBuffer = Buffer.from(req.body.audio_base64, "base64");
        mimeType = req.body.mime_type || "audio/webm";
      }

      manualTextQuery = req.body?.query_text || req.body?.text || "";
      const requestedLanguage = String(req.body?.forced_language || "").toLowerCase();
      forcedLang = ["hi", "pa", "en"].includes(requestedLanguage) ? requestedLanguage : "";

      let transcript = manualTextQuery;
      let detectedLang = forcedLang || "hi";
      let languageName = detectedLang === "pa" ? "Punjabi (ਪੰਜਾਬੀ)" : detectedLang === "en" ? "English" : "Hindi (हिंदी)";
      let confidence = 0.95;

      // STT Stage: Transcribe if audio buffer is present
      if (audioBuffer && audioBuffer.length > 0) {
        const t0 = Date.now();
        const sttRes = await transcribeAudio(audioBuffer, mimeType);
        sttTime = Date.now() - t0;
        transcript = sttRes.transcript;
        detectedLang = sttRes.detectedLanguage || forcedLang || "hi";
        languageName = sttRes.languageName;
        confidence = sttRes.confidence;
      }

      if (!transcript || transcript.trim().length === 0) {
        return res.status(400).json({
          error: "No spoken audio or query text was received.",
          suggestion: "Please speak clearly into the microphone and try again.",
        });
      }

      // Fast Navigation Intent Check (rule-based / fixed vocabulary)
      let parsedPendingAction = undefined;
      try {
        if (typeof req.body?.pending_action === "string") {
          parsedPendingAction = JSON.parse(req.body.pending_action);
        } else if (req.body?.pending_action && typeof req.body.pending_action === "object") {
          parsedPendingAction = req.body.pending_action;
        }
      } catch {}

      const navMatch = checkNavigationIntent(transcript, {
        currentTopic: req.body?.current_topic,
        pendingAction: parsedPendingAction,
        lastSpokenAnswer: req.body?.last_spoken_answer,
      });

      if (navMatch && navMatch.isNavigation) {
        const langKey = (detectedLang === "pa" ? "pa" : detectedLang === "en" ? "en" : "hi") as "hi" | "pa" | "en";
        const navAnswerNative = navMatch.spokenResponse[langKey] || navMatch.spokenResponse.hi;
        const navAnswerEn = navMatch.spokenResponse.en;

        const tTts0 = Date.now();
        const ttsRes = await generateSpeechAudio(navAnswerNative, detectedLang);
        const navTtsTime = Date.now() - tTts0;
        const navTotalTime = Date.now() - startTime;

        const logEntry: QueryLog = {
          id: `nav-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
          transcript,
          detected_language: detectedLang,
          language_name: languageName,
          translated_query: navAnswerEn,
          answer_text: navAnswerNative,
          answer_text_en: navAnswerEn,
          answer_audio_url: ttsRes.audioUrl || "",
          domain: (navMatch.topic as any) || "general",
          confidence: 0.99,
          sources: [{ id: "voice-nav", title: "Voice Navigation Engine", domain: "general" }],
          key_points: [`Voice Command: ${navMatch.commandType}`],
          helpline: navMatch.targetHelpline?.number,
          latency_breakdown: {
            stt_ms: sttTime,
            translate_in_ms: 0,
            rag_ms: 0,
            translate_out_ms: 0,
            tts_ms: navTtsTime,
            total_ms: navTotalTime,
          },
          tts_provider: ttsRes.provider,
        };

        db.addLog(logEntry);

        return res.json({
          id: logEntry.id,
          transcript: logEntry.transcript,
          detected_language: logEntry.detected_language,
          language_name: logEntry.language_name,
          translated_query: logEntry.translated_query,
          answer_text: logEntry.answer_text,
          answer_text_en: logEntry.answer_text_en,
          answer_audio_url: logEntry.answer_audio_url,
          domain: logEntry.domain,
          confidence: logEntry.confidence,
          sources: logEntry.sources,
          key_points: logEntry.key_points,
          helpline: logEntry.helpline,
          latency_breakdown: logEntry.latency_breakdown,
          tts_provider: logEntry.tts_provider,
          is_navigation: true,
          command_type: navMatch.commandType,
          topic: navMatch.topic,
          target_helpline: navMatch.targetHelpline,
          speech_rate: navMatch.speechRate || 1.0,
        });
      }

      // Translation Stage 1: Translate regional transcript to English for RAG lookup
      const t1 = Date.now();
      let englishQuery = transcript;
      if (detectedLang !== "en") {
        const transInRes = await translateText(transcript, "en", detectedLang);
        englishQuery = transInRes.translatedText;
      }
      translateInTime = Date.now() - t1;

      // RAG Stage: Semantic knowledge base context retrieval + Gemini domain reasoning
      const t2 = Date.now();
      const ragResult = await generateRAGAnswer(
        englishQuery,
        undefined,
        transcript,
        conversationContext
      );
      ragTime = Date.now() - t2;

      // Translation Stage 2: Translate English answer back to user's native regional language
      const t3 = Date.now();
      let nativeAnswer = ragResult.answerEnglish;
      if (detectedLang !== "en") {
        const transOutRes = await translateText(ragResult.answerEnglish, detectedLang, "en");
        nativeAnswer = transOutRes.translatedText;
      }
      translateOutTime = Date.now() - t3;

      // TTS Stage: Generate voice audio
      const t4 = Date.now();
      const ttsResult = await generateSpeechAudio(nativeAnswer, detectedLang);
      ttsTime = Date.now() - t4;

      const totalTime = Date.now() - startTime;

      const logEntry: QueryLog = {
        id: `query-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        transcript,
        detected_language: detectedLang,
        language_name: languageName,
        translated_query: englishQuery,
        answer_text: nativeAnswer,
        answer_text_en: ragResult.answerEnglish,
        answer_audio_url: ttsResult.audioUrl || "",
        domain: ragResult.domain,
        confidence,
        sources: ragResult.sources,
        key_points: ragResult.keyPoints,
          suggestions: ragResult.suggestions,
        helpline: ragResult.helpline,
        disclaimer: ragResult.disclaimer,
        latency_breakdown: {
          stt_ms: sttTime,
          translate_in_ms: translateInTime,
          rag_ms: ragTime,
          translate_out_ms: translateOutTime,
          tts_ms: ttsTime,
          total_ms: totalTime,
        },
        tts_provider: ttsResult.provider,
      };

      db.addLog(logEntry);

      // Return exact API schema required by prompt + rich metadata
      res.json({
        id: logEntry.id,
        transcript: logEntry.transcript,
        detected_language: logEntry.detected_language,
        language_name: logEntry.language_name,
        translated_query: logEntry.translated_query,
        answer_text: logEntry.answer_text,
        answer_text_en: logEntry.answer_text_en,
        answer_audio_url: logEntry.answer_audio_url,
        domain: logEntry.domain,
        confidence: logEntry.confidence,
        sources: logEntry.sources,
        key_points: logEntry.key_points,
          suggestions: logEntry.suggestions,
        helpline: logEntry.helpline,
        disclaimer: logEntry.disclaimer,
        latency_breakdown: logEntry.latency_breakdown,
        tts_provider: logEntry.tts_provider,
      });
    } catch (err: any) {
      console.error("Voice Query pipeline error:", err);
      res.status(500).json({
        error: "Failed to process voice query.",
        details: err?.message || String(err),
      });
    }
  };

  app.post("/api/voice-query", upload.single("audio"), handleVoiceQuery);
  app.post("/voice-query", upload.single("audio"), handleVoiceQuery);

  // 2.5 Direct Text-to-Speech synthesis endpoint
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, language = "hi" } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required for TTS generation." });
      }
      const ttsResult = await generateSpeechAudio(text, language);
      res.json({
        text,
        language,
        audio_url: ttsResult.audioUrl || "",
        provider: ttsResult.provider,
        voice_name: ttsResult.voiceName,
      });
    } catch (err: any) {
      console.error("TTS endpoint error:", err);
      res.status(500).json({ error: "TTS generation failed.", details: err?.message || String(err) });
    }
  });

  // 3. Knowledge Base Inspector endpoint
  app.get("/api/knowledge-base", (req, res) => {
    const domain = req.query.domain as string;
    let items = getAllKnowledgeItems();
    if (domain && domain !== "all") {
      items = items.filter((i) => i.domain === domain);
    }
    res.json({
      total: items.length,
      items,
    });
  });

  // 4. Query History & Metrics endpoint
  app.get("/api/history", (req, res) => {
    const logs = db.getLogs();
    const stats = {
      total_queries: logs.length,
      domains: {
        scheme: logs.filter((l) => l.domain === "scheme").length,
        health: logs.filter((l) => l.domain === "health").length,
        farming: logs.filter((l) => l.domain === "farming").length,
        education: logs.filter((l) => l.domain === "education").length,
        employment: logs.filter((l) => l.domain === "employment").length,
        finance: logs.filter((l) => l.domain === "finance").length,
        legal: logs.filter((l) => l.domain === "legal").length,
        civic: logs.filter((l) => l.domain === "civic").length,
        weather: logs.filter((l) => l.domain === "weather").length,
        general: logs.filter((l) => l.domain === "general").length,
      },
      languages: {
        hi: logs.filter((l) => l.detected_language === "hi").length,
        pa: logs.filter((l) => l.detected_language === "pa").length,
        en: logs.filter((l) => l.detected_language === "en").length,
      },
      avg_latency_ms: logs.length > 0
        ? Math.round(logs.reduce((acc, l) => acc + (l.latency_breakdown?.total_ms || 0), 0) / logs.length)
        : 0,
    };
    res.json({ stats, history: logs });
  });

  app.delete("/api/history", (req, res) => {
    db.clearLogs();
    res.json({ message: "History cleared successfully." });
  });

  // 5. Voice-Confirmed Transaction Demo endpoints
  app.get("/api/transactions", (req, res) => {
    res.json(db.getTransactions());
  });

  app.post("/api/transactions/:id/confirm", (req, res) => {
    const updated = db.confirmTransaction(req.params.id);
    if (updated) {
      res.json({ success: true, transaction: updated });
    } else {
      res.status(404).json({ error: "Transaction not found." });
    }
  });

  app.post("/api/transactions/:id/reject", (req, res) => {
    const updated = db.rejectTransaction(req.params.id);
    if (updated) {
      res.json({ success: true, transaction: updated });
    } else {
      res.status(404).json({ error: "Transaction not found." });
    }
  });

  // 6. IVR Call Simulation endpoint
  app.post("/api/ivr/dial", async (req, res) => {
    const { language = "hi", menuOption = "1", query = "" } = req.body;

    const menuPrompts: Record<string, Record<string, string>> = {
      hi: {
        "1": "सरकारी योजनाओं की जानकारी के लिए कृपया अपनी योजना का नाम बोलें।",
        "2": "प्राथमिक स्वास्थ्य और प्राथमिक उपचार की जानकारी के लिए अपनी समस्या बताएं।",
        "3": "फसल सलाह, कीट नियंत्रण और कृषि जानकारी के लिए अपनी फसल का नाम बोलें।",
      },
      pa: {
        "1": "ਸਰਕਾਰੀ ਸਕੀਮਾਂ ਦੀ ਜਾਣਕਾਰੀ ਲਈ ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਸਕੀਮ ਦਾ ਨਾਮ ਬੋਲੋ।",
        "2": "ਮੁੱਢਲੀ ਸਿਹਤ ਅਤੇ ਫਸਟ ਏਡ ਲਈ ਆਪਣੀ ਸਮੱਸਿਆ ਦੱਸੋ।",
        "3": "ਫ਼ਸਲ ਸਲਾਹ, ਕੀੜੇ-ਮਕੌੜੇ ਅਤੇ ਖੇਤੀਬਾੜੀ ਜਾਣਕਾਰੀ ਲਈ ਆਪਣੀ ਫ਼ਸਲ ਦਾ ਨਾਮ ਬੋਲੋ।",
      },
      en: {
        "1": "For government welfare schemes, please speak the scheme name.",
        "2": "For basic health guidance and first aid, please describe your symptom.",
        "3": "For farming advisories and crop health, please speak your crop name.",
      },
    };

    const promptText =
      menuPrompts[language]?.[menuOption] ||
      menuPrompts.hi[menuOption] ||
      "कृपया अपनी समस्या बोलें।";

    res.json({
      ivr_session_id: `ivr-${Date.now()}`,
      status: "connected",
      toll_free_number: "1800-BOLO-SYNC (1800-265-6796)",
      language,
      menuOption,
      system_voice_prompt: promptText,
    });
  });

  // 7. Two-Way Live Conversation Interpreter Bridge endpoint
  const handleConversationTranslate = async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    try {
      let audioBuffer: Buffer | null = null;
      let mimeType = "audio/webm";
      let textInput = "";
      let sourceLang = req.body?.source_language || "auto";
      let targetLang = req.body?.target_language || "auto";
      const speaker = req.body?.speaker || "person_a";
      const speakerName = req.body?.speaker_name || (speaker === "person_a" ? "Speaker 1 (Regional)" : "Speaker 2 (English)");

      if (req.file) {
        audioBuffer = req.file.buffer;
        mimeType = req.file.mimetype || "audio/webm";
      } else if (req.body?.audio_base64) {
        audioBuffer = Buffer.from(req.body.audio_base64, "base64");
        mimeType = req.body.mime_type || "audio/webm";
      }

      textInput = req.body?.text || req.body?.query_text || "";

      let transcript = textInput.trim();
      let detectedLang = sourceLang !== "auto" ? sourceLang : "hi";
      let sourceLangName =
        detectedLang === "pa"
          ? "Punjabi (ਪੰਜਾਬੀ)"
          : detectedLang === "en"
          ? "English"
          : "Hindi (हिंदी)";

      // STT if audio present
      if (audioBuffer && audioBuffer.length > 0) {
        try {
          const sttRes = await transcribeAudio(audioBuffer, mimeType);
          if (sttRes && sttRes.transcript && sttRes.transcript.trim().length > 0) {
            // Browser SpeechRecognition is the live transcript and should not be replaced by a second guess.
            if (!transcript) {
              transcript = sttRes.transcript;
            }
            if (sourceLang === "auto") {
              detectedLang = sttRes.detectedLanguage || "hi";
              sourceLangName = sttRes.languageName;
            }
          }
        } catch (sttErr) {
          console.warn("Conversation audio STT error:", sttErr);
        }
      }

      if (!transcript || transcript.trim().length === 0) {
        return res.status(400).json({
          error: "No speech was understood.",
          suggestion: "Please speak clearly and try again.",
        });
      }

      // Determine source & target languages
      const finalSourceLang = sourceLang !== "auto" ? sourceLang : detectedLang;
      let finalTargetLang = targetLang;

      if (finalTargetLang === "auto" || !finalTargetLang) {
        // If speaker speaks English -> translate to Hindi (or default regional)
        // If speaker speaks Hindi or Punjabi -> translate to English
        finalTargetLang = finalSourceLang === "en" ? "hi" : "en";
      }

      const langNameMap: Record<string, string> = {
        hi: "Hindi (हिंदी)",
        pa: "Punjabi (ਪੰਜਾਬੀ)",
        en: "English",
        bn: "Bengali (বাংলা)",
        mr: "Marathi (मराठी)",
        gu: "Gujarati (ગુજરાતી)",
      };

      const targetLangName = langNameMap[finalTargetLang] || finalTargetLang.toUpperCase();
      const actualSourceLangName = langNameMap[finalSourceLang] || sourceLangName;

      // Translate text
      const translationRes = await translateText(transcript, finalTargetLang, finalSourceLang);
      const translatedText = translationRes.translatedText;

      // Generate TTS for translated text in target language
      const ttsResult = await generateSpeechAudio(translatedText, finalTargetLang);

      const totalLatency = Date.now() - startTime;

      res.json({
        id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        speaker,
        speaker_name: speakerName,
        original_text: transcript,
        original_language: finalSourceLang,
        original_language_name: actualSourceLangName,
        translated_text: translatedText,
        target_language: finalTargetLang,
        target_language_name: targetLangName,
        audio_url: ttsResult.audioUrl || "",
        tts_provider: ttsResult.provider,
        latency_ms: totalLatency,
      });
    } catch (err: any) {
      console.error("Conversation translation error:", err);
      res.status(500).json({
        error: "Failed to translate conversation speech.",
        details: err?.message || String(err),
      });
    }
  };

  app.post("/api/translate-conversation", upload.single("audio"), handleConversationTranslate);
  app.post("/api/conversation/translate", upload.single("audio"), handleConversationTranslate);

  // 8. Direct Translation API endpoint
  app.post("/api/translate", async (req, res) => {
    try {
      const text = req.body?.text || "";
      const targetLang = req.body?.target_language || "en";
      const sourceLang = req.body?.source_language || "auto";

      if (!text || !text.trim()) {
        return res.status(400).json({ error: "Text parameter is required." });
      }

      const result = await translateText(text, targetLang, sourceLang);
      res.json(result);
    } catch (err: any) {
      console.error("Translate endpoint error:", err);
      res.status(500).json({ error: "Translation failed", details: err?.message || String(err) });
    }
  });

  // API Error handler for multer or synchronous errors
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith("/api") || req.path === "/voice-query") {
      console.error("API error caught:", err);
      return res.status(err.status || 500).json({
        error: err.message || "Internal server error in voice pipeline.",
      });
    }
    next(err);
  });

  // API 404 catch-all so unmatched /api routes never serve HTML
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // 9. Setup Vite middleware or static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BoloSync Server running on http://localhost:${PORT}`);
  });
}

startServer();
