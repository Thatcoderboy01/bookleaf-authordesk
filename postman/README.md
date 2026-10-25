# Postman API Testing

This directory contains the Postman collection and environment used to test BookLeaf AuthorDesk APIs.

## Files

- `BookLeaf-AuthorDesk.postman_collection.json` — API requests grouped by feature.
- `local.postman_environment.json` — Local development variables.

## Local Setup

1. Start the backend server.
2. Import the collection into Postman.
3. Import the local environment.
4. Select the local environment.
5. Run the requests against the configured API base URL.

## Test Coverage

The collection will cover authentication, books, royalties, support tickets, admin operations, and AI-assisted ticket handling as these endpoints are implemented.

Authentication, authorization, input validation, and error responses should be tested alongside successful requests.

No production credentials or API secrets should be stored in exported collections.
