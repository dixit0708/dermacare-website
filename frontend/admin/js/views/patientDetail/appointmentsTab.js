// "Appointments" tab: this patient's bookings, each of which can start a consultation.

import api from "../../api.js";
import { esc } from "../../escape.js";
import { toast } from "../../toast.js";
import { formatDate, isDateOnly, statusChipClass } from "../../format.js";
import { APPOINTMENT_STATUS } from "../../constants.js";

export function renderAppointmentsTab(panelEl, ctx) {
  const { appointments } = ctx.page;

  function tab2Html() {
    if (appointments.length === 0) {
      return `
        <div class="paper" style="padding:0;overflow:hidden;">
          <h3 style="padding:16px;border-bottom:1px solid #e2e8f0;background:#f8fafc;">Appointment History</h3>
          <div style="padding:32px;text-align:center;color:var(--muted);">No appointments found for this patient.</div>
        </div>
      `;
    }
    return `
      <div class="paper" style="padding:0;overflow:hidden;">
        <h3 style="padding:16px;border-bottom:1px solid #e2e8f0;background:#f8fafc;">Appointment History</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr style="background:#f1f5f9;">
                <th>Date &amp; Time</th><th>Type</th><th>Treatment</th><th>Status</th><th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${appointments.map((appt) => `
                <tr>
                  <td>
                    <div style="font-weight:600;">${appt.date_time !== 'Pending' ? esc(formatDate(appt.date_time, 'DD MMM YYYY')) : 'Pending'}</div>
                    ${appt.date_time !== 'Pending' && !isDateOnly(appt.date_time) ? `<div style="font-size:0.75rem;color:var(--muted);">${esc(formatDate(appt.date_time, 'h:mm A'))}</div>` : ''}
                  </td>
                  <td>${appt.consultation_type === 'walk_in' ? 'Clinic Visit' : 'Online'}</td>
                  <td>${esc(appt.treatment || '')}</td>
                  <td><span class="chip ${statusChipClass(appt.status)}">${esc(appt.status || APPOINTMENT_STATUS.NEW)}</span></td>
                  <td style="text-align:right;"><button type="button" class="btn btn-outline btn-sm pd-start-consult-btn" data-appt-id="${esc(appt._id)}">Start Consultation</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function wireTab2() {
    panelEl.querySelectorAll('.pd-start-consult-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const appt = appointments.find((a) => a._id === btn.dataset.apptId);
        if (!appt) return;
        try {
          if (appt.status !== APPOINTMENT_STATUS.STARTED) {
            await api.put(`/api/appointments/${appt._id}`, { status: APPOINTMENT_STATUS.STARTED });
            ctx.reloadAppointments();
          }
          ctx.startConsultation(appt);
        } catch (e) {
          toast.error(`Failed to start consultation: ${e.message}`);
        }
      });
    });
  }

  panelEl.innerHTML = tab2Html();
  wireTab2();
}
