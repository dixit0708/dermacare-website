// Callers pass full paths, including the /api prefix.

// FastAPI sends errors in three shapes:
//   {"detail": "text"}                  HTTPException with a string
//   {"detail": {"msg": "text", ...}}    HTTPException with extra fields (e.g. duplicate patient)
//   {"detail": [{"msg": "text", ...}]}  422 validation errors
function messageFromBody(status, data) {
  const detail = data && data.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail.map((d) => d.msg).join("; ");
  if (detail && typeof detail === "object" && detail.msg) return detail.msg;
  return `Request failed with status ${status}`;
}

// err.message is always readable text; err.response keeps the raw status and body.
export class ApiError extends Error {
  constructor(status, data) {
    super(messageFromBody(status, data));
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
