import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  sampleRoyaltyRecords,
  sampleTickets,
  sampleReplies,
  sampleInternalNotes,
} from "../prisma/seed-data.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const datasetPath = path.join(
  currentDirectory,
  "../prisma/bookleaf_sample_data.json"
);

// Schema-defined enum sets
const VALID_TICKET_STATUSES = new Set(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]);
const VALID_TICKET_PRIORITIES = new Set(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
const VALID_TICKET_CATEGORIES = new Set([
  "ROYALTY_PAYMENTS",
  "ISBN_METADATA_ISSUES",
  "PRINTING_QUALITY",
  "DISTRIBUTION_AVAILABILITY",
  "BOOK_STATUS_PRODUCTION",
  "GENERAL_INQUIRY",
]);
const VALID_REPLY_SENDER_TYPES = new Set(["AUTHOR", "ADMIN"]);
const VALID_PAYOUT_STATUSES = new Set(["PENDING", "PARTIALLY_PAID", "PAID"]);

async function loadDataset() {
  const raw = await readFile(datasetPath, "utf8");
  return JSON.parse(raw);
}

test("seed dataset integrity: authors and books in sample data match expectations", async () => {
  const dataset = await loadDataset();
  assert.equal(dataset.authors.length, 10);
  const totalBooks = dataset.authors.reduce((sum, a) => sum + a.books.length, 0);
  assert.equal(totalBooks, 18);
});

test("sampleTickets: all tickets reference valid authors and books with valid enum values", async () => {
  const dataset = await loadDataset();
  const authorMap = new Map(dataset.authors.map((a) => [a.author_id, a]));
  const bookMap = new Map();
  for (const author of dataset.authors) {
    for (const book of author.books) {
      bookMap.set(book.book_id, { ...book, author_id: author.author_id });
    }
  }

  assert.ok(sampleTickets.length >= 6, "Expected at least 6 sample tickets");

  const statusesSeen = new Set();
  const prioritiesSeen = new Set();
  const categoriesSeen = new Set();
  const ticketIdsSeen = new Set();

  for (const ticket of sampleTickets) {
    // Unique deterministic ID
    assert.ok(ticket.id, "Ticket must have an id");
    assert.ok(!ticketIdsSeen.has(ticket.id), `Duplicate ticket id: ${ticket.id}`);
    ticketIdsSeen.add(ticket.id);

    // Valid author
    assert.ok(authorMap.has(ticket.authorId), `Unknown authorId: ${ticket.authorId}`);

    // If book is referenced, it must exist and belong to the author
    if (ticket.bookId) {
      assert.ok(bookMap.has(ticket.bookId), `Unknown bookId: ${ticket.bookId}`);
      const book = bookMap.get(ticket.bookId);
      assert.equal(
        book.author_id,
        ticket.authorId,
        `Book ${ticket.bookId} does not belong to author ${ticket.authorId}`
      );
    }

    // Valid enums
    assert.ok(VALID_TICKET_STATUSES.has(ticket.status), `Invalid status: ${ticket.status}`);
    assert.ok(VALID_TICKET_PRIORITIES.has(ticket.priority), `Invalid priority: ${ticket.priority}`);
    assert.ok(VALID_TICKET_CATEGORIES.has(ticket.category), `Invalid category: ${ticket.category}`);

    if (ticket.aiSuggestedCategory) {
      assert.ok(
        VALID_TICKET_CATEGORIES.has(ticket.aiSuggestedCategory),
        `Invalid aiSuggestedCategory: ${ticket.aiSuggestedCategory}`
      );
    }
    if (ticket.aiSuggestedPriority) {
      assert.ok(
        VALID_TICKET_PRIORITIES.has(ticket.aiSuggestedPriority),
        `Invalid aiSuggestedPriority: ${ticket.aiSuggestedPriority}`
      );
    }

    statusesSeen.add(ticket.status);
    prioritiesSeen.add(ticket.priority);
    categoriesSeen.add(ticket.category);
  }

  // Confirm broad schema coverage
  assert.equal(statusesSeen.size, 4, "Must cover all 4 ticket statuses (OPEN, IN_PROGRESS, RESOLVED, CLOSED)");
  assert.equal(prioritiesSeen.size, 4, "Must cover all 4 ticket priorities (CRITICAL, HIGH, MEDIUM, LOW)");
  assert.equal(categoriesSeen.size, 6, "Must cover all 6 ticket categories");
});

test("sampleReplies and sampleInternalNotes: relations and sender types are valid", () => {
  const ticketIdSet = new Set(sampleTickets.map((t) => t.id));
  const replyIdSet = new Set();
  const noteIdSet = new Set();

  for (const reply of sampleReplies) {
    assert.ok(!replyIdSet.has(reply.id), `Duplicate reply id: ${reply.id}`);
    replyIdSet.add(reply.id);

    assert.ok(ticketIdSet.has(reply.ticketId), `Reply references unknown ticketId: ${reply.ticketId}`);
    assert.ok(VALID_REPLY_SENDER_TYPES.has(reply.senderType), `Invalid senderType: ${reply.senderType}`);
    assert.ok(reply.senderId, "Reply must have senderId");
    assert.ok(reply.message.length > 0, "Reply must have message");
  }

  for (const note of sampleInternalNotes) {
    assert.ok(!noteIdSet.has(note.id), `Duplicate note id: ${note.id}`);
    noteIdSet.add(note.id);

    assert.ok(ticketIdSet.has(note.ticketId), `Note references unknown ticketId: ${note.ticketId}`);
    assert.equal(note.authorId, "ADMIN001", "Internal notes must be authored by admin");
    assert.ok(note.note.length > 0, "Note must have content");
  }
});

test("sampleRoyaltyRecords: statements match book totals without double-counting", async () => {
  const dataset = await loadDataset();
  const bookMap = new Map();
  for (const author of dataset.authors) {
    for (const book of author.books) {
      bookMap.set(book.book_id, book);
    }
  }

  const recordIdSet = new Set();
  const bookStatementSums = new Map();

  for (const record of sampleRoyaltyRecords) {
    assert.ok(!recordIdSet.has(record.id), `Duplicate royalty id: ${record.id}`);
    recordIdSet.add(record.id);

    assert.ok(bookMap.has(record.bookId), `Royalty references unknown bookId: ${record.bookId}`);
    assert.ok(VALID_PAYOUT_STATUSES.has(record.payoutStatus), `Invalid payoutStatus: ${record.payoutStatus}`);
    assert.ok(record.periodStart instanceof Date, "periodStart must be Date");
    assert.ok(record.periodEnd instanceof Date, "periodEnd must be Date");
    assert.ok(record.periodEnd > record.periodStart, "periodEnd must be after periodStart");

    const current = bookStatementSums.get(record.bookId) || {
      copiesSold: 0,
      authorShare: 0,
      amountPaid: 0,
      amountPending: 0,
    };

    current.copiesSold += record.copiesSold;
    current.authorShare += record.authorShare;
    current.amountPaid += record.amountPaid;
    current.amountPending += record.amountPending;
    bookStatementSums.set(record.bookId, current);
  }

  // Verify consistency with Book records
  for (const [bookId, sum] of bookStatementSums.entries()) {
    const book = bookMap.get(bookId);
    assert.equal(
      sum.copiesSold,
      book.total_copies_sold,
      `Copies sold mismatch for ${bookId}: statement sum ${sum.copiesSold} vs book total ${book.total_copies_sold}`
    );
    assert.equal(
      sum.authorShare,
      book.total_royalty_earned,
      `Author share mismatch for ${bookId}: statement sum ${sum.authorShare} vs book total ${book.total_royalty_earned}`
    );
    assert.equal(
      sum.amountPaid,
      book.royalty_paid,
      `Amount paid mismatch for ${bookId}: statement sum ${sum.amountPaid} vs book total ${book.royalty_paid}`
    );
    assert.equal(
      sum.amountPending,
      book.royalty_pending,
      `Amount pending mismatch for ${bookId}: statement sum ${sum.amountPending} vs book total ${book.royalty_pending}`
    );
  }
});
