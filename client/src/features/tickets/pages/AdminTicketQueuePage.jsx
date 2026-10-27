import { useEffect, useState } from "react";
import TicketCard from "../components/TicketCard.jsx";
import TicketFilters from "../components/TicketFilters.jsx";
import { getTickets } from "../tickets.api.js";

const initialFilters = {
  category: "",
  from: "",
  limit: 10,
  page: 1,
  priority: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  status: "",
  to: "",
};

export default function AdminTicketQueuePage() {
  const [filters, setFilters] = useState(initialFilters);
  const [result, setResult] = useState({ pagination: null, tickets: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    getTickets(filters).then((data) => {
      if (isCurrent) {
        setResult(data || { pagination: null, tickets: [] });
        setError("");
      }
    }).catch((requestError) => {
      if (isCurrent) setError(requestError.message || "Unable to load the ticket queue.");
    }).finally(() => {
      if (isCurrent) setIsLoading(false);
    });

    return () => { isCurrent = false; };
  }, [filters]);

  function handleFilterChange(event) {
    setFilters((current) => ({
      ...current,
      [event.target.name]: event.target.value,
      page: 1,
    }));
  }

  function movePage(page) {
    setFilters((current) => ({ ...current, page }));
  }

  return (
    <div className="page-content">
      <section className="books-heading">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Ticket queue</h1>
          <p>Review and triage incoming author support requests.</p>
        </div>
      </section>
      <TicketFilters filters={filters} onChange={handleFilterChange} />
      {isLoading ? (
        <div className="loading-state">Loading ticket queue...</div>
      ) : error ? (
        <section className="empty-state" role="alert">
          <span className="eyebrow">QUEUE UNAVAILABLE</span>
          <h1>We could not load the ticket queue.</h1>
          <p>{error}</p>
          <button className="primary-button" onClick={() => setFilters({ ...filters })} type="button">Try again</button>
        </section>
      ) : result.tickets.length === 0 ? (
        <section className="empty-state">
          <span className="eyebrow">QUEUE IS CLEAR</span>
          <h1>No tickets match these filters.</h1>
          <p>Try adjusting the filters to see more support requests.</p>
        </section>
      ) : (
        <section className="ticket-list">
          {result.tickets.map((ticket) => (
            <TicketCard basePath="#/admin/tickets" key={ticket.id} ticket={ticket} />
          ))}
        </section>
      )}
      {result.pagination && result.pagination.totalPages > 1 && (
        <div className="pagination">
          <button disabled={filters.page <= 1} onClick={() => movePage(filters.page - 1)} type="button">Previous</button>
          <span>Page {result.pagination.page} of {result.pagination.totalPages}</span>
          <button disabled={filters.page >= result.pagination.totalPages} onClick={() => movePage(filters.page + 1)} type="button">Next</button>
        </div>
      )}
    </div>
  );
}