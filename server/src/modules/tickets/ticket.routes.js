
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateRequest } from "../../middleware/validate-request.js";
import { authorizeRole } from "../../middleware/authorize-role.js";

import {
  createTicketController,
  listTickets,
  getTicketDetails,
  updateTicketController,
  createTicketReplyController,
  listTicketRepliesController,
  createInternalNoteController,
  listInternalNotesController,
  generateTicketDraftController,
  updateTicketDraftController,
} from "./ticket.controller.js";

import {
  createTicketSchema,
  updateTicketSchema,
  createReplySchema,
  createInternalNoteSchema,
  updateTicketDraftSchema,
} from "./ticket.validation.js";

const router = Router();

// All ticket routes require authentication.
router.use(authenticate);

// Create a ticket.
router.post(
  "/",
  validateRequest(createTicketSchema),
  createTicketController
);

// List all tickets accessible to the logged-in user.
router.get("/", listTickets);

// Get a single ticket.
router.get("/:id", getTicketDetails);
router.post(
  "/:id/replies",
  validateRequest(createReplySchema),
  createTicketReplyController
);

router.get(
  "/:id/replies",
  listTicketRepliesController
);


router.post(
  "/:id/internal-notes",
  authorizeRole("ADMIN"),
  validateRequest(createInternalNoteSchema),
  createInternalNoteController
);

router.get(
  "/:id/internal-notes",
  authorizeRole("ADMIN"),
  listInternalNotesController
);

// Only admins can generate AI ticket drafts.
router.post(
  "/:id/ai-draft",
  authorizeRole("ADMIN"),
  generateTicketDraftController
);

// Only admins can edit AI ticket drafts.
router.patch(
  "/:id/ai-draft",
  authorizeRole("ADMIN"),
  validateRequest(updateTicketDraftSchema),
  updateTicketDraftController
);

// Only admins can update tickets.
router.patch(
  "/:id",
  authorizeRole("ADMIN"),
  validateRequest(updateTicketSchema),
  updateTicketController
);

export default router;
