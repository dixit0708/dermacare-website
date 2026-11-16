// "New Consultation" tab: the visit form. Saving it adds a visit to the patient,
// completes the appointment it was started from, and queues the thank-you email.

import api from "../../api.js";
import { esc } from "../../escape.js";
import { toast } from "../../toast.js";
import { uploadCloudinaryMedia } from "../../cloudinaryUpload.js";
import { render as renderBloodTestSelector } from "../../components/bloodTestSelector.js";
import { render as renderMedicinesSelector } from "../../components/medicinesSelector.js";
import { openCustomTreatmentDialog } from "../../components/customTreatmentDialog.js";
import { TREATMENTS, ADVICE_OPTIONS } from "../../clinicOptions.js";
import { toDateTimeInput } from "../../format.js";
import { APPOINTMENT_STATUS } from "../../constants.js";

export function emptyNewVisit() {
  return {
    date_of_visit: '', doctor_notes: '', doctor_advice: '', treatment: '',
    photos: [], videos: [], payment_datetime: '', amount_paid: '', dispatch_date: '', tracking_id: '',
    blood_tests: [],
  };
}

// Visits are booked in 30-minute slots; setMinutes(60) rolls over to the next hour.
function snapToHalfHour(value) {
  if (!value) return value;
  const d = new Date(value);
  d.setMinutes(Math.round(d.getMinutes() / 30) * 30);
  return toDateTimeInput(d);
}

// Uploads run while the user may keep editing, so they write to ctx.page directly.
async function handleMediaFile(e, mediaType, ctx) {
  const { page } = ctx;
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;

  if (mediaType === 'photo' && !file.type.startsWith('image/')) {
    toast.error('Please select an image file.');
    return;
  }
  if (mediaType === 'video' && !file.type.startsWith('video/')) {
    toast.error('Please select a video file.');
    return;
  }

  page.uploading = true;
  ctx.rerender();
  try {
    const uploaded = await uploadCloudinaryMedia(file);
    if (mediaType === 'video') {
      page.newVisit.videos = [...(page.newVisit.videos || []), uploaded.url];
      toast.success('Video uploaded successfully');
    } else {
      page.newVisit.photos = [...page.newVisit.photos, uploaded.url];
      toast.success('Photo uploaded successfully');
    }
  } catch (err) {
    toast.error(err.message || 'Upload error');
  } finally {
    page.uploading = false;
    ctx.rerender();
  }
}

async function submitVisit(ctx) {
  const { page } = ctx;
  if (!page.newVisit.treatment) {
    toast.error('Please select a treatment');
    return;
  }
  if (page.consultationType === 'online' && (!page.newVisit.payment_datetime || !page.newVisit.amount_paid)) {
    toast.error('Payment Date/Time and Amount Paid are required for online orders.');
    return;
  }
  page.submitting = true;
  ctx.rerender();
  try {
    const payload = { visit: { ...page.newVisit, medicines: page.selectedMedicines } };
    await api.put(`/api/patients/${page.patientId}`, payload);

    if (page.activeAppointment) {
      try {
        await api.put(`/api/appointments/${page.activeAppointment._id}`, { status: APPOINTMENT_STATUS.COMPLETED });
        page.activeAppointment = null;
        ctx.reloadAppointments();
      } catch (e) {
        toast.warning(`Visit saved, but the appointment could not be marked Completed: ${e.message}`);
      }
    }

    // The message says what actually happened to the thank-you email.
    let emailNote = 'No email address on file, so no thank-you email was sent.';
    if (page.patient?.email) {
      try {
        await api.post('/api/notify/post-visit', {
          email: page.patient.email,
          name: page.patient.full_name || '',
          treatment: page.newVisit.treatment,
          next_visit: page.newVisit.next_visit || null,
        });
        emailNote = `A thank-you email is being sent to ${page.patient.email}.`;
      } catch (notifyErr) {
        emailNote = `The thank-you email could not be sent: ${notifyErr.message}`;
      }
    }

    ctx.showSuccess(`Visit added successfully. ${emailNote}`);
    page.newVisit = emptyNewVisit();
    page.selectedMedicines = [];
    setTimeout(() => {
      ctx.reloadPatient();
      ctx.showSuccess('');
      ctx.showTab(0);
    }, 2000);
  } catch (err) {
    toast.error(`Failed to add visit: ${err.message}`);
  } finally {
    page.submitting = false;
    ctx.rerender();
  }
}

export function renderConsultationTab(panelEl, ctx) {
  const { page } = ctx;
  const { patient, newVisit, consultationType, uploading, submitting, selectedMedicines } = page;

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
      btn.addEventListener('click', () => { page.consultationType = btn.dataset.value; ctx.rerender(); });
    });

    const dateEl = panelEl.querySelector('.pd-date-of-visit');
    if (dateEl) dateEl.addEventListener('change', (e) => { newVisit.date_of_visit = snapToHalfHour(e.target.value); dateEl.value = newVisit.date_of_visit; });

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
          treatmentSelect.value = treatmentSelectValue();
          openCustomTreatmentDialog({
            initial: page.otherTreatment,
            closeOnBackdrop: false,
            onSave: (name) => { page.otherTreatment = name; page.newVisit.treatment = name; ctx.rerender(); },
            onCancel: (typed) => { page.otherTreatment = typed; }, // remembered for next time
          });
        } else {
          newVisit.treatment = e.target.value;
          ctx.rerender();
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
      photoInput.addEventListener('change', (e) => handleMediaFile(e, 'photo', ctx));
    }
    const videoBtn = panelEl.querySelector('.pd-upload-video-btn');
    const videoInput = panelEl.querySelector('.pd-video-file-input');
    if (videoBtn && videoInput) {
      videoBtn.addEventListener('click', () => videoInput.click());
      videoInput.addEventListener('change', (e) => handleMediaFile(e, 'video', ctx));
    }

    panelEl.querySelectorAll('.pd-remove-photo-btn').forEach((btn) => {
      btn.addEventListener('click', () => { const idx = parseInt(btn.dataset.idx, 10); newVisit.photos = newVisit.photos.filter((_, i) => i !== idx); ctx.rerender(); });
    });
    panelEl.querySelectorAll('.pd-remove-video-btn').forEach((btn) => {
      btn.addEventListener('click', () => { const idx = parseInt(btn.dataset.idx, 10); newVisit.videos = (newVisit.videos || []).filter((_, i) => i !== idx); ctx.rerender(); });
    });

    const bloodTestContainer = panelEl.querySelector('.pd-blood-test-container');
    if (bloodTestContainer) {
      renderBloodTestSelector(bloodTestContainer, newVisit.blood_tests || [], (tests) => { newVisit.blood_tests = tests; });
    }
    const medsContainer = panelEl.querySelector('.pd-medicines-container');
    if (medsContainer) {
      renderMedicinesSelector(medsContainer, selectedMedicines, (meds) => { page.selectedMedicines = meds; });
    }

    const saveVisitBtn = panelEl.querySelector('.pd-save-visit-btn');
    if (saveVisitBtn) saveVisitBtn.addEventListener('click', () => submitVisit(ctx));
    const resetBtn = panelEl.querySelector('.pd-reset-visit-btn');
    if (resetBtn) resetBtn.addEventListener('click', () => { page.newVisit = emptyNewVisit(); page.selectedMedicines = []; ctx.rerender(); });
  }

  panelEl.innerHTML = tab1Html();
  wireTab1();
}
