// Patient detail page: history, new consultation and appointments tabs.
// Text inputs update state directly, and the active tab is only re-rendered on
// clicks, loads and uploads, so typing never loses focus.

import api from "../api.js";
import { getUser } from "../auth.js";
import { navigate } from "../router.js";
import { uploadCloudinaryMedia } from "../cloudinaryUpload.js";
import { openMedicinesPanel } from "../components/medicinesPanel.js";
import { render as renderBloodTestSelector } from "../components/bloodTestSelector.js";
import { render as renderMedicinesSelector } from "../components/medicinesSelector.js";

const TREATMENTS = ['Cupping', 'PRP', 'GFC', 'Mesotherapy', 'Biotin', 'Other'];

const ADVICE_OPTIONS = [
  'use RO water for head wash',
  'eat Diet',
  'head stand',
  'avoid junk food',
  'ensure good sleep',
  'use sulfate-free shampoo',
  'manage stress',
  'increase protein intake',
];

const HISTORY_OPTIONS = [
  'Alopecia Areata',
  'PCOS',
  'Thyroid Disorder',
  'Telogen Effluvium',
  'Nutritional Deficiencies (Iron/Biotin/Zinc)',
  'Family History of Hair Loss',
  'Androgenetic Alopecia',
  'Traction Alopecia',
  'Dandruff / Seborrheic Dermatitis',
  'Scalp Psoriasis',
];

