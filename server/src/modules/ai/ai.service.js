
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryable(error) {
  const message = String(error?.message || error);

  return (
    /\b(429|500|502|503|504)\b/.test(message) ||
    /UNAVAILABLE|RESOURCE_EXHAUSTED|INTERNAL/i.test(message)
  );
}

export async function generateAIText(prompt, options = {}) {
  if (!ai) {
    throw new Error("AI service is not configured");
  }

  const { jsonMode = false } = options;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.2,
          maxOutputTokens: 1500,
          ...(jsonMode ? { responseMimeType: "application/json" } : {}),
        },
      });

      const text = response.text?.trim();

      if (!text) {
        throw new Error("AI returned an empty response");
      }

      return text;
    } catch (error) {
      if (attempt === 2 || !isRetryable(error)) {
        throw error;
      }

      await sleep(1000 * 2 ** attempt);
    }
  }

  throw new Error("AI request failed after retries");
}
