/**
 * Text-to-Speech service supporting ElevenLabs Multilingual API and client-side fallback
 */

interface TTSResult {
  audioUrl?: string; // Data URL or audio stream endpoint
  audioBase64?: string;
  provider: "elevenlabs" | "google_tts" | "browser_speech";
  voiceName: string;
}

export async function generateSpeechAudio(
  text: string,
  languageCode: string = "hi"
): Promise<TTSResult> {
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const cleanText = (text || "").trim();

  if (!cleanText) {
    return {
      provider: "browser_speech",
      voiceName: "Default Indian Voice",
    };
  }

  // 1. If ElevenLabs API Key is available and valid
  if (elevenLabsKey && elevenLabsKey.trim().length > 0 && !elevenLabsKey.includes("MY_") && elevenLabsKey !== "undefined") {
    try {
      const voiceId = "EXAVITQu4vr4xnSDxMaL";
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsKey.trim(),
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const audioUrl = `data:audio/mp3;base64,${base64}`;
        return {
          audioUrl,
          audioBase64: base64,
          provider: "elevenlabs",
          voiceName: "ElevenLabs Multilingual v2",
        };
      }
    } catch (err) {
      console.info("ElevenLabs TTS skipped, using Google TTS audio stream.");
    }
  }

  // 2. High-fidelity direct Google TTS audio generation for regional Indian languages
  try {
    const langParam = languageCode === "pa" ? "pa" : languageCode === "en" ? "en-IN" : "hi";
    const sampleText = cleanText.length > 200 ? cleanText.slice(0, 200) : cleanText;
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      sampleText
    )}&tl=${langParam}&client=tw-ob`;

    const res = await fetch(ttsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Referer: "https://translate.google.com/",
      },
    });

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      if (arrayBuffer && arrayBuffer.byteLength > 200) {
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        return {
          audioUrl: `data:audio/mp3;base64,${base64}`,
          audioBase64: base64,
          provider: "google_tts",
          voiceName:
            languageCode === "pa"
              ? "Punjabi (Google Voice)"
              : languageCode === "en"
              ? "Indian English (Google Voice)"
              : "Hindi (Google Voice)",
        };
      }
    }
  } catch (err) {
    console.warn("Direct Google TTS audio stream failed, falling back to browser speech:", err);
  }

  // 3. Return browser speech fallback configuration
  return {
    provider: "browser_speech",
    voiceName: languageCode === "pa" ? "Punjabi (India)" : languageCode === "en" ? "English (India)" : "Hindi (India)",
  };
}
