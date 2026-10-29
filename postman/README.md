# Postman API Testing: BookLeaf AuthorDesk

This directory contains the verified Postman collection and environment files for testing the BookLeaf AuthorDesk REST API.

---

## 1. Files in this Directory

- **`BookLeaf-AuthorDesk.postman_collection.json`** &mdash; Postman Collection v2.1 containing **23 API requests** organized into 7 logical workflow folders.
- **`BookLeaf-AuthorDesk.local.postman_environment.json`** &mdash; **Canonical local environment** matching the collection name, pre-configured with required variables (`baseUrl`, `adminToken`, `authorToken`, `ticketId`, `bookId`).
- **`local.postman_environment.json`** &mdash; Maintained with identical variables for backward compatibility with existing Postman imports that reference the original file name.

---

## 2. Prerequisites & Server Setup

Before sending requests in Postman:

1. **Configure Environment:** Ensure `server/.env` is configured with `PORT=5000` (default), `DATABASE_URL`, `JWT_SECRET`, and a valid `GEMINI_API_KEY` for AI features.
2. **Seed the Database:** Ensure the local database has been migrated and seeded with the official dataset (10 authors, 18 books, 1 admin):
   ```bash
   cd server
   npx prisma migrate dev
   npm run db:seed
   ```
3. **Start the Express API:**
   ```bash
   cd server
   npm run dev
   # API starts at http://localhost:5000/api
   ```

---

## 3. Importing into Postman

1. Open Postman.
2. Click **Import** (top left).
3. Select both `BookLeaf-AuthorDesk.postman_collection.json` and `BookLeaf-AuthorDesk.local.postman_environment.json`.
4. In the environment selector (top-right corner of Postman), select **BookLeaf AuthorDesk - Local**.

---

## 4. Authentication & Variable Population

The collection includes automated Postman test scripts that extract JWT tokens and resource IDs from JSON responses and save them into the active environment:

- **`Login as Admin`:** Authenticates with `admin@bookleaf.demo` and automatically sets `{{adminToken}}`.
- **`Login as Author`:** Authenticates with `priya.sharma@email.com` and automatically sets `{{authorToken}}`.
- **`List Author Books`:** Captures the first returned book ID into `{{bookId}}`.
- **`Create Support Ticket`:** Captures the newly created ticket ID into `{{ticketId}}`.

*(Note: The credentials in the login requests use local mock seed data with password `Demo@12345`. They are intended solely for local development and assessment.)*

---

## 5. Recommended Execution Order

Execute requests in the following sequence to ensure environment variables are populated cleanly:

```text
1. Health
   └─ API Health Check                      -> Confirms server is running (HTTP 200)

2. Authentication
   ├─ Login as Admin                        -> Sets {{adminToken}}
   └─ Login as Author                       -> Sets {{authorToken}}

3. Author Books
   ├─ List Author Books                     -> Sets {{bookId}}
   └─ Get Book Details by ID                -> Uses {{bookId}}

4. Royalties
   ├─ Get Royalty Records (Author)          -> Author financial records
   └─ Get Royalty Summary (Author)          -> Aggregated totals

5. Support Tickets
   ├─ Create Support Ticket                 -> Sets {{ticketId}} & triggers AI classification
   ├─ List Author Tickets                   -> Lists author tickets
   ├─ Get Ticket Details (Author)           -> Author ticket view
   ├─ List Ticket Replies                   -> Thread messages
   └─ Post Ticket Reply (Author)            -> Appends author message

6. Admin Ticket Management
   ├─ Admin Ticket Queue (Filtered/Sorted)  -> Triage queue (CRITICAL -> LOW)
   ├─ Get Ticket Details with Context       -> Enriched admin view with phone & city
   ├─ Assign Ticket to Self                 -> Claims ticket for admin
   ├─ Update Ticket Status & Priority       -> Overrides status & priority
   ├─ List Internal Notes                   -> Admin-only notes
   └─ Add Internal Note                     -> Appends private note

7. AI Drafts
   ├─ Generate AI Response Draft            -> Generates grounded draft via Gemini
   ├─ Edit Saved AI Draft                   -> Modifies draft text
   └─ Send AI Draft as Reply                -> Atomically sends draft & clears state
```

---

## 6. External Dependencies & Feature Requirements

- **Database Seed Required:** Requests in folders 3 (Author Books), 4 (Royalties), and 6 (Admin Ticket Management) depend on database seed data created by `npm run db:seed`.
- **Gemini API Key Required:**
  - `Create Support Ticket` triggers asynchronous AI classification.
  - `Generate AI Response Draft` calls `POST /api/tickets/:id/ai-draft`.
  If `GEMINI_API_KEY` is missing or quota is exhausted (HTTP 429), the API returns a structured `AI_CONFIGURATION_ERROR` or `AI_QUOTA_EXCEEDED` error without crashing the server.

---

## 7. Common Troubleshooting

| Error Status | Cause | Resolution |
|---|---|---|
| `ECONNREFUSED` | Backend server is not running | Start the server with `npm run dev` in `server/`. |
| `401 Unauthorized` | `adminToken` or `authorToken` is empty or expired | Run `Login as Admin` or `Login as Author` to refresh tokens. |
| `403 Forbidden` | Author token used on an admin-only endpoint | Ensure admin endpoints use `Bearer {{adminToken}}`. |
| `404 Not Found` | `ticketId` or `bookId` variable is empty | Run `List Author Books` and `Create Support Ticket` first. |
| `409 Conflict` (Draft Send) | The draft was already sent | An AI draft can only be sent once per ticket. Generate a new draft or create a new ticket to test sending again. |
| `429 Too Many Requests` | Gemini free-tier quota exhausted | Wait for quota reset or test manual replies using `Post Ticket Reply`. |
