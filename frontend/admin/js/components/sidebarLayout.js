// withSidebar(viewRender) wraps a view's render function in the sidebar layout.

import { logout } from "../auth.js";
import { navigate } from "../router.js";
import { openMedicinesPanel } from "./medicinesPanel.js";

function icon(svg) {
  const span = document.createElement("span");
  span.className = "drawer-icon";
  span.innerHTML = svg;
  return span;
}

const ICONS = {
  dashboard: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>`,
  medication: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`,
  logout: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
};

function buildDrawer(pathname) {
  const drawer = document.createElement("aside");
  drawer.className = "drawer";

  drawer.innerHTML = `
    <div class="drawer-brand">
      <div class="drawer-brand-box"><img src="/assets/img/logo.png" alt="DermaCare" /></div>
      <div class="drawer-brand-caption">Patient Management System</div>
    </div>
    <hr class="drawer-divider" />
    <div class="drawer-section-label">Clinic</div>
  `;

  const list1 = document.createElement("div");
  list1.className = "drawer-list";

  const dashBtn = document.createElement("button");
  dashBtn.className = "drawer-item" + (pathname === "/admin/" || pathname === "/admin" ? " active" : "");
  dashBtn.appendChild(icon(ICONS.dashboard));
  dashBtn.appendChild(document.createTextNode("Dashboard"));
  dashBtn.addEventListener("click", () => navigate("/admin/"));
  list1.appendChild(dashBtn);

  const websiteBtn = document.createElement("button");
  websiteBtn.className = "drawer-item" + (pathname === "/admin/website-appointments" ? " active" : "");
  const globeIcon = document.createElement("span");
  globeIcon.className = "drawer-icon";
  globeIcon.textContent = "\u{1F310}";
  websiteBtn.appendChild(globeIcon);
  websiteBtn.appendChild(document.createTextNode("Website Appointments"));
  websiteBtn.addEventListener("click", () => navigate("/admin/website-appointments"));
  list1.appendChild(websiteBtn);

  drawer.appendChild(list1);

  const hr2 = document.createElement("hr");
  hr2.className = "drawer-divider";
  drawer.appendChild(hr2);

  const resourcesLabel = document.createElement("div");
  resourcesLabel.className = "drawer-section-label";
  resourcesLabel.textContent = "Resources";
  drawer.appendChild(resourcesLabel);

  const list2 = document.createElement("div");
  list2.className = "drawer-list";
  const medsBtn = document.createElement("button");
  medsBtn.className = "drawer-item";
  medsBtn.appendChild(icon(ICONS.medication));
  medsBtn.appendChild(document.createTextNode("Medicines"));
  medsBtn.addEventListener("click", () => openMedicinesPanel());
  list2.appendChild(medsBtn);
  drawer.appendChild(list2);

  const footer = document.createElement("div");
  footer.className = "drawer-footer";
  const logoutBtn = document.createElement("button");
  logoutBtn.className = "drawer-item logout";
  logoutBtn.appendChild(icon(ICONS.logout));
  logoutBtn.appendChild(document.createTextNode("Logout"));
  logoutBtn.addEventListener("click", () => {
    logout();
    navigate("/admin/login");
  });
  footer.appendChild(logoutBtn);
  drawer.appendChild(footer);

  return drawer;
}

export function withSidebar(viewRender) {
  return (container, params, state) => {
    const shell = document.createElement("div");
    shell.className = "app-shell";
    shell.appendChild(buildDrawer(window.location.pathname));

    const main = document.createElement("main");
    main.className = "app-main";
    shell.appendChild(main);

    container.appendChild(shell);
    viewRender(main, params, state);
  };
}
