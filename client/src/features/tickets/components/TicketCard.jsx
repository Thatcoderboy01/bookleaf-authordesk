import { routes } from "../../../app/router.jsx";

function label(value) {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(value) {
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

  return (
    <a className="author-ticket-card" href={`${basePath}/${encodeURIComponent(ticket.id)}`}>
      <div className="ticket-card-content">
        <div className="ticket-card-header">
          <span className="eyebrow">{ticket.id}</span>
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
      </div>
    </a>
  );
}
