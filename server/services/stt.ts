import { GoogleGenAI } from "@google/genai";

interface STTResult {
  transcript: string;
  detectedLanguage: string; // 'hi' | 'pa' | 'en' | string
  languageName: string;
  confidence: number;
}

function safeParseJson<T>(raw: string, fallback: T): T {
  if (!raw || typeof raw !== "string" || !raw.trim()) return fallback;
  const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

function detectScriptLanguage(text: string): { code: string; name: string } {
  if (/[\u0A00-\u0A7F]/.test(text)) {
    return { code: "pa", name: "Punjabi (ਪੰਜਾਬੀ)" };
  }
  if (/[\u0900-\u097F]/.test(text)) {
    return { code: "hi", name: "Hindi (हिंदी)" };
  }
  if (/[\u0980-\u09FF]/.test(text)) {
    return { code: "bn", name: "Bengali (বাংলা)" };
  }
  if (/[\u0A80-\u0AFF]/.test(text)) {
    return { code: "gu", name: "Gujarati (ગુજરાતી)" };
  }
  if (/[\u0B80-\u0BFF]/.test(text)) {
    return { code: "ta", name: "Tamil (தமிழ்)" };
  }
  if (/[\u0C00-\u0C7F]/.test(text)) {
    return { code: "te", name: "Telugu (తెలుగు)" };
  }
  return { code: "en", name: "English" };
}

/**
 * Speech-to-Text service supporting OpenAI Whisper API (if key provided)
 * and Google Gemini Multimodal Audio transcription with native Indian regional language detection.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = "audio/webm",
  apiKey?: string,
  forcedLanguage?: string
): Promise<STTResult> {
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || apiKey;

  // 1. If OpenAI Whisper API key is available, attempt Whisper transcription
  if (openAiKey && openAiKey.trim().length > 0 && !openAiKey.includes("MY_") && openAiKey !== "undefined") {
    try {
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: mimeType });
      formData.append("file", blob, "audio.webm");
      formData.append("model", "whisper-1");
      if (forcedLanguage) {
        formData.append("language", forcedLanguage);
      }
      formData.append("response_format", "verbose_json");

      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiKey.trim()}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = (await res.json()) as { text?: string; language?: string };
        const text = (data.text || "").trim();
        const lang = forcedLanguage || data.language || "hi";
        const langMap: Record<string, string> = {
          hindi: "hi",
          punjabi: "pa",
          english: "en",
          bengali: "bn",
          marathi: "mr",
          gujarati: "gu",
          tamil: "ta",
          telugu: "te",
        };
        const detectedCode = langMap[lang.toLowerCase()] || lang.slice(0, 2) || "hi";
        const nameMap: Record<string, string> = {
          hi: "Hindi (हिंदी)",
          pa: "Punjabi (ਪੰਜਾਬੀ)",
          en: "English",
          bn: "Bengali (বাংলা)",
          mr: "Marathi (मराठी)",
          gu: "Gujarati (ગુજરાતી)",
        };

        if (text) {
          return {
            transcript: text,
            detectedLanguage: detectedCode,
            languageName: nameMap[detectedCode] || detectedCode.toUpperCase(),
            confidence: 0.95,
          };
        }
      }
    } catch (err) {
      console.info("OpenAI Whisper API skipped, using Gemini multimodal audio:", err);
    }
  }

  // 2. High-accuracy Gemini Multimodal Audio transcription
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const base64Audio = audioBuffer.toString("base64");
      const normalizedMime = mimeType.includes("webm")
        ? "audio/webm"
        : mimeType.includes("wav")
        ? "audio/wav"
        : mimeType.includes("mp3") || mimeType.includes("mpeg")
        ? "audio/mp3"
        : mimeType.includes("ogg")
        ? "audio/ogg"
        : "audio/webm";

      const languageInstruction = forcedLanguage
        ? `The user selected ${forcedLanguage}. Transcribe the audio as ${forcedLanguage} and do not switch to another language unless the audio is clearly empty.`
        : "Detect the spoken language from the audio.";
      const prompt = `You are a regional Indian speech transcription system for rural citizens, farmers, and health seekers.
    Transcribe this spoken audio accurately in its native regional script (Hindi Devanagari, Punjabi Gurmukhi, English, etc.).
    ${languageInstruction}
Return ONLY a valid JSON object strictly matching this schema:
{
  "transcript": "Exact transcription in native script",
  "detected_language": "hi" | "pa" | "en" | "bn" | "mr" | "gu" | "ta" | "te",
  "language_name": "Hindi (हिंदी)" | "Punjabi (ਪੰਜਾਬੀ)" | "English",
  "confidence": 0.95
}
Return pure JSON without markdown or backticks.`;

      const modelsToTry = [
        "gemini-3.5-transcribe",
        "gemini-3.7-flash",
        "gemini-flash-latest",
      ];
      let rawText = "";

      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                inlineData: {
                  mimeType: normalizedMime,
                  data: base64Audio,
                },
              },
              prompt,
            ],
            config: {
              responseMimeType: "application/json",
            },
          });
          rawText = (response.text || "").trim();
          if (rawText) break;
        } catch (modelErr: any) {
          console.warn(`STT model ${model} attempt failed:`, modelErr?.message || modelErr);
          // Continue to next fallback model
          continue;
        }
      }

      if (rawText) {
        const parsed = safeParseJson<any>(rawText, null);
        if (parsed && (parsed.transcript || parsed.text)) {
          const transcript = (parsed.transcript || parsed.text || "").trim();
          const detectedLanguage = forcedLanguage || parsed.detected_language || parsed.language || detectScriptLanguage(transcript).code;
          const languageName = forcedLanguage === "hi"
            ? "Hindi (हिंदी)"
            : forcedLanguage === "pa"
            ? "Punjabi (ਪੰਜਾਬੀ)"
            : forcedLanguage === "en"
            ? "English"
            : parsed.language_name || detectScriptLanguage(transcript).name;
          const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.94;

          return {
            transcript,
            detectedLanguage,
            languageName,
            confidence,
          };
        } else {
          // If model returned plain text instead of JSON
          const cleanText = rawText.replace(/```json/g, "").replace(/```/g, "").replace(/^["']|["']$/g, "").trim();
          if (cleanText.length > 0) {
            const detected = detectScriptLanguage(cleanText);
            return {
              transcript: cleanText,
              detectedLanguage: detected.code,
              languageName: detected.name,
              confidence: 0.88,
            };
          }
        }
      }
    } catch (err) {
      console.warn("Gemini audio transcription warning:", err);
    }
  }

  // Do not fabricate a query when transcription fails; the caller can ask the user to retry.
  return {
    transcript: "",
    detectedLanguage: forcedLanguage || "",
    languageName: forcedLanguage === "pa" ? "Punjabi (ਪੰਜਾਬੀ)" : forcedLanguage === "en" ? "English" : "Hindi (हिंदी)",
    confidence: 0,
  };
}
