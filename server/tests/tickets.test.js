
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";

import prisma from "../test-support/test-database.js";
import {
  assignTicketToSelf,
  getTicketById,
  getTickets,
  sendTicketDraftAsReply,
  updateTicket,
} from "../src/modules/tickets/ticket.service.js";

test("the same AI draft cannot be sent twice concurrently", async () => {
  const suffix = randomUUID();
  let admin;
  let author;
  let ticket;

  try {
    admin = await prisma.user.create({
      data: {
        name: `Test Admin ${suffix}`,
        email: `admin-${suffix}@example.test`,
        passwordHash: "test-only-not-a-real-password",
        role: "ADMIN",
      },
    });

    author = await prisma.user.create({
      data: {
        name: `Test Author ${suffix}`,
        email: `author-${suffix}@example.test`,
        passwordHash: "test-only-not-a-real-password",
        role: "AUTHOR",
      },
    });

    ticket = await prisma.ticket.create({
      data: {
        subject: "Concurrent draft send test",
        description: "Temporary automated test ticket",
        authorId: author.id,
        aiDraftResponse: "Temporary AI draft for concurrency testing",
        aiDraftId: randomUUID(),
      },
    });

    const outcomes = await Promise.allSettled([
      sendTicketDraftAsReply(ticket.id, admin),
      sendTicketDraftAsReply(ticket.id, admin),
    ]);

    const successes = outcomes.filter(
      (result) => result.status === "fulfilled"
    );
    const failures = outcomes.filter(
      (result) => result.status === "rejected"
    );

    assert.equal(successes.length, 1, "exactly one send should succeed");
    assert.equal(failures.length, 1, "exactly one send should fail");

    const error = failures[0].reason;
    assert.equal(error.statusCode, 409);

    const replies = await prisma.ticketReply.findMany({
      where: { ticketId: ticket.id },
    });

    assert.equal(replies.length, 1, "only one reply should be stored");
    assert.equal(replies[0].aiDraftId, ticket.aiDraftId);

    const refreshedTicket = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      select: {
        aiDraftResponse: true,
        aiDraftId: true,
        aiDraftGeneratedAt: true,
        aiDraftEdited: true,
      },
    });
    assert.equal(
      refreshedTicket.aiDraftResponse,
      null,
      "persisted draft text should be cleared after send"
    );
    assert.equal(
      refreshedTicket.aiDraftId,
      null,
      "persisted draft id should be cleared after send"
    );
    assert.equal(
      refreshedTicket.aiDraftGeneratedAt,
      null,
      "persisted draft timestamp should be cleared after send"
    );
    assert.equal(
      refreshedTicket.aiDraftEdited,
      false,
      "draft edited flag should reset after send"
    );
  } finally {
    if (ticket) {
      await prisma.ticketReply.deleteMany({
        where: { ticketId: ticket.id },
      });
      await prisma.ticketInternalNote.deleteMany({
        where: { ticketId: ticket.id },
      });
      await prisma.ticket.deleteMany({
        where: { id: ticket.id },
      });
    }

    if (admin) {
      await prisma.user.deleteMany({ where: { id: admin.id } });
    }

    if (author) {
      await prisma.user.deleteMany({ where: { id: author.id } });
    }
  }
});

test.after(async () => {
  await prisma.$disconnect();
});

test("admin can assign a ticket to themselves and authors cannot", async () => {
  const suffix = randomUUID();
  let admin;
  let author;
  let ticket;

  try {
    admin = await prisma.user.create({
      data: {
        name: `Assignment Admin ${suffix}`,
        email: `assignment-admin-${suffix}@example.test`,
        passwordHash: "test-only-not-a-real-password",
        role: "ADMIN",
      },
    });
    author = await prisma.user.create({
      data: {
        name: `Assignment Author ${suffix}`,
        email: `assignment-author-${suffix}@example.test`,
        passwordHash: "test-only-not-a-real-password",
        role: "AUTHOR",
      },
    });
    ticket = await prisma.ticket.create({
      data: {
        subject: "Assignment test ticket",
        description: "Testing admin self assignment",
        authorId: author.id,
      },
    });

    const assigned = await assignTicketToSelf(ticket.id, admin);
    assert.equal(assigned.assignedToId, admin.id);
    await assert.rejects(
      assignTicketToSelf(ticket.id, author),
      (error) => error.statusCode === 403
    );
  } finally {
    if (ticket) await prisma.ticket.delete({ where: { id: ticket.id } });
    if (admin) await prisma.user.delete({ where: { id: admin.id } });
    if (author) await prisma.user.delete({ where: { id: author.id } });
  }
});

