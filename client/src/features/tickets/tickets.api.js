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

export async function updateTicket(ticketId, input) {
  const data = await apiRequest(`/tickets/${encodeURIComponent(ticketId)}`, {
    body: JSON.stringify(input),
    method: "PATCH",
  });

  return data?.ticket || null;
}

export async function assignTicketToSelf(ticketId) {
  const data = await apiRequest(`/tickets/${encodeURIComponent(ticketId)}/assign-to-me`, {
    method: "POST",
  });

  return data?.ticket || null;
}

export async function getInternalNotes(ticketId) {
  const data = await apiRequest(`/tickets/${encodeURIComponent(ticketId)}/internal-notes`);
  return data?.internalNotes || [];
}

export async function createInternalNote(ticketId, note) {
  const data = await apiRequest(`/tickets/${encodeURIComponent(ticketId)}/internal-notes`, {
    body: JSON.stringify({ note }),
    method: "POST",
  });

  return data?.internalNote || null;
}

export async function generateTicketDraft(ticketId) {
  const data = await apiRequest(`/tickets/${encodeURIComponent(ticketId)}/ai-draft`, {
    method: "POST",
  });

  return data?.draft || null;
}

export async function updateTicketDraft(ticketId, draft) {
  const data = await apiRequest(`/tickets/${encodeURIComponent(ticketId)}/ai-draft`, {
    body: JSON.stringify({ draft }),
    method: "PATCH",
  });

  return data?.draft || null;
}

export async function sendTicketDraft(ticketId) {
  const data = await apiRequest(`/tickets/${encodeURIComponent(ticketId)}/ai-draft/send`, {
    method: "POST",
  });

  return data?.reply || null;
}