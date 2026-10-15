// Appointment form with a patient search dropdown (not added to the router yet).

import api from "../api.js";
import { toast } from "../toast.js";
import { navigate } from "../router.js";

function handleDateChange(val) {
  if (!val) return val;
  const d = new Date(val);
  const m = d.getMinutes();
  if (m !== 0 && m !== 30) {
    const snapped = m < 15 ? 0 : (m < 45 ? 30 : 0);
    d.setMinutes(snapped);
    if (snapped === 0 && m >= 45) d.setHours(d.getHours() + 1);
    const yyyy = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const HH = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${MM}-${dd}T${HH}:${min}`;
  }
  return val;
}

function openDialog({ iconBg, icon, title, subtitle, bodyHtml, actionsHtml }) {
  const overlay = document.createElement("div");
  overlay.className = "dialog-overlay";
  overlay.innerHTML = `
    <div class="dialog">
      <div class="dialog-title" style="display:flex;align-items:center;gap:12px;border-bottom:none;">
        <div style="width:44px;height:44px;border-radius:12px;background:${iconBg};display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;font-size:20px;">${icon}</div>
        <div>
          <div style="font-weight:700;line-height:1.2;">${title}</div>
          <div style="color:#64748b;font-size:0.75rem;">${subtitle}</div>
        </div>
      </div>
      <div class="dialog-content">${bodyHtml}</div>
      <div class="dialog-actions">${actionsHtml}</div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  return overlay;
}

export function render(container, { onCreated } = {}) {
  let patients = [];
  let selectedPatient = null;
  let patientInput = "";
  let dateTime = "";

  const wrap = document.createElement("div");
  wrap.className = "paper";
  wrap.style.position = "relative";
  wrap.innerHTML = `
    <h3 style="margin-bottom:4px;">Schedule Appointment</h3>
    <p class="text-muted mb-3">Search for an existing patient by name, ID, or WhatsApp number.</p>
    <form id="appt-form">
      <div class="flex gap-3" style="flex-wrap:wrap;align-items:flex-start;">
        <div class="field" style="min-width:320px;position:relative;">
          <label class="field-label">Patient (ID, name or WhatsApp)</label>
          <input class="input" id="appt-patient-input" placeholder="Start typing to search registered patients" autocomplete="off" />
          <div id="appt-patient-dropdown" style="display:none;position:absolute;z-index:20;top:100%;left:0;right:0;background:#fff;border:1px solid var(--border);border-radius:6px;box-shadow:0 10px 25px rgba(0,0,0,0.12);max-height:220px;overflow-y:auto;"></div>
        </div>
        <div class="field" style="width:240px;">
          <label class="field-label">Date &amp; Time</label>
          <input class="input" id="appt-datetime" type="datetime-local" step="1800" />
        </div>
        <div class="field" style="width:200px;">
          <label class="field-label">Therapist</label>
          <input class="input" id="appt-therapist" />
        </div>
        <button type="submit" class="btn btn-primary" id="appt-submit-btn" style="height:40px;margin-top:20px;">Book Appointment</button>
      </div>
    </form>
  `;
  container.appendChild(wrap);

  const patientInputEl = wrap.querySelector("#appt-patient-input");
  const dropdown = wrap.querySelector("#appt-patient-dropdown");
  const dateTimeEl = wrap.querySelector("#appt-datetime");
  const therapistEl = wrap.querySelector("#appt-therapist");
  const submitBtn = wrap.querySelector("#appt-submit-btn");

  async function fetchPatients() {
    try {
      const res = await api.get("/api/patients");
      patients = res.data.items || [];
    } catch (e) {
      console.error("fetch patients", e);
    }
  }
  fetchPatients();

  function optionLabel(p) {
    return `${p.patient_id} – ${p.full_name}`;
  }

  function showExistingPatientDialog(patient) {
    const overlay = openDialog({
      iconBg: "linear-gradient(135deg, #6366F1 0%, #EC4899 100%)",
      icon: "\u{1F50D}",
      title: "Patient Found",
      subtitle: "Existing record in the system",
      bodyHtml: `
        <div class="alert alert-success" style="border:1px solid #bbf7d0;">
          <div style="font-weight:600;color:#166534;margin-bottom:4px;">This patient is already in our records.</div>
          <div style="color:#15803d;">You can proceed to book the appointment below, or visit the patient's detail page to log a new visit directly.</div>
        </div>
        <div style="background:#f8fafc;border-radius:8px;padding:16px;border:1px solid var(--border);">
          <div style="color:#64748b;text-transform:uppercase;letter-spacing:1px;font-size:0.7rem;">Registered Patient</div>
          <div style="font-weight:700;color:#0f172a;margin-top:4px;">${patient.full_name}</div>
          <div style="color:#6366F1;font-family:monospace;margin-top:2px;">ID: ${patient.patient_id}</div>
          <div style="color:#64748b;margin-top:2px;">\u{1F4F1} ${patient.whatsapp || ""}</div>
        </div>
      `,
      actionsHtml: `
        <button type="button" class="btn btn-outline" id="existing-book-btn">Book Appointment</button>
        <button type="button" class="btn btn-primary" id="existing-goto-btn">Go to Patient Record →</button>
      `,
    });
    overlay.querySelector("#existing-book-btn").addEventListener("click", () => overlay.remove());
    overlay.querySelector("#existing-goto-btn").addEventListener("click", () => {
      overlay.remove();
      navigate(`/admin/patients/${patient.patient_id}`);
    });
  }

  function showNotFoundDialog() {
    const overlay = openDialog({
      iconBg: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
      icon: "\u{1F50D}",
      title: "Patient Not Found",
      subtitle: "No matching record in the system",
      bodyHtml: `
        <div class="alert alert-warning">
          <div style="font-weight:600;color:#92400e;margin-bottom:4px;">No patient matches your search.</div>
          <div style="color:#b45309;">To schedule an appointment, the patient must first be registered in the system. Please go to the <strong>"New Patient &amp; Appointment"</strong> tab to register them, then book the appointment.</div>
        </div>
      `,
      actionsHtml: `<button type="button" class="btn btn-primary" id="notfound-ok-btn">OK, Got It</button>`,
    });
    overlay.querySelector("#notfound-ok-btn").addEventListener("click", () => overlay.remove());
  }

  function renderDropdown() {
    const q = (patientInput || "").toLowerCase();
    const matches = q
      ? patients.filter((p) => optionLabel(p).toLowerCase().includes(q)).slice(0, 20)
      : [];
    if (matches.length === 0) {
      dropdown.style.display = "none";
      dropdown.innerHTML = "";
      return;
    }
    dropdown.innerHTML = matches
      .map((p, i) => `<div class="appt-option" data-idx="${i}" style="padding:8px 12px;cursor:pointer;font-size:0.875rem;">${optionLabel(p)}</div>`)
      .join("");
    dropdown.querySelectorAll(".appt-option").forEach((el) => {
      el.addEventListener("mouseenter", () => { el.style.background = "#f1f5f9"; });
      el.addEventListener("mouseleave", () => { el.style.background = ""; });
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const p = matches[Number(el.dataset.idx)];
        selectedPatient = p;
        patientInput = p.patient_id;
        patientInputEl.value = p.patient_id;
        dropdown.style.display = "none";
        showExistingPatientDialog(p);
      });
    });
    dropdown.style.display = "block";
  }

  patientInputEl.addEventListener("input", (e) => {
    patientInput = e.target.value;
    selectedPatient = null;
    renderDropdown();
  });
  patientInputEl.addEventListener("focus", () => renderDropdown());
  patientInputEl.addEventListener("blur", () => {
    setTimeout(() => { dropdown.style.display = "none"; }, 150);
  });

  dateTimeEl.addEventListener("change", (e) => {
    dateTime = handleDateChange(e.target.value);
    dateTimeEl.value = dateTime;
  });

  wrap.querySelector("#appt-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = "Booking...";

    let patient_id = selectedPatient?.patient_id || null;
    if (!patient_id) {
      const found = patients.find(
        (p) =>
          p.patient_id === patientInput ||
          p.whatsapp === patientInput ||
          (p.full_name || "").toLowerCase() === (patientInput || "").toLowerCase()
      );
      if (found) patient_id = found.patient_id;
    }

    if (!patient_id) {
      showNotFoundDialog();
      submitBtn.disabled = false;
      submitBtn.textContent = "Book Appointment";
      return;
    }

    if (!dateTime) {
      toast.error("Please select a date and time for the appointment.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Book Appointment";
      return;
    }

    try {
      await api.post("/api/appointments", {
        patient_id,
        date_time: new Date(dateTime).toISOString(),
        therapist: therapistEl.value,
      });
      toast.success("Appointment scheduled successfully!");
      dateTime = "";
      patientInput = "";
      selectedPatient = null;
      dateTimeEl.value = "";
      therapistEl.value = "";
      patientInputEl.value = "";
      if (onCreated) onCreated();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to create appointment");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Book Appointment";
    }
  });
}
