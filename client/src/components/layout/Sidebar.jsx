import { routes } from "../../app/router.jsx";

export default function Sidebar({ navigation, user, logout }) {
  return (
    <aside className="sidebar">
      <a className="brand" href={user.role === "ADMIN" ? routes.adminOverview.path : routes.authorOverview.path} aria-label="BookLeaf AuthorDesk home">
        <span className="brand-mark">B</span>
        <span>BookLeaf<span className="brand-light">Desk</span>
          <small>AUTHOR SUPPORT PORTAL</small>
        </span>
      </a>

      <div className="workspace-label">WORKSPACE</div>
      <nav className="navigation" aria-label="Workspace navigation">
        {navigation.map((item) => (
          <a
            className={`nav-item ${item.active ? 'active' : ''}`}
            href={item.path}
            key={item.label}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.count && <span className="nav-count">{item.count}</span>}
          </a>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="help-card">
          <span className="help-icon">✳</span>
          <strong>Need some help?</strong>
          <p>Our support team is here for you.</p>
          <a href={user.role === "ADMIN" ? routes.adminTickets.path : routes.authorTickets.path}>Contact support <span>↗</span></a>
        </div>
        <div className="profile">
          <div className="avatar">{user.name.slice(0, 2).toUpperCase()}</div>
          <div className="profile-info">
            <strong>{user.name}</strong>
            <span>{user.role === "ADMIN" ? "Administrator" : "Author account"}</span>
          </div>
          <button className="profile-menu" onClick={logout} type="button">Log out</button>
        </div>
      </div>
    </aside>
  );
}