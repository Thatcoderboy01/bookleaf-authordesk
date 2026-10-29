# AI Integration & Grounding: BookLeaf AuthorDesk

This document details the architecture, prompt engineering, grounding strategies, and fault-tolerance mechanisms powering AI-assisted support in BookLeaf AuthorDesk.

---

## 1. Provider & Configuration

- **SDK:** Official `@google/genai` (v2.31.0).
- **Model:** `gemini-3.6-flash` (configurable via `GEMINI_MODEL` in `server/.env`).
- **Generation Parameters:**
  - `temperature: 0.2` &mdash; Low temperature minimizes variance and hallucinations.
  - `maxOutputTokens: 1500` &mdash; Bounded response size to control latency and token costs.
  - `responseMimeType: "application/json"` &mdash; Direct structured JSON emission.
  - `timeout_ms: 20000` &mdash; 20-second client timeout on network calls.

---

## 2. Workflows Implemented

### Workflow 1: Ticket Classification & Priority Assignment
When an author submits a ticket (`POST /api/tickets`), `classifyTicket` is invoked asynchronously:

1. **Input:** Untrusted `subject` and `description` wrapped in JSON serialization to mitigate prompt injection.
2. **Taxonomy:**
   - **Categories:** `ROYALTY_PAYMENTS`, `ISBN_METADATA_ISSUES`, `PRINTING_QUALITY`, `DISTRIBUTION_AVAILABILITY`, `BOOK_STATUS_PRODUCTION`, `GENERAL_INQUIRY`.
   - **Priorities:**
     - `CRITICAL`: Severe financial or catalog disruptions (multi-quarter unpaid royalties).
     - `HIGH`: Urgent data or production errors (mismatched ISBNs, wrong book linked, physical print defects).
     - `MEDIUM`: Standard operational inquiries (royalty breakdown, production status).
     - `LOW`: Minor non-urgent updates (author bio changes, package inquiries).
3. **Validation:** Parsed and validated via Zod `classificationSchema`.
4. **Fallback:** If classification fails (e.g. quota exhausted or invalid JSON), the error is logged and ticket creation completes with default fallback status (`category: "GENERAL_INQUIRY"`, `priority: "MEDIUM"`).

### Workflow 2: Grounded Response Draft Generation
When an administrator reviews a ticket, an AI response draft is generated:

1. **Token-Conscious Knowledge Retrieval:** Only knowledge-base entries matching the ticket's active category (or AI-suggested category) are retrieved from [knowledge-base.js](file:///home/raysec/Project/BookLeaf/BookLeaf%20AuthorDesk/server/src/modules/ai/knowledge-base.js). If no category matches, the general inquiry policy is used as fallback.
2. **Context Separation Rules:**
   - **Company Policy vs Database Facts:** The prompt instructs the model that it may explain general policies, but **must never** claim an action occurred (e.g. payment initiated, reprint approved, status updated) unless verified database context explicitly confirms it.
   - **Verified Book Context:** Injected dynamically from the database (`title`, `isbn`, `status`, `publicationDate`, `totalCopiesSold`, `royaltyPaid`, `royaltyPending`).
   - **No Linked Book:** If no book is associated with the ticket, the prompt instructs the model to handle the query at the account level without fabricating book titles.
3. **Output Schema:** Validated using Zod `draftSchema`:
   - `draft`: Formatted response addressed to the author (&ge; 20 chars).
   - `usedKnowledge`: Array of knowledge-base IDs actually referenced (enforced to match allowed IDs).
   - `needsHumanReview`: Boolean flag indicating whether human inspection or author action (such as defect photos) is required.

---

## 3. Official BookLeaf Knowledge Base Grounding

