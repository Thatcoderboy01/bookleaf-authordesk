
import { z } from "zod";

export const createTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(5, "Subject must be at least 5 characters")
    .max(150, "Subject must not exceed 150 characters"),

  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must not exceed 5000 characters"),

  bookId: z
    .string()
    .trim()
    .min(1, "Book ID cannot be empty")
    .optional()
    .nullable(),
});


export const updateTicketSchema = z
  .object({
    status: z
      .enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"])
      .optional(),

    category: z
      .enum([
        "ROYALTY_PAYMENTS",
        "ISBN_METADATA_ISSUES",
        "PRINTING_QUALITY",
        "DISTRIBUTION_AVAILABILITY",
        "BOOK_STATUS_PRODUCTION",
        "GENERAL_INQUIRY",
      ])
      .optional(),

    priority: z
      .enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"])
      .optional(),

    assignedToId: z.string().trim().min(1).nullable().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided" }
  );


export const createReplySchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Reply message is required")
    .max(5000, "Reply must not exceed 5000 characters"),
});

export const createInternalNoteSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, "Internal note is required")
    .max(5000, "Internal note must not exceed 5000 characters"),
});
