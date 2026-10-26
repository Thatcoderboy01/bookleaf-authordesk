
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
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