The in-memory policy repository ([knowledge-base.js](file:///home/raysec/Project/BookLeaf/BookLeaf%20AuthorDesk/server/src/modules/ai/knowledge-base.js)) encodes the official BookLeaf policies:

- **Royalty Terms:**
  - 80/20 royalty split (80% net profit to author, 20% to BookLeaf).
  - Net profit = MRP minus printing cost, platform commission (Amazon/Flipkart), and shipping charges.
  - Calculated quarterly; paid within 45 days of quarter end.
  - Minimum payout threshold: ₹1,000 (accumulates to next quarter if below).
  - Overdue payments (> 45 days) escalate to finance with a 48-hour resolution SLA.
- **ISBN & Metadata Policy:**
  - Unique ISBN assigned under BookLeaf's publisher imprint.
  - External imprints require independent author registration.
  - Duplicate/mismatched ISBNs escalate to production with a 48-hour resolution commitment.
  - Post-launch metadata updates reflect on sales platforms within 3–5 business days.
- **Printing & Quality Policy:**
  - In-house Delhi printing warehouse + partner printing (Repro India, Epitome Books).
  - Standard print turnaround: 5–7 business days.
  - Quality defects: Sincere apology, request photographs of defective copies, arrange free reprint within 5–7 business days upon photo verification.
- **Distribution & Availability:**
  - Distribution channels: Amazon India, Flipkart, Amazon US, Amazon UK, BookLeaf Store.
  - New titles go live within 7–10 business days post-publication.
  - "Currently Unavailable" listings trigger inventory re-sync with distribution within 24–48 hours.
- **Production Pipeline Stages:**
  - Manuscript Received &rarr; Editing &rarr; Cover Design &rarr; Typesetting &rarr; Proofreading &rarr; ISBN Assignment &rarr; Printing &rarr; Distribution Setup &rarr; Published & Live.

---

## 4. Draft Lifecycle & Concurrency Safeguards

1. **Generation:** `POST /api/tickets/:id/ai-draft` persists generated output to `ticket.aiDraft`.
2. **Editing:** Administrators can revise the draft directly in the UI (`PATCH /api/tickets/:id/ai-draft`).
3. **State Isolation:** In the frontend, draft state is keyed to `ticketId`. Navigating between tickets cancels stale pending requests and avoids cross-ticket draft contamination.
4. **Atomic Dispatch:** `POST /api/tickets/:id/ai-draft/send` runs within a Prisma transaction:
   - Creates a new `TicketReply` with `senderType: "ADMIN"` and `aiDraftId: ticket.aiDraftId`.
   - Clears `ticket.aiDraft`, `ticket.aiDraftUpdatedAt`, and `ticket.aiDraftId`.
   - If a duplicate send request occurs concurrently, the unique index on `TicketReply.aiDraftId` triggers a constraint error, cleanly rejecting the second request with HTTP 409 without creating duplicate replies.

---

## 5. Fault Tolerance & Cost Control

### Error Normalization (`ai-errors.js`)
All AI-related exceptions are mapped to clean `ApiError` instances:

| Upstream Failure | Normalized Code | HTTP Status | Admin Message |
|---|---|---|---|
| HTTP 429 / `RESOURCE_EXHAUSTED` | `AI_QUOTA_EXCEEDED` | 429 | Gemini quota reached; extracts retry hint (e.g. "Retry suggested in 45s") |
| Malformed / truncated JSON | `AI_INVALID_RESPONSE` | 502 | Readable failure message; avoids crashing server |
| Network timeout / 503 / 500 | `AI_PROVIDER_UNAVAILABLE` | 503 | Temporary failure; suggests retrying shortly |
| Missing / Invalid API key | `AI_CONFIGURATION_ERROR` | 503 | Advises contacting system administrator |

### Manual Fallback
When AI draft generation fails:
- The error is surfaced as an informative banner in the Admin Ticket Details workspace.
- The standard manual reply editor remains active and unobstructed, ensuring support agents can continue serving authors without disruption.

### Cost & Resource Awareness
- **Token Filtering:** Instead of sending the full catalog of policies on every call, only category-relevant snippets are included in the prompt.
- **Bounded JSON Repair:** If the LLM wraps valid JSON in conversational markdown, an in-memory brace-extraction repair (`indexOf('{')` to `lastIndexOf('}')`) is executed before declaring an error, avoiding redundant model invocations.
- **Early Retry Exit:** While transient 503/timeout errors retry with exponential backoff (up to 3 attempts), daily quota exhaustion (`GenerateRequestsPerDay`) exits immediately on the first attempt without burning useless requests.
