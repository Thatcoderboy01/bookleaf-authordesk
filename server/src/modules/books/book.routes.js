
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  listBooks,
  getBookDetails,
} from "./book.controller.js";


/**
 * @openapi
 * /api/books:
 *   get:
 *     tags:
 *       - Books
 *     summary: List books accessible to the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Books fetched successfully
 *       '401':
 *         description: Authentication required
 *
 * /api/books/{id}:
 *   get:
 *     tags:
 *       - Books
 *     summary: Get a book by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Book ID
 *     responses:
 *       '200':
 *         description: Book fetched successfully
 *       '401':
 *         description: Authentication required
 *       '404':
 *         description: Book not found or inaccessible
 */


const router = Router();

router.use(authenticate);

router.get("/", listBooks);
router.get("/:id", getBookDetails);

export default router;
