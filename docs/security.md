# Security & Access Control: BookLeaf AuthorDesk

This document outlines the security architecture, authorization boundaries, data isolation mechanisms, and known security considerations in BookLeaf AuthorDesk.

---

## 1. Authentication & Token Management

- **Mechanism:** Stateless JSON Web Tokens (JWT) signed with HMAC-SHA256 (`jsonwebtoken`).
- **Token Payload:** Contains user identifier (`id`) and role (`role: "AUTHOR" | "ADMIN"`).
- **Expiration:** Default 24 hours (`JWT_EXPIRES_IN=1d`).
- **Password Security:**
  - Password hashing via `bcryptjs` with a work factor of 12 rounds.
  - Plaintext passwords and password hashes are excluded from all Prisma client queries and controller responses (`select: { passwordHash: false }` or explicit projection).
- **Client Storage:** Tokens and session profiles are stored in `window.sessionStorage`. This provides tab-level session isolation and ensures tokens are purged when the browser tab is closed.

---

## 2. Authorization & Role-Based Access Control (RBAC)

Access control is enforced at the Express middleware layer and cannot be bypassed through client-side tampering:

- **`authenticate` Middleware:**
  - Intercepts requests, parses `Authorization: Bearer <token>`, verifies signature and expiration against `JWT_SECRET`.
  - Rejects missing or forged tokens with `401 Unauthorized`.
  - Attaches authenticated user context (`req.user`) to the request.
- **`authorizeRole(role)` Middleware:**
  - Enforces role requirements. Admin-only operations reject non-admin users with `403 Forbidden`:
    - `PATCH /api/tickets/:id` (Status/priority/category overrides)
    - `POST /api/tickets/:id/assign-to-me`
    - `GET` & `POST /api/tickets/:id/internal-notes`
    - `POST`, `PATCH`, `POST send /api/tickets/:id/ai-draft`

---

## 3. Multi-Tenant Data Isolation

To prevent unauthorized cross-author data leakage (IDOR / BOLA vulnerabilities), ownership checks are enforced at the service query level:

- **Ticket Isolation:**
  - When querying `getTickets`, if `req.user.role !== "ADMIN"`, the Prisma `where` clause strictly enforces `{ authorId: req.user.id }`.
  - When accessing `getTicketById`, if the user is an author and the ticket does not belong to them, the service immediately throws `404 Not Found` (avoiding confirming ticket existence to unauthorized parties).
- **Field Projection Masking:**
  - Sensitive author contact details (`phone`, `city`) are projected exclusively when the querying user has role `ADMIN`. Author queries omit these fields.
  - Admin-only draft fields (`aiDraft`, `aiSuggestedCategory`, `aiSuggestedPriority`, `aiClassificationNote`, `aiDraftSentAt`, `aiDraftId`) are omitted from author ticket responses.
- **Book and Royalty Isolation:**
  - `GET /api/books` and `GET /api/royalties` enforce `{ authorId: req.user.id }` for author accounts.

---

## 4. Input Validation & Defense-in-Depth

- **Boundary Validation:** Every mutation route passes incoming request bodies through strict Zod schemas (`validateRequest` middleware) before invoking controllers:
  - String lengths are bounded (e.g. ticket subjects: 5–150 chars; ticket descriptions: 10–5000 chars; passwords: 8–72 chars).
  - Enums (`TicketStatus`, `TicketCategory`, `TicketPriority`) are strictly validated against allowed values.
- **Prompt Injection Defense:**
  - Ticket subject and description are treated as untrusted text. In AI prompts, user text is serialized through `JSON.stringify()` rather than raw template literal interpolation.
  - Strict system instructions command the model to ignore any instructions embedded inside ticket contents.
- **Transaction Safety & Double-Send Prevention:**
  - Sending an AI draft uses a database-level unique constraint (`TicketReply.aiDraftId`) inside a Prisma transaction. Concurrent or duplicate send requests result in a constraint violation, caught and returned as HTTP 409 without creating duplicate replies.

---

## 5. Security Gaps & Production Roadmap

While the application implements strict data isolation and input validation, the following gaps should be addressed before enterprise production deployment:

| Area | Current Implementation | Production Hardening Recommendation |
|---|---|---|
| **Token Transport** | `sessionStorage` + Bearer header | HttpOnly, Secure, SameSite cookies with short-lived access tokens and refresh-token rotation to mitigate XSS exposure. |
| **Rate Limiting** | Handled upstream by Gemini API | Implement Express-level rate limiting (`express-rate-limit`) on `/api/auth/login` and `/api/auth/register` to prevent credential brute-forcing. |
| **CSRF Protection** | Unnecessary with Bearer headers | If migrating to cookies, implement anti-CSRF token verification (Double Submit Cookie or Origin validation). |
| **Audit Logging** | Console logging | Structured security event logging (login attempts, privilege escalation, ticket reassignments) sent to a centralized SIEM. |
| **Secrets Management** | Local `.env` files | Integration with cloud secrets managers (AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault). |
