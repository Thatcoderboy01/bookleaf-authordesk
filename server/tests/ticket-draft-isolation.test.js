import test from "node:test";
import assert from "node:assert/strict";
import { getTicketById, sendTicketDraftAsReply } from "../src/modules/tickets/ticket.service.js";
import prisma from "../src/config/database.js";

test("sendTicketDraftAsReply rejects author role with 403", async () => {
  const authorUser = { id: "author-1", role: "AUTHOR" };
  await assert.rejects(
    sendTicketDraftAsReply("ticket-1", authorUser),
    (err) => err.statusCode === 403 && err.message.includes("Only admins")
  );
});

test("sendTicketDraftAsReply rejects when ticket is not found", async () => {
  const adminUser = { id: "admin-1", role: "ADMIN" };
  const originalFindUnique = prisma.ticket.findUnique;

  prisma.ticket.findUnique = async () => null;

  try {
    await assert.rejects(
      sendTicketDraftAsReply("nonexistent-ticket", adminUser),
      (err) => err.statusCode === 404 && err.message === "Ticket not found"
    );
  } finally {
    prisma.ticket.findUnique = originalFindUnique;
  }
});

test("sendTicketDraftAsReply rejects when no AI draft exists on ticket", async () => {
  const adminUser = { id: "admin-1", role: "ADMIN" };
  const originalFindUnique = prisma.ticket.findUnique;

  prisma.ticket.findUnique = async () => ({
    id: "ticket-1",
    aiDraftResponse: "   ",
    aiDraftId: null,
  });

  try {
    await assert.rejects(
      sendTicketDraftAsReply("ticket-1", adminUser),
      (err) => err.statusCode === 400 && err.message.includes("No AI draft available")
    );
  } finally {
    prisma.ticket.findUnique = originalFindUnique;
  }
});

test("sendTicketDraftAsReply uses a transaction to create reply and clear draft", async () => {
  const adminUser = { id: "admin-1", role: "ADMIN" };
  const originalFindUnique = prisma.ticket.findUnique;
  const originalFindFirst = prisma.ticket.findFirst;
  const originalTransaction = prisma.$transaction;
  const originalReplyCreate = prisma.ticketReply.create;
  const originalTicketUpdate = prisma.ticket.update;

  let transactionCalls = [];

  prisma.ticket.findUnique = async () => ({
    id: "ticket-100",
    aiDraftResponse: "Test draft response for author query",
    aiDraftId: "draft-uuid-100",
  });

  prisma.ticket.findFirst = async () => ({
    id: "ticket-100",
  });

  prisma.ticketReply.create = (args) => ({ type: "reply.create", args });
  prisma.ticket.update = (args) => ({ type: "ticket.update", args });

  prisma.$transaction = async (operations) => {
    transactionCalls = operations;
    return [
      {
        id: "reply-1",
        ticketId: "ticket-100",
        senderId: adminUser.id,
        senderType: "ADMIN",
        message: "Test draft response for author query",
        createdAt: new Date(),
      },
      { id: "ticket-100" },
    ];
  };

  try {
    const result = await sendTicketDraftAsReply("ticket-100", adminUser);

    assert.equal(result.id, "reply-1");
    assert.equal(result.message, "Test draft response for author query");

    // Verify operations passed to $transaction
    assert.equal(transactionCalls.length, 2, "transaction must contain exactly 2 operations");

    const replyCreateOp = transactionCalls[0];
    assert.equal(replyCreateOp.type, "reply.create");
    assert.equal(replyCreateOp.args.data.ticketId, "ticket-100");
    assert.equal(replyCreateOp.args.data.senderId, adminUser.id);
    assert.equal(replyCreateOp.args.data.aiDraftId, "draft-uuid-100");

    const ticketUpdateOp = transactionCalls[1];
    assert.equal(ticketUpdateOp.type, "ticket.update");
    assert.equal(ticketUpdateOp.args.where.id, "ticket-100");
    assert.deepEqual(ticketUpdateOp.args.data, {
      aiDraftResponse: null,
      aiDraftId: null,
      aiDraftGeneratedAt: null,
      aiDraftEdited: false,
    });
  } finally {
    prisma.ticket.findUnique = originalFindUnique;
    prisma.ticket.findFirst = originalFindFirst;
    prisma.$transaction = originalTransaction;
    prisma.ticketReply.create = originalReplyCreate;
    prisma.ticket.update = originalTicketUpdate;
  }
});

