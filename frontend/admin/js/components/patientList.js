// Patient list with server-side search (name / whatsapp / patient_id).

import api from "../api.js";
import { navigate } from "../router.js";

export function render(container, { patientType = "offline" } = {}) {
  const isOnline = patientType === "online";
  let patients = [];
  let loading = false;

  const wrap = document.createElement("div");
  wrap.className = "paper";
  wrap.innerHTML = `
    <div class="flex gap-2 mb-3" style="flex-wrap:wrap;align-items:center;">
      <input class="input" id="pl-query" placeholder="Search by name" style="width:220px;" />
      <input class="input" id="pl-whatsapp" placeholder="WhatsApp" style="width:160px;" />
      <input class="input" id="pl-patient-id" placeholder="Patient ID" style="width:160px;" />
      <button type="button" class="btn btn-primary" id="pl-search-btn" style="${isOnline ? "background:linear-gradient(135deg, #06b6d4, #0891b2);" : ""}">Search</button>
      <span id="pl-spinner"></span>
    </div>
    <div id="pl-table-area"></div>
    <div id="pl-empty" style="display:none;text-align:center;padding:24px;"></div>
  `;
  container.appendChild(wrap);

  const queryEl = wrap.querySelector("#pl-query");
  const whatsappEl = wrap.querySelector("#pl-whatsapp");
  const patientIdEl = wrap.querySelector("#pl-patient-id");
  const searchBtn = wrap.querySelector("#pl-search-btn");
  const spinnerEl = wrap.querySelector("#pl-spinner");
  const tableArea = wrap.querySelector("#pl-table-area");
  const emptyEl = wrap.querySelector("#pl-empty");

  function getTreatment(patient) {
    return (patient.visits && patient.visits[0] && patient.visits[0].treatment) || "N/A";
  }
  function getLatestVisit(patient) {
    return patient.visits && patient.visits.length > 0 ? patient.visits[patient.visits.length - 1] : null;
  }
  function getDispatchStatus(patient) {
    const v = getLatestVisit(patient);
    if (!v) return null;
    return v.tracking_id ? "dispatched" : "pending";
  }

  function setLoading(v) {
    loading = v;
    searchBtn.disabled = v;
    spinnerEl.innerHTML = v ? `<span class="spinner"></span>` : "";
    if (v) {
      tableArea.innerHTML = `<div style="display:flex;justify-content:center;padding:24px;"><span class="spinner"></span></div>`;
      emptyEl.style.display = "none";
    }
  }

  async function fetchPatients() {
    const params = { patient_type: patientType };
    if (queryEl.value) params.name = queryEl.value;
    if (whatsappEl.value) params.whatsapp = whatsappEl.value;
    if (patientIdEl.value) params.patient_id = patientIdEl.value;

    setLoading(true);
    try {
      const res = await api.get("/api/patients", { params });
      patients = res.data.items || [];
      renderTable();
    } catch (err) {
      console.error("Error fetching patients:", err);
      alert("Failed to fetch patients");
    } finally {
      setLoading(false);
    }
  }

  function renderTable() {
    if (patients.length === 0) {
      tableArea.innerHTML = "";
      emptyEl.style.display = "block";
      emptyEl.textContent = `No ${isOnline ? "online" : "offline"} patients found`;
      return;
    }
    emptyEl.style.display = "none";

    const extraHeadCols = isOnline ? `<th>Amount Paid</th><th>Dispatch</th>` : "";
    const rows = patients
      .map((p) => {
        const latestVisit = getLatestVisit(p);
        const dispatchStatus = getDispatchStatus(p);
        const amountCell = isOnline
          ? `<td>${latestVisit?.amount_paid ? `<strong>₹${latestVisit.amount_paid}</strong>` : `<span style="color:#94a3b8;">—</span>`}</td>`
          : "";
        const dispatchCell = isOnline
          ? `<td>${dispatchStatus === "dispatched"
              ? `<span class="chip chip-success">\u{1F69A} Dispatched</span>`
              : `<span class="chip chip-warning">⏳ Pending</span>`}</td>`
          : "";
        return `
          <tr data-patient-id="${p.patient_id}">
            <td><strong>${p.patient_id}</strong></td>
            <td>${p.full_name || ""}</td>
            <td>${p.whatsapp || ""}</td>
            <td>${p.age || "-"}</td>
            <td>${p.gender || "-"}</td>
            <td>${getTreatment(p)}</td>
            ${amountCell}
            ${dispatchCell}
            <td>
              <button type="button" class="btn btn-outline btn-sm pl-copy-btn">Copy ID</button>
              <button type="button" class="btn btn-outline btn-sm pl-view-btn" style="margin-left:8px;">View</button>
            </td>
          </tr>
        `;
      })
      .join("");

    tableArea.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr style="background:${isOnline ? "#f0fdfe" : "#f5f5f5"};">
              <th>Patient ID</th>
              <th>Name</th>
              <th>WhatsApp</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Treatment</th>
              ${extraHeadCols}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    tableArea.querySelectorAll("tr[data-patient-id]").forEach((tr) => {
      const pid = tr.dataset.patientId;
      tr.querySelector(".pl-copy-btn").addEventListener("click", () => {
        navigator.clipboard.writeText(pid);
      });
      tr.querySelector(".pl-view-btn").addEventListener("click", () => {
        navigate(`/admin/patients/${pid}`);
      });
    });
  }

  searchBtn.addEventListener("click", () => fetchPatients());

  fetchPatients();
}
