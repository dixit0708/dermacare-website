import { logout } from "../auth.js";
import { navigate } from "../router.js";
import { openMedicinesPanel } from "./medicinesPanel.js";

// One sidebar button. `icon` is trusted markup from ICONS (or an emoji).
function drawerItem({ label, icon, onClick, active = false, extraClass = "" }) {
  const btn = document.createElement("button");
  btn.className = ["drawer-item", active && "active", extraClass].filter(Boolean).join(" ");
  const iconEl = document.createElement("span");
  iconEl.className = "drawer-icon";
  iconEl.innerHTML = icon;
  btn.append(iconEl, document.createTextNode(label));
  btn.addEventListener("click", onClick);
  return btn;
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

  const clinicList = document.createElement("div");
  clinicList.className = "drawer-list";
  clinicList.append(
    drawerItem({ label: "Dashboard", icon: ICONS.dashboard, active: pathname === "/admin/" || pathname === "/admin",
                 onClick: () => navigate("/admin/") }),
    drawerItem({ label: "Website Appointments", icon: "\u{1F310}", active: pathname === "/admin/website-appointments",
                 onClick: () => navigate("/admin/website-appointments") }),
  );

  const divider = document.createElement("hr");
  divider.className = "drawer-divider";
  const resourcesLabel = document.createElement("div");
  resourcesLabel.className = "drawer-section-label";
  resourcesLabel.textContent = "Resources";
  const resourcesList = document.createElement("div");
  resourcesList.className = "drawer-list";
  resourcesList.append(drawerItem({ label: "Medicines", icon: ICONS.medication, onClick: () => openMedicinesPanel() }));

  const footer = document.createElement("div");
  footer.className = "drawer-footer";
  footer.append(drawerItem({ label: "Logout", icon: ICONS.logout, extraClass: "logout", onClick: () => {
    logout();
    navigate("/admin/login");
  } }));

  drawer.append(clinicList, divider, resourcesLabel, resourcesList, footer);
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
