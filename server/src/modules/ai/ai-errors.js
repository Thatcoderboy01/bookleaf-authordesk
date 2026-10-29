import { ApiError } from "../../utils/ApiError.js";

export const AI_ERROR_CODES = {
  QUOTA_EXCEEDED: "AI_QUOTA_EXCEEDED",
  INVALID_RESPONSE: "AI_INVALID_RESPONSE",
  PROVIDER_UNAVAILABLE: "AI_PROVIDER_UNAVAILABLE",
  CONFIGURATION_ERROR: "AI_CONFIGURATION_ERROR",
  GENERATION_FAILED: "AI_GENERATION_FAILED",
};

export const AI_ERROR_MESSAGES = {
  QUOTA_EXCEEDED:
    "Gemini API quota has been reached. Please try again after the quota resets or contact the system administrator.",
  INVALID_RESPONSE:
    "The AI service returned an unreadable response. Please try again.",
  PROVIDER_UNAVAILABLE:
    "The AI service is temporarily unavailable. Please try again later.",
  CONFIGURATION_ERROR:
    "AI draft generation is not configured correctly. Please contact the system administrator.",
  GENERATION_FAILED:
    "Unable to generate an AI draft right now. Please try again.",
};

/**
 * Extracts a safe, trustworthy retry delay hint from provider error responses.
 * Does not invent or promise an exact reset time unless supported by the provider.
 *
 * @param {any} error
 * @returns {string|null}
 */
export function extractRetryHint(error) {
  if (!error) return null;

  // 1. Direct retryAfter property (number of seconds or string)
  if (
    error.retryAfter !== undefined &&
    error.retryAfter !== null &&
    !Number.isNaN(Number(error.retryAfter))
  ) {
    const seconds = Math.round(Number(error.retryAfter));
    if (seconds > 0 && seconds <= 86400) {
      return `Retry suggested in ${seconds} second${seconds === 1 ? "" : "s"}`;
    }
  }

  // 2. HTTP header retry-after
  const retryHeader =
    error.headers?.get?.("retry-after") ||
    error.headers?.["retry-after"] ||
    error.response?.headers?.get?.("retry-after") ||
    error.response?.headers?.["retry-after"];

  if (retryHeader && !Number.isNaN(Number(retryHeader))) {
    const seconds = Math.round(Number(retryHeader));
    if (seconds > 0 && seconds <= 86400) {
      return `Retry suggested in ${seconds} second${seconds === 1 ? "" : "s"}`;
    }
  }

  // 3. Google RPC RetryInfo in errorDetails or details array
  const details = error.errorDetails || error.details;
  if (Array.isArray(details)) {
    for (const item of details) {
      if (item?.retryDelay) {
        if (typeof item.retryDelay === "string") {
          const match = item.retryDelay.match(/^(\d+(?:\.\d+)?)s?$/);
          if (match) {
            const sec = Math.round(Number(match[1]));
            if (sec > 0 && sec <= 86400) {
              return `Retry suggested in ${sec} second${sec === 1 ? "" : "s"}`;
            }
          }
        } else if (typeof item.retryDelay?.seconds === "number") {
          const sec = Math.round(item.retryDelay.seconds);
          if (sec > 0 && sec <= 86400) {
            return `Retry suggested in ${sec} second${sec === 1 ? "" : "s"}`;
          }
        }
      }
    }
  }

  // 4. Trustworthy pattern inside error message, e.g. "retry in 35s" or "retry after 42 seconds"
  const rawMsg = String(error.message || "");
  const delayMatch = rawMsg.match(
    /\b(?:retry\s+(?:after|in)|wait)\s+(\d+)\s*(?:s|sec|seconds?)\b/i
  );
  if (delayMatch) {
    const sec = Math.round(Number(delayMatch[1]));
    if (sec > 0 && sec <= 86400) {
      return `Retry suggested in ${sec} second${sec === 1 ? "" : "s"}`;
    }
  }

  return null;
}

/**
 * Normalizes any AI-related provider error into an ApiError with safe admin-facing copy.
 * Ensures internal paths, raw provider payloads, API keys, or stack traces are never exposed in HTTP responses.
 *
 * @param {any} error
 * @returns {ApiError}
 */
export function normalizeAIError(error) {
  // If already a normalized ApiError, return as-is
  if (error instanceof ApiError && error.code) {
    return error;
  }

  const rawMessage = String(error?.message || error || "");
  const status = Number(error?.status ?? error?.statusCode);
  const statusStr = String(error?.status || "");

  // 1. Quota / Rate limit (HTTP 429 / RESOURCE_EXHAUSTED)
  const isQuota =
    status === 429 ||
    statusStr === "RESOURCE_EXHAUSTED" ||
    /\b(429|RESOURCE_EXHAUSTED)\b/i.test(rawMessage) ||
    /quota\s*exceeded|rate\s*limit|generaterequests/i.test(rawMessage);

  if (isQuota) {
    const retryHint = extractRetryHint(error);
    return new ApiError(
      429,
      AI_ERROR_MESSAGES.QUOTA_EXCEEDED,
      [],
      AI_ERROR_CODES.QUOTA_EXCEEDED,
      retryHint
    );
  }

  // 2. Missing or invalid API key / configuration
  const isConfigError =
    /not configured|missing.*api key|gemini_api_key|api_key_invalid|api key not valid/i.test(
      rawMessage
    ) ||
    (status === 401 && /api key|credential|authentication/i.test(rawMessage));

  if (isConfigError) {
    return new ApiError(
      503,
      AI_ERROR_MESSAGES.CONFIGURATION_ERROR,
      [],
      AI_ERROR_CODES.CONFIGURATION_ERROR
    );
  }

  // 3. Invalid or malformed AI JSON response
  const isInvalidResponse =
    /invalid json|unreadable response|invalid response draft|unknown knowledge-base entry/i.test(
      rawMessage
    ) || (error instanceof SyntaxError && /json/i.test(rawMessage));

  if (isInvalidResponse) {
    return new ApiError(
      502,
      AI_ERROR_MESSAGES.INVALID_RESPONSE,
      [],
      AI_ERROR_CODES.INVALID_RESPONSE
    );
  }

  // 4. Network timeout, connection failure, or provider 5xx
  const isUnavailable =
    (status >= 500 && status <= 599) ||
    statusStr === "UNAVAILABLE" ||
    statusStr === "INTERNAL" ||
    /\b(500|502|503|504)\b/.test(rawMessage) ||
    /\b(INTERNAL|UNAVAILABLE|DEADLINE_EXCEEDED|ECONNRESET|ETIMEDOUT|ECONNREFUSED|ENOTFOUND)\b/.test(
      rawMessage
    ) ||
    /\b(fetch failed|timed? out|timeout|connection refused)\b/i.test(
      rawMessage
    );

  if (isUnavailable) {
    return new ApiError(
      503,
      AI_ERROR_MESSAGES.PROVIDER_UNAVAILABLE,
      [],
      AI_ERROR_CODES.PROVIDER_UNAVAILABLE
    );
  }

  // 5. Unknown / generic failure
  return new ApiError(
    500,
    AI_ERROR_MESSAGES.GENERATION_FAILED,
    [],
    AI_ERROR_CODES.GENERATION_FAILED
  );
}
