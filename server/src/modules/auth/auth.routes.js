import { Router } from "express";
import { register, login } from "./auth.controller.js";
import { validateRequest } from "../../middleware/validate-request.js";
import {
  registerSchema,
  loginSchema,
} from "./auth.validation.js";


/**
 * @openapi
 * components:
 *   schemas:
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         statusCode:
 *           type: integer
 *           example: 200
 *         message:
 *           type: string
 *           example: Login successful
 *         data:
 *           type: object
 *     AuthRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           example: Sample Author
 *         email:
 *           type: string
 *           format: email
 *           example: author@example.com
 *         password:
 *           type: string
 *           minLength: 8
 *           maxLength: 72
 *           example: ExamplePassword123
 *     AuthData:
 *       type: object
 *       properties:
 *         user:
 *           type: object
 *           description: Sanitized user object; password hash is excluded.
 *         accessToken:
 *           type: string
 *           description: JWT access token.
 */

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register an author account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/AuthRequest'
 *               - type: object
 *                 required:
 *                   - name
 *     responses:
 *       '201':
 *         description: Registration successful
 *       '409':
 *         description: An account with this email already exists
 *       '400':
 *         description: Request validation failed
 */

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Log in to an author account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthRequest'
 *     responses:
 *       '200':
 *         description: Login successful
 *       '401':
 *         description: Invalid email or password
 *       '400':
 *         description: Request validation failed
 */


const router = Router();

router.post("/register", validateRequest(registerSchema), register);
router.post("/login", validateRequest(loginSchema), login);

export default router;