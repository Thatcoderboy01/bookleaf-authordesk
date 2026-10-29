
import test from "node:test";
import assert from "node:assert/strict";
import { supportKnowledgeBase } from "../src/modules/ai/knowledge-base.js";
import { createTicketResponseGenerator } from "../src/modules/ai/response-generation.service.js";
import { createTicketClassifier } from "../src/modules/ai/classification.service.js";

test("knowledge base contains verified BookLeaf policies matching assignment PDF", () => {
  const ids = supportKnowledgeBase.map((k) => k.id);
  assert.ok(ids.includes("royalty-payments"));
  assert.ok(ids.includes("isbn-metadata"));
  assert.ok(ids.includes("printing-quality"));
  assert.ok(ids.includes("distribution-availability"));
  assert.ok(ids.includes("book-status-production"));
  assert.ok(ids.includes("general-inquiry"));

  const royaltyEntry = supportKnowledgeBase.find((k) => k.id === "royalty-payments");
  assert.match(royaltyEntry.content, /80\/20 royalty split/);
  assert.match(royaltyEntry.content, /45 days/);
  assert.match(royaltyEntry.content, /₹1,000/);
  assert.match(royaltyEntry.content, /48-hour resolution timeline/);

  const isbnEntry = supportKnowledgeBase.find((k) => k.id === "isbn-metadata");
  assert.match(isbnEntry.content, /48-hour resolution timeline/);
  assert.match(isbnEntry.content, /3–5 business days/);

  const printingEntry = supportKnowledgeBase.find((k) => k.id === "printing-quality");
  assert.match(printingEntry.content, /5–7 business days/);
  assert.match(printingEntry.content, /free reprint/);

  const distributionEntry = supportKnowledgeBase.find((k) => k.id === "distribution-availability");
  assert.match(distributionEntry.content, /24–48 hours/);
  assert.match(distributionEntry.content, /7–10 business days/);

  const productionEntry = supportKnowledgeBase.find((k) => k.id === "book-status-production");
  assert.match(productionEntry.content, /Manuscript Received → Editing/);
});

test("generateTicketResponse includes verified author and book context in prompt", async () => {
  let promptReceived = "";

  const mockGenerateAIText = async (prompt) => {
    promptReceived = prompt;
    return JSON.stringify({
      draft: "Dear Priya, thank you for contacting BookLeaf support regarding your royalty status.",
      usedKnowledge: ["royalty-payments"],
      needsHumanReview: false,
    });
  };

  const generateResponse = createTicketResponseGenerator({
    generateAITextFn: mockGenerateAIText,
  });

  const ticket = {
    subject: "Royalty query for Whispers of the Ganges",
    description: "I haven't received my royalty payout for the previous quarter.",
    category: "ROYALTY_PAYMENTS",
    aiSuggestedCategory: "ROYALTY_PAYMENTS",
    priority: "HIGH",
    author: {
      name: "Priya Sharma",
    },
    book: {
      title: "Whispers of the Ganges",
      isbn: "978-93-5XXXX-01-1",
      status: "PUBLISHED_LIVE",
      publicationDate: new Date("2023-06-20T00:00:00.000Z"),
      totalCopiesSold: 342,
      totalRoyaltyEarned: 11970,
      royaltyPaid: 8400,
      royaltyPending: 3570,
    },
  };

  const result = await generateResponse(ticket);

  assert.equal(result.usedKnowledge[0], "royalty-payments");
  assert.equal(result.needsHumanReview, false);

  // Verify prompt contains verified facts and guidelines
  assert.match(promptReceived, /Priya Sharma/);
  assert.match(promptReceived, /Whispers of the Ganges/);
  assert.match(promptReceived, /978-93-5XXXX-01-1/);
  assert.match(promptReceived, /PUBLISHED_LIVE/);
  assert.match(promptReceived, /"royaltyPending": 3570/);
  assert.match(promptReceived, /COMMUNICATION TONE GUIDELINES/);
  assert.match(promptReceived, /STRICT CONTEXT SEPARATION RULES/);
});

test("generateTicketResponse handles tickets without a linked book gracefully", async () => {
  let promptReceived = "";

  const mockGenerateAIText = async (prompt) => {
    promptReceived = prompt;
    return JSON.stringify({
      draft: "Hello Rohit, thank you for reaching out with your general inquiry about publishing packages.",
      usedKnowledge: ["general-inquiry"],
      needsHumanReview: false,
    });
  };

  const generateResponse = createTicketResponseGenerator({
    generateAITextFn: mockGenerateAIText,
  });

  const ticket = {
    subject: "Question about publishing packages",
    description: "Can you explain the difference between Standard Free and Bestseller packages?",
    category: "GENERAL_INQUIRY",
    aiSuggestedCategory: "GENERAL_INQUIRY",
    priority: "LOW",
    author: {
      name: "Rohit Kapoor",
    },
    book: null,
  };

  const result = await generateResponse(ticket);

  assert.equal(result.usedKnowledge[0], "general-inquiry");
  assert.match(promptReceived, /Rohit Kapoor/);
  assert.match(
    promptReceived,
    /General \/ Account Level query - no specific book linked/
  );
});

test("generateTicketResponse rejects response referencing unapproved knowledge IDs", async () => {
  const mockGenerateAIText = async () => {
    return JSON.stringify({
      draft: "Here is an ungrounded response.",
      usedKnowledge: ["non-existent-policy-id"],
      needsHumanReview: true,
    });
  };

  const generateResponse = createTicketResponseGenerator({
    generateAITextFn: mockGenerateAIText,
  });

  const ticket = {
    subject: "Test subject",
    description: "Test description",
    category: "PRINTING_QUALITY",
    aiSuggestedCategory: "PRINTING_QUALITY",
    priority: "MEDIUM",
  };

  await assert.rejects(
    generateResponse(ticket),
    /AI referenced an unknown knowledge-base entry/
  );
});

test("classifyTicket sends PDF-calibrated guidelines and parses valid output", async () => {
  let promptReceived = "";

  const mockGenerateAIText = async (prompt) => {
    promptReceived = prompt;
    return JSON.stringify({
      category: "ISBN_METADATA_ISSUES",
      priority: "HIGH",
      reasoning: "Mismatched ISBN between physical book and retail channel is a high priority data error.",
    });
  };

  const classifier = createTicketClassifier({
    generateAITextFn: mockGenerateAIText,
  });

  const result = await classifier({
    subject: "ISBN mismatch on Amazon",
    description: "My physical book shows ISBN 978-93-50001, but Amazon lists 978-93-50009.",
  });

  assert.equal(result.category, "ISBN_METADATA_ISSUES");
  assert.equal(result.priority, "HIGH");
  assert.match(promptReceived, /ROYALTY_PAYMENTS/);
  assert.match(promptReceived, /ISBN_METADATA_ISSUES/);
  assert.match(promptReceived, /PRINTING_QUALITY/);
  assert.match(promptReceived, /DISTRIBUTION_AVAILABILITY/);
  assert.match(promptReceived, /BOOK_STATUS_PRODUCTION/);
  assert.match(promptReceived, /GENERAL_INQUIRY/);
});

