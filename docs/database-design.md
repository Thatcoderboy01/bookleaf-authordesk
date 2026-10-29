# Database Design & Schema: BookLeaf AuthorDesk

BookLeaf AuthorDesk uses MySQL 8.0+ managed through Prisma ORM. This document details the data models, relations, enums, and indexing strategies.

---

## 1. Entity-Relationship Overview

```mermaid
erDiagram
    USER ||--o{ BOOK : "authors"
    USER ||--o{ TICKET : "creates (author)"
    USER ||--o{ TICKET : "assigned to (admin)"
    USER ||--o{ TICKET_REPLY : "sends"
    USER ||--o{ TICKET_INTERNAL_NOTE : "writes"
    BOOK ||--o{ ROYALTY_RECORD : "accumulates"
    BOOK ||--o{ TICKET : "concerns"
    TICKET ||--o{ TICKET_REPLY : "contains"
    TICKET ||--o{ TICKET_INTERNAL_NOTE : "contains"

    USER {
        string id PK
        string email UK
        string name
        string passwordHash
        enum role
        string phone
        string city
        datetime joinedAt
    }

    BOOK {
        string id PK
        string title
        string isbn
        string genre
        datetime publicationDate
        enum status
        decimal mrp
        int totalCopiesSold
        decimal totalRoyaltyEarned
        decimal royaltyPaid
        decimal royaltyPending
        string authorId FK
    }

    ROYALTY_RECORD {
        string id PK
        string bookId FK
        datetime periodStart
        datetime periodEnd
        string platform
        int copiesSold
        decimal authorShare
        enum payoutStatus
    }

    TICKET {
        string id PK
        string subject
        text description
        enum status
        enum category
        enum priority
        string authorId FK
        string bookId FK
        string assignedToId FK
        text aiDraft
        string aiDraftId
        datetime aiDraftUpdatedAt
    }

    TICKET_REPLY {
        string id PK
        string ticketId FK
        string senderId FK
        text message
        string aiDraftId UK
        enum senderType
        datetime createdAt
    }

    TICKET_INTERNAL_NOTE {
        string id PK
        string ticketId FK
        string authorId FK
        text note
        datetime createdAt
    }
```

---

## 2. Enums

- **`UserRole`:** `AUTHOR`, `ADMIN`
- **`BookStatus`:** `MANUSCRIPT_RECEIVED`, `EDITING`, `COVER_DESIGN`, `TYPESETTING`, `PROOFREADING`, `ISBN_ASSIGNMENT`, `PRINTING`, `DISTRIBUTION_SETUP`, `PUBLISHED_LIVE`, `CANCELLED`
- **`RoyaltyPayoutStatus`:** `PENDING`, `PARTIALLY_PAID`, `PAID`
- **`TicketStatus`:** `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`
- **`TicketCategory`:** `ROYALTY_PAYMENTS`, `ISBN_METADATA_ISSUES`, `PRINTING_QUALITY`, `DISTRIBUTION_AVAILABILITY`, `BOOK_STATUS_PRODUCTION`, `GENERAL_INQUIRY`
- **`TicketPriority`:** `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`
- **`ReplySenderType`:** `AUTHOR`, `ADMIN`

---

## 3. Key Indexing Strategies

- **Admin Ticket Queue Filtering:**
  - `Ticket @@index([status, priority, createdAt])`: Optimizes multi-column filtering by ticket status and priority with chronological sorting.
- **Author Ticket Timeline:**
  - `Ticket @@index([authorId, status])`: Optimizes author overview and ticket listing queries.
- **Conversation Threading:**
  - `TicketReply @@index([ticketId, createdAt])`: Guarantees fast, chronological reply retrieval.
  - `TicketReply.aiDraftId @unique`: Ensures database-level uniqueness to prevent duplicate AI draft submissions.
- **Internal Notes:**
  - `TicketInternalNote @@index([ticketId, createdAt])`: Optimizes administrative note retrieval.
