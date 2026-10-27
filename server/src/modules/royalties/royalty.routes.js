
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  getRoyaltySummaryController,
  getRoyaltyRecordsController,
} from "./royalty.controller.js";


/**
 * @openapi
 * /api/royalties:
 *   get:
 *     tags:
 *       - Royalties
 *     summary: List royalty records accessible to the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Royalty records fetched successfully
 *       '401':
 *         description: Authentication required
 *
 * /api/royalties/summary:
 *   get:
 *     tags:
 *       - Royalties
 *     summary: Get royalty totals
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Royalty summary fetched successfully
 *       '401':
 *         description: Authentication required
 */


const router = Router();

router.use(authenticate);

router.get("/", getRoyaltyRecordsController);
router.get("/summary", getRoyaltySummaryController);

export default router;
