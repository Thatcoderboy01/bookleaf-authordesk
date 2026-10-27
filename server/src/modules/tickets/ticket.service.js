
import prisma from "../../config/database.js";
import { ApiError } from "../../utils/ApiError.js";
import { classifyTicket } from "../ai/classification.service.js";


export async function generateTicketDraft(ticketId) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      subject: true,
      description: true,
      category: true,
      aiSuggestedCategory: true,
      priority: true,
    },
  });

  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  let result;

  try {
    const { generateTicketResponse } = await import(
      "../ai/response-generation.service.js"
    );

    result = await generateTicketResponse(ticket);
  } catch (error) {
    console.error("AI ticket draft generation failed:", error.message);

    throw new ApiError(
      502,
      "Unable to generate an AI draft right now. Please try again."
    );
  }

  return prisma.ticket.update({
    where: { id: ticketId },
    data: {
      aiDraftResponse: result.draft,
      aiDraftGeneratedAt: new Date(),
      aiDraftEdited: false,
      aiModel: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    },
    select: {
      id: true,
      subject: true,
      aiDraftResponse: true,
      aiDraftGeneratedAt: true,
      aiDraftEdited: true,
      aiModel: true,
    },
  });
}

export async function createTicket(user, input) {
  // Resolve and validate the ticket author.
  const authorId =
    user.role === "ADMIN" && input.authorId
      ? input.authorId
      : user.id;

  if (user.role === "ADMIN" && input.authorId) {
    const author = await prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true, role: true },
    });

    if (!author || author.role !== "AUTHOR") {
      throw new ApiError(400, "Ticket author must be an existing author");
    }
  }

  // If a book is supplied, verify that it exists and belongs to the author.
  if (input.bookId) {
    const book = await prisma.book.findUnique({
      where: { id: input.bookId },
      select: { id: true, authorId: true },
    });

    if (!book || book.authorId !== authorId) {
      throw new ApiError(404, "Book not found");
    }
  }

  // AI provides suggestions only. Ticket creation must survive AI failures.
  let classification = null;

  try {
    classification = await classifyTicket({
      subject: input.subject,
      description: input.description,
    });
  } catch (error) {
    console.error("AI ticket classification failed:", error.message);
  }

  return prisma.ticket.create({
    data: {
      subject: input.subject,
      description: input.description,
      authorId,
      bookId: input.bookId || null,
      ...(user.role === "ADMIN" && input.assignedToId
        ? { assignedToId: input.assignedToId }
        : {}),
      ...(classification
        ? {
            aiSuggestedCategory: classification.category,
            aiSuggestedPriority: classification.priority,
            aiClassificationNote: classification.reasoning,
            aiModel: process.env.GEMINI_MODEL || "gemini-3.6-flash",
          }
        : {}),
    },
    select: {
      id: true,
      subject: true,
      description: true,
      status: true,
      category: true,
      priority: true,
      aiSuggestedCategory: true,
      aiSuggestedPriority: true,
      aiClassificationNote: true,
      aiModel: true,
      authorId: true,
      bookId: true,
      assignedToId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}



export async function getTickets(user, filters = {}) {
  const {
    status,
    category,
    priority,
    from,
    to,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    limit = 10,
  } = filters;

  // Always restrict authors to their own tickets.
  const where = {
    ...(user.role === "ADMIN" ? {} : { authorId: user.id }),
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(priority ? { priority } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
            ...(to
              ? {
                  lt: new Date(
                    new Date(`${to}T00:00:00.000Z`).getTime() +
                      24 * 60 * 60 * 1000
                  ),
                }
              : {}),
          },
        }
      : {}),
  };

  const orderBy = {
    [sortBy]: sortOrder,
  };

  const skip = (page - 1) * limit;

  const [tickets, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        subject: true,
        description: true,
        status: true,
        category: true,
        priority: true,
        authorId: true,
        bookId: true,
        assignedToId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.ticket.count({ where }),
  ]);

  return {
    tickets,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}


export async function getTicketById(ticketId, user) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      subject: true,
      description: true,
      status: true,
      category: true,
      priority: true,
      authorId: true,
      bookId: true,
      assignedToId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  if (user.role !== "ADMIN" && ticket.authorId !== user.id) {
    throw new ApiError(404, "Ticket not found");
  }

  return ticket;
}


