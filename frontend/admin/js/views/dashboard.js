// Dashboard with the patient registration and patient list tabs.
// The panel is rebuilt from scratch on every tab or mode switch.

import { render as renderPatientForm } from "../components/patientForm.js";
import { render as renderPatientList } from "../components/patientList.js";

export function render(container, params, state) {
  let mode = "offline";
  let tab = 0;
  let prefillData = null;

  if (state && state.openRegistration) {
    mode = state.mode || "offline";
    tab = 0;
    prefillData = state.appointment || null;
    // Clear the history state so a refresh/back doesn't re-trigger this prefill,
    // without forcing a router re-render (which would lose the values above).
    window.history.replaceState({}, "", window.location.pathname);
  }

  const page = document.createElement("div");
  page.innerHTML = `
    <div class="mb-3">
      <h2 style="font-size:1.4rem;font-weight:800;">Dashboard</h2>
      <p class="text-muted mt-2">DermaCare — Patient Management</p>
    </div>
    <div class="flex gap-3 mb-3" id="db-mode-switch"></div>
    <div id="db-section"></div>
  `;
  container.appendChild(page);

  const modeSwitch = page.querySelector("#db-mode-switch");
  const section = page.querySelector("#db-section");

  function modeCard({ key, active, gradient, iconBg, icon, title, caption }) {
    const card = document.createElement("div");
    card.style.cssText = `
      flex:1; padding:20px; border-radius:12px; cursor:pointer;
      border:2px solid ${active ? (key === "offline" ? "#6366F1" : "#06b6d4") : "#e2e8f0"};
      background:${active ? gradient : "#fff"};
      color:${active ? "#fff" : "#64748b"};
      transition:all .22s;
      display:flex; align-items:center; gap:16px;
      box-shadow:${active ? "0 6px 24px rgba(0,0,0,0.15)" : "none"};
    `;
    card.innerHTML = `
      <div style="width:48px;height:48px;border-radius:8px;flex-shrink:0;background:${active ? "rgba(255,255,255,0.2)" : iconBg};display:flex;align-items:center;justify-content:center;font-size:22px;">
        ${icon}
      </div>
      <div>
        <div style="font-weight:700;line-height:1.2;font-size:1.05rem;">${title}</div>
        <div style="opacity:0.85;font-size:0.75rem;">${caption}</div>
      </div>
    `;
    card.addEventListener("click", () => {
      mode = key;
      renderModeSwitch();
      renderSection();
    });
    return card;
  }

  function renderModeSwitch() {
    modeSwitch.innerHTML = "";
    modeSwitch.appendChild(modeCard({
      key: "offline",
      active: mode === "offline",
      gradient: "linear-gradient(135deg, #6366F1 0%, #4f46e5 100%)",
      iconBg: "#f1f5f9",
      icon: "\u{1F3EA}",
      title: "Offline Patients",
      caption: "Walk-in clinic visits",
    }));
    modeSwitch.appendChild(modeCard({
      key: "online",
      active: mode === "online",
      gradient: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
      iconBg: "#f0fdfe",
      icon: "\u{1F4F6}",
      title: "Online Patients",
      caption: "Online orders & deliveries",
    }));
  }

  function renderSection() {
    const isOnline = mode === "online";
    const accent = isOnline ? "#06b6d4" : "#6366F1";

    section.innerHTML = `
      <div class="paper" style="padding:0;margin-bottom:16px;">
        <div class="tabs" id="db-tabs" style="padding:0 8px;">
          <button type="button" class="tab db-tab" data-tab="0">➕ Register New Patient</button>
          <button type="button" class="tab db-tab" data-tab="1">\u{1F465} All Patients</button>
        </div>
      </div>
      <div class="tab-panel" id="db-panel"></div>
    `;

    const tabButtons = section.querySelectorAll(".db-tab");
    const panel = section.querySelector("#db-panel");

    function syncTabs() {
      tabButtons.forEach((btn) => {
        const active = Number(btn.dataset.tab) === tab;
        btn.classList.toggle("active", active);
        btn.style.color = active ? accent : "";
        btn.style.borderBottomColor = active ? accent : "";
      });
    }

    function renderPanel() {
      panel.innerHTML = "";
      if (tab === 0) {
        const heading = document.createElement("h3");
        heading.className = "mb-3";
        heading.textContent = `➕ Register New ${isOnline ? "Online" : "Offline"} Patient`;
        panel.appendChild(heading);
        const host = document.createElement("div");
        panel.appendChild(host);
        renderPatientForm(host, { mode, prefillData });
      } else {
        const heading = document.createElement("h3");
        heading.className = "mb-3";
        heading.textContent = isOnline ? "\u{1F310} Online Patient Directory" : "\u{1F3E5} Offline Patient Directory";
        panel.appendChild(heading);
        const host = document.createElement("div");
        panel.appendChild(host);
        renderPatientList(host, { patientType: mode });
      }
    }

    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        tab = Number(btn.dataset.tab);
        syncTabs();
        renderPanel();
      });
    });

    syncTabs();
    renderPanel();
  }

  renderModeSwitch();
  renderSection();
}
