import { useEffect, useState } from "react";
import TicketConversation from "../components/TicketConversation.jsx";
import { createTicketReply, getTicketById, getTicketReplies } from "../tickets.api.js";

function label(value) {
  return value.split("_").map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ");
}

export default function TicketDetailsPage({ ticketId }) {
  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [replyError, setReplyError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function loadTicket() {
      try {
        const [ticketResult, repliesResult] = await Promise.all([
          getTicketById(ticketId),
          getTicketReplies(ticketId),
        ]);
        if (isCurrent) {
          setTicket(ticketResult);
          setReplies(repliesResult);
          setError("");
        }
      } catch (requestError) {
        if (isCurrent) setError(requestError.message || "Unable to load this ticket.");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadTicket();
    return () => { isCurrent = false; };
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId || !ticket) return undefined;

    let isCurrent = true;
    const intervalId = window.setInterval(async () => {
      try {
        const latestReplies = await getTicketReplies(ticketId);
        if (isCurrent) setReplies(latestReplies);
      } catch {
        // Keep the existing conversation visible when a background refresh fails.
      }
    }, 15000);

    return () => {
      isCurrent = false;
      window.clearInterval(intervalId);
    };
  }, [ticket, ticketId]);

  async function handleReplySubmit(event) {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setReplyError("Reply message is required");
      return;
    }
    if (trimmedMessage.length > 5000) {
      setReplyError("Reply must not exceed 5000 characters");
      return;
    }

    setIsSending(true);
    setReplyError("");
    try {
      const reply = await createTicketReply(ticketId, trimmedMessage);
      setReplies((currentReplies) => [...currentReplies, reply]);
      setMessage("");
    } catch (requestError) {
      setReplyError(requestError.message || "Unable to send your reply.");
    } finally {
      setIsSending(false);
    }
  }

  if (isLoading) {
    return <div className="page-content"><div className="loading-state">Loading ticket...</div></div>;
  }

  if (error || !ticket) {
    return <div className="page-content"><section className="empty-state" role="alert"><span className="eyebrow">TICKET UNAVAILABLE</span><h1>We could not load this ticket.</h1><p>{error || "This ticket was not found or is not accessible to your account."}</p><a className="primary-button" href="#/tickets">Return to tickets</a></section></div>;
  }

  return (
    <div className="page-content">
      <a className="text-button" href="#/tickets">← Back to tickets</a>
      <section className="ticket-detail-heading">
        <div><span className="eyebrow">{ticket.id}</span><h1>{ticket.subject}</h1><p>{label(ticket.category)} · {label(ticket.status)} · {label(ticket.priority)}</p></div>
      </section>
      <article className="ticket-description"><span className="eyebrow">REQUEST DETAILS</span><p>{ticket.description}</p></article>
      <section className="panel conversation-panel">
        <div className="panel-heading"><div><h2>Conversation</h2><p>Replies from you and BookLeaf Support.</p></div></div>
        <TicketConversation replies={replies} />
        <form className="reply-form" onSubmit={handleReplySubmit}>
          {replyError && <div className="form-error" role="alert">{replyError}</div>}
          <label htmlFor="ticket-reply">Add a reply</label>
          <textarea id="ticket-reply" maxLength="5000" onChange={(event) => { setMessage(event.target.value); setReplyError(""); }} placeholder="Write your reply..." rows="5" value={message} />
          <div className="reply-form-footer"><span>{message.length}/5000</span><button className="primary-button" disabled={isSending} type="submit">{isSending ? "Sending..." : "Send reply"}</button></div>
        </form>
      </section>
    </div>
  );
}