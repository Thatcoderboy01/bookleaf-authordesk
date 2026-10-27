import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";

export default function AdminLayout({ children, navigation, routeLabel, user, logout }) {
  return (
    <div className="app-shell" data-layout="admin">
      <Sidebar logout={logout} navigation={navigation} user={user} />
      <main className="main-area">
        <Header routeLabel={routeLabel} user={user} />
        {children}
      </main>
    </div>
  );
}