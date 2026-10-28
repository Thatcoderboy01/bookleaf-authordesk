import { useEffect, useRef, useState } from "react";
import { generateTicketDraft, sendTicketDraft, updateTicketDraft } from "../tickets.api.js";

export default function AiResponseDraft({
  ticketId,
  initialDraft = "",
  onReplySent,
  onDraftUpdated,
}) {
  const [prevTicketId, setPrevTicketId] = useState(ticketId);
  const [prevInitialDraft, setPrevInitialDraft] = useState(initialDraft);
  const [draft, setDraft] = useState(initialDraft || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const activeTicketIdRef = useRef(ticketId);

  useEffect(() => {
    activeTicketIdRef.current = ticketId;
  }, [ticketId]);

  if (ticketId !== prevTicketId || initialDraft !== prevInitialDraft) {
    setPrevTicketId(ticketId);
    setPrevInitialDraft(initialDraft);
    setDraft(initialDraft || "");
    setError("");
    setNotice("");
  }

  async function handleGenerate() {
    const requestTicketId = ticketId;
    setIsGenerating(true);
    setError("");
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
      setError(requestError.message || "Unable to generate an AI draft.");
    } finally {
      if (activeTicketIdRef.current === requestTicketId) {
        setIsGenerating(false);
      }
    }
  }

  async function handleSave() {
    const requestTicketId = ticketId;
    const trimmedDraft = draft.trim();
    if (trimmedDraft.length < 20) {
      setError("Draft must be at least 20 characters.");
      return;
    }
    if (trimmedDraft.length > 5000) {
      setError("Draft must not exceed 5000 characters.");
      return;
    }

    setIsSaving(true);
    setError("");
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
      setError(requestError.message || "Unable to save the draft.");
    } finally {
      if (activeTicketIdRef.current === requestTicketId) {
        setIsSaving(false);
      }
    }
  }

  async function handleSend() {
    const requestTicketId = ticketId;
    if (!draft.trim()) {
      setError("Generate or save a draft before sending.");
      return;
    }

    setIsSending(true);
    setError("");
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
      setError(requestError.message || "Unable to send the AI draft.");
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
      {error && <div className="form-error ai-draft-message" role="alert">{error}</div>}
      {notice && <div className="ai-draft-notice" role="status">{notice}</div>}
      <div className="ai-draft-body">
        <textarea
          disabled={isGenerating || isSending}
          maxLength="5000"
          onChange={(event) => {
            setDraft(event.target.value);
            setError("");
            setNotice("");
          }}
          placeholder="Generated AI response will appear here..."
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
