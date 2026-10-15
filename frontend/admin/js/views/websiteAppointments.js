// Appointments booked through the public website.

import api from "../api.js";
import { navigate } from "../router.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

function statusChipClass(status) {
  if (status === "Completed") return "chip-success";
  if (status === "Cancelled") return "chip-danger";
  if (status === "No Show") return "chip-warning";
  if (status === "Consultation Started") return "chip-primary";
  return "chip-default";
}

export function render(container) {
  let appointments = [];
  let loading = true;
  let error = null;

  const page = document.createElement("div");
  page.innerHTML = `
    <div class="flex justify-between items-center mb-3">
      <h2 style="font-size:1.4rem;font-weight:700;">\u{1F310} Website Appointments</h2>
      <button type="button" class="btn btn-outline" id="wa-refresh-btn">Refresh</button>
    </div>
    <div id="wa-error"></div>
    <div id="wa-body"></div>
  `;
  container.appendChild(page);

  const errorBox = page.querySelector("#wa-error");
  const body = page.querySelector("#wa-body");
  const refreshBtn = page.querySelector("#wa-refresh-btn");

  function renderLoading() {
    body.innerHTML = `<div style="display:flex;justify-content:center;padding:32px;"><span class="spinner"></span></div>`;
  }

  function renderTable() {
    errorBox.innerHTML = error ? `<div class="alert alert-error">${error}</div>` : "";

    if (loading) { renderLoading(); return; }

    const rows = appointments.length === 0
      ? `<tr><td colspan="7" style="text-align:center;padding:32px;color:#64748b;">No website appointments found</td></tr>`
      : appointments.map((appt) => {
          const dateTimeCell = appt.date_time === "Pending"
            ? `<span class="chip chip-warning">Pending</span>`
            : `<div>${formatDate(appt.date_time)}</div><div class="text-muted" style="font-size:0.75rem;">${formatTime(appt.date_time)}</div>`;

          const typeIsWalkIn = appt.consultation_type === "walk_in";
          const typeChip = typeIsWalkIn
            ? `<span class="chip chip-primary">Clinic Visit</span>`
            : `<span class="chip" style="border:1px solid var(--secondary);color:var(--secondary);background:transparent;">Online Consultation</span>`;

          return `
            <tr data-id="${appt._id}">
              <td>
                <div>${formatDate(appt.created_at)}</div>
                <div class="text-muted" style="font-size:0.75rem;">${formatTime(appt.created_at)}</div>
              </td>
              <td>
                <div style="font-weight:600;">${appt.patient_name || "Unknown"}</div>
                <div class="text-muted" style="font-size:0.75rem;">${appt.age ? `${appt.age}y` : ""} ${appt.gender ? `• ${appt.gender}` : ""}</div>
              </td>
              <td>
                <div>${appt.phone || "-"}</div>
                <div class="text-muted" style="font-size:0.75rem;">${appt.email || "-"}</div>
              </td>
              <td>${dateTimeCell}</td>
              <td>${typeChip}</td>
              <td><span class="chip ${statusChipClass(appt.status)}">${appt.status || "New"}</span></td>
              <td style="text-align:right;">
                <div class="flex gap-2" style="justify-content:flex-end;">
                  <button type="button" class="btn btn-primary btn-sm wa-start-btn" style="background:linear-gradient(135deg, #3b82f6, #2563eb);">▶ Start</button>
                  <button type="button" class="btn btn-outline btn-sm wa-noshow-btn" title="Mark No Show" style="color:var(--warning);border-color:var(--warning);">\u{1F6AB}</button>
                  <button type="button" class="btn btn-outline btn-sm wa-cancel-btn" title="Cancel Appointment" style="color:var(--danger);border-color:var(--danger);">✕</button>
                </div>
              </td>
            </tr>
          `;
        }).join("");

    body.innerHTML = `
      <div class="table-wrap" style="border:1px solid var(--border);border-radius:8px;">
        <table class="data-table" style="min-width:900px;">
          <thead style="background:#f8fafc;">
            <tr>
              <th>Booking Time</th>
              <th>Patient</th>
              <th>Contact</th>
              <th>Appointment Time</th>
              <th>Type</th>
              <th>Status</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    body.querySelectorAll("tr[data-id]").forEach((tr) => {
      const id = tr.dataset.id;
      const appt = appointments.find((a) => a._id === id);
      tr.querySelector(".wa-start-btn").addEventListener("click", () => startConsultation(appt));
      tr.querySelector(".wa-noshow-btn").addEventListener("click", () => updateStatus(id, "No Show"));
      tr.querySelector(".wa-cancel-btn").addEventListener("click", () => updateStatus(id, "Cancelled"));
    });
  }

  async function fetchAppointments() {
    loading = true;
    renderTable();
    try {
      const res = await api.get("/api/appointments", { params: { source: "Website" } });
      appointments = res.data.items || [];
    } catch (err) {
      error = "Failed to fetch website appointments";
    } finally {
      loading = false;
      renderTable();
    }
  }

  async function updateStatus(id, status) {
    try {
      await api.put(`/api/appointments/${id}`, { status });
      appointments = appointments.map((a) => (a._id === id ? { ...a, status } : a));
      renderTable();
    } catch (err) {
      alert("Failed to update status");
    }
  }

  async function startConsultation(appt) {
    try {
      if (appt.status !== "Consultation Started") {
        await api.put(`/api/appointments/${appt._id}`, { status: "Consultation Started" });
      }
      navigate("/admin/", {
        openRegistration: true,
        mode: appt.consultation_type === "clinic" || appt.consultation_type === "walk_in" ? "offline" : "online",
        appointment: appt,
      });
    } catch (e) {
      alert("Failed to start consultation");
    }
  }

  refreshBtn.addEventListener("click", fetchAppointments);

  fetchAppointments();
}
