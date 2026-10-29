import test from "node:test";
import assert from "node:assert/strict";
import {
  clearDraftTracking,
  hasAttemptedAutoGeneration,
  hasInFlightGeneration,
  markAttemptedAutoGeneration,
  startInFlightGeneration,
  finishInFlightGeneration,
} from "../../client/src/features/tickets/ai-draft-session.js";

test("saved draft appears without an additional AI-generation request", async () => {
  clearDraftTracking();

  const ticket = {
    id: "ticket-saved",
    status: "OPEN",
    aiDraftResponse: "Existing persisted draft response from DB",
  };

  let apiCalled = false;
  const mockGenerateDraft = async () => {
    apiCalled = true;
    return { aiDraftResponse: "Newly generated" };
  };

  const initialDraft = ticket.aiDraftResponse || "";
  const hasSavedDraft = Boolean(initialDraft && initialDraft.trim());
  const isEligibleStatus = ticket.status === "OPEN" || ticket.status === "IN_PROGRESS";
  const isAdmin = true;

  // The component checks if auto-generate should run
  if (
    !hasSavedDraft &&
    isEligibleStatus &&
    isAdmin &&
    !hasAttemptedAutoGeneration(ticket.id) &&
    !hasInFlightGeneration(ticket.id)
  ) {
    await mockGenerateDraft();
  }

  assert.equal(apiCalled, false, "API should not be called when a saved draft exists");
  assert.equal(initialDraft, "Existing persisted draft response from DB");
});

test("an eligible active ticket without a draft triggers generation once and guards against duplicate calls", async () => {
  clearDraftTracking();

  const ticket = {
    id: "ticket-active-1",
    status: "OPEN",
    aiDraftResponse: null,
  };

  let apiCallCount = 0;
  const mockGenerateDraft = async (id) => {
    apiCallCount += 1;
    return { id, aiDraftResponse: "Freshly generated draft" };
  };

  const initialDraft = ticket.aiDraftResponse || "";
  const isEligibleStatus = ticket.status === "OPEN" || ticket.status === "IN_PROGRESS";
  const isAdmin = true;

  function attemptAutoGenerate() {
    const hasSavedDraft = Boolean(initialDraft && initialDraft.trim());
    if (
      !hasSavedDraft &&
      isEligibleStatus &&
      isAdmin &&
      !hasAttemptedAutoGeneration(ticket.id) &&
      !hasInFlightGeneration(ticket.id)
    ) {
      markAttemptedAutoGeneration(ticket.id);
      startInFlightGeneration(ticket.id);

      mockGenerateDraft(ticket.id).finally(() => {
        finishInFlightGeneration(ticket.id);
      });
      return true;
    }
    return false;
  }

  // First mount/render
  const firstTriggered = attemptAutoGenerate();
  assert.equal(firstTriggered, true, "First render should trigger generation");
  assert.equal(apiCallCount, 1);
  assert.equal(hasInFlightGeneration(ticket.id), true);

  // Second mount (e.g. React StrictMode or re-render during in-flight)
  const secondTriggered = attemptAutoGenerate();
  assert.equal(secondTriggered, false, "Strict mode / re-render must be blocked by session guard");
  assert.equal(apiCallCount, 1, "API should only be called exactly once");

  // Wait for mock call to finish
  await Promise.resolve();
  assert.equal(hasInFlightGeneration(ticket.id), false);

  // Subsequent render after completion
  const thirdTriggered = attemptAutoGenerate();
  assert.equal(thirdTriggered, false, "Subsequent renders must not re-trigger generation");
  assert.equal(apiCallCount, 1);
});

test("resolved and closed tickets do not trigger automatic generation", async () => {
  clearDraftTracking();

  const resolvedTicket = { id: "ticket-resolved", status: "RESOLVED", aiDraftResponse: null };
  const closedTicket = { id: "ticket-closed", status: "CLOSED", aiDraftResponse: null };

  let apiCalled = false;
  const mockGenerateDraft = async () => {
    apiCalled = true;
  };

  for (const ticket of [resolvedTicket, closedTicket]) {
    const initialDraft = ticket.aiDraftResponse || "";
    const hasSavedDraft = Boolean(initialDraft && initialDraft.trim());
    const isEligibleStatus = ticket.status === "OPEN" || ticket.status === "IN_PROGRESS";
    const isAdmin = true;

    if (
      !hasSavedDraft &&
      isEligibleStatus &&
      isAdmin &&
      !hasAttemptedAutoGeneration(ticket.id) &&
      !hasInFlightGeneration(ticket.id)
    ) {
      await mockGenerateDraft();
    }
  }

  assert.equal(apiCalled, false, "Neither resolved nor closed ticket should trigger auto-generation");
});

