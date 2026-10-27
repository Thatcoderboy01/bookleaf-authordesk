import "dotenv/config";
import { randomUUID } from "node:crypto";
import http from "node:http";
import jwt from "jsonwebtoken";
import { test } from "node:test";
import assert from "node:assert/strict";

import app from "../src/app.js";
import prisma from "../test-support/test-database.js";

function createToken(user) {
  return jwt.sign(
    { role: user.role },
    process.env.JWT_SECRET,
    {
      subject: user.id,
      expiresIn: "5m",
    }
  );
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${port}`,
      });
    });
  });
}

test("self-assignment route rejects unauthenticated and author requests", async () => {
  const suffix = randomUUID();
  let author;
  let ticket;
  let server;

  try {
    author = await prisma.user.create({
      data: {
        name: `Route Author ${suffix}`,
        email: `route-author-${suffix}@example.test`,
        passwordHash: "test-only-not-a-real-password",
        role: "AUTHOR",
      },
    });

    ticket = await prisma.ticket.create({
      data: {
        subject: "Assignment route test",
        description: "Testing assignment route authorization",
        authorId: author.id,
      },
    });

    server = await startServer();

    const unauthenticatedResponse = await fetch(
      `${server.url}/api/tickets/${ticket.id}/assign-to-me`,
      { method: "POST" }
    );
    assert.equal(unauthenticatedResponse.status, 401);

    const authorResponse = await fetch(
      `${server.url}/api/tickets/${ticket.id}/assign-to-me`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${createToken(author)}`,
        },
      }
    );
    assert.equal(authorResponse.status, 403);
  } finally {
    let cleanupError;

    if (server) {
      try {
        await new Promise((resolve, reject) => {
          server.server.close((error) => (error ? reject(error) : resolve()));
        });
      } catch (error) {
        cleanupError = error;
      }
    }

    try {
      if (ticket) await prisma.ticket.delete({ where: { id: ticket.id } });
    } catch (error) {
      cleanupError ||= error;
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
});
