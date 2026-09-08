import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

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

export interface KnowledgeItem {
  id: string;
  title: string;
  domain: DomainType;
  [key: string]: any;
}

export interface RAGAnswerResult {
  domain: DomainType;
  answerEnglish: string;
  confidence: number;
  sources: Array<{ id: string; title: string; domain: string }>;
  keyPoints: string[];
  suggestions: string[];
  helpline?: string;
  disclaimer?: string;
}

let loadedKnowledgeBase: KnowledgeItem[] = [];

function loadKnowledgeBase(): KnowledgeItem[] {
  if (loadedKnowledgeBase.length > 0) return loadedKnowledgeBase;

  const baseDir = path.join(process.cwd(), "server", "data", "knowledge_base");
  const allItems: KnowledgeItem[] = [];

  if (fs.existsSync(baseDir)) {
    try {
      const files = fs.readdirSync(baseDir).filter((f) => f.endsWith(".json"));
      for (const f of files) {
        const fullPath = path.join(baseDir, f);
        try {
          const raw = fs.readFileSync(fullPath, "utf-8");
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            allItems.push(...parsed);
          }
        } catch (err) {
          console.error(`Error loading knowledge file ${f}:`, err);
        }
      }
    } catch (err) {
      console.error("Error reading knowledge_base directory:", err);
    }
  }

  loadedKnowledgeBase = allItems;
  return loadedKnowledgeBase;
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

/**
 * Fast BM25 / token-overlap keyword + semantic scoring for RAG retrieval
 */
