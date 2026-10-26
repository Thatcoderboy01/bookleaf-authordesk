
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  getRoyaltySummaryController,
  getRoyaltyRecordsController,
} from "./royalty.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", getRoyaltyRecordsController);
router.get("/summary", getRoyaltySummaryController);

export default router;
