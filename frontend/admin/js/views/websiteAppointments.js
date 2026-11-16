// Bookings from returning patients are linked to their record by the backend
// (APPOINTMENT_SOURCE.RETURNING_PATIENT) and shown here with a tag.

import api from "../api.js";
import { navigate } from "../router.js";
import { esc } from "../escape.js";
import { toast } from "../toast.js";
import { formatDate, isDateOnly, statusChipClass } from "../format.js";
import { APPOINTMENT_STATUS, APPOINTMENT_SOURCE } from "../constants.js";

// "01 Dec 2026" above "10:30 AM"; a date-only value (the preferred date) has no time line.
function dateTimeCell(value) {
  const time = isDateOnly(value) ? "" : `<div class="text-muted" style="font-size:0.75rem;">${formatDate(value, "h:mm A")}</div>`;
  return `<div>${formatDate(value, "DD MMM YYYY")}</div>${time}`;
}

function isReturning(appt) {
  return appt.source === APPOINTMENT_SOURCE.RETURNING_PATIENT && !!appt.patient_id;
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
          const appointmentTimeCell = appt.date_time === "Pending"
            ? `<span class="chip chip-warning">Pending</span>`
            : dateTimeCell(appt.date_time);

          const typeIsWalkIn = appt.consultation_type === "walk_in";
          const typeChip = typeIsWalkIn
            ? `<span class="chip chip-primary">Clinic Visit</span>`
            : `<span class="chip" style="border:1px solid var(--secondary);color:var(--secondary);background:transparent;">Online Consultation</span>`;

          return `
            <tr data-id="${esc(appt._id)}">
              <td>${dateTimeCell(appt.created_at)}</td>
              <td>
                <div style="font-weight:600;">${esc(appt.patient_name || "Unknown")}</div>
                <div class="text-muted" style="font-size:0.75rem;">${appt.age ? `${esc(appt.age)}y` : ""} ${appt.gender ? `• ${esc(appt.gender)}` : ""}</div>
                ${isReturning(appt) ? `<span class="chip chip-primary" style="margin-top:4px;" title="Already registered: opens the patient's record">Returning · ${esc(appt.patient_id)}</span>` : ""}
              </td>
              <td>
                <div>${esc(appt.phone || "-")}</div>
                <div class="text-muted" style="font-size:0.75rem;">${esc(appt.email || "-")}</div>
              </td>
              <td>${appointmentTimeCell}</td>
              <td>${typeChip}</td>
              <td><span class="chip ${statusChipClass(appt.status)}">${esc(appt.status || APPOINTMENT_STATUS.NEW)}</span></td>
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
      tr.querySelector(".wa-noshow-btn").addEventListener("click", () => updateStatus(id, APPOINTMENT_STATUS.NO_SHOW));
      tr.querySelector(".wa-cancel-btn").addEventListener("click", () => updateStatus(id, APPOINTMENT_STATUS.CANCELLED));
    });
  }

  async function fetchAppointments() {
    loading = true;
    renderTable();
    try {
      const [newRes, returningRes] = await Promise.all([
        api.get("/api/appointments", { params: { source: APPOINTMENT_SOURCE.WEBSITE } }),
        api.get("/api/appointments", { params: { source: APPOINTMENT_SOURCE.RETURNING_PATIENT } }),
      ]);
      appointments = [...(newRes.data.items || []), ...(returningRes.data.items || [])]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      error = null;
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
      toast.error(`Failed to update status: ${err.message}`);
    }
  }

  async function startConsultation(appt) {
    try {
      if (appt.status !== APPOINTMENT_STATUS.STARTED) {
        await api.put(`/api/appointments/${appt._id}`, { status: APPOINTMENT_STATUS.STARTED });
      }
      // A returning patient is already registered: open their record with the
      // new consultation pre-filled, instead of the registration form (which
      // would reject them as a duplicate).
      if (isReturning(appt)) {
        navigate(`/admin/patients/${encodeURIComponent(appt.patient_id)}`, {
          startConsultation: true,
          appointment: { ...appt, status: APPOINTMENT_STATUS.STARTED },
        });
        return;
      }
      navigate("/admin/", {
        openRegistration: true,
        mode: appt.consultation_type === "walk_in" ? "offline" : "online",
        appointment: appt,
      });
    } catch (e) {
      toast.error(`Failed to start consultation: ${e.message}`);
    }
  }

  refreshBtn.addEventListener("click", fetchAppointments);

  fetchAppointments();
}