function esc(v) {
  return v == null ? '' : String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Small date formatter for the tokens used in this file.
function fmt(input, pattern) {
  const d = new Date(input);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours24 = d.getHours();
  const hours12 = hours24 % 12 || 12;
  const map = {
    YYYY: d.getFullYear(),
    MM: pad(d.getMonth() + 1),
    MMM: months[d.getMonth()],
    DD: pad(d.getDate()),
    HH: pad(hours24),
    h: hours12,
    mm: pad(d.getMinutes()),
    A: hours24 >= 12 ? 'PM' : 'AM',
  };
  return pattern.replace(/YYYY|MMM|MM|DD|HH|mm|h|A/g, (m) => (map[m] !== undefined ? String(map[m]) : m));
}

export function render(container, params, state) {
  const patient_id = params.patient_id;
  const routerState = state;

  // local state
  let patient = null;
  let appointments = [];
  let activeAppointment = null;
  let editing = false;
  let form = {};
  let tabValue = 0;
  let compare = { a: '', b: '' };
  let videoCompare = { a: '', b: '' };
  let confirmDelete = false;
  let successMessage = '';
  let consultationType = 'offline';

  function emptyNewVisit() {
    return {
      date_of_visit: '', doctor_notes: '', doctor_advice: '', treatment: '',
      photos: [], videos: [], payment_datetime: '', amount_paid: '', dispatch_date: '', tracking_id: '',
      blood_tests: [],
    };
  }
  let newVisit = emptyNewVisit();
  let uploading = false;
  let submitting = false;
  let selectedMedicines = [];
  let otherTreatmentDialogOpen = false;
  let otherTreatment = '';
  let dispatchDialog = { open: false, visitId: null, dispatch_date: '', tracking_id: '' };
  let dispatchSaving = false;
  let lightbox = { open: false, src: '' };

  // DOM skeleton
  container.innerHTML = `
    <div class="pd-header flex justify-between items-center mb-3"></div>
    <div class="pd-alert"></div>
    <div class="paper" style="padding:0;">
      <div class="tabs pd-tabs" style="padding:0 8px;"></div>
      <div class="tab-panel pd-panel" style="padding:16px;"></div>
    </div>
  `;
  const headerEl = container.querySelector('.pd-header');
  const alertEl = container.querySelector('.pd-alert');
  const tabsEl = container.querySelector('.pd-tabs');
  const panelEl = container.querySelector('.pd-panel');
  const dialogHost = document.createElement('div');
  container.appendChild(dialogHost);

  // derived data
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
      label: `${fmt(visit.date_of_visit, 'DD MMM YYYY')} - ${visit.treatment || 'Visit'}${(visit.videos || []).length > 1 ? ` - Video ${videoIndex + 1}` : ''}`,
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

  // data loading
  async function loadPatient() {
    try {
      const res = await api.get(`/api/patients/${patient_id}`);
      if (!(routerState && routerState.startConsultation)) {
        consultationType = res.data.patient_type || 'offline';
      }
      patient = {
        ...res.data,
        medical_history: res.data.current_issues
          ? (res.data.medical_history ? `${res.data.medical_history}\n\nCurrent Issues: ${res.data.current_issues}` : `Current Issues: ${res.data.current_issues}`)
          : res.data.medical_history,
      };
      form = {
        full_name: res.data.full_name,
        age: res.data.age,
        gender: res.data.gender,
        whatsapp: res.data.whatsapp,
        medical_history: res.data.current_issues
          ? (res.data.medical_history ? `${res.data.medical_history}\n\nCurrent Issues: ${res.data.current_issues}` : res.data.current_issues)
          : res.data.medical_history,
        email: res.data.email,
        address: res.data.address || '',
      };
      renderPanel();
    } catch (e) {
      console.error(e);
    }
  }

  async function loadAppointments() {
    try {
      const res = await api.get('/api/appointments', { params: { patient_id, per_page: 100 } });
      appointments = res.data.items || [];
      renderPanel();
    } catch (e) {}
  }

  function applyStartConsultation(appt) {
    activeAppointment = appt;
    tabValue = 1;
    const treatmentType = appt.consultation_type === 'walk_in' ? 'Clinic Visit' : 'Online Consultation';
    if (!TREATMENTS.includes(treatmentType)) {
      otherTreatment = treatmentType;
    }
    consultationType = appt.consultation_type === 'walk_in' ? 'offline' : 'online';
    newVisit.date_of_visit = formatDateTimeForHandoff(appt.date_time);
    newVisit.treatment = treatmentType;
    successMessage = 'Auto-filled consultation details from Website Appointment.';
    window.history.replaceState(null, document.title);
  }
  function formatDateTimeForHandoff(dt) {
    if (!dt || dt === 'Pending') return '';
    try { return fmt(dt, 'YYYY-MM-DDTHH:mm'); } catch (e) { return ''; }
  }

  // 30-minute snapping
  function handleDateChange(val) {
    if (!val) return val;
    const d = new Date(val);
    const m = d.getMinutes();
    if (m !== 0 && m !== 30) {
      const snapped = m < 15 ? 0 : (m < 45 ? 30 : 0);
      d.setMinutes(snapped);
      if (snapped === 0 && m >= 45) d.setHours(d.getHours() + 1);
      const yyyy = d.getFullYear();
      const MM = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const HH = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${yyyy}-${MM}-${dd}T${HH}:${min}`;
    }
    return val;
  }

  // actions
  async function save() {
    try {
      // The edit box already shows current issues merged into medical history,
      // so clear current_issues to stop them being merged in a second time.
      await api.put(`/api/patients/${patient_id}`, { ...form, current_issues: '' });
      editing = false;
      renderPanel();
      loadPatient();
    } catch (e) {
      alert('Save failed');
    }
  }

  async function handleMediaFile(e, mediaType) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    if (mediaType === 'photo' && !file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    if (mediaType === 'video' && !file.type.startsWith('video/')) {
      alert('Please select a video file.');
      return;
    }

    uploading = true;
    renderPanel();
    try {
      const uploaded = await uploadCloudinaryMedia(file);
      if (mediaType === 'video') {
        newVisit.videos = [...(newVisit.videos || []), uploaded.url];
        alert('Video uploaded successfully');
      } else {
        newVisit.photos = [...newVisit.photos, uploaded.url];
        alert('Photo uploaded successfully');
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Upload error');
    } finally {
      uploading = false;
      renderPanel();
    }
  }

  function removePhotoFromNewVisit(idx) {
    newVisit.photos = newVisit.photos.filter((_, i) => i !== idx);
  }

  function removeVideoFromNewVisit(idx) {
    newVisit.videos = (newVisit.videos || []).filter((_, i) => i !== idx);
  }

  async function submitVisit() {
    if (!newVisit.treatment) {
      alert('Please select a treatment');
      return;
    }
    if (consultationType === 'online' && (!newVisit.payment_datetime || !newVisit.amount_paid)) {
      alert('Payment Date/Time and Amount Paid are required for online orders.');
      return;
    }
    submitting = true;
    renderPanel();
    try {
      const payload = { visit: { ...newVisit, medicines: selectedMedicines } };
      await api.put(`/api/patients/${patient_id}`, payload);

      if (activeAppointment) {
        try {
          await api.put(`/api/appointments/${activeAppointment._id}`, { status: 'Completed' });
          activeAppointment = null;
          loadAppointments();
        } catch (e) {}
      }

      try {
        await api.post('/api/notify/post-visit', {
          phone: patient?.whatsapp || '',
          email: patient?.email || null,
          name: patient?.full_name || '',
          treatment: newVisit.treatment,
          next_visit: newVisit.next_visit || null,
        });
      } catch (notifyErr) {
        console.warn('Post-visit notification failed (non-critical):', notifyErr);
      }

      successMessage = 'Visit added successfully! Confirmation sent to patient.';
      newVisit = emptyNewVisit();
      selectedMedicines = [];
      setTimeout(() => {
        loadPatient();
        tabValue = 0;
        updateActiveTab();
        successMessage = '';
        renderAlert();
        renderPanel();
      }, 2000);
    } catch (err) {
      alert(err?.response?.data?.msg || 'Failed to add visit');
    } finally {
      submitting = false;
      renderAlert();
      renderPanel();
    }
  }

  async function remove() {
    try {
      await api.delete(`/api/patients/${patient_id}`);
      navigate('/admin/');
    } catch (e) {
      alert('Delete failed');
    }
  }

  async function saveDispatch() {
    try {
      dispatchSaving = true;
      renderDialogs();
      await api.patch(`/api/patients/${patient_id}/visit-dispatch`, {
        visit_id: dispatchDialog.visitId,
        dispatch_date: dispatchDialog.dispatch_date,
        tracking_id: dispatchDialog.tracking_id,
      });
      dispatchDialog = { open: false, visitId: null, dispatch_date: '', tracking_id: '' };
      dispatchSaving = false;
      renderDialogs();
      loadPatient();
    } catch (e) {
      alert(e?.response?.data?.msg || 'Failed to update dispatch info');
      dispatchSaving = false;
      renderDialogs();
    }
  }

  function exportPdf() {
    window.print();
  }

  function openLightbox(src) {
    lightbox = { open: true, src };
    renderDialogs();
  }

  // header
  function headerHtml() {
    const isAdmin = getUser()?.role === 'Admin';
    return `
      <h2>Patient: ${esc(patient_id)}</h2>
      <div class="flex gap-2">
        <button type="button" class="btn btn-outline pd-export-btn">Export PDF</button>
        ${isAdmin ? `
          <button type="button" class="btn btn-primary pd-manage-meds-btn">Manage Medicines</button>
          <button type="button" class="btn btn-danger pd-delete-btn">Delete</button>
        ` : ''}
      </div>
    `;
  }
  function wireHeader() {
    const exportBtn = headerEl.querySelector('.pd-export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportPdf);
    const manageMedsBtn = headerEl.querySelector('.pd-manage-meds-btn');
    if (manageMedsBtn) manageMedsBtn.addEventListener('click', () => openMedicinesPanel());
    const deleteBtn = headerEl.querySelector('.pd-delete-btn');
    if (deleteBtn) deleteBtn.addEventListener('click', () => { confirmDelete = true; renderDialogs(); });
  }

  // alert
  function renderAlert() {
    alertEl.innerHTML = successMessage ? `<div class="alert alert-success">${esc(successMessage)}</div>` : '';
  }

  // tabs bar
  function tabsBarHtml() {
    return `
      <button type="button" class="tab pd-tab-btn ${tabValue === 0 ? 'active' : ''}" data-idx="0">History &amp; Details</button>
      <button type="button" class="tab pd-tab-btn ${tabValue === 1 ? 'active' : ''}" data-idx="1">New Consultation</button>
      <button type="button" class="tab pd-tab-btn ${tabValue === 2 ? 'active' : ''}" data-idx="2">Appointments</button>
    `;
  }
  function updateActiveTab() {
    tabsEl.querySelectorAll('.pd-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.idx, 10) === tabValue);
    });
  }

  function renderPanel() {
    if (tabValue === 0) renderTab0();
    else if (tabValue === 1) renderTab1();
    else renderTab2();
  }

  // TAB 0: History & Details
  function onlineVisitInfoHtml(v) {
    const isDispatched = !!v.tracking_id;
    return `
      <div class="mt-3" style="background:${isDispatched ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : 'linear-gradient(135deg,#f0fdfe,#e0f7fa)'};border:1.5px solid ${isDispatched ? '#86efac' : '#a5f3fc'};border-radius:8px;padding:12px;">
        <div style="display:flex;flex-wrap:wrap;gap:16px;margin-bottom:8px;">
          <div>
            <div style="font-size:0.7rem;color:#64748b;">\u{1F4B3} Payment Date &amp; Time</div>
            <div style="font-weight:600;">${v.payment_datetime ? esc(fmt(v.payment_datetime, 'DD MMM YYYY, h:mm A')) : '<em style="color:#94a3b8;">Not recorded</em>'}</div>
          </div>
          <div>
            <div style="font-size:0.7rem;color:#64748b;">\u{1F4B0} Amount Paid</div>
            <div style="font-weight:700;color:#16a34a;">${v.amount_paid ? '₹' + Number(v.amount_paid).toLocaleString('en-IN') : '<em style="color:#94a3b8;">—</em>'}</div>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;">
          <div>
            <div style="font-size:0.7rem;color:#64748b;">\u{1F4C5} Dispatch Date</div>
            <div style="font-weight:600;">${v.dispatch_date ? esc(fmt(v.dispatch_date, 'DD MMM YYYY')) : '<em style="color:#94a3b8;">Not dispatched yet</em>'}</div>
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
    const total = medicines.reduce((sum, m) => sum + m.price, 0);
    return `
      <div class="mt-3" style="background:#f9f9f9;padding:12px;border-radius:6px;border:2px solid #2196F3;">
        <div style="font-weight:bold;color:#2196F3;margin-bottom:8px;">\u{1F48A} Medicines &amp; Billing</div>
        <div class="flex flex-col gap-2">
          ${medicines.map((m) => `<div class="flex justify-between items-center"><span>${esc(m.name)}</span><span style="font-weight:bold;color:#2196F3;">₹${m.price.toFixed(2)}</span></div>`).join('')}
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
      <div><strong>${esc(fmt(v.date_of_visit, 'DD MMM YYYY, h:mm A'))}</strong></div>
      <div style="color:var(--primary);font-size:0.875rem;">${esc(v.treatment || '')}</div>
      ${v.doctor_notes ? `<div style="font-size:0.875rem;"><strong>Notes:</strong> ${esc(v.doctor_notes)}</div>` : ''}
      ${v.doctor_advice ? `<div style="font-size:0.875rem;"><strong>Advice:</strong> ${esc(v.doctor_advice)}</div>` : ''}
      ${v.next_visit ? `<div style="font-size:0.875rem;color:orange;"><strong>Next Scheduled:</strong> ${esc(fmt(v.next_visit, 'DD MMM YYYY'))}</div>` : ''}
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
            <div><strong>Next Visit:</strong> ${patient?.next_visit ? esc(fmt(patient.next_visit, 'DD MMM YYYY, h:mm A')) : ''}</div>
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
          <span style="font-size:0.75rem;color:#64748b;">${esc(fmt(visit.date_of_visit, 'DD MMM YYYY'))}</span>
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
          <span style="font-size:0.75rem;color:#64748b;">${visit?.date_of_visit ? esc(fmt(visit.date_of_visit, 'DD MMM YYYY')) : ''}</span>
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
                ${visits.map((v, i) => `<option value="${i}" ${String(compare.a) === String(i) ? 'selected' : ''}>${esc(fmt(v.date_of_visit, 'DD MMM YYYY'))} — ${esc(v.treatment || '')}${(v.photos || []).length > 0 ? ' \u{1F4F7}' : ' (no photo)'}</option>`).join('')}
              </select>
              <select class="select pd-compare-b" style="flex:1;">
                <option value="">Select Visit</option>
                ${visits.map((v, i) => `<option value="${i}" ${String(compare.b) === String(i) ? 'selected' : ''}>${esc(fmt(v.date_of_visit, 'DD MMM YYYY'))} — ${esc(v.treatment || '')}${(v.photos || []).length > 0 ? ' \u{1F4F7}' : ' (no photo)'}</option>`).join('')}
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
    if (editBtn) editBtn.addEventListener('click', () => { editing = true; renderPanel(); });
    const saveBtn = panelEl.querySelector('.pd-save-details-btn');
    if (saveBtn) saveBtn.addEventListener('click', save);
    const cancelBtn = panelEl.querySelector('.pd-cancel-details-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => { editing = false; renderPanel(); });

    ['full_name', 'age', 'gender', 'whatsapp', 'email'].forEach((key) => {
      const el = panelEl.querySelector(`.pd-form-${key}`);
      if (el) el.addEventListener('input', (e) => { form[key] = e.target.value; });
    });
    const addressEl = panelEl.querySelector('.pd-form-address');
    if (addressEl) addressEl.addEventListener('input', (e) => { form.address = e.target.value; });
    const mhEl = panelEl.querySelector('.pd-form-medical_history');
    if (mhEl) mhEl.addEventListener('input', (e) => { form.medical_history = e.target.value; });

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
    if (compareA) compareA.addEventListener('change', (e) => { compare = { ...compare, a: e.target.value }; renderPanel(); });
    if (compareB) compareB.addEventListener('change', (e) => { compare = { ...compare, b: e.target.value }; renderPanel(); });

    const vCompareA = panelEl.querySelector('.pd-video-compare-a');
    const vCompareB = panelEl.querySelector('.pd-video-compare-b');
    if (vCompareA) vCompareA.addEventListener('change', (e) => { videoCompare = { ...videoCompare, a: e.target.value }; renderPanel(); });
    if (vCompareB) vCompareB.addEventListener('change', (e) => { videoCompare = { ...videoCompare, b: e.target.value }; renderPanel(); });

    panelEl.querySelectorAll('.pd-dispatch-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        dispatchDialog = { open: true, visitId: btn.dataset.visitId, dispatch_date: btn.dataset.dispatchDate || '', tracking_id: btn.dataset.trackingId || '' };
        renderDialogs();
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
      tile.addEventListener('click', () => { if (tile.dataset.broken !== '1') openLightbox(url); });
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
      box.addEventListener('click', () => openLightbox(url));
    });
  }

  function renderTab0() {
    panelEl.innerHTML = tab0Html();
    wireTab0();
  }

  // TAB 1: New Consultation
  function treatmentSelectValue() {
    return TREATMENTS.includes(newVisit.treatment) ? newVisit.treatment : (newVisit.treatment ? 'Other' : '');
  }

  function tab1Html() {
    const selVal = treatmentSelectValue();
    return `
      <div class="paper">
        <h3 class="mb-3">Add New Consultation for ${esc(patient?.full_name || '')}</h3>
        <div class="mb-3">
          <div class="toggle-group">
            <button type="button" class="toggle-btn pd-consult-toggle ${consultationType === 'offline' ? 'active' : ''}" data-value="offline">Clinic Visit</button>
            <button type="button" class="toggle-btn pd-consult-toggle ${consultationType === 'online' ? 'active' : ''}" data-value="online">Online Consultation</button>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <div class="field">
            <label class="field-label">Date of Visit</label>
            <input type="datetime-local" step="1800" class="input pd-date-of-visit" value="${esc(newVisit.date_of_visit)}" />
          </div>

          ${consultationType === 'online' ? `
            <div style="background:linear-gradient(135deg,#f0fdfe,#e0f7fa);border:1.5px solid #a5f3fc;border-radius:8px;padding:16px;">
              <div style="color:#0891b2;margin-bottom:12px;font-weight:600;">\u{1F4B3} Order &amp; Payment Details</div>
              <div class="grid-2">
                <div class="field">
                  <label class="field-label">Payment Date &amp; Time *</label>
                  <input type="datetime-local" class="input pd-payment-datetime" value="${esc(newVisit.payment_datetime || '')}" />
                </div>
                <div class="field">
                  <label class="field-label">Amount Paid (₹) *</label>
                  <input type="number" min="0" step="0.01" class="input pd-amount-paid" value="${esc(newVisit.amount_paid || '')}" />
                </div>
                <div class="field">
                  <label class="field-label">Dispatch Date (optional)</label>
                  <input type="date" class="input pd-dispatch-date" value="${esc(newVisit.dispatch_date || '')}" />
                  <div style="font-size:0.72rem;color:var(--muted);margin-top:2px;">Fill when order is shipped</div>
                </div>
                <div class="field">
                  <label class="field-label">Tracking ID (optional)</label>
                  <input type="text" class="input pd-tracking-id" placeholder="e.g. DTDC123456789IN" value="${esc(newVisit.tracking_id || '')}" />
                  <div style="font-size:0.72rem;color:var(--muted);margin-top:2px;">Fill when order is shipped</div>
                </div>
              </div>
            </div>
          ` : ''}

          <div class="field">
            <label class="field-label">Treatment Type</label>
            <select class="select pd-treatment-select">
              <option value="">Select Treatment</option>
              ${TREATMENTS.map((t) => `<option value="${esc(t)}" ${selVal === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
            </select>
            ${(newVisit.treatment && !TREATMENTS.includes(newVisit.treatment)) ? `<div style="font-size:0.75rem;color:var(--primary);margin-top:4px;">Custom: ${esc(newVisit.treatment)}</div>` : ''}
          </div>

          <div class="field">
            <label class="field-label">Doctor Notes</label>
            <textarea class="textarea pd-doctor-notes" rows="2">${esc(newVisit.doctor_notes || '')}</textarea>
          </div>

          <div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
              ${ADVICE_OPTIONS.map((adv) => `<span class="chip chip-primary pd-advice-chip" data-adv="${esc(adv)}" style="cursor:pointer;border:1px solid var(--primary);background:transparent;">${esc(adv)}</span>`).join('')}
            </div>
            <div class="field">
              <label class="field-label">Doctor Advice</label>
              <textarea class="textarea pd-doctor-advice" rows="2">${esc(newVisit.doctor_advice || '')}</textarea>
            </div>
          </div>

          <div style="margin-bottom:8px;">
            <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
              <button type="button" class="btn btn-outline pd-upload-photo-btn" ${uploading ? 'disabled' : ''}>\u{1F4F7} Upload Photo</button>
              <input type="file" accept="image/*" class="pd-photo-file-input" style="display:none;" />
              <button type="button" class="btn btn-outline pd-upload-video-btn" ${uploading ? 'disabled' : ''}>\u{1F3A5} Upload Video</button>
              <input type="file" accept="video/*" class="pd-video-file-input" style="display:none;" />
              ${uploading ? `<span class="spinner" style="margin-left:4px;"></span>` : ''}
            </div>
          </div>

          ${newVisit.photos.length > 0 ? `
            <div>
              <div style="font-size:0.85rem;font-weight:600;margin-bottom:8px;">Uploaded Photos:</div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;">
                ${newVisit.photos.map((u, i) => `
                  <div style="position:relative;">
                    <img src="${esc(u)}" alt="photo-${i}" style="height:100px;border-radius:4px;border:1px solid #ccc;" />
                    <button type="button" class="btn btn-danger btn-sm pd-remove-photo-btn" data-idx="${i}" style="position:absolute;top:-8px;right:-8px;min-width:auto;width:24px;height:24px;padding:0;border-radius:50%;">✕</button>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${(newVisit.videos || []).length > 0 ? `
            <div>
              <div style="font-size:0.85rem;font-weight:600;margin-bottom:8px;">Uploaded Videos:</div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;">
                ${newVisit.videos.map((u, i) => `
                  <div style="position:relative;width:180px;height:110px;border-radius:6px;overflow:hidden;border:1px solid #ccc;background:#0f172a;">
                    <video src="${esc(u)}" controls muted preload="metadata" style="width:100%;height:100%;object-fit:cover;display:block;"></video>
                    <button type="button" class="btn btn-danger btn-sm pd-remove-video-btn" data-idx="${i}" style="position:absolute;top:-8px;right:-8px;min-width:auto;width:24px;height:24px;padding:0;border-radius:50%;background:#fff;">✕</button>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${consultationType !== 'online' ? `
            <div class="mt-2 mb-2">
              <div class="flex items-center gap-2 mb-2">
                <span style="width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,#7c3aed,#6d28d9);display:inline-flex;align-items:center;justify-content:center;">\u{1F9EA}</span>
                <span style="font-weight:700;color:#1e293b;">Blood Test Prescriptions</span>
              </div>
              <div class="pd-blood-test-container"></div>
            </div>
          ` : ''}

          <div class="mt-3" style="border-top:1px solid #f0f0f0;padding-top:16px;">
            <div class="flex items-center gap-2 mb-2">
              <span style="color:#1d4ed8;">⚕️</span>
              <h3 style="color:#1e293b;">Medicines &amp; Billing</h3>
            </div>
            <div class="pd-medicines-container"></div>
          </div>

          <div class="flex gap-2 mt-3">
            <button type="button" class="btn btn-primary pd-save-visit-btn" ${submitting || !newVisit.treatment ? 'disabled' : ''}>${submitting ? 'Saving...' : 'Save Consultation'}</button>
            <button type="button" class="btn btn-outline pd-reset-visit-btn">Reset</button>
          </div>
        </div>
      </div>
    `;
  }

  function wireTab1() {
    panelEl.querySelectorAll('.pd-consult-toggle').forEach((btn) => {
      btn.addEventListener('click', () => { consultationType = btn.dataset.value; renderPanel(); });
    });

    const dateEl = panelEl.querySelector('.pd-date-of-visit');
    if (dateEl) dateEl.addEventListener('change', (e) => { newVisit.date_of_visit = handleDateChange(e.target.value); dateEl.value = newVisit.date_of_visit; });

    const paymentEl = panelEl.querySelector('.pd-payment-datetime');
    if (paymentEl) paymentEl.addEventListener('input', (e) => { newVisit.payment_datetime = e.target.value; });
    const amountEl = panelEl.querySelector('.pd-amount-paid');
    if (amountEl) amountEl.addEventListener('input', (e) => { newVisit.amount_paid = e.target.value; });
    const dispatchDateEl = panelEl.querySelector('.pd-dispatch-date');
    if (dispatchDateEl) dispatchDateEl.addEventListener('input', (e) => { newVisit.dispatch_date = e.target.value; });
    const trackingEl = panelEl.querySelector('.pd-tracking-id');
    if (trackingEl) trackingEl.addEventListener('input', (e) => { newVisit.tracking_id = e.target.value; });

    const treatmentSelect = panelEl.querySelector('.pd-treatment-select');
    if (treatmentSelect) {
      treatmentSelect.addEventListener('change', (e) => {
        if (e.target.value === 'Other') {
          otherTreatmentDialogOpen = true;
          renderDialogs();
          treatmentSelect.value = treatmentSelectValue();
        } else {
          newVisit.treatment = e.target.value;
          renderPanel();
        }
      });
    }

    const notesEl = panelEl.querySelector('.pd-doctor-notes');
    if (notesEl) notesEl.addEventListener('input', (e) => { newVisit.doctor_notes = e.target.value; });

    const adviceEl = panelEl.querySelector('.pd-doctor-advice');
    if (adviceEl) adviceEl.addEventListener('input', (e) => { newVisit.doctor_advice = e.target.value; });

    panelEl.querySelectorAll('.pd-advice-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const adv = chip.dataset.adv;
        newVisit.doctor_advice = newVisit.doctor_advice ? `${newVisit.doctor_advice}, ${adv}` : adv;
        const ta = panelEl.querySelector('.pd-doctor-advice');
        if (ta) ta.value = newVisit.doctor_advice;
      });
    });

    const photoBtn = panelEl.querySelector('.pd-upload-photo-btn');
    const photoInput = panelEl.querySelector('.pd-photo-file-input');
    if (photoBtn && photoInput) {
      photoBtn.addEventListener('click', () => photoInput.click());
      photoInput.addEventListener('change', (e) => handleMediaFile(e, 'photo'));
    }
    const videoBtn = panelEl.querySelector('.pd-upload-video-btn');
    const videoInput = panelEl.querySelector('.pd-video-file-input');
    if (videoBtn && videoInput) {
      videoBtn.addEventListener('click', () => videoInput.click());
      videoInput.addEventListener('change', (e) => handleMediaFile(e, 'video'));
    }

    panelEl.querySelectorAll('.pd-remove-photo-btn').forEach((btn) => {
      btn.addEventListener('click', () => { removePhotoFromNewVisit(parseInt(btn.dataset.idx, 10)); renderPanel(); });
    });
    panelEl.querySelectorAll('.pd-remove-video-btn').forEach((btn) => {
      btn.addEventListener('click', () => { removeVideoFromNewVisit(parseInt(btn.dataset.idx, 10)); renderPanel(); });
    });

    const bloodTestContainer = panelEl.querySelector('.pd-blood-test-container');
    if (bloodTestContainer) {
      renderBloodTestSelector(bloodTestContainer, newVisit.blood_tests || [], (tests) => { newVisit.blood_tests = tests; });
    }
    const medsContainer = panelEl.querySelector('.pd-medicines-container');
    if (medsContainer) {
      renderMedicinesSelector(medsContainer, selectedMedicines, (meds) => { selectedMedicines = meds; });
    }

    const saveVisitBtn = panelEl.querySelector('.pd-save-visit-btn');
    if (saveVisitBtn) saveVisitBtn.addEventListener('click', submitVisit);
    const resetBtn = panelEl.querySelector('.pd-reset-visit-btn');
    if (resetBtn) resetBtn.addEventListener('click', () => { newVisit = emptyNewVisit(); selectedMedicines = []; renderPanel(); });
  }

  function renderTab1() {
    panelEl.innerHTML = tab1Html();
    wireTab1();
  }

  // TAB 2: Appointments
  function statusChipClass(status) {
    if (status === 'Completed') return 'chip-success';
    if (status === 'Cancelled') return 'chip-danger';
    if (status === 'No Show') return 'chip-warning';
    if (status === 'Consultation Started') return 'chip-primary';
    return 'chip-default';
  }

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
                    <div style="font-weight:600;">${appt.date_time !== 'Pending' ? esc(fmt(appt.date_time, 'DD MMM YYYY')) : 'Pending'}</div>
                    ${appt.date_time !== 'Pending' ? `<div style="font-size:0.75rem;color:var(--muted);">${esc(fmt(appt.date_time, 'h:mm A'))}</div>` : ''}
                  </td>
                  <td>${appt.consultation_type === 'walk_in' ? 'Clinic Visit' : 'Online'}</td>
                  <td>${esc(appt.treatment || '')}</td>
                  <td><span class="chip ${statusChipClass(appt.status)}">${esc(appt.status || 'New')}</span></td>
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
          if (appt.status !== 'Consultation Started') {
            await api.put(`/api/appointments/${appt._id}`, { status: 'Consultation Started' });
            loadAppointments();
          }
          activeAppointment = appt;
          tabValue = 1;
          const treatmentType = appt.consultation_type === 'walk_in' ? 'Clinic Visit' : 'Online Consultation';
          consultationType = appt.consultation_type === 'walk_in' ? 'offline' : 'online';
          newVisit.date_of_visit = appt.date_time !== 'Pending' ? fmt(appt.date_time, 'YYYY-MM-DDTHH:mm') : '';
          newVisit.treatment = treatmentType;
          updateActiveTab();
          renderPanel();
        } catch (e) {}
      });
    });
  }

  function renderTab2() {
    panelEl.innerHTML = tab2Html();
    wireTab2();
  }

  // Dialogs (delete confirm, dispatch update, custom treatment, lightbox)
  function dialogsHtml() {
    let html = '';
    if (confirmDelete) {
      html += `
        <div class="dialog-overlay pd-confirm-delete-overlay">
          <div class="dialog">
            <div class="dialog-title">Confirm Delete</div>
            <div class="dialog-content">Are you sure you want to delete this patient? This action cannot be undone.</div>
            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost pd-cancel-delete-btn">Cancel</button>
              <button type="button" class="btn btn-danger pd-confirm-delete-btn">Delete</button>
            </div>
          </div>
        </div>
      `;
    }
    if (dispatchDialog.open) {
      html += `
        <div class="dialog-overlay pd-dispatch-overlay">
          <div class="dialog">
            <div class="dialog-title">\u{1F69A} Update Dispatch Info</div>
            <div class="dialog-content">
              <div class="field">
                <label class="field-label">Dispatch Date</label>
                <input type="date" class="input pd-dispatch-dialog-date" value="${esc(dispatchDialog.dispatch_date)}" />
              </div>
              <div class="field">
                <label class="field-label">Tracking ID</label>
                <input type="text" class="input pd-dispatch-dialog-tracking" placeholder="e.g. DTDC123456789IN" value="${esc(dispatchDialog.tracking_id)}" />
              </div>
            </div>
            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost pd-dispatch-cancel-btn">Cancel</button>
              <button type="button" class="btn btn-primary pd-dispatch-save-btn" ${dispatchSaving ? 'disabled' : ''}>${dispatchSaving ? 'Saving...' : 'Save Dispatch Info'}</button>
            </div>
          </div>
        </div>
      `;
    }
    if (otherTreatmentDialogOpen) {
      html += `
        <div class="dialog-overlay pd-other-treatment-overlay">
          <div class="dialog">
            <div class="dialog-title">Specify Custom Treatment</div>
            <div class="dialog-content">
              <div class="field">
                <label class="field-label">Treatment Name</label>
                <input type="text" class="input pd-other-treatment-input" value="${esc(otherTreatment)}" autofocus />
              </div>
            </div>
            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost pd-other-cancel-btn">Cancel</button>
              <button type="button" class="btn btn-primary pd-other-ok-btn">OK</button>
            </div>
          </div>
        </div>
      `;
    }
    if (lightbox.open) {
      html += `
        <div class="lightbox-overlay pd-lightbox-overlay">
          <div style="position:absolute;top:16px;right:16px;">
            <button type="button" class="btn btn-ghost pd-lightbox-close-btn" style="color:#fff;">✕ Close</button>
          </div>
          <img src="${esc(lightbox.src)}" alt="full view" />
        </div>
      `;
    }
    return html;
  }

  function wireDialogs() {
    const cancelDeleteBtn = dialogHost.querySelector('.pd-cancel-delete-btn');
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => { confirmDelete = false; renderDialogs(); });
    const confirmDeleteBtn = dialogHost.querySelector('.pd-confirm-delete-btn');
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', remove);

    const dispatchDateEl = dialogHost.querySelector('.pd-dispatch-dialog-date');
    if (dispatchDateEl) dispatchDateEl.addEventListener('input', (e) => { dispatchDialog.dispatch_date = e.target.value; });
    const dispatchTrackingEl = dialogHost.querySelector('.pd-dispatch-dialog-tracking');
    if (dispatchTrackingEl) dispatchTrackingEl.addEventListener('input', (e) => { dispatchDialog.tracking_id = e.target.value; });
    const dispatchCancelBtn = dialogHost.querySelector('.pd-dispatch-cancel-btn');
    if (dispatchCancelBtn) dispatchCancelBtn.addEventListener('click', () => { dispatchDialog = { open: false, visitId: null, dispatch_date: '', tracking_id: '' }; renderDialogs(); });
    const dispatchSaveBtn = dialogHost.querySelector('.pd-dispatch-save-btn');
    if (dispatchSaveBtn) dispatchSaveBtn.addEventListener('click', saveDispatch);

    const otherInput = dialogHost.querySelector('.pd-other-treatment-input');
    if (otherInput) otherInput.addEventListener('input', (e) => { otherTreatment = e.target.value; });
    const otherCancelBtn = dialogHost.querySelector('.pd-other-cancel-btn');
    if (otherCancelBtn) otherCancelBtn.addEventListener('click', () => { otherTreatmentDialogOpen = false; renderDialogs(); });
    const otherOkBtn = dialogHost.querySelector('.pd-other-ok-btn');
    if (otherOkBtn) otherOkBtn.addEventListener('click', () => {
      newVisit.treatment = otherTreatment;
      otherTreatmentDialogOpen = false;
      renderDialogs();
      renderPanel();
    });

    const lightboxCloseBtn = dialogHost.querySelector('.pd-lightbox-close-btn');
    if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', () => { lightbox = { open: false, src: '' }; renderDialogs(); });
    const lightboxOverlay = dialogHost.querySelector('.pd-lightbox-overlay');
    if (lightboxOverlay) {
      lightboxOverlay.addEventListener('click', (e) => {
        if (e.target === lightboxOverlay) { lightbox = { open: false, src: '' }; renderDialogs(); }
      });
    }
  }

  function renderDialogs() {
    dialogHost.innerHTML = dialogsHtml();
    wireDialogs();
  }

  // mount
  headerEl.innerHTML = headerHtml();
  wireHeader();

  tabsEl.innerHTML = tabsBarHtml();
  tabsEl.querySelectorAll('.pd-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => { tabValue = parseInt(btn.dataset.idx, 10); updateActiveTab(); renderPanel(); });
  });

  if (routerState && routerState.startConsultation && routerState.appointment) {
    applyStartConsultation(routerState.appointment);
  }
  updateActiveTab();

  renderAlert();
  renderPanel();
  renderDialogs();

  loadPatient();
  loadAppointments();
}
