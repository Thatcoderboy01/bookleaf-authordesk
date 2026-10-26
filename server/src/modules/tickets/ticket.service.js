
import prisma from "../../config/database.js";
import { ApiError } from "../../utils/ApiError.js";

export async function createTicket(user, input) {
  // If a book is supplied, verify that it exists and belongs to the author.
  if (input.bookId) {
    const book = await prisma.book.findUnique({
      where: { id: input.bookId },
      select: { id: true, authorId: true },
    });

    if (!book) {
      throw new ApiError(404, "Book not found");
    }

    if (user.role !== "ADMIN" && book.authorId !== user.id) {
      throw new ApiError(404, "Book not found");
    }
  }

  return prisma.ticket.create({
    data: {
      subject: input.subject,
      description: input.description,
      authorId: user.role === "ADMIN" && input.authorId
        ? input.authorId
        : user.id,
      bookId: input.bookId || null,
      ...(user.role === "ADMIN" && input.assignedToId
        ? { assignedToId: input.assignedToId }
        : {}),
    },
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
}

export async function getTickets(user) {
  const where = user.role === "ADMIN"
    ? {}
    : { authorId: user.id };

  return prisma.ticket.findMany({
    where,
    orderBy: { createdAt: "desc" },
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
