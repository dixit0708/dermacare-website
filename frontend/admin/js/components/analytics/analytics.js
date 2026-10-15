// Analytics view (not added to the router yet).

import api from "../../api.js";

function esc(v) {
  return v == null ? '' : String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function render(container) {
  container.innerHTML = `<p>Loading analytics...</p>`;

  api.get('/api/patients', { params: { per_page: 1000 } }).then((res) => {
    const items = res.data.items || [];
    const total = items.length;
    const genders = items.reduce((acc, i) => {
      const g = i.gender || 'Unknown';
      acc[g] = (acc[g] || 0) + 1;
      return acc;
    }, {});
    const treatments = {};
    items.forEach((p) => {
      const t = (p.visits && p.visits[0] && p.visits[0].treatment_type) || 'Unknown';
      treatments[t] = (treatments[t] || 0) + 1;
    });

    container.innerHTML = `
      <div class="grid-3">
        <div class="paper">
          <h3>Totals</h3>
          <p>Total patients: ${total}</p>
        </div>
        <div class="paper">
          <h3>By Gender</h3>
          ${Object.entries(genders).map(([k, v]) => `<p>${esc(k)}: ${v}</p>`).join('')}
        </div>
        <div class="paper">
          <h3>Top Treatments</h3>
          ${Object.entries(treatments).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `<p>${esc(k)}: ${v}</p>`).join('')}
        </div>
      </div>
    `;
  }).catch((e) => {
    console.error(e);
  });
}
