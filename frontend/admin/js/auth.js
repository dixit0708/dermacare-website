// The login token lives in sessionStorage.

// Reads the token's payload (role, name) for the UI only. It isn't verified here;
// the server checks the signature on every request.
function parseJwt(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)); // UTF-8, so names like "Dr. Śarmā" survive
  } catch {
    return null;
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
