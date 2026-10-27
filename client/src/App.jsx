import LoginPage from "./features/auth/pages/LoginPage.jsx";
import AdminLayout from "./components/layout/AdminLayout.jsx";
import AuthorLayout from "./components/layout/AuthorLayout.jsx";
import { getRouteByPath, routes, useHashRoute } from "./app/router.jsx";
import MyBooksPage from "./features/books/pages/MyBooksPage.jsx";
import MyRoyaltiesPage from "./features/royalties/pages/MyRoyaltiesPage.jsx";
import CreateTicketPage from "./features/tickets/pages/CreateTicketPage.jsx";
import MyTicketsPage from "./features/tickets/pages/MyTicketsPage.jsx";
import TicketDetailsPage from "./features/tickets/pages/TicketDetailsPage.jsx";
import { useAuth } from "./hooks/useAuth.js";

const tickets = [
  {
    id: 'TKT-1042',
    subject: 'Royalty payment for September is missing',
    category: 'Payments',
    status: 'In Progress',
    priority: 'High',
    date: 'Oct 27, 2026',
  },
  {
    id: 'TKT-1041',
    subject: 'Need to update book cover',
    category: 'Book Updates',
    status: 'Open',
    priority: 'Medium',
    date: 'Oct 26, 2026',
  },
  {
    id: 'TKT-1038',
    subject: 'Correction required in author name',
    category: 'Book Updates',
    status: 'Resolved',
    priority: 'Low',
    date: 'Oct 24, 2026',
  },
  {
    id: 'TKT-1035',
    subject: 'Clarification regarding publishing charges',
    category: 'General',
    status: 'Resolved',
    priority: 'Medium',
    date: 'Oct 22, 2026',
  },
]

const navigation = [
  { icon: '◫', label: 'Overview', path: routes.overview.path },
  { icon: '▤', label: 'My Tickets', count: '4', path: routes.tickets.path },
  { icon: '▧', label: 'My Books', path: routes.books.path },
  { icon: '₹', label: 'Royalties', path: routes.royalties.path },
];

function App() {
  const { isAuthenticated, logout, user } = useAuth();
  const currentPath = useHashRoute();
  const currentRoute = getRouteByPath(currentPath);
  const bookId = currentPath.startsWith(`${routes.books.path}/`)
    ? decodeURIComponent(currentPath.slice(`${routes.books.path}/`.length))
    : null;
  const ticketId = currentPath.startsWith(`${routes.tickets.path}/`) && currentPath !== "#/tickets/new"
    ? decodeURIComponent(currentPath.slice(`${routes.tickets.path}/`.length))
    : null;

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
              <h1>Good afternoon, Test Author <span className="wave">✦</span></h1>
              <p className="welcome-description">
                Here's what's happening with your books and support requests.
              </p>
            </div>
            <button className="primary-button" type="button" onClick={() => window.alert('Ticket creation form is coming next.')}>
              <span>＋</span> Create a ticket
            </button>
          </section>

          <section className="stats-grid" aria-label="Support overview">
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Total tickets</span>
                <span className="stat-icon purple">▤</span>
              </div>
              <div className="stat-value">12</div>
              <div className="stat-foot"><span className="stat-neutral">All time</span> support requests</div>
            </article>
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Open tickets</span>
                <span className="stat-icon orange">◷</span>
              </div>
              <div className="stat-value">2</div>
              <div className="stat-foot"><span className="dot orange-dot" /> Awaiting a resolution</div>
            </article>
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">In progress</span>
                <span className="stat-icon blue">↗</span>
              </div>
              <div className="stat-value">1</div>
              <div className="stat-foot"><span className="dot blue-dot" /> Being reviewed by support</div>
            </article>
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Resolved</span>
                <span className="stat-icon green">✓</span>
              </div>
              <div className="stat-value">9</div>
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
                <button className="text-button" type="button" onClick={() => window.alert('My Tickets page is coming next.')}>
                  View all <span>→</span>
                </button>
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
                    {tickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td>
                          <div className="ticket-subject">{ticket.subject}</div>
                          <div className="ticket-meta">{ticket.id} <span>·</span> {ticket.category}</div>
                        </td>
                        <td>
                          <span className={`status-badge ${ticket.status.toLowerCase().replace(' ', '-')}`}>
                            <span />{ticket.status}
                          </span>
                        </td>
                        <td>
                          <span className={`priority ${ticket.priority.toLowerCase()}`}>
                            <span />{ticket.priority}
                          </span>
                        </td>
                        <td className="ticket-date">{ticket.date}</td>
                        <td><button className="row-menu" type="button" aria-label={`Open ${ticket.id}`} onClick={() => window.alert(`${ticket.id}: Ticket details will be connected next.`)}>↗</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="table-footer">
                <span>Showing 4 of 12 tickets</span>
                <button type="button" onClick={() => window.alert('My Tickets page is coming next.')}>View all tickets →</button>
              </div>
            </article>

            <aside className="right-column">
              <article className="panel quick-panel">
                <div className="panel-heading compact">
                  <div><h2>Quick actions</h2><p>What would you like to do?</p></div>
                </div>
                <button className="quick-action" type="button" onClick={() => window.alert('Ticket creation form is coming next.')}>
                  <span className="quick-icon purple">＋</span>
                  <span className="quick-copy"><strong>Raise a new ticket</strong><small>Get help from our team</small></span>
                  <span className="quick-arrow">→</span>
                </button>
                <button className="quick-action" type="button" onClick={() => window.alert('My Books page is coming next.')}>
                  <span className="quick-icon blue">▧</span>
                  <span className="quick-copy"><strong>Explore my books</strong><small>View your published titles</small></span>
                  <span className="quick-arrow">→</span>
                </button>
                <button className="quick-action" type="button" onClick={() => window.alert('Royalties page is coming next.')}>
                  <span className="quick-icon green">₹</span>
                  <span className="quick-copy"><strong>Check royalties</strong><small>Review your earnings</small></span>
                  <span className="quick-arrow">→</span>
                </button>
              </article>

              <article className="knowledge-card">
                <div className="knowledge-decoration">✳</div>
                <span className="knowledge-label">AUTHOR RESOURCES</span>
                <h3>A little guidance goes a long way.</h3>
                <p>Find answers to common questions about publishing, royalties, and your books.</p>
                <button type="button" onClick={() => window.alert('Knowledge base links will be added soon.')}>Explore help center <span>↗</span></button>
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
