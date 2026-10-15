// Doctor metrics with simple inline SVG charts (not added to the router yet).

import api from "../../api.js";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

function esc(v) {
  return v == null ? '' : String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function pieSvg(data, colors) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cumulative = 0;
  const r = 15.91549430918954;
  const circles = data.map((d, i) => {
    const pct = (d.value / total) * 100;
    const dashoffset = 25 - cumulative;
    cumulative += pct;
    return `<circle cx="21" cy="21" r="${r}" fill="transparent" stroke="${colors[i % colors.length]}" stroke-width="8" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${dashoffset}"></circle>`;
  }).join('');

  return `
    <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;">
      <svg viewBox="0 0 42 42" width="220" height="220">${circles}</svg>
      <div class="flex flex-col gap-2">
        ${data.map((d, i) => `
          <div class="flex items-center gap-2">
            <span style="width:12px;height:12px;border-radius:2px;background:${colors[i % colors.length]};display:inline-block;"></span>
            <span style="font-size:0.85rem;">${esc(d.name)}: ${d.value}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function barSvg(data) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const width = 480;
  const height = 260;
  const padding = 40;
  const barWidth = (width - padding * 2) / data.length - 16;

  const bars = data.map((d, i) => {
    const barHeight = ((height - padding * 2) * d.value) / max;
    const x = padding + i * ((width - padding * 2) / data.length) + 8;
    const y = height - padding - barHeight;
    return `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#2196F3" rx="3"></rect>
      <text x="${x + barWidth / 2}" y="${height - padding + 16}" text-anchor="middle" font-size="11" fill="#64748b">${esc(d.name)}</text>
      <text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" font-size="11" fill="#1e293b" font-weight="600">${d.value}</text>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="300" style="max-width:480px;">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#e2e8f0" />
      ${bars}
    </svg>
  `;
}

export function render(container) {
  container.innerHTML = `<div class="flex items-center justify-center" style="min-height:400px;"><span class="spinner"></span></div>`;

  fetchMetrics(container);
}

async function fetchMetrics(container) {
  try {
    const pRes = await api.get('/api/patients?limit=1000');
    const patients = pRes.data.patients || [];

    let totalPatients = patients.length;
    let totalVisits = 0;
    let medicineRevenue = 0;
    const treatmentBreakdown = {};

    patients.forEach((patient) => {
      const visits = patient.visits || [];
      totalVisits += visits.length;
      visits.forEach((visit) => {
        if (visit.treatment) {
          treatmentBreakdown[visit.treatment] = (treatmentBreakdown[visit.treatment] || 0) + 1;
        }
        if (visit.medicines && Array.isArray(visit.medicines)) {
          const visitMedicineRevenue = visit.medicines.reduce((sum, m) => sum + (m.price || 0), 0);
          medicineRevenue += visitMedicineRevenue;
        }
      });
    });

    const treatmentData = Object.entries(treatmentBreakdown).map(([name, count]) => ({ name, count, value: count }));
    const chartData = [
      { name: 'Patients', value: totalPatients },
      { name: 'Visits', value: totalVisits },
      { name: 'Revenue (₹)', value: Math.round(medicineRevenue) },
    ];

    container.innerHTML = `
      <div class="grid-3 mb-4">
        <div class="card" style="background:#E3F2FD;border:2px solid #2196F3;padding:16px;">
          <div class="text-muted">Total Patients</div>
          <div style="font-size:2rem;font-weight:bold;color:#2196F3;">${totalPatients}</div>
        </div>
        <div class="card" style="background:#F3E5F5;border:2px solid #9C27B0;padding:16px;">
          <div class="text-muted">Total Consultations</div>
          <div style="font-size:2rem;font-weight:bold;color:#9C27B0;">${totalVisits}</div>
        </div>
        <div class="card" style="background:#E8F5E9;border:2px solid #4CAF50;padding:16px;">
          <div class="text-muted">Total Medicine Revenue</div>
          <div style="font-size:2rem;font-weight:bold;color:#4CAF50;">₹${medicineRevenue.toFixed(0)}</div>
        </div>
        <div class="card" style="background:#FFF3E0;border:2px solid #FF9800;padding:16px;">
          <div class="text-muted">Avg Revenue/Patient</div>
          <div style="font-size:2rem;font-weight:bold;color:#FF9800;">₹${totalPatients > 0 ? (medicineRevenue / totalPatients).toFixed(0) : 0}</div>
        </div>
      </div>

      <div class="grid-2">
        ${treatmentData.length > 0 ? `
          <div class="paper">
            <h3 class="mb-3">\u{1F4CA} Treatment Distribution</h3>
            ${pieSvg(treatmentData, COLORS)}
          </div>
        ` : '<div></div>'}
        <div class="paper">
          <h3 class="mb-3">\u{1F4C8} Practice Overview</h3>
          ${barSvg(chartData)}
        </div>
      </div>

      ${treatmentData.length > 0 ? `
        <div class="paper mt-4">
          <h3 class="mb-3">\u{1FA7A} Treatment Breakdown</h3>
          <div>
            ${treatmentData.map((t) => `
              <div class="flex justify-between" style="padding:8px 0;border-bottom:1px solid #eee;">
                <span>${esc(t.name)}</span>
                <span style="font-weight:bold;color:#2196F3;">${t.count} consultations</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="alert alert-error">Failed to load metrics</div>`;
  }
}
