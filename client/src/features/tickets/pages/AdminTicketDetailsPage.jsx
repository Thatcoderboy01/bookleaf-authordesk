import { useEffect, useState } from "react";
import TicketConversation from "../components/TicketConversation.jsx";
import AiResponseDraft from "../components/AiResponseDraft.jsx";
import {
  createInternalNote,
  createTicketReply,
  assignTicketToSelf,
  getInternalNotes,
  getTicketById,
  getTicketReplies,
  updateTicket,
} from "../tickets.api.js";

const statuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const categories = [
  "ROYALTY_PAYMENTS",
  "ISBN_METADATA_ISSUES",
  "PRINTING_QUALITY",
  "DISTRIBUTION_AVAILABILITY",
  "BOOK_STATUS_PRODUCTION",
  "GENERAL_INQUIRY",
];
const priorities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

function label(value) {
  return value.split("_").map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ");
}

export default function AdminTicketDetailsPage({ ticketId }) {
  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [notes, setNotes] = useState([]);
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    Promise.all([
      getTicketById(ticketId),
      getTicketReplies(ticketId),
      getInternalNotes(ticketId),
    ]).then(([ticketResult, repliesResult, notesResult]) => {
      if (isCurrent) {
        setTicket(ticketResult);
        setReplies(repliesResult);
        setNotes(notesResult);
      }
    }).catch((requestError) => {
      if (isCurrent) setError(requestError.message || "Unable to load this ticket.");
    }).finally(() => {
      if (isCurrent) setIsLoading(false);
    });

    return () => { isCurrent = false; };
  }, [ticketId]);

  async function handleTicketUpdate(event) {
    const { name, value } = event.target;
    setIsSaving(true);
    setActionError("");
    try {
      const updatedTicket = await updateTicket(ticketId, { [name]: value });
      setTicket((current) => ({ ...current, ...updatedTicket }));
    } catch (requestError) {
      setActionError(requestError.message || "Unable to update the ticket.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAssignToSelf() {
    setIsAssigning(true);
    setActionError("");
    try {
      const updatedTicket = await assignTicketToSelf(ticketId);
      setTicket((current) => ({ ...current, ...updatedTicket }));
    } catch (requestError) {
      setActionError(requestError.message || "Unable to assign the ticket.");
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleReplySubmit(event) {
    event.preventDefault();
    const message = reply.trim();
    if (!message) {
      setActionError("Reply message is required.");
      return;
    }
    setIsSaving(true);
    setActionError("");
    try {
      const createdReply = await createTicketReply(ticketId, message);
      setReplies((current) => [...current, createdReply]);
      setReply("");
    } catch (requestError) {
      setActionError(requestError.message || "Unable to send the reply.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleNoteSubmit(event) {
    event.preventDefault();
    const value = note.trim();
    if (!value) {
      setActionError("Internal note is required.");
      return;
    }
    setIsSaving(true);
    setActionError("");
    try {
      const createdNote = await createInternalNote(ticketId, value);
      setNotes((current) => [...current, createdNote]);
      setNote("");
    } catch (requestError) {
      setActionError(requestError.message || "Unable to add the internal note.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <div className="page-content"><div className="loading-state">Loading admin ticket...</div></div>;
  if (error || !ticket) return <div className="page-content"><section className="empty-state" role="alert"><span className="eyebrow">TICKET UNAVAILABLE</span><h1>We could not load this ticket.</h1><p>{error || "This ticket was not found."}</p><a className="primary-button" href="#/admin/tickets">Return to queue</a></section></div>;

  return (
    <div className="page-content">
      <a className="text-button" href="#/admin/tickets">← Back to queue</a>
      <section className="ticket-detail-heading"><div><span className="eyebrow">{ticket.id}</span><h1>{ticket.subject}</h1><p>{ticket.description}</p></div></section>
      {actionError && <div className="form-error" role="alert">{actionError}</div>}
      <section className="admin-ticket-layout">
        <article className="panel admin-controls">
          <div className="panel-heading"><div><h2>Ticket controls</h2><p>Update classification and status.</p></div></div>
          <div className="assignment-control">
            <span className="control-label">Assignment</span>
            <span className="assignment-value">{ticket.assignedToId ? "Assigned" : "Unassigned"}</span>
            <button className="secondary-button" disabled={isAssigning} onClick={handleAssignToSelf} type="button">{isAssigning ? "Assigning..." : "Assign to me"}</button>
          </div>
          <label>Status<select disabled={isSaving} name="status" onChange={handleTicketUpdate} value={ticket.status}>{statuses.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
          <label>Category<select disabled={isSaving} name="category" onChange={handleTicketUpdate} value={ticket.category}>{categories.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
          <label>Priority<select disabled={isSaving} name="priority" onChange={handleTicketUpdate} value={ticket.priority}>{priorities.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
        </article>
        <article className="panel conversation-panel">
          <div className="panel-heading"><div><h2>Public conversation</h2><p>Replies visible to the author.</p></div></div>
          <TicketConversation replies={replies} />
          <form className="reply-form" onSubmit={handleReplySubmit}><label htmlFor="admin-reply">Reply to author</label><textarea id="admin-reply" onChange={(event) => setReply(event.target.value)} rows="4" value={reply} /><div className="reply-form-footer"><span>{reply.length}/5000</span><button className="primary-button" disabled={isSaving} type="submit">Send reply</button></div></form>
        </article>
      </section>
      <section className="panel ai-classification-panel">
        <div className="panel-heading"><div><h2>AI classification suggestion</h2><p>Saved recommendation for admin review; final values remain editable above.</p></div></div>
        {ticket.aiSuggestedCategory || ticket.aiSuggestedPriority || ticket.aiClassificationNote ? (
          <div className="ai-classification-content">
            <div><span className="classification-label">Suggested category</span><strong>{ticket.aiSuggestedCategory ? label(ticket.aiSuggestedCategory) : "Not available"}</strong></div>
            <div><span className="classification-label">Suggested priority</span><strong>{ticket.aiSuggestedPriority ? label(ticket.aiSuggestedPriority) : "Not available"}</strong></div>
            <div className="classification-note"><span className="classification-label">Reasoning</span><p>{ticket.aiClassificationNote || "No reasoning was saved."}</p></div>
          </div>
        ) : (
          <p className="ai-classification-empty">No AI classification is available. The ticket can still be classified manually.</p>
        )}
      </section>
      <AiResponseDraft ticketId={ticketId} onReplySent={(createdReply) => setReplies((current) => [...current, createdReply])} />
      <section className="panel internal-notes-panel">
        <div className="panel-heading"><div><h2>Internal notes</h2><p>Visible only to administrators.</p></div></div>
        <div className="internal-notes-list">{notes.length === 0 ? <div className="table-empty-state">No internal notes yet.</div> : notes.map((item) => <article className="internal-note" key={item.id}><p>{item.note}</p></article>)}</div>
        <form className="reply-form" onSubmit={handleNoteSubmit}><label htmlFor="internal-note">Add internal note</label><textarea id="internal-note" onChange={(event) => setNote(event.target.value)} rows="3" value={note} /><div className="reply-form-footer"><span>{note.length}/5000</span><button className="primary-button" disabled={isSaving} type="submit">Add note</button></div></form>
      </section>
    </div>
  );
}
