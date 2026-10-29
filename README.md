# BookLeaf AuthorDesk

BookLeaf AuthorDesk is a full-stack support and author communication portal developed for BookLeaf Publishing. It connects self-published authors with the BookLeaf support and editorial team, giving authors visibility into their publishing status, catalog, and royalty earnings while providing administrators with a unified triage queue and AI-assisted support workflows.

---

## Table of Contents

1. [Problem & Objectives](#problem--objectives)
2. [Key Implemented Features](#key-implemented-features)
   - [Author Portal](#author-portal)
   - [Admin Support Dashboard](#admin-support-dashboard)
   - [AI-Assisted Support Workflow](#ai-assisted-support-workflow)
3. [Technology Stack](#technology-stack)
4. [Architecture & Design Decisions](#architecture--design-decisions)
5. [Repository Structure](#repository-structure)
6. [Prerequisites](#prerequisites)
7. [Local Development Setup](#local-development-setup)
8. [Environment Configuration](#environment-configuration)
9. [Database Setup, Migrations & Seeding](#database-setup-migrations--seeding)
10. [Demo Accounts](#demo-accounts)
11. [API Documentation (Swagger/OpenAPI)](#api-documentation-swaggeropenapi)
12. [AI Implementation & Knowledge Base Grounding](#ai-implementation--knowledge-base-grounding)
13. [Security & Access Control](#security--access-control)
14. [Testing & Verification](#testing--verification)
15. [Current Limitations & Future Improvements](#current-limitations--future-improvements)

---

## Problem & Objectives

Self-publishing authors frequently contact support regarding royalty disbursement dates, calculation breakdowns, ISBN assignments, retail distribution status across platforms like Amazon and Flipkart, and book production timelines. Without a dedicated portal:

- Authors lack real-time visibility into their earnings, platform distribution status, and manuscript progression.
- Support teams receive unstructured inquiries across channels, leading to inconsistent answers and slow response times.
- Agents must manually look up company policies, publication schedules, and sales data to compose repetitive responses.

### Project Objectives

- Provide self-published authors with self-service access to book publication statuses, platform availability, and royalty records.
- Deliver an admin support desk for triaging, categorizing, prioritizing, and assigning support tickets.
- Ground AI response generation directly in official BookLeaf policies and database facts, avoiding ungrounded payment dates or speculative production promises.
- Enforce strict role-based access control and tenant isolation between authors.

---

## Key Implemented Features

### Author Portal

- **Overview Dashboard (`/author`):** At-a-glance summary displaying recent tickets, status badges, and quick actions to raise new requests or inspect books and earnings.
- **My Books (`/author/books` & `/author/books/:id`):** The catalog overview (`/author/books`) lists each title with its genre, publication status, and total copies sold. Selecting a title opens its details view (`/author/books/:id`), displaying publication metadata (ISBN, genre, publication date, MRP) alongside royalty performance metrics (copies sold, total royalty earned, royalty paid, and royalty pending). *Note:* While retail channel availability (`availableOn`) is stored in the database and returned by the API, platform channels are not currently rendered in the book details UI.
- **My Royalties (`/author/royalties`):** Financial summary detailing total earnings, paid amounts, and pending payouts with per-book line items and payout statuses.
- **Support Ticket Creation (`/author/tickets/new`):** Authors submit requests specifying subject, category, optional linked book, and detailed inquiry.
- **Ticket Conversation View (`/author/tickets/:id`):** Chronological conversation thread between author and support staff, with auto-refresh every 15 seconds.

### Admin Support Dashboard

- **Admin Overview (`/admin`):** High-level operational metrics and recent support activity.
- **Ticket Queue (`/admin/tickets`):** Filterable ticket table with:
  - Status filters (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`).
  - Category filters (`ROYALTY_PAYMENTS`, `ISBN_METADATA_ISSUES`, `PRINTING_QUALITY`, `DISTRIBUTION_AVAILABILITY`, `BOOK_STATUS_PRODUCTION`, `GENERAL_INQUIRY`).
  - Priority filters (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
  - Date range filtering (`from` and `to`).
  - Sorting controls: Newest first, Oldest first, Recently updated, Highest priority (`CRITICAL` &rarr; `LOW`), and Lowest priority (`LOW` &rarr; `CRITICAL`).
  - Visual triage indicators for urgency and aging unresolved tickets (&ge; 7 days open).
  - 15-second background polling for near-real-time updates.
- **Ticket Workspace (`/admin/tickets/:id`):**
  - Author contact card (name, email, phone, city, join date).
  - Linked book details (title, ISBN, status, retail channels, royalty figures).
  - One-click ticket self-assignment (`POST /api/tickets/:id/assign-to-me`).
  - Status, category, and priority adjustment controls with admin override capability.
  - Internal administrative notes thread (`POST` and `GET /api/tickets/:id/internal-notes`), visible only to admins.

### AI-Assisted Support Workflow

- **Automated Classification & Priority:** On ticket creation, Gemini analyzes subject and description against operational guidelines, suggesting a category, priority, and brief reasoning note stored on the ticket record.
- **Grounded AI Reply Drafts:** When an admin reviews an active ticket, an AI response draft is generated using only relevant entries from the official BookLeaf Knowledge Base and available database records.
- **Draft Persistence & Isolation:** Generated drafts are persisted to `ticket.aiDraft` and isolated per ticket. Navigating between tickets or experiencing network delays does not overwrite another ticket's state.
- **Editable Before Sending:** Administrators can modify the draft text directly in the UI (`PATCH /api/tickets/:id/ai-draft`) before dispatching.
- **Atomic Dispatch:** Sending a draft (`POST /api/tickets/:id/ai-draft/send`) executes within a Prisma transaction that creates the official `TicketReply` and clears the saved draft fields. Duplicate sends are rejected via a database unique constraint on `TicketReply.aiDraftId`.
- **Graceful Failure & Quota Awareness:** Upstream Gemini rate limits (HTTP 429 `RESOURCE_EXHAUSTED`), malformed outputs, or network timeouts map to structured error codes with retry hints, leaving the manual reply interface fully operational.

---

## Technology Stack

| Layer | Technology | Version | Role in Project |
|---|---|---|---|
| **Frontend UI** | React | 19.3.1 | Core component architecture and reactive UI rendering |
| **Frontend Build Tool** | Vite | 8.3.4 | Development server, ES module bundling, and client build pipeline |
| **Frontend Styling** | Custom CSS | &mdash; | Semantic custom stylesheets featuring responsive layouts, admin coral theme, and author indigo theme |
| **Frontend Routing** | Custom Browser Router | &mdash; | HTML5 History API router with role-based access checks and popstate synchronization |
| **Backend Framework** | Node.js / Express | 5.3.0 | RESTful API server, middleware routing, and controller architecture |
| **Database** | MySQL | 8.0+ | Relational persistence with transactional integrity, foreign keys, and indexes |
| **ORM** | Prisma ORM | 6.19.3 | Schema definition, migration management, type safety, and query construction |
| **AI Integration** | Google Gen AI SDK (`@google/genai`) | 2.31.0 | Official client for Google Gemini API (`gemini-3.6-flash`) |
| **Validation** | Zod | 4.6.7 | Strict schema validation for incoming HTTP payloads and AI JSON responses |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`) | 9.0.3 | Stateless Bearer token issuance and signature verification |
| **Password Hashing** | bcryptjs | 3.0.3 | Salted password hashing (cost factor 12) for author and admin credentials |
| **API Documentation** | swagger-jsdoc / swagger-ui-express | 6.3.0 / 5.0.1 | OpenAPI 3.0.3 specification generation and interactive Swagger UI |
| **Testing** | Node.js Test Runner (`node:test`) | Node 20+ | Native test execution with assertions and mock isolation |

---

## Architecture & Design Decisions

```mermaid
flowchart TD
    subgraph Client ["Frontend (React 19 + Vite)"]
        A1["Author Views\n/author/*"]
        A2["Admin Views\n/admin/*"]
        AC["API Client (sessionStorage JWT)"]
        Poll["15s Interval Poller"]
    end

    subgraph Server ["Backend (Express 5 REST API)"]
        MW["Middleware\n(CORS, JWT Authenticate, AuthorizeRole, Zod Validation)"]
        TR["Ticket Controller & Service"]
        BR["Book & Royalty Controllers"]
        AR["Auth Controller"]
        AI["AI Service\n(@google/genai)"]
        KB["Grounded Knowledge Base\n(BookLeaf Policies)"]
    end

    subgraph Data ["Persistence & External Services"]
        DB[("MySQL Database\nvia Prisma ORM")]
        Gemini["Google Gemini API\n(gemini-3.6-flash)"]
    end

    A1 --> AC
    A2 --> AC
    Poll -.-> AC
    AC -- HTTP / JSON + Bearer JWT --> MW
    MW --> TR
    MW --> BR
    MW --> AR
    TR <--> DB
    BR <--> DB
    AR <--> DB
    TR --> AI
    AI --> KB
    AI -- Structured Prompt --> Gemini
    Gemini -- JSON Classification & Draft --> AI
```

### Key Design Decisions

1. **Lightweight Frontend State vs. Heavy State Libraries:**
   Instead of introducing Redux Toolkit or external store managers for a focused support workflow, state is managed via React component hooks, context-driven auth (`useAuth`), and feature-level API modules. This minimizes bundle overhead and avoids state-synchronization complexity between separate stores.
2. **Short-Interval HTTP Polling (15s) vs. WebSockets:**
   The assignment requires near-real-time ticket updates. Given that support replies and status transitions occur intermittently, polling with `window.setInterval` on active ticket queue and details views provides a reliable mechanism without managing persistent socket handshakes, heartbeat timeouts, reconnection storms, or stateful server scaling.
3. **Database-Indexed Priority Translation:**
   In MySQL, `ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')` assigns internal sequential indices `1, 2, 3, 4`. To implement semantic "Highest priority" sorting (`CRITICAL` &rarr; `LOW`), the query translates `sortOrder=desc` to Prisma's `{ priority: 'asc' }` (index 1 &rarr; 4) with a secondary sort on `{ createdAt: 'desc' }`. This ensures accurate and deterministic queue ordering directly in the database engine.
4. **Context-Grounding & Separation of Concerns:**
   System prompts explicitly instruct the model not to invent payment transaction IDs, reprint confirmations, or status changes, dividing context between official company policy (`knowledge-base.js`) and database records.
5. **Session-Scoped Token Storage:**
   Tokens and user identity are maintained in `window.sessionStorage`. This provides isolation between browser tabs and automatically clears credentials when the session terminates.

---

## Repository Structure

```text
BookLeaf AuthorDesk/
├── client/                              # Frontend React application
│   ├── src/
│   │   ├── app/                         # Browser router and route definitions
│   │   ├── components/
│   │   │   ├── common/                  # Shared UI components (Badge, Button, etc.)
│   │   │   └── layout/                  # AuthorLayout and AdminLayout wrappers
│   │   ├── features/
│   │   │   ├── auth/                    # Login page and authentication handlers
│   │   │   ├── books/                   # Book catalog page and book details
│   │   │   ├── royalties/               # Royalty tables and earnings summaries
│   │   │   └── tickets/                 # Ticket queue, triage cards, details, sort logic
│   │   ├── hooks/                       # useAuth and custom utilities
│   │   ├── services/                    # Fetch wrapper with interceptors and error handling
│   │   ├── App.jsx                      # Application root and route distributor
│   │   ├── index.css                    # Global and component stylesheet
│   │   └── main.jsx                     # Vite entry point
│   ├── .env.example                     # Client environment template
│   ├── package.json
│   └── vite.config.js
├── server/                              # Backend Express REST API
│   ├── prisma/
│   │   ├── migrations/                  # Versioned SQL migrations
│   │   ├── bookleaf_sample_data.json    # Seed dataset (10 authors, 18 books)
│   │   ├── schema.prisma                # Database schema, models, enums, relations
│   │   └── seed.js                      # Database seeder populating authors, books, admin
│   ├── src/
│   │   ├── config/                      # Database client, env validation, AI config
│   │   ├── docs/                        # Swagger/OpenAPI 3.0 configuration
│   │   ├── middleware/                  # Authenticate, authorizeRole, validateRequest, errorHandler
│   │   ├── modules/
│   │   │   ├── ai/                      # Gemini integration, knowledge base, prompts, error mapping
│   │   │   ├── auth/                    # Registration, login, JWT issuance, validation
│   │   │   ├── books/                   # Book listing, author-scoped queries
│   │   │   ├── royalties/               # Royalty calculation queries and summaries
│   │   │   └── tickets/                 # Ticket lifecycle, triage, replies, notes, sorting
│   │   ├── utils/                       # ApiError and ApiResponse helper classes
│   │   ├── app.js                       # Express app configuration and middleware stack
│   │   └── server.js                    # Server bootstrap and port listener
│   ├── test-support/                    # Test database utilities
│   ├── tests/                           # Unit and integration test suites
│   ├── .env.example                     # Server environment template
│   └── package.json
├── docs/                                # Project documentation
├── postman/                             # Postman environment collection files
├── README.md                            # Primary project documentation
└── .gitignore
```

---

## Prerequisites

Ensure the following runtimes and services are available on your system:

- **Node.js:** `v20.x` or later
- **npm:** `v10.x` or later
- **MySQL Database Server:** `v8.0` or later
- **Google Gemini API Key:** Required for ticket classification and draft generation features

---

## Local Development Setup

### 1. Clone and Enter Repository

```bash
git clone <repository-url>
cd "BookLeaf AuthorDesk"
```

### 2. Configure Environment Files

Copy the provided example environment files:

```bash
# Server configuration
cp server/.env.example server/.env

# Client configuration
cp client/.env.example client/.env
```

Edit `server/.env` with your local MySQL credentials and Google Gemini API key (see [Environment Configuration](#environment-configuration)).

### 3. Install Dependencies

Install dependencies for both backend and frontend:

```bash
# Backend dependencies
cd server && npm install

# Frontend dependencies
cd ../client && npm install
cd ..
```

### 4. Database Setup & Seeding

From the repository root, initialize the schema and populate the sample dataset:

```bash
cd server

# Run migrations
npx prisma migrate dev

# Seed official dataset (10 authors, 18 books, 1 admin)
npm run db:seed
cd ..
```

### 5. Start Development Servers

Run the backend and frontend in separate terminal windows:

**Terminal 1 (Backend API):**
```bash
cd server
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Vite runs on http://localhost:5173
```

Navigate to `http://localhost:5173` in your browser.

---

## Environment Configuration

### Server Environment (`server/.env`)

| Variable Name | Required | Default / Example | Purpose |
|---|---|---|---|
| `PORT` | No | `5000` | Port on which the Express server listens |
| `NODE_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `CLIENT_URL` | Yes | `http://localhost:5173` | Allowed frontend origin for CORS configuration |
| `DATABASE_URL` | Yes | `mysql://USER:PASSWORD@localhost:3306/bookleaf_authordesk` | Prisma connection string for MySQL database |
| `TEST_DATABASE_URL`| Optional | `mysql://USER:PASSWORD@localhost:3306/bookleaf_authordesk_test` | Connection string for isolated integration tests |
| `JWT_SECRET` | Yes | `your_secure_random_jwt_secret_key` | Secret key used for signing and verifying JWT tokens |
| `JWT_EXPIRES_IN` | No | `1d` | Token validity duration |
| `GEMINI_API_KEY` | Yes | `your-gemini-api-key-here` | Google AI Studio API key for Gemini access |
| `GEMINI_MODEL` | No | `gemini-3.6-flash` | Gemini model name used for classification and drafts |

### Client Environment (`client/.env`)

| Variable Name | Required | Default / Example | Purpose |
|---|---|---|---|
| `VITE_API_BASE_URL` | Yes | `http://localhost:5000/api` | Base URL prefix for all backend REST API calls |

---

## Database Setup, Migrations & Seeding

The database layer utilizes MySQL managed by Prisma ORM.

### Database Schema Models

- **`User`:** Stores user profiles, credentials (`passwordHash`), role (`AUTHOR` or `ADMIN`), and author contact metadata (`phone`, `city`, `joinedAt`).
- **`Book`:** Stores publication metadata, genre, publishing pipeline status, retail channels (`availableOn`), sales volumes, and royalty accumulations.
- **`RoyaltyRecord`:** Granular royalty accounting records by period and platform, with payout status (`PENDING`, `PARTIALLY_PAID`, `PAID`).
- **`Ticket`:** Support ticket entity holding subject, description, current status, category, priority, assigned agent, and AI-related draft/classification fields.
- **`TicketReply`:** Chronological messages within a ticket thread, with `senderType` (`AUTHOR` or `ADMIN`) and an optional unique `aiDraftId`.
- **`TicketInternalNote`:** Internal staff notes attached to a ticket, restricted to administrators.

### Seeding Command

```bash
cd server
npm run db:seed
```

The seed script loads `server/prisma/bookleaf_sample_data.json` and verifies that **exactly 10 authors and 18 books** are seeded alongside the default demo administrator account.

---

## Demo Accounts

All seeded demo accounts are generated from local mock data in `server/prisma/bookleaf_sample_data.json` with the development password `Demo@12345` defined in `server/prisma/seed.js`. These are intended solely for local testing and evaluation.

| Account Type | Email | Password | Role / Access Details |
|---|---|---|---|
| **Administrator** | `admin@bookleaf.demo` | `Demo@12345` | Full administrative access to `/admin`, `/admin/tickets`, triage tools, and AI draft controls |
| **Author (Sample 1)** | `priya.sharma@email.com` | `Demo@12345` | Author with 2 published books (*Whispers of the Ganges*, *The Saffron Diaries*), royalties, and tickets |
| **Author (Sample 2)** | `rohit.kapoor@email.com` | `Demo@12345` | Author with books across production stages |
| **Author (Sample 3)** | `ananya.iyer@email.com` | `Demo@12345` | Author account with pending royalties |

*(Any of the 10 seeded author emails from `bookleaf_sample_data.json` can be used to log in with `Demo@12345`.)*

---

## API Documentation (Swagger/OpenAPI)

Interactive API documentation is generated via `swagger-jsdoc` and served with `swagger-ui-express`.

- **Swagger UI URL:** [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- **OpenAPI JSON Spec:** [http://localhost:5000/api/docs.json](http://localhost:5000/api/docs.json)
- **Configuration File:** `server/src/docs/swagger.js`

> **API Testing Note:** Interactive Swagger UI (`/api/docs`) is the primary interface for exploring and executing API requests. The repository includes a `postman/` folder with an environment template, but the collection file is an empty placeholder; use Swagger UI for testing.

### Documented Endpoint Groups

- **Health:**
  - `GET /api/health` &mdash; Server status and runtime environment
- **Authentication:**
  - `POST /api/auth/register` &mdash; Create a new author account
  - `POST /api/auth/login` &mdash; Authenticate with email/password; returns JWT access token and user profile
- **Books:**
  - `GET /api/books` &mdash; List books (scoped to current author; all books for admins)
  - `GET /api/books/{id}` &mdash; Retrieve details of a specific book
- **Royalties:**
  - `GET /api/royalties` &mdash; Query royalty records
  - `GET /api/royalties/summary` &mdash; Aggregate totals (earned, paid, pending)
- **Tickets:**
  - `POST /api/tickets` &mdash; Create a support ticket (triggers async AI classification)
  - `GET /api/tickets` &mdash; List tickets with filtering (`status`, `category`, `priority`, `from`, `to`), sorting (`sortBy`, `sortOrder`), and pagination
  - `GET /api/tickets/{id}` &mdash; Ticket details (author metadata and draft fields visible to admins only)
  - `PATCH /api/tickets/{id}` &mdash; Admin update of status, category, priority, or assignee
  - `POST /api/tickets/{id}/assign-to-me` &mdash; Assign ticket to authenticated admin
  - `GET /api/tickets/{id}/replies` &mdash; Conversation replies
  - `POST /api/tickets/{id}/replies` &mdash; Post reply to conversation
  - `GET /api/tickets/{id}/internal-notes` &mdash; List private admin notes
  - `POST /api/tickets/{id}/internal-notes` &mdash; Create private admin note
  - `POST /api/tickets/{id}/ai-draft` &mdash; Generate an AI response draft (admin only)
  - `PATCH /api/tickets/{id}/ai-draft` &mdash; Update/edit the saved AI response draft (admin only)
  - `POST /api/tickets/{id}/ai-draft/send` &mdash; Atomically send saved draft as reply and clear draft state

### Authentication in Swagger UI

Click the **Authorize** button (top right) in Swagger UI and enter your token:
```text
<your_jwt_access_token>
```
*(Swagger UI uses the OpenAPI `http` bearer scheme and prefixes `Bearer` automatically.)*

---

## AI Implementation & Knowledge Base Grounding

### Provider & Model

- **Provider:** Google Gemini API via official `@google/genai` SDK
- **Configured Model:** `gemini-3.6-flash` (overridable via `GEMINI_MODEL`)
- **Sampling Settings:** `temperature: 0.2`, `maxOutputTokens: 1500`, `responseMimeType: "application/json"`

### Classification & Priority Scoring

Incoming tickets are classified using calibrated operational rules:

- **Categories:**
  - `ROYALTY_PAYMENTS` &mdash; Calculations, payout schedules, threshold inquiries.
  - `ISBN_METADATA_ISSUES` &mdash; ISBN assignments, duplicate ISBNs, title/metadata updates.
  - `PRINTING_QUALITY` &mdash; Physical defects, misprints, binding issues.
  - `DISTRIBUTION_AVAILABILITY` &mdash; Retail availability (Amazon/Flipkart stock syncs).
  - `BOOK_STATUS_PRODUCTION` &mdash; Manuscript stages and production timeline updates.
  - `GENERAL_INQUIRY` &mdash; Publishing packages, general author questions.
- **Priority Rules:**
  - `CRITICAL` &mdash; Severe financial or catalog-wide operational issues (multi-quarter unpaid royalties).
  - `HIGH` &mdash; Mismatched ISBNs, wrong book linked on retail channels, severe print defects.
  - `MEDIUM` &mdash; Standard royalty questions, normal production updates, stock sync requests.
  - `LOW` &mdash; Minor updates (bio changes, general non-urgent inquiries).

### Knowledge Base Grounding & Policy Alignment

Draft responses are grounded in official BookLeaf operational policies (`server/src/modules/ai/knowledge-base.js`):

- **Royalty Terms:** 80/20 royalty split (80% net profit to author, 20% BookLeaf). Net profit is defined as MRP minus printing cost, platform commission, and shipping. Payouts are calculated quarterly and distributed within 45 days of the quarter ending, subject to a ₹1,000 minimum threshold. Overdue royalties are escalated to finance with a 48-hour resolution timeline.
- **ISBN Policy:** Unique ISBN assigned under BookLeaf's imprint. External imprints require independent author acquisition. Duplicate or mislinked ISBNs are escalated to production with a 48-hour SLA. Post-launch metadata updates reflect within 3–5 business days.
- **Printing Turnaround:** 5–7 business days standard print turnaround from the Delhi facility or print partners (Repro India, Epitome Books). Free reprints are arranged for verified defective copies (requiring photos) within 5–7 business days.
- **Distribution Timelines:** New listings go live on Amazon India, Flipkart, and BookLeaf Store within 7–10 business days. Out-of-stock listings are re-synced with distribution within 24–48 hours.
- **Production Stages:** Full pipeline sequence: Manuscript Received &rarr; Editing &rarr; Cover Design &rarr; Typesetting &rarr; Proofreading &rarr; ISBN Assignment &rarr; Printing &rarr; Distribution Setup &rarr; Published & Live.

### Prompt Strategy & Grounding Rules

1. **Separation of Policy vs. Database Facts:** The prompt directs the model to explain general BookLeaf policies while disallowing claims that an action was taken (such as a payment processed or a reprint approved) unless explicitly present in the provided database context.
2. **Untrusted User Text:** Ticket subjects and descriptions are treated as untrusted text and wrapped in JSON stringification to mitigate prompt injection.
3. **Structured Schema Validation:** Model outputs are parsed and validated using Zod schemas (`draftSchema` and `classificationSchema`).
4. **Token-Conscious Filtering:** Only knowledge-base entries matching the ticket's category or suggested category are injected into the prompt.
5. **Bounded JSON Repair:** If the LLM returns JSON enclosed in conversational markdown, a single in-memory brace-extraction repair is attempted without issuing duplicate API calls.

### Error Handling & Graceful Degradation

AI service errors are handled gracefully without blocking manual responses:

- **Error Normalization (`ai-errors.js`):** Raw provider errors are intercepted and translated into clean, non-leaking HTTP status codes:
  - `429 AI_QUOTA_EXCEEDED` &mdash; Free-tier quota exhaustion or rate limits, accompanied by extracted retry hints (e.g. "Retry suggested in 35 seconds").
  - `502 AI_INVALID_RESPONSE` &mdash; Malformed or unparseable JSON output.
  - `503 AI_PROVIDER_UNAVAILABLE` &mdash; Upstream network timeouts or temporary 5xx errors.
  - `503 AI_CONFIGURATION_ERROR` &mdash; Missing or invalid `GEMINI_API_KEY`.
- **Manual Reply Fallback:** When AI draft generation fails, administrators are presented with a clear banner explaining the issue while the standard reply editor remains active for manual composition.

---

## Security & Access Control

- **Stateless Bearer Authentication:** Validated using HMAC-SHA256 JWT tokens containing `id` and `role`.
- **Role-Based Authorization (`authorizeRole`):** Protected routes enforce explicit roles. Admin-only endpoints (`/api/tickets/:id/internal-notes`, `/api/tickets/:id/ai-draft`, `/api/tickets/:id/assign-to-me`, ticket update controls) reject authors with `403 Forbidden`.
- **Strict Data Isolation:**
  - Authors can only query tickets where `authorId == req.user.id`.
  - Authors can only view books and royalty records linked to their account.
  - Admin-only ticket fields (`aiDraft`, `aiSuggestedCategory`, `aiSuggestedPriority`, `aiClassificationNote`) are stripped when queried by an author.
  - Sensitive author contact details (`phone`, `city`) are projected exclusively to authenticated administrators.
- **Transactional Integrity:** Draft dispatch and concurrent reply creation use Prisma transactions with database unique constraints to prevent double-reply submissions.
- **Request Validation & Error Masking:** Incoming request bodies are sanitized through Zod schemas. Unexpected 500 errors are masked to prevent leaking stack traces or credentials.

---

## Testing & Verification

The project includes unit and integration tests executed using the Node.js native test runner (`node:test`).

### Running Tests

#### 1. Standalone Unit Tests (No External Services or Database Required)

These tests execute with isolated mocks and do not require MySQL or Gemini network connectivity:

```bash
cd server
node --test \
  tests/ai.test.js \
  tests/ticket-draft-isolation.test.js \
  tests/ai-grounding.test.js \
  tests/ticket-context.test.js \
  tests/ticket-triage.test.js \
  tests/ai-draft-presentation.test.js \
  tests/ai-error-handling.test.js \
  tests/ticket-sort.test.js
```

**Results:**
- **55 passed, 0 failed** across all test suites.

#### 2. Full Test Suite (Requires Running Local MySQL Database)

To run the integration tests that require live database connections (`tests/tickets.test.js`, `tests/books.test.js`, `tests/auth.test.js`, etc.), ensure MySQL is running locally and `TEST_DATABASE_URL` or `DATABASE_URL` is set in `server/.env`:

```bash
cd server
npm test
```

*(Note: In sandbox environments where local port 3306 is not bound, the standalone suite above should be used instead.)*

### Client Linting & Production Build Verification

```bash
cd client

# Check code formatting and lint rules
npm run lint

# Compile production bundle
npm run build
```

Both frontend linting and Vite production builds complete with zero errors.

---

## Current Limitations & Future Improvements

| Current Implementation | Planned / Future Improvement |
|---|---|
| **15-second HTTP polling** on active queues | Implement WebSocket / Server-Sent Events (SSE) connections if scale and concurrent agent concurrency expand. |
| **Plain text ticket replies** | Add secure cloud object storage (e.g., S3/GCS) for author photo attachments when reporting printing quality defects. |
| **Single-assigned admin agent** | Multi-agent collaboration, ticket collision detection, and automated department routing (e.g. routing overdue royalties directly to Finance). |
| **In-app escalation commitments** | Webhook integrations dispatching notifications directly to internal Slack or email alerting systems for `CRITICAL` tickets. |
