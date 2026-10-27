import { apiRequest } from "../../services/api-client.js";

export async function getBooks() {
  const data = await apiRequest("/books");
  return data?.books || [];
}

export async function getBookById(bookId) {
  const data = await apiRequest(`/books/${encodeURIComponent(bookId)}`);
  return data?.book || null;
}