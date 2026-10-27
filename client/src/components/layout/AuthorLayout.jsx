import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";

export default function AuthorLayout({ children, navigation, routeLabel, user, logout }) {
  return (
    <div className="app-shell" data-layout="author">
      <Sidebar logout={logout} navigation={navigation} user={user} />
      <main className="main-area">
        <Header routeLabel={routeLabel} user={user} />
        {children}
      </main>
    </div>
  );
}