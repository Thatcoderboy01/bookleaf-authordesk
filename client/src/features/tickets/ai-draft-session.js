/**
 * Session-level tracking for AI draft auto-generation.
 * Prevents redundant in-flight API calls and duplicate auto-generation
 * attempts caused by React StrictMode or component re-renders.
 */

const inFlightGenerations = new Set();
const attemptedAutoGenerations = new Set();

export function hasInFlightGeneration(ticketId) {
  return inFlightGenerations.has(ticketId);
}

export function startInFlightGeneration(ticketId) {
  inFlightGenerations.add(ticketId);
}

export function finishInFlightGeneration(ticketId) {
  inFlightGenerations.delete(ticketId);
}

export function hasAttemptedAutoGeneration(ticketId) {
  return attemptedAutoGenerations.has(ticketId);
}

export function markAttemptedAutoGeneration(ticketId) {
  attemptedAutoGenerations.add(ticketId);
}

export function clearDraftTracking() {
  inFlightGenerations.clear();
  attemptedAutoGenerations.clear();
}

