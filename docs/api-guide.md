# API Developer Guide: BookLeaf AuthorDesk

This guide documents the RESTful API endpoints implemented in BookLeaf AuthorDesk, covering request specifications, authorization roles, validation constraints, and response payloads.

---

## 1. Overview & Swagger Documentation

- **Base URL:** `http://localhost:5000/api`
- **Interactive Swagger UI:** [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- **OpenAPI 3.0.3 Spec (JSON):** [http://localhost:5000/api/docs.json](http://localhost:5000/api/docs.json)
- **Specification Source:** `server/src/docs/swagger.js`

All protected endpoints require an HTTP `Authorization` header containing a valid JWT:
```text
Authorization: Bearer <your_jwt_access_token>
```

---

## 2. Standard Response & Error Format

All API responses follow a consistent envelope structure defined by `ApiResponse` and `ApiError`:

### Success Envelope (`ApiResponse`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Envelope (`ApiError`)
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "subject", "message": "Subject must be at least 5 characters" }
  ],
  "code": "VALIDATION_ERROR",
  "retryHint": null
}
```

---

## 3. Implemented Route Groups

### Health

#### `GET /api/health`
Public health check verifying server uptime and environment.
- **Access:** Public
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "BookLeaf AuthorDesk API is running",
    "environment": "development"
  }
  ```

---

### Authentication (`/api/auth`)

#### `POST /api/auth/register`
Creates a new author account.
- **Access:** Public
- **Request Body:**
  ```json
  {
    "name": "Jane Author",
    "email": "jane@example.com",
    "password": "Password123"
  }
  ```
- **Validation:** `name` (&ge; 2 chars), `email` (valid email), `password` (8–72 chars).
- **Response (201):** Returns user profile and `accessToken`.
- **Errors:** 409 (Email already registered), 400 (Validation failure).

#### `POST /api/auth/login`
Authenticates an author or administrator.
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "admin@bookleaf.demo",
    "password": "Demo@12345"
  }
  ```
- **Response (200):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Login successful",
    "data": {
      "user": {
        "id": "ADMIN001",
        "name": "BookLeaf Admin",
        "email": "admin@bookleaf.demo",
        "role": "ADMIN"
      },
      "accessToken": "eyJhbGciOi..."
    }
  }
  ```
- **Errors:** 401 (Invalid email or password).

---

### Books (`/api/books`)

#### `GET /api/books`
Lists books. Authors receive only their own titles; Admins receive all titles in the catalog.
- **Access:** Authenticated (`AUTHOR` or `ADMIN`)
- **Response (200):** Array of book objects including title, ISBN, genre, publication date, status, copies sold, MRP, and royalties.

#### `GET /api/books/:id`
Retrieves a single book record by ID. Authors can only access books they own.
- **Access:** Authenticated (`AUTHOR` or `ADMIN`)
- **Response (200):** Book record.
- **Errors:** 404 (Book not found or inaccessible).

---

### Royalties (`/api/royalties`)

#### `GET /api/royalties`
Lists detailed royalty accounting records. Scoped automatically to the authenticated author.
- **Access:** Authenticated (`AUTHOR` or `ADMIN`)
- **Response (200):** Array of royalty records with sales volume, MRP total, net profit, author share, paid amounts, and payout status.

#### `GET /api/royalties/summary`
Calculates aggregate royalty totals for the user.
- **Access:** Authenticated (`AUTHOR` or `ADMIN`)
- **Response (200):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Royalty summary fetched successfully",
    "data": {
      "totalEarned": 19908.00,
      "totalPaid": 16338.00,
      "totalPending": 3570.00
    }
  }
  ```

---

### Support Tickets (`/api/tickets`)

#### `POST /api/tickets`
Creates a support ticket and asynchronously invokes AI classification.
- **Access:** Authenticated (`AUTHOR` or `ADMIN`)
- **Request Body:**
  ```json
  {
    "subject": "Delay in Q3 royalty disbursement",
    "description": "I would like to check when the Q3 royalties for Whispers of the Ganges will be credited.",
    "bookId": "BK001"
  }
  ```
- **Validation:** `subject` (5–150 chars), `description` (10–5000 chars), `bookId` (optional).
- **Response (201):** Ticket record with `status: "OPEN"`, AI-suggested category/priority, and timestamp.

#### `GET /api/tickets`
Lists accessible tickets with filtering, pagination, and sorting.
- **Access:** Authenticated (`AUTHOR` or `ADMIN`)
- **Query Parameters:**
  - `status`: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`
  - `category`: `ROYALTY_PAYMENTS`, `ISBN_METADATA_ISSUES`, `PRINTING_QUALITY`, `DISTRIBUTION_AVAILABILITY`, `BOOK_STATUS_PRODUCTION`, `GENERAL_INQUIRY`
  - `priority`: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`
  - `from`, `to`: Date strings (`YYYY-MM-DD`)
  - `sortBy`: `createdAt`, `updatedAt`, `priority` (default: `createdAt`)
  - `sortOrder`: `asc`, `desc` (default: `desc`)
  - `page`: integer (&ge; 1, default: `1`)
  - `limit`: integer (1–100, default: `10`)
- **Priority Sorting Semantics:** Setting `sortBy=priority&sortOrder=desc` orders `CRITICAL` &rarr; `HIGH` &rarr; `MEDIUM` &rarr; `LOW` with deterministic secondary sort on `createdAt desc`.
- **Response (200):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Tickets fetched successfully",
    "data": {
      "tickets": [ ... ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 24,
        "totalPages": 3
      }
    }
  }
  ```

