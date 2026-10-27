
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "BookLeaf AuthorDesk API",
      version: "1.0.0",
      description:
        "API documentation for the BookLeaf AuthorDesk author support and administration platform.",
    },
    servers: [
      {
        url: "/",
        description: "Current server",
      },
    ],
    tags: [
      { name: "Health", description: "API health check" },
      { name: "Authentication", description: "Registration and login" },
      { name: "Books", description: "Author book records" },
      { name: "Royalties", description: "Royalty records and summaries" },
      { name: "Tickets", description: "Support tickets and administration" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "An error occurred" },
          },
        },
        TicketStatus: {
          type: "string",
          enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
        },
        TicketCategory: {
          type: "string",
          enum: [
            "ROYALTY_PAYMENTS",
            "ISBN_METADATA_ISSUES",
            "PRINTING_QUALITY",
            "DISTRIBUTION_AVAILABILITY",
            "BOOK_STATUS_PRODUCTION",
            "GENERAL_INQUIRY",
          ],
        },
        TicketPriority: {
          type: "string",
          enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
        },
      },
    },
  },
  apis: ["./src/modules/**/*.routes.js", "./src/app.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerSpec };

export function setupSwagger(app) {
  app.get("/api/docs.json", (req, res) => {
    res.json(swaggerSpec);
  });

  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: "BookLeaf AuthorDesk API Docs",
    })
  );
}
