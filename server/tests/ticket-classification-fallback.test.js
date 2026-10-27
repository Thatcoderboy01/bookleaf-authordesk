import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { test } from "node:test";
import assert from "node:assert/strict";

const execFileAsync = promisify(execFile);

const fallbackTestScript = `
  import { randomUUID } from "node:crypto";
  import assert from "node:assert/strict";
  import prisma from "./test-support/test-database.js";
  import { createTicket } from "./src/modules/tickets/ticket.service.js";

  const suffix = randomUUID();
  let author;
  let ticket;

  try {
    author = await prisma.user.create({
      data: {
        name: \`Fallback Author \${suffix}\`,
        email: \`fallback-author-\${suffix}@example.test\`,
        passwordHash: "test-only-not-a-real-password",
        role: "AUTHOR",
      },
    });

    ticket = await createTicket(author, {
      subject: "AI fallback test ticket",
      description: "Ticket creation must survive unavailable AI.",
      bookId: null,
    });

    const persisted = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      select: {
        category: true,
        priority: true,
        aiSuggestedCategory: true,
        aiSuggestedPriority: true,
        aiClassificationNote: true,
      },
    });

    assert.equal(persisted.category, "GENERAL_INQUIRY");
    assert.equal(persisted.priority, "MEDIUM");
    assert.equal(persisted.aiSuggestedCategory, null);
    assert.equal(persisted.aiSuggestedPriority, null);
    assert.equal(persisted.aiClassificationNote, null);
  } finally {
    let cleanupError;

    try {
      if (ticket) await prisma.ticket.delete({ where: { id: ticket.id } });
    } catch (error) {
      cleanupError = error;
    }

    try {
      if (author) await prisma.user.delete({ where: { id: author.id } });
    } catch (error) {
      cleanupError ||= error;
    }

    try {
      await prisma.$disconnect();
    } catch (error) {
      cleanupError ||= error;
    }

    if (cleanupError) throw cleanupError;
  }
`;

test("ticket creation succeeds without AI classification", async () => {
  try {
    await execFileAsync(
      process.execPath,
      ["--input-type=module", "--eval", fallbackTestScript],
      {
        cwd: new URL("..", import.meta.url),
        env: {
          ...process.env,
          GEMINI_API_KEY: "",
        },
        maxBuffer: 1024 * 1024,
      }
    );
  } catch (error) {
    const output = [error.stdout, error.stderr].filter(Boolean).join("\n");
    assert.fail(`Fallback child process failed:\n${output || error.message}`);
  }
});
