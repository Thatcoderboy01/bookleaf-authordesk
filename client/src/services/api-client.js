const DEFAULT_API_BASE_URL = "http://localhost:5000/api";
const ACCESS_TOKEN_KEY = "bookleaf_access_token";

let unauthorizedHandler = null;

export class ApiError extends Error {
  constructor(message, { status = 0, data = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function getApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL;
  return (configuredUrl || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

function getRequestUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${getApiBaseUrl()}/${String(path).replace(/^\/+/, "")}`;
}

export function getAccessToken() {
  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

function getErrorMessage(payload, fallbackMessage) {
  if (payload && typeof payload.message === "string" && payload.message) {
    return payload.message;
  }

  return fallbackMessage;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
}

export function setAccessToken(token) {
  if (!token) {
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }

  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === "function" ? handler : null;

  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null;
    }
  };
}

export async function apiRequest(path, options = {}) {
  const { headers: customHeaders, ...requestOptions } = options;
  const token = getAccessToken();
  const headers = new Headers(customHeaders);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (
    requestOptions.body &&
    !(requestOptions.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(getRequestUrl(path), {
    ...requestOptions,
    headers,
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    const error = new ApiError(
      getErrorMessage(payload, `Request failed with status ${response.status}`),
      { status: response.status, data: payload },
    );

    if (response.status === 401 && unauthorizedHandler) {
      unauthorizedHandler(error);
    }

    throw error;
  }

  if (payload && payload.success === true && Object.hasOwn(payload, "data")) {
    return payload.data;
  }

  return payload;
}