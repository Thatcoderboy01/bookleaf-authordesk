
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  createTicketReply,
  getTicketReplies,
  createInternalNote,
  getInternalNotes,
} from "./ticket.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export async function createTicketController(req, res, next) {
  try {
    const ticket = await createTicket(req.user, req.body);

    return res
      .status(201)
      .json(new ApiResponse(201, { ticket }, "Ticket created successfully"));
  } catch (error) {
    next(error);
  }
}

export async function listTickets(req, res, next) {
  try {
    const tickets = await getTickets(req.user);

    return res
      .status(200)
      .json(new ApiResponse(200, { tickets }, "Tickets fetched successfully"));
  } catch (error) {
    next(error);
  }
}

export async function getTicketDetails(req, res, next) {
  try {
    const ticket = await getTicketById(req.params.id, req.user);

    return res
      .status(200)
      .json(new ApiResponse(200, { ticket }, "Ticket fetched successfully"));
  } catch (error) {
    next(error);
  }
}


export async function updateTicketController(req, res, next) {
  try {
    const ticket = await updateTicket(req.params.id, req.body);

    return res
      .status(200)
      .json(
        new ApiResponse(200, { ticket }, "Ticket updated successfully")
      );
  } catch (error) {
    next(error);
  }
}


export async function createTicketReplyController(req, res, next) {
  try {
    const reply = await createTicketReply(
      req.params.id,
      req.user,
      req.body
    );

    return res
      .status(201)
      .json(
        new ApiResponse(201, { reply }, "Reply added successfully")
      );
  } catch (error) {
    next(error);
  }
}

export async function listTicketRepliesController(req, res, next) {
  try {
    const replies = await getTicketReplies(req.params.id, req.user);

    return res
      .status(200)
      .json(
        new ApiResponse(200, { replies }, "Replies fetched successfully")
      );
  } catch (error) {
    next(error);
  }
}


export async function createInternalNoteController(req, res, next) {
  try {
    const internalNote = await createInternalNote(
      req.params.id,
      req.user,
      req.body
    );

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { internalNote },
          "Internal note added successfully"
        )
      );
  } catch (error) {
    next(error);
  }
}

export async function listInternalNotesController(req, res, next) {
  try {
    const internalNotes = await getInternalNotes(req.params.id);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { internalNotes },
          "Internal notes fetched successfully"
        )
      );
  } catch (error) {
    next(error);
  }
}