#### `GET /api/tickets/:id`
Retrieves ticket details and conversation status. Authors can only access tickets they submitted.
- **Access:** Authenticated (`AUTHOR` or `ADMIN`)
- **Projection Rules:**
  - Authors receive: ticket details, linked book summary (`id`, `title`), and replies.
  - Admins additionally receive: author contact info (`phone`, `city`), full book context, `aiSuggestedCategory`, `aiSuggestedPriority`, `aiClassificationNote`, and `aiDraft`.

#### `PATCH /api/tickets/:id`
Updates ticket operational status, priority, category, or assigned staff.
- **Access:** Admin only (`role: "ADMIN"`)
- **Request Body (at least one required):**
  ```json
  {
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "category": "ROYALTY_PAYMENTS",
    "assignedToId": "ADMIN001"
  }
  ```
- **Response (200):** Updated ticket record.
- **Errors:** 403 (Admin role required), 404 (Ticket not found).

#### `POST /api/tickets/:id/assign-to-me`
Assigns the ticket to the authenticated administrator.
- **Access:** Admin only (`role: "ADMIN"`)
- **Response (200):** Updated ticket record with `assignedToId = req.user.id`.

#### `GET /api/tickets/:id/replies`
Fetches chronological conversation replies for a ticket.
- **Access:** Authenticated (`AUTHOR` or `ADMIN`)
- **Response (200):** Array of reply objects with `senderType` (`AUTHOR` or `ADMIN`), message, and creation date.

#### `POST /api/tickets/:id/replies`
Appends a manual reply to the ticket thread.
- **Access:** Authenticated (`AUTHOR` or `ADMIN`)
- **Request Body:**
  ```json
  {
    "message": "Thank you for the update. My bank details are verified in the dashboard."
  }
  ```
- **Validation:** `message` (1–5000 chars).
- **Response (201):** Created reply object.

#### `GET /api/tickets/:id/internal-notes`
Lists private administrative notes.
- **Access:** Admin only (`role: "ADMIN"`)
- **Response (200):** Array of internal notes with staff author details.

#### `POST /api/tickets/:id/internal-notes`
Adds a private note to the ticket, hidden from the author.
- **Access:** Admin only (`role: "ADMIN"`)
- **Request Body:**
  ```json
  {
    "note": "Escalated to finance team with 48h SLA per BookLeaf royalty policy."
  }
  ```
- **Response (201):** Created note object.

---

### AI Draft Operations (`/api/tickets/:id/ai-draft`)

#### `POST /api/tickets/:id/ai-draft`
Generates a grounded AI response draft based on BookLeaf operational policies and verified database facts.
- **Access:** Admin only (`role: "ADMIN"`)
- **Response (200):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "AI ticket draft generated successfully",
    "data": {
      "draft": "Dear Priya,\n\nThank you for reaching out regarding your Q3 royalties...",
      "usedKnowledge": ["royalty-payments"],
      "needsHumanReview": true
    }
  }
  ```
- **Normalized Error Statuses:**
  - `429 AI_QUOTA_EXCEEDED` &mdash; Gemini daily quota reached; contains retry delay hint if available.
  - `502 AI_INVALID_RESPONSE` &mdash; Model returned malformed JSON.
  - `503 AI_PROVIDER_UNAVAILABLE` &mdash; Gemini API timeout or temporary 5xx failure.
  - `503 AI_CONFIGURATION_ERROR` &mdash; Missing `GEMINI_API_KEY`.

#### `PATCH /api/tickets/:id/ai-draft`
Updates the saved AI draft before sending.
- **Access:** Admin only (`role: "ADMIN"`)
- **Request Body:**
  ```json
  {
    "draft": "Dear Priya,\n\nI have reviewed your sales record and escalated this to our finance desk..."
  }
  ```
- **Validation:** `draft` (20–5000 chars).
- **Response (200):** Updated ticket record.

#### `POST /api/tickets/:id/ai-draft/send`
Dispatches the saved AI draft as an official ticket reply in an atomic transaction and clears the saved draft.
- **Access:** Admin only (`role: "ADMIN"`)
- **Response (201):** Created `TicketReply` object.
- **Errors:**
  - `400` &mdash; No saved draft found on ticket.
  - `409` &mdash; Draft already sent (`TicketReply.aiDraftId` collision).
  - `403` &mdash; Admin role required.

