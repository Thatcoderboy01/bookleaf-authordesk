import { apiRequest } from "../../services/api-client.js";

export async function getTickets(filters = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return apiRequest(`/tickets${query ? `?${query}` : ""}`);
}

export async function createTicket(input) {
  const data = await apiRequest("/tickets", {
    body: JSON.stringify(input),
    method: "POST",
  });

  return data?.ticket || null;
}

export async function getTicketById(ticketId) {
  const data = await apiRequest(`/tickets/${encodeURIComponent(ticketId)}`);
  return data?.ticket || null;
}

export async function getTicketReplies(ticketId) {
  const data = await apiRequest(`/tickets/${encodeURIComponent(ticketId)}/replies`);
  return data?.replies || [];
}

export async function createTicketReply(ticketId, message) {
  const data = await apiRequest(`/tickets/${encodeURIComponent(ticketId)}/replies`, {
    body: JSON.stringify({ message }),
    method: "POST",
  });

  return data?.reply || null;
}