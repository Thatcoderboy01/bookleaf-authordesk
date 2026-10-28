import { useEffect, useState } from "react";
import { routes } from "../../../app/router.jsx";
import { getTickets } from "../tickets.api.js";

const statuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const priorities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

function label(value) {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

export default function AdminOverviewPage() {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function loadDashboard() {
      try {
        const [recentResult, ...summaryResults] = await Promise.all([
          getTickets({ limit: 6, sortBy: "updatedAt", sortOrder: "desc" }),
          ...statuses.map((status) => getTickets({ limit: 1, status })),
          ...priorities.map((priority) => getTickets({ limit: 1, priority })),
        ]);

        if (isCurrent) {
          setDashboard({
            priorities: Object.fromEntries(
              priorities.map((priority, index) => [priority, summaryResults[statuses.length + index].pagination.total]),
            ),
            recentTickets: recentResult.tickets || [],
            statuses: Object.fromEntries(
              statuses.map((status, index) => [status, summaryResults[index].pagination.total]),
            ),
            total: recentResult.pagination?.total || 0,
          });
          setError("");
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.message || "Unable to load the admin dashboard.");
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadDashboard();
    return () => {
      isCurrent = false;
    };
  }, []);

  if (isLoading) {
    return <div className="page-content"><div className="loading-state">Loading admin dashboard...</div></div>;
  }

  if (error) {
    return (
      <div className="page-content">
        <section className="empty-state" role="alert">
          <span className="eyebrow">DASHBOARD UNAVAILABLE</span>
          <h1>We could not load the admin dashboard.</h1>
          <p>{error}</p>
          <button className="primary-button" onClick={() => window.location.reload()} type="button">Try again</button>
        </section>
      </div>
    );
  }

  if (!dashboard || dashboard.total === 0) {
    return (
      <div className="page-content">
        <section className="empty-state">
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>No tickets yet.</h1>
          <p>New author support requests will appear here when they are created.</p>
          <a className="primary-button" href={routes.adminTickets.path}>Open ticket queue</a>
        </section>
      </div>
    );
  }

  return (
    <div className="page-content admin-overview">
      <section className="admin-welcome">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Support overview</h1>
          <p>Monitor incoming author requests and keep the support queue moving.</p>
        </div>
        <a className="primary-button" href={routes.adminTickets.path}>Open ticket queue <span>→</span></a>
      </section>

      <section className="admin-summary-grid" aria-label="Ticket summary">
        <article className="admin-summary-card admin-summary-total">
          <span className="stat-label">Total tickets</span>
          <strong>{dashboard.total}</strong>
          <span>All author requests</span>
        </article>
        {statuses.map((status) => (
          <article className="admin-summary-card" key={status}>
            <span className="stat-label">{label(status)}</span>
            <strong>{dashboard.statuses[status]}</strong>
            <span>Current status</span>
          </article>
        ))}
      </section>

      <section className="admin-overview-grid">
        <article className="panel admin-recent-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent requests</h2>
              <p>Latest tickets by update time.</p>
            </div>
            <a className="text-button" href={routes.adminTickets.path}>View queue <span>→</span></a>
          </div>
          <div className="admin-recent-list">
            {dashboard.recentTickets.map((ticket) => (
              <a className="admin-recent-item" href={`${routes.adminTickets.path}/${encodeURIComponent(ticket.id)}`} key={ticket.id}>
                <div>
                  <strong>{ticket.subject}</strong>
                  <span>{ticket.id} · Updated {formatDate(ticket.updatedAt)}</span>
                </div>
                <span className={`status-badge ${ticket.status.toLowerCase().replace("_", "-")}`}>
                  <span />{label(ticket.status)}
                </span>
              </a>
            ))}
          </div>
        </article>

        <article className="panel admin-priority-panel">
          <div className="panel-heading">
            <div>
              <h2>Priority mix</h2>
              <p>Counts from the ticket queue.</p>
            </div>
          </div>
          <div className="admin-priority-list">
            {priorities.map((priority) => (
              <div className="admin-priority-row" key={priority}>
                <span className={`priority ${priority.toLowerCase()}`}><span />{label(priority)}</span>
                <strong>{dashboard.priorities[priority]}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
