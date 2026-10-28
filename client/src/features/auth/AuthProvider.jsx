import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  setUnauthorizedHandler,
} from "../../services/api-client.js";
import { login as loginRequest } from "./auth.api.js";
import { AuthContext } from "./auth-context.js";

const USER_KEY = "bookleaf_user";

function readStoredUser() {
  const storedUser = window.sessionStorage.getItem(USER_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    window.sessionStorage.removeItem(USER_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (
    getAccessToken() ? readStoredUser() : null
  ));

  const logout = useCallback(() => {
    clearAccessToken();
    window.sessionStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    const removeUnauthorizedHandler = setUnauthorizedHandler(() => {
      logout();
    });

    return removeUnauthorizedHandler;
  }, [logout]);

  const login = useCallback(async (credentials) => {
    const data = await loginRequest(credentials);

    if (!data?.accessToken || !data?.user) {
      throw new Error("Login response did not contain user authentication data");
    }

    setAccessToken(data.accessToken);
    window.sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);

    return data.user;
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user && getAccessToken()),
    login,
    logout,
  }), [login, logout, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}