import { useEffect, useState } from "react";
import TicketCard from "../components/TicketCard.jsx";
import TicketFilters from "../components/TicketFilters.jsx";
import { getTickets } from "../tickets.api.js";
import { routes } from "../../../app/router.jsx";

const initialFilters = { category: "", from: "", priority: "", status: "", to: "", page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" };

export default function MyTicketsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [result, setResult] = useState({ tickets: [], pagination: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    getTickets(filters).then((data) => {
      if (isCurrent) {
        setResult(data || { tickets: [], pagination: null });
        setError("");
      }
    }).catch((requestError) => {
      if (isCurrent) setError(requestError.message || "Unable to load tickets.");
    }).finally(() => {
      if (isCurrent) setIsLoading(false);
    });
    return () => { isCurrent = false; };
  }, [filters]);

  function handleFilterChange(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value, page: 1 }));
  }

  function movePage(page) {
    setFilters((current) => ({ ...current, page }));
  }

  return (
    <div className="page-content">
      <section className="books-heading"><div><span className="eyebrow">AUTHOR SUPPORT</span><h1>My tickets</h1><p>Track your support requests and their latest status.</p></div><a className="primary-button" href={`${routes.authorTickets.path}/new`}>＋ Create a ticket</a></section>
      <TicketFilters filters={filters} onChange={handleFilterChange} />
      {isLoading ? <div className="loading-state">Loading your tickets...</div> : error ? <section className="empty-state" role="alert"><span className="eyebrow">TICKETS UNAVAILABLE</span><h1>We could not load your tickets.</h1><p>{error}</p><button className="primary-button" onClick={() => setFilters({ ...filters })} type="button">Try again</button></section> : result.tickets.length === 0 ? <section className="empty-state"><span className="eyebrow">NO TICKETS</span><h1>No tickets match these filters.</h1><p>Create a support ticket or adjust the filters.</p><a className="primary-button" href={`${routes.authorTickets.path}/new`}>Create a ticket</a></section> : <section className="ticket-list">{result.tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}</section>}
      {result.pagination && result.pagination.totalPages > 1 && <div className="pagination"><button disabled={filters.page <= 1} onClick={() => movePage(filters.page - 1)} type="button">Previous</button><span>Page {result.pagination.page} of {result.pagination.totalPages}</span><button disabled={filters.page >= result.pagination.totalPages} onClick={() => movePage(filters.page + 1)} type="button">Next</button></div>}
    </div>
  );
}