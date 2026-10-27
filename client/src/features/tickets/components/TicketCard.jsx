function label(value) {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

export default function TicketCard({ ticket, basePath = "#/tickets" }) {
  return (
    <a className="author-ticket-card" href={`${basePath}/${encodeURIComponent(ticket.id)}`}>
      <div>
        <span className="eyebrow">{ticket.id}</span>
        <h2>{ticket.subject}</h2>
        <p>{label(ticket.category)} · Updated {formatDate(ticket.updatedAt)}</p>
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