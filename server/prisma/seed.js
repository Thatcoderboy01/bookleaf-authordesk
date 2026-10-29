
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  sampleRoyaltyRecords,
  sampleTickets,
  sampleReplies,
  sampleInternalNotes,
} from "./seed-data.js";

const prisma = new PrismaClient();

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const datasetPath = path.join(
  currentDirectory,
  "bookleaf_sample_data.json"
);

const DEMO_PASSWORD = "Demo@12345";

const statusMap = {
  "Published & Live": "PUBLISHED_LIVE",
  "In Production - Cover Design": "COVER_DESIGN",
  "In Production - Typesetting": "TYPESETTING",
  "Manuscript Received": "MANUSCRIPT_RECEIVED",
  "Editing": "EDITING",
  "Proofreading": "PROOFREADING",
  "ISBN Assignment": "ISBN_ASSIGNMENT",
  "Printing": "PRINTING",
  "Distribution Setup": "DISTRIBUTION_SETUP",
};

function parseDate(value) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

async function main() {
  const rawData = await readFile(datasetPath, "utf8");
  const dataset = JSON.parse(rawData);

  if (!Array.isArray(dataset.authors) || dataset.authors.length !== 10) {
    throw new Error("Expected exactly 10 authors in the sample dataset.");
  }

  const totalBooks = dataset.authors.reduce(
    (total, author) => total + author.books.length,
    0
  );

  if (totalBooks !== 18) {
    throw new Error("Expected exactly 18 books in the sample dataset.");
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // Create the demo admin account.
  await prisma.user.upsert({
    where: { email: "admin@bookleaf.demo" },
    update: {},
    create: {
      id: "ADMIN001",
      name: "BookLeaf Admin",
      email: "admin@bookleaf.demo",
      passwordHash,
      role: "ADMIN",
    },
  });

  for (const author of dataset.authors) {
    await prisma.user.upsert({
      where: { id: author.author_id },
      update: {
        name: author.name,
        phone: author.phone ?? null,
        city: author.city ?? null,
        joinedAt: parseDate(author.joined_date),
      },
      create: {
        id: author.author_id,
        name: author.name,
        email: author.email,
        passwordHash,
        role: "AUTHOR",
        phone: author.phone ?? null,
        city: author.city ?? null,
        joinedAt: parseDate(author.joined_date),
      },
    });

    for (const book of author.books) {
      const status = statusMap[book.status];

      if (!status) {
        throw new Error(
          `Unknown book status "${book.status}" for ${book.book_id}`
        );
      }

      const bookData = {
        title: book.title,
        isbn: book.isbn,
        genre: book.genre,
        publicationDate: parseDate(book.publication_date),
        status,
        mrp: book.mrp == null ? null : book.mrp,
        authorRoyaltyPerCopy:
          book.author_royalty_per_copy == null
            ? null
            : book.author_royalty_per_copy,
        totalCopiesSold: book.total_copies_sold,
        totalRoyaltyEarned: book.total_royalty_earned,
        royaltyPaid: book.royalty_paid,
        royaltyPending: book.royalty_pending,
        printPartner: book.print_partner ?? null,
        availableOn: book.available_on,
        authorId: author.author_id,
      };

      await prisma.book.upsert({
        where: { id: book.book_id },
        update: bookData,
        create: {
          id: book.book_id,
          ...bookData,
        },
      });
    }
  }

  // Seed sample royalty statements matching book-level totals
  for (const record of sampleRoyaltyRecords) {
    const { id, ...data } = record;
    await prisma.royaltyRecord.upsert({
      where: { id },
      update: data,
      create: record,
    });
  }

  // Seed sample support tickets across authors, statuses, categories, and priorities
  for (const ticket of sampleTickets) {
    const { id, ...data } = ticket;
    await prisma.ticket.upsert({
      where: { id },
      update: data,
      create: ticket,
    });
  }

  // Seed sample replies
  for (const reply of sampleReplies) {
    const { id, ...data } = reply;
    await prisma.ticketReply.upsert({
      where: { id },
      update: data,
      create: reply,
    });
  }

  // Seed sample internal notes
  for (const note of sampleInternalNotes) {
    const { id, ...data } = note;
    await prisma.ticketInternalNote.upsert({
      where: { id },
      update: data,
      create: note,
    });
  }

  const authorCount = await prisma.user.count({
    where: { role: "AUTHOR" },
  });
  const bookCount = await prisma.book.count();
  const ticketCount = await prisma.ticket.count();
  const replyCount = await prisma.ticketReply.count();
  const noteCount = await prisma.ticketInternalNote.count();
  const royaltyCount = await prisma.royaltyRecord.count();

  console.log("Sample data seeded successfully.");
  console.log(`Authors: ${authorCount}`);
  console.log(`Books: ${bookCount}`);
  console.log(`Tickets: ${ticketCount}`);
  console.log(`Replies: ${replyCount}`);
  console.log(`Internal notes: ${noteCount}`);
  console.log(`Royalty records: ${royaltyCount}`);
  console.log("Demo admin: admin@bookleaf.demo");
  console.log(`Demo password: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