test("admin responses expose saved classification while author responses do not", async () => {
  const suffix = randomUUID();
  let admin;
  let author;
  let ticket;

  try {
    admin = await prisma.user.create({
      data: {
        name: `Classification Admin ${suffix}`,
        email: `classification-admin-${suffix}@example.test`,
        passwordHash: "test-only-not-a-real-password",
        role: "ADMIN",
      },
    });
    author = await prisma.user.create({
      data: {
        name: `Classification Author ${suffix}`,
        email: `classification-author-${suffix}@example.test`,
        passwordHash: "test-only-not-a-real-password",
        role: "AUTHOR",
      },
    });
    ticket = await prisma.ticket.create({
      data: {
        subject: "Classification persistence test",
        description: "Testing saved AI classification fields",
        authorId: author.id,
        aiSuggestedCategory: "ROYALTY_PAYMENTS",
        aiSuggestedPriority: "HIGH",
        aiClassificationNote: "Payment language indicates a royalty enquiry.",
        aiDraftResponse: "Saved draft response for admin review",
        aiDraftId: `draft-${suffix}`,
      },
    });

    const adminTicket = await getTicketById(ticket.id, admin);
    assert.equal(adminTicket.aiSuggestedCategory, "ROYALTY_PAYMENTS");
    assert.equal(adminTicket.aiSuggestedPriority, "HIGH");
    assert.equal(
      adminTicket.aiClassificationNote,
      "Payment language indicates a royalty enquiry."
    );
    assert.equal(
      adminTicket.aiDraftResponse,
      "Saved draft response for admin review"
    );
    assert.equal(adminTicket.aiDraftId, `draft-${suffix}`);

    const authorTicket = await getTicketById(ticket.id, author);
    assert.equal("aiSuggestedCategory" in authorTicket, false);
    assert.equal("aiSuggestedPriority" in authorTicket, false);
    assert.equal("aiClassificationNote" in authorTicket, false);
    assert.equal("aiDraftResponse" in authorTicket, false);
    assert.equal("aiDraftId" in authorTicket, false);
    assert.equal("aiDraftGeneratedAt" in authorTicket, false);
    assert.equal("aiDraftEdited" in authorTicket, false);

    const adminList = await getTickets(admin, { page: 1, limit: 100 });
    const listedTicket = adminList.tickets.find((item) => item.id === ticket.id);
    assert.equal(listedTicket.aiSuggestedCategory, "ROYALTY_PAYMENTS");
    assert.equal(listedTicket.aiSuggestedPriority, "HIGH");

    const updated = await updateTicket(ticket.id, {
      category: "GENERAL_INQUIRY",
      priority: "LOW",
    });
    assert.equal(updated.category, "GENERAL_INQUIRY");
    assert.equal(updated.priority, "LOW");

    const persisted = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      select: {
        category: true,
        priority: true,
        aiSuggestedCategory: true,
        aiSuggestedPriority: true,
      },
    });
    assert.deepEqual(persisted, {
      category: "GENERAL_INQUIRY",
      priority: "LOW",
      aiSuggestedCategory: "ROYALTY_PAYMENTS",
      aiSuggestedPriority: "HIGH",
    });
  } finally {
    if (ticket) await prisma.ticket.delete({ where: { id: ticket.id } });
    if (admin) await prisma.user.delete({ where: { id: admin.id } });
    if (author) await prisma.user.delete({ where: { id: author.id } });
  }
});
