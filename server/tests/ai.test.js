
import test from "node:test";
import assert from "node:assert/strict";
import { createAITextGenerator } from "../src/modules/ai/ai.service.js";

function createMockClient(implementation) {
  return {
    models: {
      generateContent: implementation,
    },
  };
}

test("AI generator returns trimmed text and supports JSON mode", async () => {
  let receivedParams;

  const client = createMockClient(async (params) => {
    receivedParams = params;
    return { text: "  Generated answer  " };
  });

  const generate = createAITextGenerator({
    client,
    modelName: "test-model",
  });

  const result = await generate("Test prompt", { jsonMode: true });

  assert.equal(result, "Generated answer");
  assert.equal(receivedParams.model, "test-model");
  assert.equal(receivedParams.contents, "Test prompt");
  assert.equal(
    receivedParams.config.responseMimeType,
    "application/json"
  );
});

test("AI generator retries a temporary 503 error and then succeeds", async () => {
  let calls = 0;
  const delays = [];

  const client = createMockClient(async () => {
    calls++;

    if (calls === 1) {
      const error = new Error("Service unavailable: 503");
      error.status = 503;
      throw error;
    }

    return { text: "Success after retry" };
  });

  const generate = createAITextGenerator({
    client,
    modelName: "test-model",
    sleepFn: async (ms) => delays.push(ms),
  });

  const result = await generate("Test prompt");

  assert.equal(result, "Success after retry");
  assert.equal(calls, 2);
  assert.deepEqual(delays, [1000]);
});

test("AI generator does not retry permanent 400 errors", async () => {
  let calls = 0;

  const client = createMockClient(async () => {
    calls++;
    const error = new Error("Invalid request: 400");
    error.status = 400;
    throw error;
  });

  const generate = createAITextGenerator({
    client,
    modelName: "test-model",
    sleepFn: async () => {
      assert.fail("Permanent errors should not be retried");
    },
  });

  await assert.rejects(generate("Test prompt"), /400/);
  assert.equal(calls, 1);
});

test("AI generator retries transient failures up to three attempts", async () => {
  let calls = 0;
  const delays = [];

  const client = createMockClient(async () => {
    calls++;
    const error = new Error("Service unavailable: 503");
    error.status = 503;
    throw error;
  });

  const generate = createAITextGenerator({
    client,
    modelName: "test-model",
    sleepFn: async (ms) => delays.push(ms),
  });

  await assert.rejects(generate("Test prompt"), /503/);

  assert.equal(calls, 3);
  assert.deepEqual(delays, [1000, 2000]);
});

test("AI generator rejects empty responses without retrying", async () => {
  let calls = 0;

  const client = createMockClient(async () => {
    calls++;
    return { text: "   " };
  });

  const generate = createAITextGenerator({
    client,
    modelName: "test-model",
    sleepFn: async () => {
      assert.fail("Empty responses should not be retried");
    },
  });

  await assert.rejects(
    generate("Test prompt"),
    /AI returned an empty response/
  );

  assert.equal(calls, 1);
});

test("AI generator reports missing client configuration", async () => {
  const generate = createAITextGenerator({
    client: null,
    modelName: "test-model",
  });

  await assert.rejects(
    generate("Test prompt"),
    /AI service is not configured/
  );
});
