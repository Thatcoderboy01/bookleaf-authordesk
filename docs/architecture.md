# Architecture

## Overview

BookLeaf AuthorDesk is organized into a React client and an Express server, with MySQL as the primary database.

The application provides separate author and admin interfaces for book information, royalty records, support tickets, and AI-assisted support workflows.

## Components

### Client

- React and Vite
- Tailwind CSS
- Redux Toolkit for shared client-side state
- Feature-based organization for authentication, books, royalties, and tickets

### Server

- Node.js and Express
- Feature-based modules for authentication, users, books, royalties, tickets, replies, and AI
- Middleware for authentication, authorization, request validation, and error handling

### Data Layer

- MySQL
- Prisma ORM for database access and migrations

### AI Integration

- Google Gemini API for ticket classification, priority suggestions, and response drafts
- BookLeaf support knowledge base for grounding generated responses
- Manual response handling when the AI service is unavailable

### Real-time Communication

- Socket.IO for ticket replies and status updates

## Request Flow

1. The client sends a request to the Express API.
2. Middleware validates authentication, permissions, and request data.
3. Controllers handle HTTP requests and delegate business logic to services.
4. Services interact with Prisma and MySQL when database operations are required.
5. AI services are called for supported classification and response-generation workflows.
6. The server returns the result to the client.

## Access Control

Authors must only access their own books, royalty records, and support tickets. Admin permissions are enforced on the server and must not depend solely on frontend route restrictions.

## Implementation Status

This document describes the planned architecture. It should be updated as implementation decisions and deployed behaviour are finalized.
