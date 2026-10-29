import { routes } from "../../../app/router.jsx";
import { getTicketTriageInfo } from "../ticket-triage.js";

function label(value) {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(value) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

export default function TicketCard({ ticket, basePath = routes.authorTickets.path }) {
  const isAdmin = basePath.includes("admin");

  const authorName = ticket.author?.name?.trim();
  const authorEmail = ticket.author?.email?.trim();
  let authorDisplay = "Author: Unknown author";

  if (authorName && authorEmail) {
    authorDisplay = `Author: ${authorName} (${authorEmail})`;
  } else if (authorName) {
    authorDisplay = `Author: ${authorName}`;
  } else if (authorEmail) {
    authorDisplay = `Author: ${authorEmail}`;
  }

  const { isUrgent, isAging, ageLabel } = getTicketTriageInfo(ticket);

  return (
    <a
      className={`author-ticket-card ${isUrgent ? "urgent-card" : ""} ${isAging ? "aging-card" : ""}`}
      href={`${basePath}/${encodeURIComponent(ticket.id)}`}
    >
      <div className="ticket-card-content">
        <div className="ticket-card-header">
          <span className="eyebrow">{ticket.id}</span>
          {isUrgent && (
            <span
              className="urgency-pill"
              role="status"
              title="Urgent unresolved ticket requiring prompt triage"
            >
              <span aria-hidden="true" className="urgency-dot" />
              Urgent attention
            </span>
          )}
          {isAging && (
            <span
              className="aging-pill"
              role="status"
              title="Oldest unresolved ticket: open for over a week"
            >
              <span aria-hidden="true" className="aging-dot" />
              Aging ticket
            </span>
          )}
          {isAdmin && (
            <span className="ticket-card-author" title={authorDisplay}>
              {authorDisplay}
            </span>
          )}
        </div>
        <h2>{ticket.subject}</h2>
        <p>
          <span>{label(ticket.category)}</span>
          {ticket.book?.title ? <span> · Book: {ticket.book.title}</span> : ""}
          <span> · Updated {formatDate(ticket.updatedAt)}</span>
        </p>
      </div>
      <div className="author-ticket-meta">
        <span className={`status-badge ${ticket.status.toLowerCase().replace("_", "-")}`}>
          <span />{label(ticket.status)}
        </span>
        <span className={`priority ${ticket.priority.toLowerCase()}`}>
          <span />{label(ticket.priority)}
        </span>
        <span className={`ticket-age ${isAging ? "aging" : ""}`}>
          {ageLabel}
        </span>
      </div>
    </a>
  );
}
