export default function Header({ user, routeLabel }) {
  return (
    <header className="topbar">
      <div className="breadcrumbs">
        <span>Workspace</span>
        <span className="crumb-separator">/</span>
        <strong>{routeLabel}</strong>
      </div>
      <div className="topbar-actions">
        <span className="system-status"><span /> All systems operational</span>
        <button className="icon-button" aria-label="Notifications" type="button">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
        <div className="top-avatar">{user.name.slice(0, 2).toUpperCase()}</div>
      </div>
    </header>
  );
}