export function retrieveContext(
  query: string,
  topK: number = 3
): { item: KnowledgeItem; score: number }[] {
  const kb = loadKnowledgeBase();
  const stopWords = new Set([
    "about", "after", "also", "and", "are", "can", "could", "does", "for", "from",
    "give", "have", "help", "how", "into", "just", "more", "need", "please", "plus",
    "should", "that", "the", "their", "there", "this", "what", "when", "where", "which",
    "with", "would", "you", "your", "two", "three", "one", "four", "five", "equals",
  ]);
  const queryTokens = query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && /[a-z]/i.test(t) && !stopWords.has(t));

  const scored = kb.map((item) => {
    let score = 0;
    const fullText = JSON.stringify(item).toLowerCase();

    for (const token of queryTokens) {
      // Title match gets higher weight
      if (item.title && item.title.toLowerCase().includes(token)) {
        score += 8;
      }
      // Keywords array match
      if (Array.isArray(item.keywords)) {
        for (const kw of item.keywords) {
          if (kw.toLowerCase().includes(token)) {
            score += 6;
          }
        }
      }
      // Crop / disease match
      if (item.crop && item.crop.toLowerCase().includes(token)) {
        score += 5;
      }
      // General body match
      if (fullText.includes(token)) {
        score += 2;
      }
    }

    // Exact domain keyword boosts
    if (/kisan|scheme|yojana|subsidy|pmjay|bima|card|pension|awas|apply|welfare|scholarship/i.test(query) && item.domain === "scheme") {
      score += 3;
    }
    if (/fever|diarrhea|loose motion|heat|ors|doctor|hospital|pain|pregnant|baby|vaccine|snake|blood|dengue|illness/i.test(query) && item.domain === "health") {
      score += 3;
    }
    if (/crop|pest|rust|insect|wheat|paddy|mustard|cotton|fertilizer|spray|water|soil|irrigation|urea|dap|kheti|harvest/i.test(query) && item.domain === "farming") {
      score += 3;
    }
    if (/school|college|degree|iti|course|study|scholarship|exam|admission|neet|jee|cbse|swayam|skill/i.test(query) && item.domain === "education") {
      score += 4;
    }
    if (/job|naukri|interview|resume|rozgar|mgnrega|eshram|work|apprenticeship|business|loan|pmegp/i.test(query) && item.domain === "employment") {
      score += 4;
    }
    if (/bank|jan dhan|upi|pin|scam|fraud|mudra|pension|apy|pmsby|pmjjby|saving|aeps|atm/i.test(query) && item.domain === "finance") {
      score += 4;
    }
    if (/law|legal|court|police|fir|nalsa|vakeel|tenant|rent|consumer|complaint|domestic violence|rti|mact/i.test(query) && item.domain === "legal") {
      score += 4;
    }
    if (/ration|voter|aadhaar|electricity|bijli|1912|swachhata|garbage|water|bus pass|train|uts|digilocker/i.test(query) && item.domain === "civic") {
      score += 4;
    }
    if (/weather|rain|barish|monsoon|heatwave|loo|lightning|damini|flood|cyclone|tufan|earthquake|frost/i.test(query) && item.domain === "weather") {
      score += 4;
    }

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter((result) => result.score >= 4).slice(0, topK);
}

/**
 * Get all available knowledge base items for inspection/explorer
 */
export function getAllKnowledgeItems(): KnowledgeItem[] {
  return loadKnowledgeBase();
}

/**
 * Detect domain accurately from query tokens
 */
export function detectQueryDomain(query: string): DomainType {
  const q = query.toLowerCase();
  if (/fever|diarrhea|ors|doctor|hospital|pain|pregnant|vaccine|blood|dengue|snake|headache|vomit|wound|burn|medicine/i.test(q)) {
    return "health";
  }
  if (/crop|pest|rust|insect|wheat|paddy|mustard|cotton|fertilizer|spray|urea|dap|kheti|jeevamrit|irrigation|soil/i.test(q)) {
    return "farming";
  }
  if (/scholarship|school|college|polytechnic|iti|study|exam|board|admission|student|padhai|swayam|navodaya/i.test(q)) {
    return "education";
  }
  if (/job|naukri|interview|resume|rozgar|mgnrega|job card|eshram|apprenticeship|naps|pmegp|hiring|career/i.test(q)) {
    return "employment";
  }
  if (/bank|jan dhan|pmjdy|upi|pin|mudra|apy|pmsby|pmjjby|sukanya|pension|scam|fraud|digital arrest|aeps|rupay/i.test(q)) {
    return "finance";
  }
  if (/legal|lawyer|vakeel|nalsa|court|fir|tenant|rent|consumer|complaint 1915|domestic violence|181|rti|lok adalat/i.test(q)) {
    return "legal";
  }
  if (/ration|onorc|voter|epic|electricity|1912|bijli|swachhata|garbage|water|uts ticket|digilocker|certificate|pmay/i.test(q)) {
    return "civic";
  }
  if (/weather|mausam|rain|barish|lightning|damini|flood|baadh|cyclone|tufan|heatwave|loo|earthquake|frost|pala/i.test(q)) {
    return "weather";
  }
  if (/scheme|yojana|subsidy|pm kisan|ayushman|pmjay|beneficiary|sarkari/i.test(q)) {
    return "scheme";
  }
  return "general";
}

/**
 * Core RAG pipeline with Gemini:
 * takes English query + retrieved context, reasons, and returns domain-tagged spoken response.
 */
export async function generateRAGAnswer(
  englishQuery: string,
  apiKey?: string,
  originalQuery?: string,
  conversationContext?: string
): Promise<RAGAnswerResult> {
  const geminiKey = process.env.GEMINI_API_KEY || apiKey;
  const retrieved = retrieveContext(englishQuery, 3);
  const contextDocs = retrieved.map((r) => r.item);

  const fallbackDomain = detectQueryDomain(englishQuery);

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

      const contextText = contextDocs
        .map(
          (doc, i) =>
            `[DOCUMENT ${i + 1}] Title: ${doc.title}\nDomain: ${doc.domain}\nDetails: ${JSON.stringify(
              doc
            )}`
        )
        .join("\n\n");

      const systemPrompt = `You are BoloSync, an empathetic, highly accurate AI voice assistant for Indian citizens, rural families, farmers, students, and workers.
Your task is to answer the user query based on the retrieved knowledge base documents and provide practical, direct, trustworthy spoken advice.

RULES:
1. Identify the domain strictly as one of:
   - "scheme" (Government welfare schemes like PM-KISAN, Ayushman, PMAY)
   - "health" (Health guidance, first aid, home care, medical symptoms)
   - "farming" (Agriculture, crop diseases, pest spray, fertilizers, livestock)
   - "education" (Scholarships, free skill courses, admissions, exam guidance)
   - "employment" (Job search, MGNREGA, apprenticeships, self-employment loans, interview tips)
   - "finance" (Banking, zero-balance Jan Dhan, UPI safety, insurance, pensions, fraud warnings)
   - "legal" (Free legal aid, consumer complaints, tenant rights, labor rights, RTI, women safety)
   - "civic" (Ration card ONORC, voter ID, electricity 1912, certificates, municipal civic complaints)
   - "weather" (Weather forecast, lightning alert, flood, heatwave, disaster precautions)
   - "general" (General civic questions, emergency numbers, helpline routing)

2. Voice-First Spoken Output: The response will be translated into the detected user language and spoken aloud. Keep the spoken answer warm, conversational, clear, and direct (under 75 words). Do not use markdown tables, raw asterisks, or unpronounceable formatting. Answer only what the user asked; do not add unrelated offers or promotional follow-up questions.
3. If the domain is "health", ALWAYS provide clear first-aid steps AND explicitly mention that this is home guidance only, not a clinical diagnosis, and to consult an ASHA worker or local doctor.
4. If the domain is "scheme", "education", or "employment", mention the key benefit, eligibility, and how to apply (e.g. CSC center or official portal).
5. If the domain is "farming", mention the exact recommended medicine/fertilizer dosage or organic remedy, and when to spray.
6. Use the knowledge base as evidence, not as a reason to force an answer. Lead with the safest useful action the user can take now. If one detail is missing, give the safe general step first and ask one short clarifying question. Never invent a scheme rule, dosage, eligibility requirement, helpline, or date. Do not use defeatist phrases such as "I cannot help" or "I could not find information" when a practical next step is available.
7. Think through the user intent, relevant evidence, safety constraints, and most useful next step before writing the answer. Do not reveal private chain-of-thought; return only the final answer and concise supporting points.
8. Use recent conversation context to resolve references such as "that", "it", or "the same problem". Treat the latest user query as the current request.
9. Provide structured output in pure JSON matching this schema:
{
  "domain": "scheme" | "health" | "farming" | "education" | "employment" | "finance" | "legal" | "civic" | "weather" | "general",
  "answer_english": "Natural, spoken-friendly answer in English",
  "key_points": ["Point 1", "Point 2", "Point 3"],
  "suggestions": ["Useful next step", "Relevant follow-up"],
  "helpline": "Official helpline number if applicable or empty",
  "disclaimer": "Safety or medical disclaimer if applicable or empty",
  "confidence": 0.95
}`;

      const userPrompt = `RECENT CONVERSATION CONTEXT:
    ${conversationContext || "No previous context."}

    ORIGINAL USER QUERY: "${originalQuery || englishQuery}"
    NORMALIZED QUERY FOR SEARCH: "${englishQuery}"

RETRIEVED KNOWLEDGE BASE CONTEXT:
    ${contextText || "No directly matching document was found. Give safe general guidance and one practical next step, then ask one short clarifying question for the missing detail. Do not invent specific facts."}

Generate the JSON response:`;

      const modelsToTry = [
        "gemini-3.6-flash",
        "gemini-3.5-flash-lite",
      ];
      let raw = "";

      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: userPrompt,
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          });
          raw = (response.text || "").trim();
          if (raw) break;
        } catch (modelErr: any) {
          console.warn(`Gemini RAG model ${model} attempt failed:`, modelErr?.message || modelErr);
          continue;
        }
      }

      if (raw) {
        const parsed = safeParseJson<any>(raw, null);
        if (parsed && (parsed.answer_english || parsed.answer)) {
          const validDomains: DomainType[] = [
            "scheme",
            "health",
            "farming",
            "education",
            "employment",
            "finance",
            "legal",
            "civic",
            "weather",
            "general",
          ];
          const detectedDomain: DomainType = validDomains.includes(parsed.domain)
            ? parsed.domain
            : (topDocDomain(contextDocs) || fallbackDomain);

          return {
            domain: detectedDomain,
            answerEnglish:
              parsed.answer_english ||
              parsed.answer ||
              "Support and verified guidance are available under official public portals and helplines.",
            confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.94,
            sources: contextDocs.map((d) => ({
              id: d.id,
              title: d.title,
              domain: d.domain,
            })),
            keyPoints: Array.isArray(parsed.key_points) ? parsed.key_points : [],
            suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [],
            helpline: parsed.helpline || (contextDocs[0] as any)?.helpline || "",
            disclaimer:
              parsed.disclaimer ||
              (detectedDomain === "health"
                ? "This is first-aid guidance only, not a clinical diagnosis. Please consult your local doctor or ASHA worker."
                : undefined),
          };
        }
      }
    } catch (err) {
      console.warn("Gemini RAG reasoning warning:", err);
    }
  }

  // Fallback if Gemini is not responding or returned empty
  const topDoc = contextDocs[0];
  let fallbackAnswer = `To help you immediately, please tell me the ${fallbackDomain === "health" ? "main symptom and how long it has been present" : fallbackDomain === "farming" ? "crop and the problem you can see" : "scheme, service, or problem name"}. I will then give the next practical step and the relevant official contact if available.`;
  let fallbackKeyPoints: string[] = [];
  let helpline = (topDoc as any)?.helpline || "";

  if (topDoc) {
    if (topDoc.domain === "scheme" || topDoc.domain === "education" || topDoc.domain === "employment" || topDoc.domain === "finance" || topDoc.domain === "legal" || topDoc.domain === "civic" || topDoc.domain === "weather" || topDoc.domain === "general") {
      fallbackAnswer = `Regarding ${topDoc.title}: ${topDoc.benefits || topDoc.advisory || topDoc.summary || "Verified guidance is available."} Check the official portal or nearest CSC for current eligibility and application steps.`;
      fallbackKeyPoints = topDoc.key_benefits || (topDoc.benefits ? [topDoc.benefits] : [topDoc.title]);
      helpline = topDoc.helpline || "112 / 1950 / 1800-180-1551";
    } else if (topDoc.domain === "health") {
      fallbackAnswer = `For ${topDoc.title}: ${topDoc.first_aid_steps ? topDoc.first_aid_steps.join(". ") : (topDoc.home_action || topDoc.summary)}. Please stay hydrated and consult your local ASHA worker or Primary Health Centre (PHC).`;
      fallbackKeyPoints = topDoc.first_aid_steps || (topDoc.symptoms ? [topDoc.symptoms] : [topDoc.title]);
      helpline = topDoc.helpline || "108 / 104";
    } else if (topDoc.domain === "farming") {
      fallbackAnswer = `For ${topDoc.crop || topDoc.title} (${topDoc.problem || "Crop Care"}): ${topDoc.advisory || topDoc.organic_method || topDoc.solution || topDoc.summary}. Kisan Call Centre helpline is 1800-180-1551.`;
      fallbackKeyPoints = [
        topDoc.advisory ? `Advisory: ${topDoc.advisory}` : topDoc.title,
        topDoc.organic_method ? `Organic: ${topDoc.organic_method}` : "Spray in calm morning/evening hours",
      ];
      helpline = topDoc.helpline || "1800-180-1551";
    }
  }

  const finalDomain = (topDoc?.domain as DomainType) || fallbackDomain;

  return {
    domain: finalDomain,
    answerEnglish: fallbackAnswer,
    confidence: 0.88,
    sources: contextDocs.map((d) => ({
      id: d.id,
      title: d.title,
      domain: d.domain,
    })),
    keyPoints: fallbackKeyPoints,
    suggestions: [],
    helpline,
    disclaimer:
      finalDomain === "health"
        ? "This is first-aid guidance only, not a clinical diagnosis. Please consult your local doctor or ASHA worker."
        : undefined,
  };
}

function topDocDomain(docs: KnowledgeItem[]): DomainType | undefined {
  if (docs && docs.length > 0 && docs[0].domain) {
    return docs[0].domain;
  }
  return undefined;
}