export async function updateTicket(ticketId, input) {
  const existingTicket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, status: true },
  });

  if (!existingTicket) {
    throw new ApiError(404, "Ticket not found");
  }

  // Only an existing ADMIN can be assigned to a ticket.
  if (input.assignedToId) {
    const assignee = await prisma.user.findUnique({
      where: { id: input.assignedToId },
      select: { id: true, role: true },
    });

    if (!assignee || assignee.role !== "ADMIN") {
      throw new ApiError(400, "Assignee must be an existing admin");
    }
  }

  const data = { ...input };

  // Track when a ticket is resolved.
  if (input.status === "RESOLVED") {
    data.resolvedAt = new Date();
  } else if (
    input.status &&
    existingTicket.status === "RESOLVED"
  ) {
    data.resolvedAt = null;
  }

  return prisma.ticket.update({
    where: { id: ticketId },
    data,
    select: {
      id: true,
      subject: true,
      description: true,
      status: true,
      category: true,
      priority: true,
      authorId: true,
      bookId: true,
      assignedToId: true,
      resolvedAt: true,
      updatedAt: true,
    },
  });
}


export async function createTicketReply(ticketId, user, input) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      authorId: true,
    },
  });

  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  // Authors can reply only to their own tickets.
  if (user.role !== "ADMIN" && ticket.authorId !== user.id) {
    throw new ApiError(404, "Ticket not found");
  }

  return prisma.ticketReply.create({
    data: {
      ticketId: ticket.id,
      senderId: user.id,
      senderType: user.role === "ADMIN" ? "ADMIN" : "AUTHOR",
      message: input.message,
    },
    select: {
      id: true,
      ticketId: true,
      senderId: true,
      senderType: true,
      message: true,
      createdAt: true,
    },
  });
}

export async function getTicketReplies(ticketId, user) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      authorId: true,
    },
  });

  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  // Authors can view replies only on their own tickets.
  if (user.role !== "ADMIN" && ticket.authorId !== user.id) {
    throw new ApiError(404, "Ticket not found");
  }

  return prisma.ticketReply.findMany({
    where: { ticketId: ticket.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      ticketId: true,
      senderId: true,
      senderType: true,
      message: true,
      createdAt: true,
    },
  });
}


export async function createInternalNote(ticketId, user, input) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true },
  });

  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  return prisma.ticketInternalNote.create({
    data: {
      ticketId: ticket.id,
      authorId: user.id,
      note: input.note,
    },
    select: {
      id: true,
      ticketId: true,
      authorId: true,
      note: true,
      createdAt: true,
    },
  });
}

export async function getInternalNotes(ticketId) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true },
  });

  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  return prisma.ticketInternalNote.findMany({
    where: { ticketId: ticket.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      ticketId: true,
      authorId: true,
      note: true,
      createdAt: true,
    },
  });
}


export async function updateTicketDraft(ticketId, draft) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true },
  });

  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  return prisma.ticket.update({
    where: { id: ticketId },
    data: {
      aiDraftResponse: draft,
      aiDraftEdited: true,
    },
    select: {
      id: true,
      subject: true,
      aiDraftResponse: true,
      aiDraftGeneratedAt: true,
      aiDraftEdited: true,
      aiModel: true,
      updatedAt: true,
    },
  });
}



export async function sendTicketDraftAsReply(ticketId, user) {
  if (user.role !== "ADMIN") {
    throw new ApiError(403, "Only admins can send AI ticket drafts");
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      aiDraftResponse: true,
    },
  });

  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  const draft = ticket.aiDraftResponse?.trim();

  if (!draft) {
    throw new ApiError(400, "No AI draft available to send");
  }

  const existingReply = await prisma.ticketReply.findFirst({
    where: {
      ticketId: ticket.id,
      senderType: "ADMIN",
      message: draft,
    },
    select: { id: true },
  });

  if (existingReply) {
    throw new ApiError(
      409,
      "This AI draft has already been sent as a reply"
    );
  }

  return prisma.ticketReply.create({
    data: {
      ticketId: ticket.id,
      senderId: user.id,
      senderType: "ADMIN",
      message: draft,
    },
    select: {
      id: true,
      ticketId: true,
      senderId: true,
      senderType: true,
      message: true,
      createdAt: true,
    },
  });
}
