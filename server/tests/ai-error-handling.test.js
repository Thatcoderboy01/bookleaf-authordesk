import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAIError,
  extractRetryHint,
  AI_ERROR_CODES,
  AI_ERROR_MESSAGES,
} from "../src/modules/ai/ai-errors.js";
import errorHandler from "../src/middleware/error-handler.js";
import { createTicketResponseGenerator } from "../src/modules/ai/response-generation.service.js";

test("HTTP 429 / RESOURCE_EXHAUSTED maps to AI_QUOTA_EXCEEDED with safe copy", () => {
  const error429 = new Error(
    "Gemini API error: [429 Too Many Requests] RESOURCE_EXHAUSTED. Quota exceeded for GenerateRequestsPerDayPerModel."
  );
  error429.status = 429;

  const normalized = normalizeAIError(error429);
  assert.equal(normalized.statusCode, 429);
  assert.equal(normalized.code, AI_ERROR_CODES.QUOTA_EXCEEDED);
  assert.equal(normalized.message, AI_ERROR_MESSAGES.QUOTA_EXCEEDED);

  // Must not expose raw provider message or model name in client-facing message
  assert.equal(normalized.message.includes("GenerateRequestsPerDayPerModel"), false);
});

test("extractRetryHint extracts trustworthy retry delay from headers, details, or message", () => {
  // Direct retryAfter number
  const errWithProp = { message: "Rate limit", retryAfter: 45 };
  assert.equal(extractRetryHint(errWithProp), "Retry suggested in 45 seconds");

  // HTTP header
  const errWithHeader = {
    message: "Rate limit",
    headers: { "retry-after": "60" },
  };
  assert.equal(extractRetryHint(errWithHeader), "Retry suggested in 60 seconds");

  // Google RPC RetryInfo in errorDetails
  const errWithRpc = {
    message: "Quota exceeded",
    errorDetails: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "30s" }],
  };
  assert.equal(extractRetryHint(errWithRpc), "Retry suggested in 30 seconds");

  // Message regex
  const errWithMsgDelay = {
    message: "Resource exhausted, please retry after 15 seconds.",
  };
  assert.equal(extractRetryHint(errWithMsgDelay), "Retry suggested in 15 seconds");

  // Untrustworthy or missing retry delay -> null (does not promise or invent an exact time)
  const errWithoutDelay = { message: "Quota exceeded" };
  assert.equal(extractRetryHint(errWithoutDelay), null);
});

test("invalid or malformed AI JSON maps to AI_INVALID_RESPONSE with safe copy", () => {
  const jsonError = new Error("AI returned invalid JSON for response draft");
  const normalized = normalizeAIError(jsonError);

  assert.equal(normalized.statusCode, 502);
  assert.equal(normalized.code, AI_ERROR_CODES.INVALID_RESPONSE);
  assert.equal(normalized.message, AI_ERROR_MESSAGES.INVALID_RESPONSE);
});

test("bounded JSON repair parses valid JSON surrounded by conversational preamble", async () => {
  const noisyAIResponse = `
Here is the drafted response for the author:
\`\`\`json
{
  "draft": "Dear Author, thank you for contacting us regarding your book. We will investigate this promptly and update you within 48 hours.",
  "usedKnowledge": ["gen-01"],
  "needsHumanReview": false
}
\`\`\`
I hope this draft helps!
`;

  const generator = createTicketResponseGenerator({
    generateAITextFn: async () => noisyAIResponse,
    knowledgeBase: [
      {
        id: "gen-01",
        category: "GENERAL_INQUIRY",
        title: "General Inquiries",
        content: "Standard inquiry policy.",
      },
    ],
  });

  const result = await generator({
    subject: "Hello",
    description: "Question about book",
    category: "GENERAL_INQUIRY",
  });

  assert.ok(result.draft.includes("Dear Author"));
  assert.deepEqual(result.usedKnowledge, ["gen-01"]);
});

test("provider 5xx, network timeouts, and connection failures map to AI_PROVIDER_UNAVAILABLE", () => {
  const timeoutError = new Error("Fetch timeout: ETIMEDOUT connection dropped");
  timeoutError.status = 504;

  const normalized = normalizeAIError(timeoutError);
  assert.equal(normalized.statusCode, 503);
  assert.equal(normalized.code, AI_ERROR_CODES.PROVIDER_UNAVAILABLE);
  assert.equal(normalized.message, AI_ERROR_MESSAGES.PROVIDER_UNAVAILABLE);
  assert.equal(normalized.message.includes("ETIMEDOUT"), false);
});

test("missing or invalid API key maps to AI_CONFIGURATION_ERROR", () => {
  const configError = new Error("AI service is not configured: missing API key");
  const normalized = normalizeAIError(configError);

  assert.equal(normalized.statusCode, 503);
  assert.equal(normalized.code, AI_ERROR_CODES.CONFIGURATION_ERROR);
  assert.equal(normalized.message, AI_ERROR_MESSAGES.CONFIGURATION_ERROR);
});

test("unknown errors map to AI_GENERATION_FAILED without leaking provider payloads or stack traces", () => {
  const sensitiveError = new Error("Internal secret leaked: /var/secrets/key.pem [raw payload]");
  const normalized = normalizeAIError(sensitiveError);

  assert.equal(normalized.statusCode, 500);
  assert.equal(normalized.code, AI_ERROR_CODES.GENERATION_FAILED);
  assert.equal(normalized.message, AI_ERROR_MESSAGES.GENERATION_FAILED);
  assert.equal(normalized.message.includes("/var/secrets"), false);
  assert.equal(normalized.message.includes("key.pem"), false);
});

test("errorHandler middleware preserves ApiError code, message, and retryHint in JSON response", () => {
  const apiError = normalizeAIError({
    message: "429 RESOURCE_EXHAUSTED quota exceeded",
    status: 429,
    retryAfter: 42,
  });

  let responseStatus = null;
  let responseJson = null;

  const mockRes = {
    status(code) {
      responseStatus = code;
      return this;
    },
    json(body) {
      responseJson = body;
      return this;
    },
    headersSent: false,
  };

  errorHandler(apiError, {}, mockRes, () => {});

  assert.equal(responseStatus, 429);
  assert.equal(responseJson.success, false);
  assert.equal(responseJson.code, "AI_QUOTA_EXCEEDED");
  assert.equal(responseJson.message, AI_ERROR_MESSAGES.QUOTA_EXCEEDED);
  assert.equal(responseJson.retryHint, "Retry suggested in 42 seconds");
});

test("errorHandler middleware still masks unhandled non-ApiErrors as Internal server error", () => {
  const runtimeError = new TypeError("Cannot read properties of undefined (reading 'foo')");

  let responseStatus = null;
  let responseJson = null;

  const mockRes = {
    status(code) {
      responseStatus = code;
      return this;
    },
    json(body) {
      responseJson = body;
      return this;
    },
    headersSent: false,
  };

  // Mute console.error for expected test error log
  const originalError = console.error;
  console.error = () => {};

  try {
    errorHandler(runtimeError, {}, mockRes, () => {});

    assert.equal(responseStatus, 500);
    assert.equal(responseJson.success, false);
    assert.equal(responseJson.message, "Internal server error");
    assert.equal(responseJson.message.includes("reading 'foo'"), false);
  } finally {
    console.error = originalError;
  }
});

