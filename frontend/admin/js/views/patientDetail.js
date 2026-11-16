// Patient page: header, tab bar and the state the three tabs share.
// The tabs live in ./patientDetail/. Each one re-renders from `page` when
// ctx.rerender() is called; text inputs write to `page` without re-rendering,
// so typing never loses focus.

import api from "../api.js";
import { getUser } from "../auth.js";
import { navigate } from "../router.js";
import { esc } from "../escape.js";
import { toast } from "../toast.js";
import { openMedicinesPanel } from "../components/medicinesPanel.js";
import { TREATMENTS } from "../clinicOptions.js";
import { toDateTimeInput } from "../format.js";
import { renderHistoryTab } from "./patientDetail/historyTab.js";
import { renderConsultationTab, emptyNewVisit } from "./patientDetail/consultationTab.js";
import { renderAppointmentsTab } from "./patientDetail/appointmentsTab.js";
import { openDeletePatientDialog } from "./patientDetail/dialogs.js";

const TABS = [
  { label: "History &amp; Details", render: renderHistoryTab },
  { label: "New Consultation", render: renderConsultationTab },
  { label: "Appointments", render: renderAppointmentsTab },
];

export function render(container, params, state) {
  // Owned here, read and updated by the tabs.
  const page = {
    patientId: params.patient_id,
    patient: null,              // as loaded; medical_history shown with current issues appended
    appointments: [],
    activeAppointment: null,    // the booking this consultation completes, if started from one
    consultationType: "offline",
    // History & Details
    editing: false,
    form: {},                   // the details edit form
    compare: { a: "", b: "" },  // visit indexes for the photo comparison
    videoCompare: { a: "", b: "" },
    // New Consultation
    newVisit: emptyNewVisit(),
    selectedMedicines: [],
    uploading: false,
    submitting: false,
    otherTreatment: "",         // last custom treatment name typed in the "Other" dialog
  };
  let tab = 0;

  container.innerHTML = `
    <div class="pd-header flex justify-between items-center mb-3"></div>
    <div class="pd-alert"></div>
    <div class="paper" style="padding:0;">
      <div class="tabs pd-tabs" style="padding:0 8px;"></div>
      <div class="tab-panel pd-panel" style="padding:16px;"></div>
    </div>
  `;
  const headerEl = container.querySelector(".pd-header");
  const alertEl = container.querySelector(".pd-alert");
  const tabsEl = container.querySelector(".pd-tabs");
  const panelEl = container.querySelector(".pd-panel");

  const ctx = {
    page,
    overlayHost: container,
    rerender: renderPanel,
    reloadPatient: loadPatient,
    reloadAppointments: loadAppointments,
    showTab,
    showSuccess,
    startConsultation: (appt) => { applyStartConsultation(appt); showTab(1); },
  };

  function renderPanel() {
    TABS[tab].render(panelEl, ctx);
  }

  function showTab(index) {
    tab = index;
    tabsEl.querySelectorAll(".pd-tab-btn").forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.idx) === tab);
    });
    renderPanel();
  }

  function showSuccess(message) {
    alertEl.innerHTML = message ? `<div class="alert alert-success">${esc(message)}</div>` : "";
  }

  async function loadPatient() {
    try {
      const res = await api.get(`/api/patients/${page.patientId}`);
      if (!(state && state.startConsultation)) {
        page.consultationType = res.data.patient_type || "offline";
      }
      page.patient = {
        ...res.data,
        medical_history: res.data.current_issues
          ? (res.data.medical_history ? `${res.data.medical_history}\n\nCurrent Issues: ${res.data.current_issues}` : `Current Issues: ${res.data.current_issues}`)
          : res.data.medical_history,
      };
      page.form = {
        full_name: res.data.full_name,
        age: res.data.age,
        gender: res.data.gender,
        whatsapp: res.data.whatsapp,
        medical_history: res.data.current_issues
          ? (res.data.medical_history ? `${res.data.medical_history}\n\nCurrent Issues: ${res.data.current_issues}` : res.data.current_issues)
          : res.data.medical_history,
        email: res.data.email,
        address: res.data.address || "",
      };
      renderPanel();
    } catch (e) {
      // Show why the page is empty (e.g. a mistyped or deleted patient ID).
      const msg = e.response?.status === 404 ? `No patient found with ID ${page.patientId}.` : `Could not load this patient: ${e.message}`;
      alertEl.innerHTML = `<div class="alert alert-error">${esc(msg)}</div>`;
    }
  }

  async function loadAppointments() {
    try {
      const res = await api.get("/api/appointments", { params: { patient_id: page.patientId } });
      page.appointments = res.data.items || [];
      renderPanel();
    } catch (e) {
      toast.error(`Could not load appointments: ${e.message}`);
    }
  }

  // Prefills the New Consultation tab from an appointment. Used both when arriving
  // from Website Appointments (router state) and from the Appointments tab.
  function applyStartConsultation(appt) {
    page.activeAppointment = appt;
    tab = 1;
    // Consultation type (online / clinic) and treatment are separate fields:
    // the treatment is what the patient booked, e.g. "PRP Therapy".
    page.consultationType = appt.consultation_type === "walk_in" ? "offline" : "online";
    page.newVisit.date_of_visit = appt.date_time === "Pending" ? "" : toDateTimeInput(appt.date_time);
    page.newVisit.treatment = appt.treatment || "";
    // Website treatment names aren't in the clinic list; pre-fill the "Other" dialog with it.
    page.otherTreatment = TREATMENTS.includes(page.newVisit.treatment) ? "" : page.newVisit.treatment;
  }

  function deletePatient() {
    openDeletePatientDialog(async (close) => {
      try {
        await api.delete(`/api/patients/${page.patientId}`);
        close();
        navigate("/admin/");
      } catch (e) {
        toast.error(`Delete failed: ${e.message}`);
      }
    });
  }

  // Mirrors the server rules: any logged-in user manages medicines (as from the
  // sidebar), but only an Admin can delete a patient.
  const isAdmin = getUser()?.role === "Admin";
  headerEl.innerHTML = `
    <h2>Patient: ${esc(page.patientId)}</h2>
    <div class="flex gap-2">
      <button type="button" class="btn btn-outline pd-export-btn">Export PDF</button>
      <button type="button" class="btn btn-primary pd-manage-meds-btn">Manage Medicines</button>
      ${isAdmin ? `<button type="button" class="btn btn-danger pd-delete-btn">Delete</button>` : ""}
    </div>
  `;
  headerEl.querySelector(".pd-export-btn").addEventListener("click", () => window.print());
  headerEl.querySelector(".pd-manage-meds-btn").addEventListener("click", () => openMedicinesPanel());
  headerEl.querySelector(".pd-delete-btn")?.addEventListener("click", deletePatient);

  tabsEl.innerHTML = TABS.map((t, i) => `<button type="button" class="tab pd-tab-btn" data-idx="${i}">${t.label}</button>`).join("");
  tabsEl.querySelectorAll(".pd-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => showTab(Number(btn.dataset.idx)));
  });

  if (state && state.startConsultation && state.appointment) {
    applyStartConsultation(state.appointment);
    showSuccess("Auto-filled consultation details from Website Appointment.");
    // Drop the router state so a refresh doesn't prefill again.
    window.history.replaceState(null, "");
  }
  showTab(tab);

  loadPatient();
  loadAppointments();
}
