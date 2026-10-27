
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";

import prisma from "../test-support/test-database.js";
import { sendTicketDraftAsReply } from "../src/modules/tickets/ticket.service.js";

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
