// Small fetch wrapper for the admin API. Paths include the /api prefix.

export class ApiError extends Error {
  constructor(status, data) {
    super((data && data.detail) ? (Array.isArray(data.detail) ? JSON.stringify(data.detail) : String(data.detail)) : `Request failed with status ${status}`);
    this.response = { status, data };
  }
}

function buildUrl(path, params) {
  let url = path;
  if (params) {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
    if (entries.length) url += (url.includes("?") ? "&" : "?") + new URLSearchParams(entries).toString();
  }
  return url;
}

async function request(method, path, { params, data } = {}) {
  const token = sessionStorage.getItem("access_token");
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let body;
  if (data !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(data);
  }

  const res = await fetch(buildUrl(path, params), { method, headers, body });

  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }

  // An expired/invalid session sends the user back to login. A wrong password on
  // the login form itself is also a 401, but that must just show the error.
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    sessionStorage.removeItem("access_token");
    window.location.href = "/admin";
    throw new ApiError(401, json);
  }

  if (!res.ok) throw new ApiError(res.status, json);
  return { data: json, status: res.status };
}

const api = {
  get: (path, config) => request("GET", path, config),
  post: (path, data) => request("POST", path, { data }),
  put: (path, data) => request("PUT", path, { data }),
  patch: (path, data) => request("PATCH", path, { data }),
  delete: (path) => request("DELETE", path),
};

export default api;
