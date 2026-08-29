import { GoogleGenAI } from "@google/genai";

interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

// Built-in high-confidence dictionary for common conversational phrases
const PHRASE_DICTIONARY: Record<string, { hi: string; pa: string; en: string }> = {
  hello: { hi: "नमस्ते", pa: "ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ", en: "Hello" },
  hi: { hi: "नमस्ते", pa: "ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ", en: "Hi" },
  "how are you": { hi: "आप कैसे हैं?", pa: "ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?", en: "How are you?" },
  "how are you?": { hi: "आप कैसे हैं?", pa: "ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?", en: "How are you?" },
  "thank you": { hi: "धन्यवाद", pa: "ਧੰਨਵਾਦ", en: "Thank you" },
  "thanks": { hi: "धन्यवाद", pa: "ਧੰਨਵਾਦ", en: "Thanks" },
  "please help me": { hi: "कृपया मेरी मदद करें।", pa: "ਕਿਰਪਾ ਕਰਕੇ ਮੇਰੀ ਮਦਦ ਕਰੋ।", en: "Please help me." },
  "what is your name": { hi: "आपका नाम क्या है?", pa: "ਤੁਹਾਡਾ ਨਾਮ ਕੀ ਹੈ?", en: "What is your name?" },
  "good morning": { hi: "शुभ प्रभात", pa: "ਸ਼ੁਭ ਸਵੇਰ", en: "Good morning" },
  "good evening": { hi: "शुभ संध्या", pa: "ਸ਼ੁਭ ਸ਼ਾਮ", en: "Good evening" },
  "yes": { hi: "हाँ", pa: "ਹਾਂ", en: "Yes" },
  "no": { hi: "नहीं", pa: "ਨਹੀਂ", en: "No" },
  "okay": { hi: "ठीक है", pa: "ਠੀਕ ਹੈ", en: "Okay" },
  "doctor": { hi: "डॉक्टर", pa: "ਡਾਕਟਰ", en: "Doctor" },
  "hospital": { hi: "अस्पताल", pa: "ਹਸਪਤਾਲ", en: "Hospital" },
  "medicine": { hi: "दवा", pa: "ਦਵਾਈ", en: "Medicine" },
  "kisan": { hi: "किसान", pa: "ਕਿਸਾਨ", en: "Farmer" },
};

/**
 * Secondary public translation API fallback using MyMemory
 */
async function fetchMyMemoryTranslate(
  text: string,
  targetLang: string,
  sourceLang: string = "en"
): Promise<string | null> {
  try {
    const sl = sourceLang === "auto" ? "en" : sourceLang;
    const tl = targetLang;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sl}|${tl}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data?.responseData?.translatedText) {
        const tr = data.responseData.translatedText.trim();
        if (tr && tr.toLowerCase() !== text.toLowerCase()) {
          return tr;
        }
      }
    }
  } catch (err) {
    console.warn("MyMemory translation fallback error:", err);
  }
  return null;
}

/**
 * Service to translate between Indian Regional Languages (Hindi, Punjabi, etc.) and English.
 * Prioritizes colloquial spoken clarity so translated answers sound natural when read aloud.
 */
export async function translateText(
  text: string,
  targetLang: "en" | "hi" | "pa" | string,
  sourceLang?: string,
  apiKey?: string
): Promise<TranslationResult> {
  const cleanInput = (text || "").trim();
  if (!cleanInput) {
    return {
      translatedText: "",
      sourceLanguage: sourceLang || "auto",
      targetLanguage: targetLang,
    };
  }

  // If source and target are identical and specified
  if (sourceLang && sourceLang !== "auto" && sourceLang.toLowerCase() === targetLang.toLowerCase()) {
    return {
      translatedText: cleanInput,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
    };
  }

  // Quick dictionary lookup for common exact short phrases
  const lower = cleanInput.toLowerCase().replace(/[.!?,]$/, "");
  if (PHRASE_DICTIONARY[lower]) {
    const entry = PHRASE_DICTIONARY[lower];
    const directTr = (entry as any)[targetLang];
    if (directTr) {
      return {
        translatedText: directTr,
        sourceLanguage: sourceLang || "auto",
        targetLanguage: targetLang,
      };
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY || apiKey;

  // 1. Try Gemini Generative AI for high-accuracy translation
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

      const langMap: Record<string, string> = {
        en: "English",
        hi: "Hindi (हिंदी - simple spoken Devanagari, respectful, clear vocabulary)",
        pa: "Punjabi (ਪੰਜਾਬੀ - natural spoken Gurmukhi, respectful rural vocabulary)",
        bn: "Bengali (বাংলা)",
        mr: "Marathi (मराठी)",
        gu: "Gujarati (ગુજરાતી)",
      };

      const targetDesc = langMap[targetLang] || targetLang;
      const sourceDesc = sourceLang && sourceLang !== "auto" ? langMap[sourceLang] || sourceLang : "the input language";

      const systemPrompt = `You are an expert bilingual speech and language translator specializing in Indian languages (Hindi, Punjabi, English).
Translate the input text accurately from ${sourceDesc} into ${targetDesc}.
RULES:
1. Return ONLY the direct translation. Do not include notes, phonetic brackets, romanization, conversational chatter, or quotation marks.
2. Use clear, simple, warm spoken language suitable for voice output.
3. Keep numbers, currency symbols (₹), dosages, and scheme names accurate.`;

      // Active reliable Gemini models with graceful fallbacks
      const modelsToTry = [
        "gemini-3.7-flash",
        "gemini-flash-latest",
        "gemini-3.1-flash-lite",
      ];

      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: `Translate this text directly into ${targetDesc}:\n\n"${cleanInput}"`,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.1,
            },
          });

          let cleanTranslated = (response.text || "").trim();
          cleanTranslated = cleanTranslated
            .replace(/^```[a-z]*\n?/i, "")
            .replace(/\n?```$/i, "")
            .replace(/^["'`]|["'`]$/g, "")
            .replace(/^(Translation|Translated text|Output):\s*/i, "")
            .trim();

          if (cleanTranslated.length > 0) {
            return {
              translatedText: cleanTranslated,
              sourceLanguage: sourceLang || "auto",
              targetLanguage: targetLang,
            };
          }
        } catch (modelErr: any) {
          console.warn(`Translation model ${model} attempt failed:`, modelErr?.message || modelErr);
          continue;
        }
      }
    } catch (err) {
      console.warn("Gemini translation error, switching to fallback API:", err);
    }
  }

  // 2. Secondary public translation fallback
  const myMemoryTr = await fetchMyMemoryTranslate(cleanInput, targetLang, sourceLang || "auto");
  if (myMemoryTr) {
    return {
      translatedText: myMemoryTr,
      sourceLanguage: sourceLang || "auto",
      targetLanguage: targetLang,
    };
  }

  // 3. Fallback direct return if all translation services fail
  return {
    translatedText: cleanInput,
    sourceLanguage: sourceLang || "auto",
    targetLanguage: targetLang,
  };
}

