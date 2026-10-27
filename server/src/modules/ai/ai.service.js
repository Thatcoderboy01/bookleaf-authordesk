import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 20_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryable(error) {
  const message = String(error?.message || error);
  const status = error?.status ?? error?.statusCode;

  return (
    [408, 429, 500, 502, 503, 504].includes(Number(status)) ||
    /\b(408|429|500|502|503|504)\b/.test(message) ||
    /UNAVAILABLE|RESOURCE_EXHAUSTED|INTERNAL|TIMEOUT|TIMED OUT|ECONNRESET|ETIMEDOUT|ECONNREFUSED/i.test(
      message
    )
  );
}

export function createAITextGenerator({
  client,
  modelName,
  sleepFn = sleep,
  maxAttempts = MAX_ATTEMPTS,
  timeoutMs = REQUEST_TIMEOUT_MS,
}) {
  return async function generateAIText(prompt, options = {}) {
    if (!client) {
      throw new Error("AI service is not configured");
    }

    const { jsonMode = false } = options;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await client.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            temperature: 0.2,
            maxOutputTokens: 1500,
            ...(jsonMode
              ? { responseMimeType: "application/json" }
              : {}),
          },
        });

        const text = response.text?.trim();

        if (!text) {
          throw new Error("AI returned an empty response");
        }

        return text;
      } catch (error) {
        const finalAttempt = attempt === maxAttempts - 1;

        if (finalAttempt || !isRetryable(error)) {
          throw error;
        }

        await sleepFn(1000 * 2 ** attempt);
      }
    }

    throw new Error("AI request failed after retries");
  };
}

const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      timeout_ms: REQUEST_TIMEOUT_MS,
    })
  : null;

export const generateAIText = createAITextGenerator({
  client: ai,
  modelName: model,
});
