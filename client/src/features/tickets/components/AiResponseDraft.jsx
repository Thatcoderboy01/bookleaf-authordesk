import { useEffect, useRef, useState } from "react";
import { generateTicketDraft, sendTicketDraft, updateTicketDraft } from "../tickets.api.js";
import {
  finishInFlightGeneration,
  hasAttemptedAutoGeneration,
  hasInFlightGeneration,
  markAttemptedAutoGeneration,
  startInFlightGeneration,
} from "../ai-draft-session.js";

function extractErrorDetails(requestError) {
  const message =
    requestError?.message ||
    "Unable to generate an AI draft right now. Please try again.";
  const code = requestError?.data?.code || requestError?.code || null;
  const retryHint =
    requestError?.data?.retryHint || requestError?.retryHint || null;

  let heading = "Unable to Generate AI Draft";
  if (code === "AI_QUOTA_EXCEEDED") {
    heading = "AI Quota Limit Reached";
  } else if (code === "AI_CONFIGURATION_ERROR") {
    heading = "AI Configuration Issue";
  } else if (code === "AI_PROVIDER_UNAVAILABLE") {
    heading = "AI Service Temporarily Unavailable";
  } else if (code === "AI_INVALID_RESPONSE") {
    heading = "AI Response Format Error";
  }

  return { heading, message, code, retryHint };
}

