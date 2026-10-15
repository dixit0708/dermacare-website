// Medicines catalog dialog. A fresh overlay is built every time it opens.

import api from "../api.js";

function closeOverlay(overlay) {
  overlay.remove();
}

export function openMedicinesPanel() {
  let medicines = [];
  let editingId = null;

  const overlay = document.createElement("div");
  overlay.className = "dialog-overlay";
  overlay.innerHTML = `
    <div class="dialog dialog-lg">
      <div class="dialog-title">Manage Medicines</div>
      <div class="dialog-content">
        <div id="meds-alert"></div>
        <div class="mb-3">
          <button type="button" class="btn btn-primary" id="meds-add-btn">Add New Medicine</button>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Price (₹)</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="meds-tbody"></tbody>
          </table>
        </div>
      </div>
      <div class="dialog-actions">
        <button type="button" class="btn btn-ghost" id="meds-close-btn">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const alertBox = overlay.querySelector("#meds-alert");
  const tbody = overlay.querySelector("#meds-tbody");

  overlay.querySelector("#meds-close-btn").addEventListener("click", () => closeOverlay(overlay));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeOverlay(overlay);
  });

  function showAlert(type, msg) {
    alertBox.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
    if (type === "success") {
      setTimeout(() => { alertBox.innerHTML = ""; }, 3000);
    }
  }
  function clearAlert() { alertBox.innerHTML = ""; }

  async function fetchMedicines() {
    try {
      const res = await api.get("/api/medicines");
      medicines = res.data.medicines || [];
      renderRows();
    } catch (err) {
      showAlert("error", "Failed to fetch medicines");
    }
  }

  function renderRows() {
    tbody.innerHTML = "";
    if (medicines.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No medicines found</td></tr>`;
      return;
    }
    medicines.forEach((m) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.name}</td>
        <td style="text-align:right;">₹${Number(m.price).toFixed(2)}</td>
        <td>${m.description || "-"}</td>
        <td style="text-align:center;">
          <button type="button" class="btn btn-ghost btn-sm meds-edit-btn">Edit</button>
          <button type="button" class="btn btn-danger btn-sm meds-delete-btn">Delete</button>
        </td>
      `;
      tr.querySelector(".meds-edit-btn").addEventListener("click", () => openForm(m));
      tr.querySelector(".meds-delete-btn").addEventListener("click", () => handleDelete(m._id));
      tbody.appendChild(tr);
    });
  }

  // Add/Edit form dialog (nested)
  function openForm(medicine) {
    editingId = medicine ? medicine._id : null;
    const form = { name: medicine?.name || "", price: medicine?.price ?? "", description: medicine?.description || "" };

    const formOverlay = document.createElement("div");
    formOverlay.className = "dialog-overlay";
    formOverlay.style.zIndex = "1001";
    formOverlay.innerHTML = `
      <div class="dialog">
        <div class="dialog-title">${editingId ? "Edit Medicine" : "Add Medicine"}</div>
        <div class="dialog-content">
          <div id="meds-form-error"></div>
          <div class="field">
            <label class="field-label">Medicine Name</label>
            <input class="input" id="meds-form-name" value="${form.name}" autofocus />
          </div>
          <div class="field">
            <label class="field-label">Price (₹)</label>
            <input class="input" id="meds-form-price" type="number" step="0.01" min="0" value="${form.price}" />
          </div>
          <div class="field">
            <label class="field-label">Description</label>
            <textarea class="textarea" id="meds-form-desc" rows="2">${form.description}</textarea>
          </div>
        </div>
        <div class="dialog-actions">
          <button type="button" class="btn btn-ghost" id="meds-form-cancel">Cancel</button>
          <button type="button" class="btn btn-primary" id="meds-form-save">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(formOverlay);

    const formError = formOverlay.querySelector("#meds-form-error");
    formOverlay.querySelector("#meds-form-cancel").addEventListener("click", () => formOverlay.remove());
    formOverlay.addEventListener("click", (e) => { if (e.target === formOverlay) formOverlay.remove(); });

    const saveBtn = formOverlay.querySelector("#meds-form-save");
    saveBtn.addEventListener("click", async () => {
      const name = formOverlay.querySelector("#meds-form-name").value;
      const price = formOverlay.querySelector("#meds-form-price").value;
      const description = formOverlay.querySelector("#meds-form-desc").value;

      if (!name.trim() || !price) {
        formError.innerHTML = `<div class="alert alert-error">Name and price are required</div>`;
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";
      try {
        if (editingId) {
          await api.put(`/api/medicines/${editingId}`, { name, price: parseFloat(price), description });
          showAlert("success", "Medicine updated successfully");
        } else {
          await api.post("/api/medicines", { name, price: parseFloat(price), description });
          showAlert("success", "Medicine added successfully");
        }
        formOverlay.remove();
        fetchMedicines();
      } catch (err) {
        formError.innerHTML = `<div class="alert alert-error">${err.response?.data?.msg || "Failed to save medicine"}</div>`;
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save";
      }
    });
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this medicine?")) return;
    try {
      await api.delete(`/api/medicines/${id}`);
      showAlert("success", "Medicine deleted successfully");
      fetchMedicines();
    } catch (err) {
      showAlert("error", err.response?.data?.msg || "Failed to delete medicine");
    }
  }

  overlay.querySelector("#meds-add-btn").addEventListener("click", () => { clearAlert(); openForm(null); });

  fetchMedicines();
}
