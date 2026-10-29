import test from "node:test";
import assert from "node:assert/strict";
import { getTickets, getTicketById } from "../src/modules/tickets/ticket.service.js";
import prisma from "../src/config/database.js";

test("getTickets projects safe author metadata (id, name, email) and book summary (id, title)", async () => {
  const adminUser = { id: "admin-1", role: "ADMIN" };
  const originalTransaction = prisma.$transaction;

  let findManyArgs = null;

  prisma.$transaction = async (queries) => {
    // queries is an array: [findManyPromise, countPromise] or promises
    // In our implementation: prisma.$transaction([prisma.ticket.findMany(...), prisma.ticket.count(...)])
    return [
      [
        {
          id: "ticket-1",
          subject: "Royalty clarification",
          status: "OPEN",
          category: "ROYALTY_PAYMENTS",
          priority: "HIGH",
          authorId: "author-1",
          bookId: "book-1",
          author: { id: "author-1", name: "Aarav Sharma", email: "aarav@example.com" },
          book: { id: "book-1", title: "Wings of Silence" },
        },
      ],
      1,
    ];
  };

  const originalFindMany = prisma.ticket.findMany;
  const originalCount = prisma.ticket.count;

  prisma.ticket.findMany = (args) => {
    findManyArgs = args;
    return Promise.resolve([]);
  };
  prisma.ticket.count = () => Promise.resolve(1);

  try {
    const result = await getTickets(adminUser, { page: 1, limit: 10 });

    assert.ok(findManyArgs, "findMany should be called");
    assert.deepEqual(findManyArgs.select.author, {
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
    assert.deepEqual(findManyArgs.select.book, {
      select: {
        id: true,
        title: true,
      },
    });

    // Verify sensitive fields are not selected
    assert.equal("passwordHash" in findManyArgs.select.author.select, false);
    assert.equal("password" in findManyArgs.select.author.select, false);

    assert.equal(result.tickets.length, 1);
    assert.equal(result.tickets[0].author.name, "Aarav Sharma");
    assert.equal(result.tickets[0].book.title, "Wings of Silence");
  } finally {
    prisma.$transaction = originalTransaction;
    prisma.ticket.findMany = originalFindMany;
    prisma.ticket.count = originalCount;
  }
});

test("getTicketById projects author contact details (phone, city) and book details for admins", async () => {
  const adminUser = { id: "admin-1", role: "ADMIN" };
  const originalFindUnique = prisma.ticket.findUnique;

  let capturedQuery = null;

  prisma.ticket.findUnique = async (query) => {
    capturedQuery = query;
    return {
      id: "ticket-10",
      subject: "ISBN registration question",
      description: "When will my ISBN be assigned?",
      status: "OPEN",
      category: "ISBN_METADATA_ISSUES",
      priority: "MEDIUM",
      authorId: "author-1",
      bookId: "book-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      author: {
        id: "author-1",
        name: "Devika Roy",
        email: "devika@example.com",
        phone: "+91 98765 43210",
        city: "Kolkata",
      },
      book: {
        id: "book-1",
        title: "Echoes of the Valley",
        isbn: "978-93-12345-67-8",
        status: "ISBN_ASSIGNMENT",
        publicationDate: null,
      },
    };
  };

  try {
    const ticket = await getTicketById("ticket-10", adminUser);

    assert.ok(capturedQuery, "findUnique should be called with query");
    assert.equal(capturedQuery.select.author.select.id, true);
    assert.equal(capturedQuery.select.author.select.name, true);
    assert.equal(capturedQuery.select.author.select.email, true);
    assert.equal(capturedQuery.select.author.select.phone, true);
    assert.equal(capturedQuery.select.author.select.city, true);
    assert.equal("passwordHash" in capturedQuery.select.author.select, false);

    assert.equal(capturedQuery.select.book.select.id, true);
    assert.equal(capturedQuery.select.book.select.title, true);
    assert.equal(capturedQuery.select.book.select.isbn, true);
    assert.equal(capturedQuery.select.book.select.status, true);
    assert.equal(capturedQuery.select.book.select.publicationDate, true);

    assert.equal(ticket.author.name, "Devika Roy");
    assert.equal(ticket.author.phone, "+91 98765 43210");
    assert.equal(ticket.book.title, "Echoes of the Valley");
    assert.equal(ticket.book.isbn, "978-93-12345-67-8");
  } finally {
    prisma.ticket.findUnique = originalFindUnique;
  }
});

test("getTicketById omits phone/city from author projections when queried by an author", async () => {
  const authorUser = { id: "author-1", role: "AUTHOR" };
  const originalFindUnique = prisma.ticket.findUnique;

  let capturedQuery = null;

  prisma.ticket.findUnique = async (query) => {
    capturedQuery = query;
    return {
      id: "ticket-10",
      subject: "ISBN registration question",
      description: "When will my ISBN be assigned?",
      status: "OPEN",
      category: "ISBN_METADATA_ISSUES",
      priority: "MEDIUM",
      authorId: "author-1",
      bookId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: {
        id: "author-1",
        name: "Devika Roy",
        email: "devika@example.com",
      },
      book: null,
    };
  };

  try {
    const ticket = await getTicketById("ticket-10", authorUser);

    assert.ok(capturedQuery, "findUnique should be called with query");
    assert.equal(capturedQuery.select.author.select.id, true);
    assert.equal(capturedQuery.select.author.select.name, true);
    assert.equal(capturedQuery.select.author.select.email, true);
    assert.equal("phone" in capturedQuery.select.author.select, false);
    assert.equal("city" in capturedQuery.select.author.select, false);
    assert.equal("passwordHash" in capturedQuery.select.author.select, false);

    assert.equal(ticket.author.name, "Devika Roy");
    assert.equal(ticket.book, null);
  } finally {
    prisma.ticket.findUnique = originalFindUnique;
  }
});

test("getTicketById enforces author isolation and rejects unauthorized author access", async () => {
  const otherAuthor = { id: "author-999", role: "AUTHOR" };
  const originalFindUnique = prisma.ticket.findUnique;

  prisma.ticket.findUnique = async () => ({
    id: "ticket-10",
    subject: "Private Query",
    description: "Confidential matter",
    status: "OPEN",
    category: "GENERAL_INQUIRY",
    priority: "LOW",
    authorId: "author-1",
    bookId: null,
    author: {
      id: "author-1",
      name: "Author One",
      email: "author1@example.com",
    },
    book: null,
  });

  try {
    await assert.rejects(
      getTicketById("ticket-10", otherAuthor),
      (err) => err.statusCode === 404 && err.message === "Ticket not found"
    );
  } finally {
    prisma.ticket.findUnique = originalFindUnique;
  }
});

test("getTicketById handles tickets without a linked book gracefully", async () => {
  const adminUser = { id: "admin-1", role: "ADMIN" };
  const originalFindUnique = prisma.ticket.findUnique;

  prisma.ticket.findUnique = async () => ({
    id: "ticket-20",
    subject: "Account password change assistance",
    description: "Need help updating email address.",
    status: "OPEN",
    category: "GENERAL_INQUIRY",
    priority: "LOW",
    authorId: "author-1",
    bookId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: {
      id: "author-1",
      name: "Rohan Varma",
      email: "rohan@example.com",
      phone: null,
      city: "Mumbai",
    },
    book: null,
  });

  try {
    const ticket = await getTicketById("ticket-20", adminUser);
    assert.equal(ticket.id, "ticket-20");
    assert.equal(ticket.bookId, null);
    assert.equal(ticket.book, null);
    assert.equal(ticket.author.name, "Rohan Varma");
  } finally {
    prisma.ticket.findUnique = originalFindUnique;
  }
});

