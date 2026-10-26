
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateRequest } from "../../middleware/validate-request.js";
import { authorizeRole } from "../../middleware/authorize-role.js";
import { updateTicketController } from "./ticket.controller.js";
import { updateTicketSchema } from "./ticket.validation.js";
import {
  createTicketController,
  listTickets,
  getTicketDetails,
} from "./ticket.controller.js";
import { createTicketSchema } from "./ticket.validation.js";

const router = Router();

// Every ticket endpoint requires authentication.
router.use(authenticate);

router.post(
  "/",
  validateRequest(createTicketSchema),
  createTicketController
);

router.get("/", listTickets);
router.get("/:id", getTicketDetails);

export default router;

router.patch(
  "/:id",
  authorizeRole("ADMIN"),
  validateRequest(updateTicketSchema),
  updateTicketController
);