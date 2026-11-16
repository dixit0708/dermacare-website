// "History & Details" tab: patient details (view / edit), visit history and the
// before/after photo and video comparison.

import api from "../../api.js";
import { esc } from "../../escape.js";
import { toast } from "../../toast.js";
import { HISTORY_OPTIONS } from "../../clinicOptions.js";
import { formatDate } from "../../format.js";
import { openDispatchDialog, openLightbox } from "./dialogs.js";

export function renderHistoryTab(panelEl, ctx) {
  const { page } = ctx;
  const { patient, newVisit, editing, form, compare, videoCompare } = page;

  function getVisits() {
    return (patient && patient.visits)
      ? [...patient.visits].sort((a, b) => new Date(b.date_of_visit) - new Date(a.date_of_visit))
      : [];
  }

  function getVideoCompareOptions() {
    const visits = getVisits();
    const fromVisits = visits.flatMap((visit, visitIndex) => (visit.videos || []).map((src, videoIndex) => ({
      key: `visit:${visitIndex}:${videoIndex}`,
      src,
      visit,
      label: `${formatDate(visit.date_of_visit, 'DD MMM YYYY')} - ${visit.treatment || 'Visit'}${(visit.videos || []).length > 1 ? ` - Video ${videoIndex + 1}` : ''}`,
    })));
    const fromDraft = (newVisit.videos || []).map((src, videoIndex) => ({
      key: `draft:${videoIndex}`,
      src,
      visit: {
        ...newVisit,
        date_of_visit: newVisit.date_of_visit || new Date().toISOString(),
        treatment: newVisit.treatment || 'Current consultation draft',
      },
      label: `Current consultation draft${newVisit.videos.length > 1 ? ` - Video ${videoIndex + 1}` : ''}`,
    }));
    return [...fromVisits, ...fromDraft];
  }

  async function save() {
    try {
      // The edit box already shows current issues merged into medical history,
      // so clear current_issues to stop them being merged in a second time.
      await api.put(`/api/patients/${page.patientId}`, { ...form, current_issues: '' });
      page.editing = false;
      ctx.rerender();
      ctx.reloadPatient();
    } catch (e) {
      toast.error(`Save failed: ${e.message}`);
    }
  }

  function onlineVisitInfoHtml(v) {
    const isDispatched = !!v.tracking_id;
    return `
      <div class="mt-3" style="background:${isDispatched ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : 'linear-gradient(135deg,#f0fdfe,#e0f7fa)'};border:1.5px solid ${isDispatched ? '#86efac' : '#a5f3fc'};border-radius:8px;padding:12px;">
        <div style="display:flex;flex-wrap:wrap;gap:16px;margin-bottom:8px;">
          <div>
            <div style="font-size:0.7rem;color:#64748b;">\u{1F4B3} Payment Date &amp; Time</div>
            <div style="font-weight:600;">${v.payment_datetime ? esc(formatDate(v.payment_datetime, 'DD MMM YYYY, h:mm A')) : '<em style="color:#94a3b8;">Not recorded</em>'}</div>
          </div>
          <div>
            <div style="font-size:0.7rem;color:#64748b;">\u{1F4B0} Amount Paid</div>
            <div style="font-weight:700;color:#16a34a;">${v.amount_paid ? '₹' + Number(v.amount_paid).toLocaleString('en-IN') : '<em style="color:#94a3b8;">—</em>'}</div>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;">
          <div>
            <div style="font-size:0.7rem;color:#64748b;">\u{1F4C5} Dispatch Date</div>
            <div style="font-weight:600;">${v.dispatch_date ? esc(formatDate(v.dispatch_date, 'DD MMM YYYY')) : '<em style="color:#94a3b8;">Not dispatched yet</em>'}</div>
          </div>
          <div>
            <div style="font-size:0.7rem;color:#64748b;">\u{1F69A} Tracking ID</div>
            <div style="font-weight:600;font-family:monospace;${isDispatched ? 'color:#0891b2;' : ''}">${v.tracking_id ? esc(v.tracking_id) : '<em style="color:#94a3b8;">Not available yet</em>'}</div>
          </div>
          <div style="margin-left:auto;">
            <button type="button" class="btn btn-outline btn-sm pd-dispatch-btn" data-visit-id="${esc(v.visit_id || '')}" data-dispatch-date="${esc(v.dispatch_date || '')}" data-tracking-id="${esc(v.tracking_id || '')}" style="border-color:#06b6d4;color:#0891b2;font-weight:600;">\u{1F69A} ${isDispatched ? 'Update Dispatch' : 'Mark Dispatched'}</button>
          </div>
        </div>
      </div>
    `;
  }

  function bloodTestBadgesHtml(tests) {
    if (!tests || tests.length === 0) return '';
    return `
      <div class="mt-3" style="background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:1.5px solid #c4b5fd;border-radius:8px;padding:12px;">
        <div style="color:#7c3aed;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;font-size:0.7rem;margin-bottom:8px;">\u{1F9EA} Blood Tests Prescribed (${tests.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;">
          ${tests.map((t) => `<span class="chip" style="background:#7c3aed;color:#fff;font-weight:600;font-size:0.72rem;">${esc(t)}</span>`).join('')}
        </div>
      </div>
    `;
  }

  function visitPhotosHtml(photos) {
    if (!photos || photos.length === 0) return '';
    const formatted = photos.map((url) => (url.includes('f_auto') ? url : url.replace('/upload/', '/upload/f_auto,q_auto/')));
    return `
      <div class="mt-3">
        <div style="font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;font-size:0.7rem;">\u{1F4F7} Photos (${photos.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:6px;">
          ${formatted.map((url) => `
            <div class="pd-photo-tile" data-url="${esc(url)}" style="position:relative;cursor:zoom-in;border-radius:8px;overflow:hidden;border:2px solid #e2e8f0;width:140px;height:140px;background:#f8fafc;display:flex;align-items:center;justify-content:center;">
              <img src="${esc(url)}" alt="photo" style="width:100%;height:100%;object-fit:cover;display:block;" />
              <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent, rgba(0,0,0,0.5));padding:4px 0;text-align:center;">
                <span style="color:#fff;font-size:0.65rem;">Click to expand</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function visitVideosHtml(videos) {
    if (!videos || videos.length === 0) return '';
    return `
      <div class="mt-3">
        <div style="font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;font-size:0.7rem;">Videos (${videos.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:6px;">
          ${videos.map((url) => `
            <div style="border-radius:8px;overflow:hidden;border:2px solid #e2e8f0;width:220px;max-width:100%;background:#0f172a;">
              <video src="${esc(url)}" controls preload="metadata" style="width:100%;height:140px;object-fit:cover;display:block;"></video>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function medicinesBillingHtml(medicines) {
    // Older visits can hold a missing or text price; treat it as 0 rather than fail to render.
    const price = (m) => Number(m.price) || 0;
    const total = medicines.reduce((sum, m) => sum + price(m), 0);
    return `
      <div class="mt-3" style="background:#f9f9f9;padding:12px;border-radius:6px;border:2px solid #2196F3;">
        <div style="font-weight:bold;color:#2196F3;margin-bottom:8px;">\u{1F48A} Medicines &amp; Billing</div>
        <div class="flex flex-col gap-2">
          ${medicines.map((m) => `<div class="flex justify-between items-center"><span>${esc(m.name)}</span><span style="font-weight:bold;color:#2196F3;">₹${price(m).toFixed(2)}</span></div>`).join('')}
        </div>
        <div class="flex justify-between" style="border-top:2px solid #ddd;padding-top:8px;margin-top:8px;">
          <span><strong>Total Bill:</strong></span>
          <span style="font-weight:bold;color:#4CAF50;font-size:1.1em;">₹${total.toFixed(2)}</span>
        </div>
      </div>
    `;
  }

  function visitInnerHtml(v) {
    return `
      <div><strong>${esc(formatDate(v.date_of_visit, 'DD MMM YYYY, h:mm A'))}</strong></div>
      <div style="color:var(--primary);font-size:0.875rem;">${esc(v.treatment || '')}</div>
      ${v.doctor_notes ? `<div style="font-size:0.875rem;"><strong>Notes:</strong> ${esc(v.doctor_notes)}</div>` : ''}
      ${v.doctor_advice ? `<div style="font-size:0.875rem;"><strong>Advice:</strong> ${esc(v.doctor_advice)}</div>` : ''}
      ${v.next_visit ? `<div style="font-size:0.875rem;color:orange;"><strong>Next Scheduled:</strong> ${esc(formatDate(v.next_visit, 'DD MMM YYYY'))}</div>` : ''}
      ${patient?.patient_type === 'online' ? onlineVisitInfoHtml(v) : ''}
      ${(v.blood_tests || []).length > 0 ? bloodTestBadgesHtml(v.blood_tests) : ''}
      ${(v.photos || []).length > 0 ? visitPhotosHtml(v.photos) : ''}
      ${(v.videos || []).length > 0 ? visitVideosHtml(v.videos) : ''}
      ${(v.medicines || []).length > 0 ? medicinesBillingHtml(v.medicines) : ''}
    `;
  }

  function detailsCardHtml() {
    if (!editing) {
      return `
        <div class="paper">
          <h3>Details</h3>
          <div class="mt-2">
            <div><strong>Name:</strong> ${esc(patient?.full_name || '')}</div>
            <div><strong>Age:</strong> ${esc(patient?.age || '')}</div>
            <div><strong>Gender:</strong> ${esc(patient?.gender || '')}</div>
            <div><strong>WhatsApp:</strong> ${esc(patient?.whatsapp || '')}</div>
            <div><strong>Email:</strong> ${esc(patient?.email || '')}</div>
            <div><strong>Address:</strong> ${patient?.address ? esc(patient.address) : '<em style="color:#94a3b8;">Not provided</em>'}</div>
            <div><strong>Next Visit:</strong> ${patient?.next_visit ? esc(formatDate(patient.next_visit, 'DD MMM YYYY, h:mm A')) : ''}</div>
            <div class="mt-2"><button type="button" class="btn btn-ghost pd-edit-btn">Edit</button></div>
          </div>
        </div>
      `;
    }
    return `
      <div class="paper">
        <h3>Details</h3>
        <div class="flex flex-col gap-2 mt-2">
          <div class="field"><label class="field-label">Full name</label><input type="text" class="input pd-form-full_name" value="${esc(form.full_name || '')}" /></div>
          <div class="field"><label class="field-label">Age</label><input type="text" class="input pd-form-age" value="${esc(form.age || '')}" /></div>
          <div class="field"><label class="field-label">Gender</label><input type="text" class="input pd-form-gender" value="${esc(form.gender || '')}" /></div>
          <div class="field"><label class="field-label">WhatsApp</label><input type="text" class="input pd-form-whatsapp" value="${esc(form.whatsapp || '')}" /></div>
          <div class="field"><label class="field-label">Email</label><input type="text" class="input pd-form-email" value="${esc(form.email || '')}" /></div>
          <div class="field"><label class="field-label">Address</label><textarea class="textarea pd-form-address" rows="2" placeholder="House no., Street, Area, City, State, Pincode">${esc(form.address || '')}</textarea></div>
          <div>
            <div style="font-size:0.85rem;font-weight:600;margin:8px 0;">Common Conditions:</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
              ${HISTORY_OPTIONS.map((hist) => `<span class="chip chip-default pd-history-chip" data-hist="${esc(hist)}" style="cursor:pointer;border:1px solid var(--secondary);color:var(--secondary);background:transparent;">${esc(hist)}</span>`).join('')}
            </div>
            <div class="field"><label class="field-label">Complete Medical History &amp; Current Issues</label><textarea class="textarea pd-form-medical_history w-full" rows="3">${esc(form.medical_history || '')}</textarea></div>
          </div>
          <div class="mt-2">
            <button type="button" class="btn btn-primary pd-save-details-btn" style="margin-right:8px;">Save</button>
            <button type="button" class="btn btn-ghost pd-cancel-details-btn">Cancel</button>
          </div>
        </div>
      </div>
    `;
  }

  function previousVisitsHtml() {
    const visits = getVisits();
    if (visits.length <= 1) {
      return `<div class="paper mt-3"><h3>Previous Visits History</h3><div class="mt-2 text-muted" style="font-size:0.875rem;">No previous visits recorded yet</div></div>`;
    }
    const prev = visits.slice(1);
    return `
      <div class="paper mt-3">
        <h3>Previous Visits History</h3>
        <div class="mt-2">
          ${prev.map((v, idx) => `
            <div style="margin-bottom:16px;padding-bottom:8px;${idx < prev.length - 1 ? 'border-bottom:1px solid #eee;' : ''}">
              ${visitInnerHtml(v)}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function latestVisitHtml() {
    const visits = getVisits();
    if (visits.length === 0) {
      return `<div class="paper mb-3"><h3>Visit History (Latest)</h3><div class="text-muted" style="font-size:0.875rem;">No visits recorded yet</div></div>`;
    }
    const v = visits[0];
    return `
      <div class="paper mb-3">
        <h3>Visit History (Latest)</h3>
        <div style="padding:16px 0;">
          ${visitInnerHtml(v)}
        </div>
      </div>
    `;
  }

  function compareImagesHtml() {
    const a = compare.a, b = compare.b;
    if (a === '' || b === '' || a == null || b == null) {
      return `<div style="text-align:center;padding:32px 0;color:#94a3b8;"><div style="font-size:36px;">\u{1F50D}</div><div style="font-size:0.875rem;">Select two visits above to compare their photos</div></div>`;
    }
    const visits = getVisits();
    const va = visits[parseInt(a, 10)];
    const vb = visits[parseInt(b, 10)];
    let ima = va?.photos?.[0];
    let imb = vb?.photos?.[0];
    if (ima && !ima.includes('f_auto')) ima = ima.replace('/upload/', '/upload/f_auto,q_auto/');
    if (imb && !imb.includes('f_auto')) imb = imb.replace('/upload/', '/upload/f_auto,q_auto/');
    if (!ima && !imb) {
      return `<div style="text-align:center;padding:24px 0;color:#94a3b8;"><div style="font-size:0.875rem;">Neither selected visit has photos</div></div>`;
    }
    const side = (visit, img, label) => `
      <div style="flex:1;min-width:0;">
        <div style="background:${label === 'BEFORE' ? '#fef2f2' : '#f0fdf4'};border-radius:8px 8px 0 0;padding:6px 12px;border-bottom:3px solid ${label === 'BEFORE' ? '#ef4444' : '#22c55e'};display:flex;align-items:center;justify-content:space-between;">
          <span style="font-weight:800;letter-spacing:1px;font-size:0.75rem;color:${label === 'BEFORE' ? '#dc2626' : '#16a34a'};">${label}</span>
          <span style="font-size:0.75rem;color:#64748b;">${esc(formatDate(visit.date_of_visit, 'DD MMM YYYY'))}</span>
        </div>
        <div class="pd-compare-img-box" data-url="${esc(img || '')}" style="background:#0f172a;border-radius:0 0 8px 8px;overflow:hidden;min-height:220px;display:flex;align-items:center;justify-content:center;cursor:${img ? 'zoom-in' : 'default'};">
          ${!img ? `<div style="text-align:center;padding:16px;"><div style="font-size:32px;">\u{1F4F7}</div><div style="font-size:0.75rem;color:#64748b;">No photo for this visit</div></div>`
            : `<img src="${esc(img)}" alt="${label}" style="width:100%;max-height:320px;object-fit:contain;display:block;" />`}
        </div>
        <div style="font-size:0.75rem;color:#64748b;padding:2px 4px;margin-top:4px;">${esc(visit.treatment || '')}</div>
      </div>
    `;
    return `
      <div class="flex gap-3 mt-2">
        ${side(va, ima, 'BEFORE')}
        <div class="flex items-center" style="color:#94a3b8;font-size:24px;flex-shrink:0;">→</div>
        ${side(vb, imb, 'AFTER')}
      </div>
      ${(ima && imb) ? `<div style="text-align:center;color:#94a3b8;font-size:0.75rem;margin-top:8px;">\u{1F4A1} Click either image to view full size</div>` : ''}
    `;
  }

  function compareVideosHtml() {
    const options = getVideoCompareOptions();
    if (!options || options.length === 0) {
      return `<div style="text-align:center;padding:24px 0;color:#94a3b8;"><div style="font-size:0.875rem;">No visit videos are available yet</div></div>`;
    }
    const a = videoCompare.a, b = videoCompare.b;
    if (a === '' || b === '' || a == null || b == null) {
      return `<div style="text-align:center;padding:32px 0;color:#94a3b8;"><div style="font-size:0.875rem;">Select two visits above to compare their videos</div></div>`;
    }
    const optionA = options.find((o) => o.key === a);
    const optionB = options.find((o) => o.key === b);
    const va = optionA?.visit, vb = optionB?.visit;
    const videoA = optionA?.src, videoB = optionB?.src;
    if (!videoA && !videoB) {
      return `<div style="text-align:center;padding:24px 0;color:#94a3b8;"><div style="font-size:0.875rem;">Neither selected visit has a video</div></div>`;
    }
    const side = (visit, src, label) => `
      <div style="flex:1;min-width:0;">
        <div style="background:${label === 'VIDEO A' ? '#eff6ff' : '#f0fdf4'};border-radius:8px 8px 0 0;padding:6px 12px;border-bottom:3px solid ${label === 'VIDEO A' ? '#2563eb' : '#22c55e'};display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <span style="font-weight:800;font-size:0.75rem;color:${label === 'VIDEO A' ? '#1d4ed8' : '#16a34a'};">${label}</span>
          <span style="font-size:0.75rem;color:#64748b;">${visit?.date_of_visit ? esc(formatDate(visit.date_of_visit, 'DD MMM YYYY')) : ''}</span>
        </div>
        <div style="background:#0f172a;border-radius:0 0 8px 8px;overflow:hidden;min-height:220px;display:flex;align-items:center;justify-content:center;">
          ${src ? `<video src="${esc(src)}" controls preload="metadata" style="width:100%;max-height:320px;object-fit:contain;display:block;"></video>` : `<div style="text-align:center;padding:16px;"><div style="font-size:0.75rem;color:#64748b;">No video for this visit</div></div>`}
        </div>
        <div style="font-size:0.75rem;color:#64748b;padding:2px 4px;margin-top:4px;">${esc(visit?.treatment || '')}</div>
      </div>
    `;
    return `<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;">${side(va, videoA, 'VIDEO A')}${side(vb, videoB, 'VIDEO B')}</div>`;
  }

  function tab0Html() {
    const visits = getVisits();
    const options = getVideoCompareOptions();
    return `
      <div class="grid-2">
        <div>
          ${detailsCardHtml()}
          ${previousVisitsHtml()}
        </div>
        <div>
          ${latestVisitHtml()}
          <div class="paper">
            <h3 style="font-weight:700;">Before / After Comparison</h3>
            <div class="text-muted mb-3" style="font-size:0.875rem;">Select two visits with photos or videos to compare</div>
            <div style="font-weight:700;margin-bottom:8px;">Photo Comparison</div>
            <div class="flex gap-2 mb-3">
              <select class="select pd-compare-a" style="flex:1;">
                <option value="">Select Visit</option>
                ${visits.map((v, i) => `<option value="${i}" ${String(compare.a) === String(i) ? 'selected' : ''}>${esc(formatDate(v.date_of_visit, 'DD MMM YYYY'))} — ${esc(v.treatment || '')}${(v.photos || []).length > 0 ? ' \u{1F4F7}' : ' (no photo)'}</option>`).join('')}
              </select>
              <select class="select pd-compare-b" style="flex:1;">
                <option value="">Select Visit</option>
                ${visits.map((v, i) => `<option value="${i}" ${String(compare.b) === String(i) ? 'selected' : ''}>${esc(formatDate(v.date_of_visit, 'DD MMM YYYY'))} — ${esc(v.treatment || '')}${(v.photos || []).length > 0 ? ' \u{1F4F7}' : ' (no photo)'}</option>`).join('')}
              </select>
            </div>
            ${compareImagesHtml()}
            <hr class="divider" />
            <div style="font-weight:700;margin-bottom:8px;">Video Comparison</div>
            <div class="flex gap-2 mb-3">
              <select class="select pd-video-compare-a" style="flex:1;">
                <option value="">Select Visit</option>
                ${options.map(({ key, label }) => `<option value="${esc(key)}" ${videoCompare.a === key ? 'selected' : ''}>${esc(label)}</option>`).join('')}
              </select>
              <select class="select pd-video-compare-b" style="flex:1;">
                <option value="">Select Visit</option>
                ${options.map(({ key, label }) => `<option value="${esc(key)}" ${videoCompare.b === key ? 'selected' : ''}>${esc(label)}</option>`).join('')}
              </select>
            </div>
            ${compareVideosHtml()}
          </div>
        </div>
      </div>
    `;
  }

  function wireTab0() {
    const editBtn = panelEl.querySelector('.pd-edit-btn');
    if (editBtn) editBtn.addEventListener('click', () => { page.editing = true; ctx.rerender(); });
    const saveBtn = panelEl.querySelector('.pd-save-details-btn');
    if (saveBtn) saveBtn.addEventListener('click', save);
    const cancelBtn = panelEl.querySelector('.pd-cancel-details-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => { page.editing = false; ctx.rerender(); });

    ['full_name', 'age', 'gender', 'whatsapp', 'email', 'address', 'medical_history'].forEach((key) => {
      const el = panelEl.querySelector(`.pd-form-${key}`);
      if (el) el.addEventListener('input', (e) => { form[key] = e.target.value; });
    });

    panelEl.querySelectorAll('.pd-history-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const hist = chip.dataset.hist;
        form.medical_history = form.medical_history ? `${form.medical_history}, ${hist}` : hist;
        const ta = panelEl.querySelector('.pd-form-medical_history');
        if (ta) ta.value = form.medical_history;
      });
    });

    const compareA = panelEl.querySelector('.pd-compare-a');
    const compareB = panelEl.querySelector('.pd-compare-b');
    if (compareA) compareA.addEventListener('change', (e) => { page.compare = { ...compare, a: e.target.value }; ctx.rerender(); });
    if (compareB) compareB.addEventListener('change', (e) => { page.compare = { ...compare, b: e.target.value }; ctx.rerender(); });

    const vCompareA = panelEl.querySelector('.pd-video-compare-a');
    const vCompareB = panelEl.querySelector('.pd-video-compare-b');
    if (vCompareA) vCompareA.addEventListener('change', (e) => { page.videoCompare = { ...videoCompare, a: e.target.value }; ctx.rerender(); });
    if (vCompareB) vCompareB.addEventListener('change', (e) => { page.videoCompare = { ...videoCompare, b: e.target.value }; ctx.rerender(); });

    panelEl.querySelectorAll('.pd-dispatch-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        openDispatchDialog({
          patientId: page.patientId,
          visitId: btn.dataset.visitId,
          dispatchDate: btn.dataset.dispatchDate || '',
          trackingId: btn.dataset.trackingId || '',
          onSaved: ctx.reloadPatient,
        });
      });
    });

    panelEl.querySelectorAll('.pd-photo-tile').forEach((tile) => {
      const url = tile.dataset.url;
      const img = tile.querySelector('img');
      if (img) {
        img.addEventListener('error', () => {
          tile.dataset.broken = '1';
          tile.style.cursor = 'default';
          tile.innerHTML = '<div style="text-align:center;padding:8px;"><div style="font-size:28px;">\u{1F5BC}️</div><div style="color:#94a3b8;font-size:11px;">Image unavailable</div></div>';
        });
      }
      tile.addEventListener('click', () => { if (tile.dataset.broken !== '1') openLightbox(url, ctx.overlayHost); });
    });

    panelEl.querySelectorAll('.pd-compare-img-box').forEach((box) => {
      const url = box.dataset.url;
      if (!url) return;
      const img = box.querySelector('img');
      if (img) {
        img.addEventListener('error', () => {
          box.innerHTML = '<div style="text-align:center;padding:16px;"><div style="font-size:32px;">\u{1F5BC}️</div><div style="font-size:0.75rem;color:#64748b;">Image unavailable</div></div>';
          box.style.cursor = 'default';
        });
      }
      box.addEventListener('click', () => openLightbox(url, ctx.overlayHost));
    });
  }

  panelEl.innerHTML = tab0Html();
  wireTab0();
}
