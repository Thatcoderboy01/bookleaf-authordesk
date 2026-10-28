import { useEffect, useState } from "react";

export const routes = {
  authorOverview: { path: "/author", label: "Overview", roles: ["AUTHOR"] },
  authorTickets: { path: "/author/tickets", label: "My Tickets", roles: ["AUTHOR"] },
  authorBooks: { path: "/author/books", label: "My Books", roles: ["AUTHOR"] },
  authorRoyalties: { path: "/author/royalties", label: "Royalties", roles: ["AUTHOR"] },
  adminOverview: { path: "/admin", label: "Overview", roles: ["ADMIN"] },
  adminTickets: { path: "/admin/tickets", label: "Ticket Queue", roles: ["ADMIN"] },
  login: { path: "/login", label: "Login", roles: [] },
};

export const roleOverviewPaths = {
  AUTHOR: routes.authorOverview.path,
  ADMIN: routes.adminOverview.path,
};

export function normalizePath(path) {
  if (path === "/") {
    return path;
  }

  return path.replace(/\/+$/, "") || "/";
}

export function navigate(path, { replace = false } = {}) {
  const normalizedPath = normalizePath(path);

  if (replace) {
    window.history.replaceState({}, "", normalizedPath);
  } else {
    window.history.pushState({}, "", normalizedPath);
  }

  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useBrowserRoute() {
  const [route, setRoute] = useState(() => {
    const currentPath = window.location.pathname || "/login";
    const normalizedPath = normalizePath(currentPath);

    if (normalizedPath !== currentPath) {
      window.history.replaceState({}, "", normalizedPath);
    }

    return normalizedPath;
  });

  useEffect(() => {
    const handlePopState = () => {
      const currentPath = window.location.pathname || "/login";
      const normalizedPath = normalizePath(currentPath);

      if (normalizedPath !== currentPath) {
        window.history.replaceState({}, "", normalizedPath);
      }

      setRoute(normalizedPath);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return route;
}

export function getRouteByPath(path) {
  if (path.startsWith(`${routes.authorBooks.path}/`)) {
    return routes.authorBooks;
  }
  if (path === `${routes.authorTickets.path}/new`) {
    return routes.authorTickets;
  }
  if (path.startsWith(`${routes.authorTickets.path}/`)) {
    return routes.authorTickets;
  }
  if (path.startsWith(`${routes.adminTickets.path}/`)) {
    return routes.adminTickets;
  }

  return Object.values(routes).find((route) => route.path === path) || null;
}
