import { useEffect, useState } from "react";
import LoginPage from "./features/auth/pages/LoginPage.jsx";
import AdminLayout from "./components/layout/AdminLayout.jsx";
import AuthorLayout from "./components/layout/AuthorLayout.jsx";
import { getRouteByPath, routes, useHashRoute } from "./app/router.jsx";
import MyBooksPage from "./features/books/pages/MyBooksPage.jsx";
import MyRoyaltiesPage from "./features/royalties/pages/MyRoyaltiesPage.jsx";
import CreateTicketPage from "./features/tickets/pages/CreateTicketPage.jsx";
import MyTicketsPage from "./features/tickets/pages/MyTicketsPage.jsx";
import TicketDetailsPage from "./features/tickets/pages/TicketDetailsPage.jsx";
import AdminTicketQueuePage from "./features/tickets/pages/AdminTicketQueuePage.jsx";
import AdminTicketDetailsPage from "./features/tickets/pages/AdminTicketDetailsPage.jsx";
import { getTickets } from "./features/tickets/tickets.api.js";
import { useAuth } from "./hooks/useAuth.js";

const navigation = [
  { icon: '◫', label: 'Overview', path: routes.overview.path },
  { icon: '▤', label: 'My Tickets', count: '4', path: routes.tickets.path },
  { icon: '▧', label: 'My Books', path: routes.books.path },
  { icon: '₹', label: 'Royalties', path: routes.royalties.path },
];

