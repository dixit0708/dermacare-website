// Session helpers. The logged-in user is kept in sessionStorage.

function parseJwt(token) {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(decoded)));
  } catch (e) {
    try {
      return JSON.parse(atob(token.split(".")[1]));
    } catch (e2) {
      return null;
    }
  }
}

export function getUser() {
  const token = sessionStorage.getItem("access_token");
  return token ? parseJwt(token) : null;
}

export function isAuthenticated() {
  return !!sessionStorage.getItem("access_token");
}

export function login(token) {
  sessionStorage.setItem("access_token", token);
  return parseJwt(token);
}

export function logout() {
  sessionStorage.removeItem("access_token");
}
