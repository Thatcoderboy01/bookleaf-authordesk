import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import notFound from "./middleware/not-found.js";
import errorHandler from "./middleware/error-handler.js";

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

// Health check endpoint.
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "BookLeaf AuthorDesk API is running",
    environment: env.nodeEnv,
  });
});

// Unknown routes return a consistent 404 response.
app.use(notFound);

// Error handler must be registered after routes and not-found middleware.
app.use(errorHandler);

export default app;