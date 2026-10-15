// Small History API router for the admin panel, with a login guard.

import { isAuthenticated } from "./auth.js";

const routes = [];

export function registerRoute(path, render, { protected: isProtected = false } = {}) {
  const paramNames = [];
  const regexPath = path.replace(/:[^/]+/g, (m) => {
    paramNames.push(m.slice(1));
    return "([^/]+)";
  });
  const pattern = new RegExp(`^${regexPath}/?$`);
  routes.push({ pattern, paramNames, render, protected: isProtected });
}

function matchRoute(pathname) {
  for (const route of routes) {
    const m = route.pattern.exec(pathname);
    if (m) {
      const params = {};
      route.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(m[i + 1]); });
      return { route, params };
    }
  }
  return null;
}

// `state` is passed along with the navigation (used to prefill a consultation
// from a website appointment).
export function navigate(path, state = null) {
  window.history.pushState(state, "", path);
  handleRoute(state);
}

export function replace(path, state = null) {
  window.history.replaceState(state, "", path);
  handleRoute(state);
}

function handleRoute(state) {
  const pathname = window.location.pathname;
  const matched = matchRoute(pathname);

  if (!matched) {
    navigate("/admin/");
    return;
  }

  const { route, params } = matched;
  if (route.protected && !isAuthenticated()) {
    navigate("/admin/login");
    return;
  }

  const container = document.getElementById("app");
  container.innerHTML = "";
  route.render(container, params, state);
}

window.addEventListener("popstate", (e) => handleRoute(e.state));

export function startRouter() {
  handleRoute(window.history.state);
}