function App() {
  const { isAuthenticated, logout, user } = useAuth();
  const [overviewTickets, setOverviewTickets] = useState([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const currentPath = useHashRoute();
  const currentRoute = getRouteByPath(currentPath);
  const bookId = currentPath.startsWith(`${routes.books.path}/`)
    ? decodeURIComponent(currentPath.slice(`${routes.books.path}/`.length))
    : null;
  const ticketId = currentPath.startsWith(`${routes.tickets.path}/`) && currentPath !== "#/tickets/new"
    ? decodeURIComponent(currentPath.slice(`${routes.tickets.path}/`.length))
    : null;
  const adminTicketId = currentPath.startsWith(`${routes.adminTickets.path}/`)
    ? decodeURIComponent(currentPath.slice(`${routes.adminTickets.path}/`.length))
    : null;

  useEffect(() => {
    if (!isAuthenticated || currentRoute !== routes.overview) {
      return undefined;
    }

    let isCurrent = true;
    getTickets({ limit: 4, sortBy: "updatedAt", sortOrder: "desc" })
      .then((data) => {
        if (isCurrent) {
          setOverviewTickets(data?.tickets || []);
          setOverviewError("");
        }
      })
      .catch((error) => {
        if (isCurrent) setOverviewError(error.message || "Unable to load ticket summary.");
      })
      .finally(() => {
        if (isCurrent) setOverviewLoading(false);
      });

    return () => { isCurrent = false; };
  }, [currentRoute, isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const isAllowedRoute = currentRoute?.roles.includes(user.role);
  const layoutNavigation = user.role === "ADMIN"
    ? [...navigation, {
      icon: '▤',
      label: 'Ticket Queue',
      path: routes.adminTickets.path,
    }]
    : navigation;
  const activeNavigation = layoutNavigation.map((item) => ({
    ...item,
    active: item.path === currentPath,
  }));
  const Layout = user.role === "ADMIN" ? AdminLayout : AuthorLayout;

  const ticketCounts = overviewTickets.reduce((counts, ticket) => {
    counts[ticket.status] = (counts[ticket.status] || 0) + 1;
    return counts;
  }, {});
  const totalTickets = overviewTickets.length;
  const openTickets = ticketCounts.OPEN || 0;
  const inProgressTickets = ticketCounts.IN_PROGRESS || 0;
  const resolvedTickets = (ticketCounts.RESOLVED || 0) + (ticketCounts.CLOSED || 0);

  return (
    <Layout
      logout={logout}
      navigation={activeNavigation}
      routeLabel={currentRoute?.label || "Not found"}
      user={user}
    >
      <div className="page-content">
        {!currentRoute || !isAllowedRoute ? (
          <section className="empty-state" aria-live="polite">
            <span className="eyebrow">ACCESS RESTRICTED</span>
            <h1>You do not have access to this workspace.</h1>
            <p>Use the navigation available for your account to continue.</p>
            <a className="primary-button" href="#/">Return to overview</a>
          </section>
        ) : currentRoute === routes.books ? (
          <MyBooksPage bookId={bookId} />
        ) : currentRoute === routes.royalties ? (
          <MyRoyaltiesPage />
        ) : currentRoute === routes.tickets ? (
          currentPath === "#/tickets/new"
            ? <CreateTicketPage onCreated={() => { window.location.hash = "#/tickets"; }} />
            : ticketId
              ? <TicketDetailsPage ticketId={ticketId} />
            : <MyTicketsPage />
        ) : currentRoute === routes.adminTickets ? (
          adminTicketId ? (
            <AdminTicketDetailsPage ticketId={adminTicketId} />
          ) : <AdminTicketQueuePage />
        ) : currentRoute !== routes.overview ? (
          <section className="empty-state" aria-live="polite">
            <span className="eyebrow">COMING NEXT</span>
            <h1>{currentRoute.label}</h1>
            <p>This workspace is reserved for the next implementation task.</p>
            <a className="primary-button" href="#/">Return to overview</a>
          </section>
        ) : (
          <>
          <section className="welcome-row">
            <div>
              <div className="eyebrow">MONDAY, OCTOBER 27, 2026</div>
              <h1>Good afternoon, {user.name} <span className="wave">✦</span></h1>
              <p className="welcome-description">
                Here's what's happening with your books and support requests.
              </p>
            </div>
            <a className="primary-button" href={user.role === "ADMIN" ? "#/admin/tickets" : "#/tickets/new"}>
              <span>＋</span> Create a ticket
            </a>
          </section>

          <section className="stats-grid" aria-label="Support overview">
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Total tickets</span>
                <span className="stat-icon purple">▤</span>
              </div>
              <div className="stat-value">{overviewLoading ? "—" : totalTickets}</div>
              <div className="stat-foot"><span className="stat-neutral">Recent</span> support requests</div>
            </article>
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Open tickets</span>
                <span className="stat-icon orange">◷</span>
              </div>
              <div className="stat-value">{overviewLoading ? "—" : openTickets}</div>
              <div className="stat-foot"><span className="dot orange-dot" /> Awaiting a resolution</div>
            </article>
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">In progress</span>
                <span className="stat-icon blue">↗</span>
              </div>
              <div className="stat-value">{overviewLoading ? "—" : inProgressTickets}</div>
              <div className="stat-foot"><span className="dot blue-dot" /> Being reviewed by support</div>
            </article>
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Resolved</span>
                <span className="stat-icon green">✓</span>
              </div>
              <div className="stat-value">{overviewLoading ? "—" : resolvedTickets}</div>
              <div className="stat-foot"><span className="dot green-dot" /> Successfully completed</div>
            </article>
          </section>

          <section className="content-grid">
            <article className="panel tickets-panel">
              <div className="panel-heading">
                <div>
                  <h2>Recent tickets</h2>
                  <p>Track and manage your support requests.</p>
                </div>
                <a className="text-button" href={user.role === "ADMIN" ? "#/admin/tickets" : "#/tickets"}>
                  View all <span>→</span>
                </a>
              </div>

              <div className="ticket-table-wrap">
                <table className="ticket-table">
                  <thead>
                    <tr>
                      <th>SUBJECT</th>
                      <th>STATUS</th>
                      <th>PRIORITY</th>
                      <th>LAST UPDATED</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {overviewTickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td>
                          <div className="ticket-subject">{ticket.subject}</div>
                          <div className="ticket-meta">{ticket.id} <span>·</span> {ticket.category.replaceAll("_", " ")}</div>
                        </td>
                        <td>
                          <span className={`status-badge ${ticket.status.toLowerCase().replace("_", "-")}`}>
                          <span />{ticket.status.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td>
                          <span className={`priority ${ticket.priority.toLowerCase()}`}>
                            <span />{ticket.priority}
                          </span>
                        </td>
                        <td className="ticket-date">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(ticket.updatedAt))}</td>
                        <td><a className="row-menu" href={`${user.role === "ADMIN" ? "#/admin/tickets" : "#/tickets"}/${encodeURIComponent(ticket.id)}`} aria-label={`Open ${ticket.id}`}>↗</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="table-footer">
                <span>{overviewError || `Showing ${overviewTickets.length} recent tickets`}</span>
                <a href={user.role === "ADMIN" ? "#/admin/tickets" : "#/tickets"}>View all tickets →</a>
              </div>
            </article>

            <aside className="right-column">
              <article className="panel quick-panel">
                <div className="panel-heading compact">
                  <div><h2>Quick actions</h2><p>What would you like to do?</p></div>
                </div>
                <a className="quick-action" href={user.role === "ADMIN" ? "#/admin/tickets" : "#/tickets/new"}>
                  <span className="quick-icon purple">＋</span>
                  <span className="quick-copy"><strong>Raise a new ticket</strong><small>Get help from our team</small></span>
                  <span className="quick-arrow">→</span>
                </a>
                <a className="quick-action" href="#/books">
                  <span className="quick-icon blue">▧</span>
                  <span className="quick-copy"><strong>Explore my books</strong><small>View your published titles</small></span>
                  <span className="quick-arrow">→</span>
                </a>
                <a className="quick-action" href="#/royalties">
                  <span className="quick-icon green">₹</span>
                  <span className="quick-copy"><strong>Check royalties</strong><small>Review your earnings</small></span>
                  <span className="quick-arrow">→</span>
                </a>
              </article>

              <article className="knowledge-card">
                <div className="knowledge-decoration">✳</div>
                <span className="knowledge-label">AUTHOR RESOURCES</span>
                <h3>A little guidance goes a long way.</h3>
                <p>Find answers to common questions about publishing, royalties, and your books.</p>
                <a href="#/tickets">Explore support options <span>↗</span></a>
              </article>
            </aside>
          </section>

          <footer className="page-footer">
            <span>© 2026 BookLeaf AuthorDesk</span>
            <span>Made for authors, with care <span className="footer-heart">♥</span></span>
          </footer>
          </>
        )}
        </div>
    </Layout>
  )
}

export default App
