// Medicines picker. Calls onChange(selectedMedicines) whenever the list changes.

import api from "../api.js";

function esc(v) {
  return v == null ? '' : String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function render(container, initialSelected = [], onChange) {
  let medicines = [];
  let selectedMedicines = [...initialSelected];
  let selectedMedicineId = '';
  let loading = false;
  let error = '';

  function notify() {
    if (onChange) onChange([...selectedMedicines]);
  }

  async function fetchMedicines() {
    loading = true;
    paint();
    try {
      const res = await api.get('/api/medicines');
      medicines = res.data.medicines || [];
    } catch (err) {
      error = 'Failed to fetch medicines';
    } finally {
      loading = false;
      paint();
    }
  }

  function handleAddMedicine() {
    if (!selectedMedicineId) return;
    const medicine = medicines.find((m) => m._id === selectedMedicineId);
    if (!medicine) return;
    if (selectedMedicines.some((m) => m._id === selectedMedicineId)) {
      error = 'This medicine is already selected';
      paint();
      return;
    }
    selectedMedicines = [...selectedMedicines, medicine];
    selectedMedicineId = '';
    error = '';
    notify();
    paint();
  }

  function handleRemoveMedicine(medicineId) {
    selectedMedicines = selectedMedicines.filter((m) => m._id !== medicineId);
    notify();
    paint();
  }

  function buildHtml() {
    const totalAmount = selectedMedicines.reduce((sum, m) => sum + m.price, 0);
    return `
      ${error ? `<div class="alert alert-error">${esc(error)}</div>` : ''}
      <div class="flex items-center gap-2 mb-2">
        <select class="select ms-select" style="flex:1;" ${loading ? 'disabled' : ''}>
          <option value="">Select a medicine</option>
          ${medicines.map((m) => `<option value="${esc(m._id)}" ${selectedMedicineId === m._id ? 'selected' : ''}>${esc(m.name)} (₹${m.price.toFixed(2)})</option>`).join('')}
        </select>
        <span class="text-muted" style="font-size:0.85rem;">(select to add to bill)</span>
        <button type="button" class="btn btn-primary ms-add-btn" style="${selectedMedicineId ? '' : 'display:none;'}" ${!selectedMedicineId || loading ? 'disabled' : ''}>Add</button>
      </div>
      ${selectedMedicines.length > 0 ? `
        <div style="padding:16px;background:#fcfcfc;border-radius:6px;border:1px solid #f0f0f0;">
          <div class="flex flex-col gap-2">
            ${selectedMedicines.map((m) => `
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <button type="button" class="btn btn-ghost btn-sm ms-remove-btn" data-id="${esc(m._id)}" style="color:#d32f2f;min-width:auto;padding:0;">✕</button>
                  <span style="color:#334155;">${esc(m.name)} — ₹${m.price.toFixed(2)}</span>
                </div>
              </div>
            `).join('')}
            <div class="flex justify-between" style="border-top:1px dashed #cbd5e1;padding-top:12px;margin-top:8px;">
              <span style="color:#475569;"><strong>Total Bill</strong></span>
              <span style="font-weight:bold;color:#1e293b;font-size:1.1em;">₹${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }

  function wire() {
    const select = container.querySelector('.ms-select');
    if (select) {
      select.addEventListener('change', (e) => {
        selectedMedicineId = e.target.value;
        const addBtn = container.querySelector('.ms-add-btn');
        if (addBtn) {
          addBtn.style.display = selectedMedicineId ? '' : 'none';
          addBtn.disabled = !selectedMedicineId || loading;
        }
      });
    }
    const addBtn = container.querySelector('.ms-add-btn');
    if (addBtn) addBtn.addEventListener('click', handleAddMedicine);
    container.querySelectorAll('.ms-remove-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleRemoveMedicine(btn.dataset.id));
    });
  }

  function paint() {
    container.innerHTML = buildHtml();
    wire();
  }

  paint();
  fetchMedicines();
}
