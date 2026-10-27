import { useEffect, useState } from "react";

export const routes = {
  overview: { path: "#/", label: "Overview", roles: ["AUTHOR", "ADMIN"] },
  tickets: { path: "#/tickets", label: "My Tickets", roles: ["AUTHOR"] },
  books: { path: "#/books", label: "My Books", roles: ["AUTHOR"] },
  royalties: { path: "#/royalties", label: "Royalties", roles: ["AUTHOR"] },
  adminTickets: {
    path: "#/admin/tickets",
    label: "Ticket Queue",
    roles: ["ADMIN"],
  },
};

export function useHashRoute() {
  const [route, setRoute] = useState(window.location.hash || "#/");

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash || "#/");

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return route;
}

export function getRouteByPath(path) {
  return Object.values(routes).find((route) => route.path === path) || null;
}