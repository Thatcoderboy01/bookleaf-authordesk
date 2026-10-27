
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
  sendTicketDraftAsReplyController,
} from "./ticket.controller.js";

import {
  createTicketSchema,
  updateTicketSchema,
  createReplySchema,
  createInternalNoteSchema,
  updateTicketDraftSchema,
} from "./ticket.validation.js";


/**
 * @openapi
 * /api/tickets:
 *   post:
 *     tags:
 *       - Tickets
 *     summary: Create a support ticket
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject, description]
 *             properties:
 *               subject:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 150
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 5000
 *               bookId:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       '201':
 *         description: Ticket created successfully
 *       '400':
 *         description: Validation failed
 *       '401':
 *         description: Authentication required
 *
 *   get:
 *     tags:
 *       - Tickets
 *     summary: List accessible tickets with filters and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/TicketStatus'
 *       - in: query
 *         name: category
 *         schema:
 *           $ref: '#/components/schemas/TicketCategory'
 *       - in: query
 *         name: priority
 *         schema:
 *           $ref: '#/components/schemas/TicketPriority'
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, priority]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *     responses:
 *       '200':
 *         description: Tickets fetched successfully
 *       '401':
 *         description: Authentication required
 *
 * /api/tickets/{id}:
 *   get:
 *     tags:
 *       - Tickets
 *     summary: Get ticket details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TicketId'
 *     responses:
 *       '200':
 *         description: Ticket fetched successfully
 *       '404':
 *         description: Ticket not found or inaccessible
 *
 *   patch:
 *     tags:
 *       - Tickets
 *     summary: Update ticket status, category, priority, or assignee (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TicketId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               status:
 *                 $ref: '#/components/schemas/TicketStatus'
 *               category:
 *                 $ref: '#/components/schemas/TicketCategory'
 *               priority:
 *                 $ref: '#/components/schemas/TicketPriority'
 *               assignedToId:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       '200':
 *         description: Ticket updated successfully
 *       '401':
 *         description: Authentication required
 *       '403':
 *         description: Admin role required
 *       '404':
 *         description: Ticket not found
 *
 * /api/tickets/{id}/replies:
 *   get:
 *     tags:
 *       - Tickets
 *     summary: List ticket replies
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TicketId'
 *     responses:
 *       '200':
 *         description: Replies fetched successfully
 *       '404':
 *         description: Ticket not found or inaccessible
 *
 *   post:
 *     tags:
 *       - Tickets
 *     summary: Add a reply to a ticket
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TicketId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 5000
 *     responses:
 *       '201':
 *         description: Reply added successfully
 *       '404':
 *         description: Ticket not found or inaccessible
 *
 * /api/tickets/{id}/internal-notes:
 *   get:
 *     tags:
 *       - Tickets
 *     summary: List internal notes (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TicketId'
 *     responses:
 *       '200':
 *         description: Internal notes fetched successfully
 *       '403':
 *         description: Admin role required
 *
 *   post:
 *     tags:
 *       - Tickets
 *     summary: Add an internal note (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TicketId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [note]
 *             properties:
 *               note:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 5000
 *     responses:
 *       '201':
 *         description: Internal note added successfully
 *       '403':
 *         description: Admin role required
 *
 * /api/tickets/{id}/ai-draft:
 *   post:
 *     tags:
 *       - Tickets
 *     summary: Generate an AI reply draft (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TicketId'
 *     responses:
 *       '200':
 *         description: AI ticket draft generated successfully
 *       '502':
 *         description: AI draft generation failed
 *       '403':
 *         description: Admin role required
 *
 *   patch:
 *     tags:
 *       - Tickets
 *     summary: Edit an AI reply draft (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TicketId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [draft]
 *             properties:
 *               draft:
 *                 type: string
 *                 minLength: 20
 *                 maxLength: 5000
 *     responses:
 *       '200':
 *         description: AI ticket draft updated successfully
 *       '403':
 *         description: Admin role required
 *
 * /api/tickets/{id}/ai-draft/send:
 *   post:
 *     tags:
 *       - Tickets
 *     summary: Send the saved AI draft as a reply (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TicketId'
 *     responses:
 *       '201':
 *         description: AI draft sent as ticket reply successfully
 *       '409':
 *         description: This AI draft has already been sent
 *       '403':
 *         description: Admin role required
 *
 * components:
 *   parameters:
 *     TicketId:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: string
 *       description: Ticket ID
 */


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

// Only admins can send the saved AI draft as a ticket reply.
router.post(
  "/:id/ai-draft/send",
  authorizeRole("ADMIN"),
  sendTicketDraftAsReplyController
);

// Only admins can update tickets.
router.patch(
  "/:id",
  authorizeRole("ADMIN"),
  validateRequest(updateTicketSchema),
  updateTicketController
);

export default router;
