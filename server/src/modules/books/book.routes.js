
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  listBooks,
  getBookDetails,
} from "./book.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", listBooks);
router.get("/:id", getBookDetails);

export default router;
