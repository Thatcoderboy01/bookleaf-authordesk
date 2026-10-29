# API Reference

BookLeaf AuthorDesk exposes a RESTful API documented using OpenAPI 3.0.3 standards.

## Quick Links

- **Comprehensive API Guide:** Refer to [api-guide.md](./api-guide.md) for detailed route descriptions, validation schemas, and sample payloads.
- **Interactive Swagger UI:** Accessible at `http://localhost:5000/api/docs` when the backend server is running.
- **OpenAPI 3.0.3 Spec (JSON):** Accessible at `http://localhost:5000/api/docs.json`.
- **Postman Collection:** An automated test collection and environment are located in the [`/postman`](../postman/) directory.

## Summary of Implemented Route Modules

| Module | Mount Path | Endpoints Summary |
|---|---|---|
| **Health** | `/api/health` | Service uptime and environment check |
| **Authentication** | `/api/auth` | User registration and login |
| **Books** | `/api/books` | Author catalog and book detail retrieval |
| **Royalties** | `/api/royalties` | Royalty records and financial summary calculations |
| **Tickets** | `/api/tickets` | Support ticket creation, triage queue, replies, internal notes, and AI drafts |