export default function AiResponseDraft({
  ticketId,
  initialDraft = "",
  ticketStatus = "OPEN",
  userRole = "ADMIN",
  onReplySent,
  onDraftUpdated,
}) {
  const [prevTicketId, setPrevTicketId] = useState(ticketId);
  const [prevInitialDraft, setPrevInitialDraft] = useState(initialDraft);
  const [draft, setDraft] = useState(initialDraft || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);
  const [notice, setNotice] = useState("");

  const activeTicketIdRef = useRef(ticketId);

  useEffect(() => {
    activeTicketIdRef.current = ticketId;
  }, [ticketId]);

  // Adjust state at render time when switching tickets or receiving a new initial draft
  if (ticketId !== prevTicketId || initialDraft !== prevInitialDraft) {
    setPrevTicketId(ticketId);
    setPrevInitialDraft(initialDraft);
    setDraft(initialDraft || "");
    setErrorInfo(null);
    setNotice("");
  }

  // Automatic AI draft presentation on ticket open
  useEffect(() => {
    activeTicketIdRef.current = ticketId;

    const hasSavedDraft = Boolean(initialDraft && initialDraft.trim());
    const isEligibleStatus = ticketStatus === "OPEN" || ticketStatus === "IN_PROGRESS";
    const isAdmin = userRole === "ADMIN";

    // Auto-generate only when:
    // 1. No saved draft exists
    // 2. Ticket status is OPEN or IN_PROGRESS (never for RESOLVED or CLOSED)
    // 3. Current user is an authenticated ADMIN
    // 4. Has not already been attempted or currently in-flight for this ticket
    if (
      !hasSavedDraft &&
      isEligibleStatus &&
      isAdmin &&
      !hasAttemptedAutoGeneration(ticketId) &&
      !hasInFlightGeneration(ticketId)
    ) {
      markAttemptedAutoGeneration(ticketId);
      startInFlightGeneration(ticketId);

      const requestTicketId = ticketId;
      let isCurrent = true;

      queueMicrotask(async () => {
        if (!isCurrent || activeTicketIdRef.current !== requestTicketId) {
          finishInFlightGeneration(requestTicketId);
          return;
        }

        setIsGenerating(true);
        setErrorInfo(null);
        setNotice("");

        try {
          const generatedDraft = await generateTicketDraft(requestTicketId);
          if (!isCurrent || activeTicketIdRef.current !== requestTicketId) return;
          const nextDraft = generatedDraft?.aiDraftResponse || "";
          setDraft(nextDraft);
          setNotice("AI draft generated automatically. Review and edit it before sending.");
          onDraftUpdated?.(nextDraft);
        } catch (requestError) {
          if (!isCurrent || activeTicketIdRef.current !== requestTicketId) return;
          setErrorInfo(extractErrorDetails(requestError));
        } finally {
          finishInFlightGeneration(requestTicketId);
          if (isCurrent && activeTicketIdRef.current === requestTicketId) {
            setIsGenerating(false);
          }
        }
      });

      return () => {
        isCurrent = false;
        finishInFlightGeneration(requestTicketId);
      };
    }
  }, [ticketId, initialDraft, ticketStatus, userRole, onDraftUpdated]);

  async function handleGenerate() {
    const requestTicketId = ticketId;
    markAttemptedAutoGeneration(requestTicketId);
    startInFlightGeneration(requestTicketId);

    setIsGenerating(true);
    setErrorInfo(null);
    setNotice("");
    try {
      const generatedDraft = await generateTicketDraft(requestTicketId);
      if (activeTicketIdRef.current !== requestTicketId) return;
      const nextDraft = generatedDraft?.aiDraftResponse || "";
      setDraft(nextDraft);
      setNotice("AI draft generated. Review and edit it before sending.");
      onDraftUpdated?.(nextDraft);
    } catch (requestError) {
      if (activeTicketIdRef.current !== requestTicketId) return;
      setErrorInfo(extractErrorDetails(requestError));
    } finally {
      finishInFlightGeneration(requestTicketId);
      if (activeTicketIdRef.current === requestTicketId) {
        setIsGenerating(false);
      }
    }
  }

  async function handleSave() {
    const requestTicketId = ticketId;
    const trimmedDraft = draft.trim();
    if (trimmedDraft.length < 20) {
      setErrorInfo({
        heading: "Draft Validation Error",
        message: "Draft must be at least 20 characters.",
        code: "VALIDATION_ERROR",
        retryHint: null,
      });
      return;
    }
    if (trimmedDraft.length > 5000) {
      setErrorInfo({
        heading: "Draft Validation Error",
        message: "Draft must not exceed 5000 characters.",
        code: "VALIDATION_ERROR",
        retryHint: null,
      });
      return;
    }

    setIsSaving(true);
    setErrorInfo(null);
    setNotice("");
    try {
      const savedDraft = await updateTicketDraft(requestTicketId, trimmedDraft);
      if (activeTicketIdRef.current !== requestTicketId) return;
      const nextDraft = savedDraft?.aiDraftResponse || trimmedDraft;
      setDraft(nextDraft);
      setNotice("Draft saved.");
      onDraftUpdated?.(nextDraft);
    } catch (requestError) {
      if (activeTicketIdRef.current !== requestTicketId) return;
      setErrorInfo(extractErrorDetails(requestError));
    } finally {
      if (activeTicketIdRef.current === requestTicketId) {
        setIsSaving(false);
      }
    }
  }

  async function handleSend() {
    const requestTicketId = ticketId;
    if (!draft.trim()) {
      setErrorInfo({
        heading: "Draft Missing",
        message: "Generate or save a draft before sending.",
        code: "VALIDATION_ERROR",
        retryHint: null,
      });
      return;
    }

    setIsSending(true);
    setErrorInfo(null);
    setNotice("");
    try {
      const reply = await sendTicketDraft(requestTicketId);
      if (activeTicketIdRef.current !== requestTicketId) return;
      // Clear the draft in the UI after a successful send
      setDraft("");
      setNotice("Draft sent as a public reply.");
      onReplySent?.(reply);
      onDraftUpdated?.("");
    } catch (requestError) {
      if (activeTicketIdRef.current !== requestTicketId) return;
      // Preserve draft in the UI when sending fails
      setErrorInfo(extractErrorDetails(requestError));
    } finally {
      if (activeTicketIdRef.current === requestTicketId) {
        setIsSending(false);
      }
    }
  }

  return (
    <article className="panel ai-draft-panel">
      <div className="panel-heading">
        <div>
          <h2>AI response draft</h2>
          <p>Generate a draft, review it, then send it manually.</p>
        </div>
        <button
          className="text-button"
          disabled={isGenerating}
          onClick={handleGenerate}
          type="button"
        >
          {isGenerating ? "Generating..." : "Generate draft"}
        </button>
      </div>
      {isGenerating && (
        <div className="ai-draft-generating" role="status">
          Generating AI response draft...
        </div>
      )}
      {errorInfo && (
        <div className="form-error ai-draft-message" role="alert">
          <div className="ai-draft-error-header">
            <strong>{errorInfo.heading}</strong>
          </div>
          <p className="ai-draft-error-text">{errorInfo.message}</p>
          {errorInfo.retryHint && (
            <p className="ai-draft-retry-hint">
              <span aria-hidden="true">⏱ </span>
              {errorInfo.retryHint}
            </p>
          )}
          <div className="ai-draft-error-actions">
            <button
              className="text-button inline-retry"
              disabled={isGenerating}
              onClick={handleGenerate}
              type="button"
            >
              Try again
            </button>
          </div>
        </div>
      )}
      {notice && <div className="ai-draft-notice" role="status">{notice}</div>}
      <div className="ai-draft-body">
        <textarea
          disabled={isGenerating || isSending}
          maxLength="5000"
          onChange={(event) => {
            setDraft(event.target.value);
            setErrorInfo(null);
            setNotice("");
          }}
          placeholder={
            isGenerating
              ? "Generating AI response draft..."
              : "Generated AI response will appear here..."
          }
          rows="7"
          value={draft}
        />
        <div className="reply-form-footer">
          <span>{draft.length}/5000</span>
          <div className="ai-draft-actions">
            <button
              disabled={isSaving || isGenerating || isSending || !draft}
              onClick={handleSave}
              type="button"
            >
              {isSaving ? "Saving..." : "Save draft"}
            </button>
            <button
              className="primary-button"
              disabled={isSaving || isGenerating || isSending || !draft}
              onClick={handleSend}
              type="button"
            >
              {isSending ? "Sending..." : "Send draft"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