test("sendTicketDraftAsReply preserves draft if transaction fails", async () => {
  const adminUser = { id: "admin-1", role: "ADMIN" };
  const originalFindUnique = prisma.ticket.findUnique;
  const originalFindFirst = prisma.ticket.findFirst;
  const originalTransaction = prisma.$transaction;
  const originalReplyCreate = prisma.ticketReply.create;
  const originalTicketUpdate = prisma.ticket.update;

  prisma.ticket.findUnique = async () => ({
    id: "ticket-200",
    aiDraftResponse: "Preserved draft text",
    aiDraftId: "draft-200",
  });

  prisma.ticket.findFirst = async () => ({
    id: "ticket-200",
  });

  prisma.ticketReply.create = (args) => args;
  prisma.ticket.update = (args) => args;

  prisma.$transaction = async () => {
    throw new Error("Simulated database failure during transaction");
  };

  try {
    await assert.rejects(
      sendTicketDraftAsReply("ticket-200", adminUser),
      (err) => err.message === "Simulated database failure during transaction"
    );
  } finally {
    prisma.ticket.findUnique = originalFindUnique;
    prisma.ticket.findFirst = originalFindFirst;
    prisma.$transaction = originalTransaction;
    prisma.ticketReply.create = originalReplyCreate;
    prisma.ticket.update = originalTicketUpdate;
  }
});

test("getTicketById requests draft fields for admins and omits them for authors", async () => {
  const adminUser = { id: "admin-1", role: "ADMIN" };
  const authorUser = { id: "author-1", role: "AUTHOR" };
  const originalFindUnique = prisma.ticket.findUnique;

  let selectedFieldsAdmin;
  let selectedFieldsAuthor;

  prisma.ticket.findUnique = async (query) => {
    if (!selectedFieldsAdmin) {
      selectedFieldsAdmin = query.select;
      return {
        id: "ticket-1",
        subject: "Subject",
        description: "Desc",
        status: "OPEN",
        category: "GENERAL_INQUIRY",
        priority: "MEDIUM",
        authorId: "author-1",
        aiDraftResponse: "Saved draft",
        aiDraftId: "draft-1",
        aiDraftGeneratedAt: new Date(),
        aiDraftEdited: true,
      };
    }

    selectedFieldsAuthor = query.select;
    return {
      id: "ticket-1",
      subject: "Subject",
      description: "Desc",
      status: "OPEN",
      category: "GENERAL_INQUIRY",
      priority: "MEDIUM",
      authorId: "author-1",
    };
  };

  try {
    const adminResult = await getTicketById("ticket-1", adminUser);
    assert.equal(selectedFieldsAdmin.aiDraftResponse, true);
    assert.equal(selectedFieldsAdmin.aiDraftId, true);
    assert.equal(selectedFieldsAdmin.aiDraftGeneratedAt, true);
    assert.equal(selectedFieldsAdmin.aiDraftEdited, true);
    assert.equal(adminResult.aiDraftResponse, "Saved draft");

    const authorResult = await getTicketById("ticket-1", authorUser);
    assert.equal("aiDraftResponse" in selectedFieldsAuthor, false);
    assert.equal("aiDraftId" in selectedFieldsAuthor, false);
    assert.equal("aiDraftGeneratedAt" in selectedFieldsAuthor, false);
    assert.equal("aiDraftEdited" in selectedFieldsAuthor, false);
    assert.equal("aiDraftResponse" in authorResult, false);
  } finally {
    prisma.ticket.findUnique = originalFindUnique;
  }
});

