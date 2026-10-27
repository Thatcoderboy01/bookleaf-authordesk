import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import notFound from "./middleware/not-found.js";
import errorHandler from "./middleware/error-handler.js";
import authRoutes from "./modules/auth/auth.routes.js";
import { authenticate } from "./middleware/authenticate.js";
import { authorizeRole } from "./middleware/authorize-role.js";
import bookRoutes from "./modules/books/book.routes.js";
import ticketRoutes from "./modules/tickets/ticket.routes.js";
import royaltyRoutes from "./modules/royalties/royalty.routes.js";
import { setupSwagger } from "./docs/swagger.js";


const app = express();

// Parse incoming JSON request bodies.
app.use(express.json({ limit: "1mb" }));

// Allow requests from the configured frontend origin.
app.use(
  cors({
    origin: env.clientUrl,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


/**
 * @openapi
 * /api/health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Check API health
 *     responses:
 *       '200':
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: BookLeaf AuthorDesk API is running
 *                 environment:
 *                   type: string
 *                   example: development
 */


// Health check endpoint.
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "BookLeaf AuthorDesk API is running",
    environment: env.nodeEnv,
  });
});

// Temp Test
// app.get("/api/test/me", authenticate, (req, res) => {
//   res.json({ success: true, user: req.user });
// });

// app.get(
//   "/api/test/admin",
//   authenticate,
//   authorizeRole("ADMIN"),
//   (req, res) => {
//     res.json({ success: true, message: "Admin access granted" });
//   }
// );

// Authentication routes
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/royalties", royaltyRoutes);

setupSwagger(app);

// Unknown routes return a consistent 404 response.
app.use(notFound);

// Error handler must be registered after routes and not-found middleware.
app.use(errorHandler);

export default app;