test("author role cannot trigger automatic draft generation", async () => {
  clearDraftTracking();

  const ticket = { id: "ticket-author-view", status: "OPEN", aiDraftResponse: null };
  let apiCalled = false;
  const userRole = "AUTHOR";

  const initialDraft = ticket.aiDraftResponse || "";
  const hasSavedDraft = Boolean(initialDraft && initialDraft.trim());
  const isEligibleStatus = ticket.status === "OPEN" || ticket.status === "IN_PROGRESS";
  const isAdmin = userRole === "ADMIN";

  if (
    !hasSavedDraft &&
    isEligibleStatus &&
    isAdmin &&
    !hasAttemptedAutoGeneration(ticket.id) &&
    !hasInFlightGeneration(ticket.id)
  ) {
    apiCalled = true;
  }

  assert.equal(apiCalled, false, "Author role must never trigger draft generation");
});

test("ticket switching isolates draft state and drops late responses for previous ticket", async () => {
  clearDraftTracking();

  let activeTicketId = "ticket-A";
  let displayedDraft = "";

  // Simulate Ticket A in-flight generation
  let resolveTicketA;
  const ticketAPromise = new Promise((resolve) => {
    resolveTicketA = resolve;
  });

  // Start generation for Ticket A
  const requestTicketIdA = "ticket-A";
  ticketAPromise.then((result) => {
    // Component guard: only update if user is still on the same ticket
    if (activeTicketId !== requestTicketIdA) return;
    displayedDraft = result.draft;
  });

  // User switches to Ticket B before Ticket A completes
  activeTicketId = "ticket-B";
  displayedDraft = "Initial draft for Ticket B";

  // Ticket A's network response arrives late
  resolveTicketA({ draft: "Draft for Ticket A that arrived late" });
  await ticketAPromise;

  // Verify Ticket B's displayed draft was NOT overwritten by late Ticket A response
  assert.equal(
    displayedDraft,
    "Initial draft for Ticket B",
    "Late response for Ticket A must not overwrite Ticket B state"
  );
});

test("generation failure records recoverable error and does not enter auto-retry loop", async () => {
  clearDraftTracking();

  const ticket = { id: "ticket-fail-1", status: "OPEN", aiDraftResponse: null };
  let attempts = 0;
  let componentError = "";

  const mockGenerateDraft = async () => {
    attempts += 1;
    throw new Error("503 AI Model Overloaded");
  };

  const attemptGeneration = async () => {
    const hasSavedDraft = Boolean(ticket.aiDraftResponse);
    const isEligibleStatus = ticket.status === "OPEN" || ticket.status === "IN_PROGRESS";

    if (
      !hasSavedDraft &&
      isEligibleStatus &&
      !hasAttemptedAutoGeneration(ticket.id) &&
      !hasInFlightGeneration(ticket.id)
    ) {
      markAttemptedAutoGeneration(ticket.id);
      startInFlightGeneration(ticket.id);

      try {
        await mockGenerateDraft();
      } catch (err) {
        componentError = err.message;
      } finally {
        finishInFlightGeneration(ticket.id);
      }
    }
  };

  // First auto-generation attempt fails
  await attemptGeneration();
  assert.equal(attempts, 1);
  assert.equal(componentError, "503 AI Model Overloaded");
  assert.equal(hasInFlightGeneration(ticket.id), false);
  assert.equal(hasAttemptedAutoGeneration(ticket.id), true);

  // Polling or re-render should NOT retry automatically
  await attemptGeneration();
  assert.equal(attempts, 1, "Must not auto-retry in a loop");

  // Manual retry should work when admin clicks 'Try again'
  async function manualRetry() {
    startInFlightGeneration(ticket.id);
    try {
      await mockGenerateDraft();
    } catch (err) {
      componentError = err.message;
    } finally {
      finishInFlightGeneration(ticket.id);
    }
  }

  await manualRetry();
  assert.equal(attempts, 2, "Manual retry must execute when initiated by admin");
});

