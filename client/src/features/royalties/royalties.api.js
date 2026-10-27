import { apiRequest } from "../../services/api-client.js";

export async function getRoyaltySummary() {
  return apiRequest("/royalties/summary");
}

export async function getRoyaltyRecords() {
  const data = await apiRequest("/royalties");
  return Array.isArray(data) ? data : [];
}