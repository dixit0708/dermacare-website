// Appointment list (not added to the router yet).
// TODO: backend doesn't have the send_reminder endpoint yet.

import api from "../api.js";

export function render(container) {
  const wrap = document.createElement("div");
  wrap.className = "paper";
  wrap.innerHTML = `
    <h3 style="margin-bottom:8px;">Appointments</h3>
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Patient ID</th>
            <th>Date/Time</th>
            <th>Therapist</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="appt-list-body"></tbody>
      </table>
    </div>
  `;
  container.appendChild(wrap);

  const tbody = wrap.querySelector("#appt-list-body");

  const fetchAppointments = async () => {
    try {
      const res = await api.get("/api/appointments");
      renderRows(res.data.items || []);
    } catch (e) {
      console.error("fetch appts", e);
    }
  };

  const sendReminder = async (id) => {
    try {
      await api.post(`/api/appointments/${id}/send_reminder`, {});
      alert("Reminder sent");
      fetchAppointments();
    } catch (err) {
      alert("Failed to send reminder");
    }
  };

  function renderRows(appointments) {
    tbody.innerHTML = "";
    appointments.forEach((a) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${a._id ?? ""}</td>
        <td>${a.patient_id ?? ""}</td>
        <td>${a.date_time ?? ""}</td>
        <td>${a.therapist ?? ""}</td>
        <td>${a.status ?? ""}</td>
        <td><button type="button" class="btn btn-outline btn-sm" data-id="${a._id}">Send Reminder</button></td>
      `;
      tr.querySelector("button").addEventListener("click", () => sendReminder(a._id));
      tbody.appendChild(tr);
    });
  }

  fetchAppointments();
}
