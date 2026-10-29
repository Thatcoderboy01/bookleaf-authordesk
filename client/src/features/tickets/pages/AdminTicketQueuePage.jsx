import { useEffect, useState } from "react";
import TicketCard from "../components/TicketCard.jsx";
import TicketFilters from "../components/TicketFilters.jsx";
import { getSortOption, parseSortValue, SORT_OPTIONS } from "../ticket-sort.js";
import { getTickets } from "../tickets.api.js";
import { routes } from "../../../app/router.jsx";

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
    let isRequestInFlight = false;
    const filterSnapshot = filters;

    async function refreshQueue({ initial = false } = {}) {
      if (!isCurrent || isRequestInFlight) return;

      isRequestInFlight = true;
      try {
        const data = await getTickets(filterSnapshot);
        if (isCurrent) {
          setResult(data || { pagination: null, tickets: [] });
          setError("");
        }
      } catch (requestError) {
        if (isCurrent && initial) {
          setError(requestError.message || "Unable to load the ticket queue.");
        }
      } finally {
        isRequestInFlight = false;
        if (isCurrent && initial) setIsLoading(false);
      }
    }

    refreshQueue({ initial: true });
    const intervalId = window.setInterval(refreshQueue, 15000);

    return () => {
      isCurrent = false;
      window.clearInterval(intervalId);
    };
  }, [filters]);

  function handleFilterChange(event) {
    setFilters((current) => ({
      ...current,
      [event.target.name]: event.target.value,
      page: 1,
    }));
  }

  function handleSortChange(event) {
    const selected = parseSortValue(event.target.value);
    setFilters((current) => ({
      ...current,
      page: 1,
      sortBy: selected.sortBy,
      sortOrder: selected.sortOrder,
    }));
  }

  function movePage(page) {
    setFilters((current) => ({ ...current, page }));
  }

  const currentSortValue = getSortOption(filters.sortBy, filters.sortOrder).value;

  return (
    <div className="page-content">
      <section className="books-heading">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Ticket queue</h1>
          <p>Review and triage incoming author support requests.</p>
        </div>
      </section>
      <TicketFilters filters={filters} onChange={handleFilterChange}>
        <label>
          Sort by
          <select
            aria-label="Sort tickets by"
            name="sort"
            onChange={handleSortChange}
            value={currentSortValue}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </TicketFilters>
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
            <TicketCard basePath={routes.adminTickets.path} key={ticket.id} ticket={ticket} />
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
