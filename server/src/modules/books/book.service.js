
import prisma from "../../config/database.js";
import { ApiError } from "../../utils/ApiError.js";

export async function getBooks(user) {
  const where =
    user.role === "ADMIN"
      ? {}
      : { authorId: user.id };

  return prisma.book.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      isbn: true,
      genre: true,
      publicationDate: true,
      status: true,
      mrp: true,
      totalCopiesSold: true,
      totalRoyaltyEarned: true,
      royaltyPaid: true,
      royaltyPending: true,
      authorId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getBookById(bookId, user) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      id: true,
      title: true,
      isbn: true,
      genre: true,
      publicationDate: true,
      status: true,
      mrp: true,
      totalCopiesSold: true,
      totalRoyaltyEarned: true,
      royaltyPaid: true,
      royaltyPending: true,
      authorId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!book) {
    throw new ApiError(404, "Book not found");
  }

  if (user.role !== "ADMIN" && book.authorId !== user.id) {
    throw new ApiError(404, "Book not found");
  }

  return book;
}
