import { useState } from "react";
import { generateTicketDraft, sendTicketDraft, updateTicketDraft } from "../tickets.api.js";

export default function AiResponseDraft({ ticketId, onReplySent }) {
  const [draft, setDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleGenerate() {
    setIsGenerating(true);
    setError("");
    setNotice("");
    try {
      const generatedDraft = await generateTicketDraft(ticketId);
      setDraft(generatedDraft?.aiDraftResponse || "");
      setNotice("AI draft generated. Review and edit it before sending.");
    } catch (requestError) {
      setError(requestError.message || "Unable to generate an AI draft.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
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
      const savedDraft = await updateTicketDraft(ticketId, trimmedDraft);
      setDraft(savedDraft?.aiDraftResponse || trimmedDraft);
      setNotice("Draft saved.");
    } catch (requestError) {
      setError(requestError.message || "Unable to save the draft.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSend() {
    if (!draft.trim()) {
      setError("Generate or save a draft before sending.");
      return;
    }

    setIsSending(true);
    setError("");
    setNotice("");
    try {
      const reply = await sendTicketDraft(ticketId);
      onReplySent(reply);
      setNotice("Draft sent as a public reply.");
    } catch (requestError) {
      setError(requestError.message || "Unable to send the AI draft.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <article className="panel ai-draft-panel">
      <div className="panel-heading">
        <div><h2>AI response draft</h2><p>Generate a draft, review it, then send it manually.</p></div>
        <button className="text-button" disabled={isGenerating} onClick={handleGenerate} type="button">{isGenerating ? "Generating..." : "Generate draft"}</button>
      </div>
      {error && <div className="form-error ai-draft-message" role="alert">{error}</div>}
      {notice && <div className="ai-draft-notice" role="status">{notice}</div>}
      <div className="ai-draft-body">
        <textarea disabled={isGenerating || isSending} maxLength="5000" onChange={(event) => { setDraft(event.target.value); setError(""); setNotice(""); }} placeholder="Generated AI response will appear here..." rows="7" value={draft} />
        <div className="reply-form-footer">
          <span>{draft.length}/5000</span>
          <div className="ai-draft-actions">
            <button disabled={isSaving || isGenerating || isSending || !draft} onClick={handleSave} type="button">{isSaving ? "Saving..." : "Save draft"}</button>
            <button className="primary-button" disabled={isSaving || isGenerating || isSending || !draft} onClick={handleSend} type="button">{isSending ? "Sending..." : "Send draft"}</button>
          </div>
        </div>
      </div>
    </article>
  );
}