# BookLeaf AuthorDesk

An author support and communication portal for managing book information, royalty details, and support requests in one place.

The project is being developed as part of a Full Stack Developer technical assignment for BookLeaf Publishing.

## Overview

BookLeaf AuthorDesk has two interfaces:

- **Author Portal** — view book details and royalty information, raise support tickets, and follow up on existing requests.
- **Admin Portal** — review and manage tickets, communicate with authors, and use AI-assisted tools to classify requests and draft responses.

The goal is to make support requests easier to track while keeping communication and ticket status visible to the relevant users.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **State Management:** Redux Toolkit
- **Backend:** Node.js, Express.js
- **Database:** MySQL, Prisma ORM
- **AI Integration:** Google Gemini API
- **Real-time Communication:** Socket.IO
- **API Testing & Documentation:** Postman, Swagger/OpenAPI

## Project Structure

```text
bookleaf-authordesk/
├── client/          # React application
├── server/          # Express API and business logic
├── docs/            # Architecture and project documentation
├── postman/         # API testing collection
├── .gitignore
└── README.md
```

## Planned Features

### Author Portal
- Sign in and access author-specific information
- View books, publication details, and royalty records
- Create support tickets and view ticket history
- Read replies and track ticket status

### Admin Portal
- View and filter incoming support tickets
- Review ticket categories and priorities
- Assign tickets and update their status
- Add internal notes and reply to authors
- Generate AI-assisted response drafts for review before sending

### AI-Assisted Support
- Classify tickets using the provided support categories
- Suggest a priority based on the ticket details
- Draft replies grounded in the BookLeaf support knowledge base
- Handle AI service failures without blocking manual support

## Local Development

Prerequisites:

- Node.js and npm
- MySQL
- A Google Gemini API key for AI features

The setup instructions below will be completed alongside the application configuration.

1. Clone the private repository.
2. Install dependencies in `client/` and `server/`.
3. Configure the environment variables using the respective `.env.example` files.
4. Set up the MySQL database and run Prisma migrations.
5. Start the backend and frontend development servers.

## Environment Variables

Keep credentials and secrets in local environment files. Do not commit `.env` files or API keys.

Required variables will be documented in `client/.env.example` and `server/.env.example` as the implementation progresses.

## API Documentation & Testing

API endpoints will be documented using Swagger/OpenAPI. Postman will be used to test requests, authentication, authorization, validation, and error responses.

## Project Status

The repository structure has been created. Application features, API documentation, testing, and deployment will be added as development progresses.

## Notes

This repository is private and intended for the technical assessment. Sample data and test credentials will be documented here when the application is ready for review.
