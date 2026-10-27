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
        <button className="icon-button" aria-label="Notifications" type="button">♧</button>
        <div className="top-avatar">{user.name.slice(0, 2).toUpperCase()}</div>
      </div>
    </header>
  );
}