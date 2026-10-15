// Calendar view of appointments (not added to the router yet).

import api from "../api.js";

function esc(v) {
  return v == null ? '' : String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Small date formatter for the tokens used in this file.
function fmt(input, pattern) {
  const d = new Date(input);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const map = {
    YYYY: d.getFullYear(),
    MM: pad(d.getMonth() + 1),
    MMM: months[d.getMonth()],
    DD: pad(d.getDate()),
    HH: pad(d.getHours()),
    mm: pad(d.getMinutes()),
  };
  return pattern.replace(/YYYY|MMM|MM|DD|HH|mm/g, (m) => (map[m] !== undefined ? map[m] : m));
}

export function render(container) {
  container.innerHTML = `<div class="paper"><h3>Upcoming Appointments</h3><div class="cal-list"></div></div>`;
  const listEl = container.querySelector('.cal-list');

  api.get('/api/appointments').then((res) => {
    const appts = res.data.items || [];
    const groups = {};
    appts.forEach((a) => {
      const d = a.date_time ? fmt(a.date_time, 'YYYY-MM-DD') : 'Unknown';
      groups[d] = groups[d] || [];
      groups[d].push(a);
    });
    const days = Object.keys(groups).sort();

    listEl.innerHTML = days.map((d) => `
      <div>
        <div style="font-weight:600;margin-top:12px;">${d === 'Unknown' ? 'Unknown' : esc(fmt(d, 'DD MMM YYYY'))}</div>
        ${groups[d].map((a) => `
          <div style="padding:8px 0;border-bottom:1px solid var(--border, #e2e8f0);">
            ${esc(a.patient_id)} — ${esc(fmt(a.date_time, 'HH:mm'))} — ${esc(a.therapist || '')}
          </div>
        `).join('')}
      </div>
    `).join('');
  }).catch((e) => {
    console.error(e);
  });
}
