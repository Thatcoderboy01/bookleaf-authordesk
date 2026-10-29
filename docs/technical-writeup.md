# Technical Write-up: BookLeaf AuthorDesk

## Context & Objectives
BookLeaf Publishing operates a high-volume self-publishing platform supporting thousands of authors across India and international markets. Authors routinely submit inquiries regarding royalty disbursement dates, calculation breakdowns (the 80/20 profit split), retail availability on Amazon and Flipkart, and book production pipeline progression.

The objective of BookLeaf AuthorDesk is to streamline author-publisher communication by providing:
1. A self-service **Author Portal** for checking book catalog details, platform availability, royalty summaries, and managing support tickets.
2. An **Admin Support Desk** equipped with triage queues, filtering, sorting, internal notes, and assignment tools.
3. **AI-Assisted Support Workflows** that automatically classify tickets and draft replies grounded strictly in verified BookLeaf operational policies and database facts.

---

## Key Implementation Decisions & Technical Trade-offs

### 1. Polling-Based Near-Real-Time Updates vs. WebSockets
- **Decision:** Implemented a 15-second background polling interval (`window.setInterval`) on active queue and ticket views.
- **Trade-off:** While WebSockets provide instant push notifications, support interactions are asynchronous rather than conversational chat. Polling eliminated socket connection handshakes, reconnection storms, stateful server clustering overhead, and heartbeat management, providing a reliable near-real-time experience with minimal infrastructure complexity.

### 2. Relational Database with Transactional Reply Dispatch
- **Decision:** Built on MySQL 8 via Prisma ORM, utilizing foreign keys, composite indexes (`[status, priority, createdAt]`), and Prisma transactions (`prisma.$transaction`).
- **Trade-off:** Draft dispatch (`POST /api/tickets/:id/ai-draft/send`) executes atomically: it inserts the official `TicketReply` and clears `ticket.aiDraft`. A database unique constraint on `TicketReply.aiDraftId` prevents duplicate sends under race conditions or double-clicks without requiring distributed locks.

### 3. Database-Level Priority Enum Ordering
- **Decision:** Translated client priority sorting directly at the SQL level.
- **Trade-off:** MySQL sorts `ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')` by declaration index (`1, 2, 3, 4`). Requesting "Highest priority" first maps `sortOrder=desc` to Prisma's `{ priority: 'asc' }` (index 1 &rarr; 4) with a secondary sort on `{ createdAt: 'desc' }`. This ensures deterministic, paginated ordering in the database engine rather than in-memory JavaScript sorting.

### 4. Context-Grounded AI Generation with Strict Separation
- **Decision:** Implemented Gemini API (`gemini-3.6-flash`) integration with token-conscious knowledge retrieval and schema-enforced output via Zod.
- **Trade-off:** The system prompt explicitly separates official company policy (from `knowledge-base.js`) from database records (ticket, author, book). The model is forbidden from claiming an action occurred (such as a payment sent or reprint approved) unless database facts confirm it. Upstream rate limits (HTTP 429) or timeouts fail gracefully with retry hints, leaving manual support fully operational.

---

## Current Limitations & Production Evolution

| Area | Current Implementation | Production Evolution Path |
|---|---|---|
| **Real-time Delivery** | 15s client polling on active views | Server-Sent Events (SSE) or WebSockets backed by Redis Pub/Sub for high-concurrency environments. |
| **Defect Reporting** | Text-only ticket descriptions | Cloud object storage (S3/GCS) with signed URLs for author photo uploads of defective print copies. |
| **Agent Collaboration** | Single-admin ticket assignment | Concurrent agent collision detection ("Agent X is viewing this ticket") and automated department routing. |
| **Session Security** | Stateless JWT in `sessionStorage` | HttpOnly, SameSite cookies with refresh-token rotation and Redis-backed revocation lists. |
| **Escalation Triggers** | Internal status changes and notes | Direct webhook integrations dispatching automated alerts to Slack or PagerDuty for `CRITICAL` tickets. |

