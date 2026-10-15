// New patient registration form.
// A 409 from the API means the patient is already registered, so the duplicate dialog is shown.

import api from "../api.js";
import { toast } from "../toast.js";
import { navigate } from "../router.js";
import { uploadCloudinaryMedia } from "../cloudinaryUpload.js";
import { esc } from "../escape.js";

const GENDERS = ["Male", "Female", "Other"];

const ADVICE_OPTIONS = [
  "use RO water for head wash",
  "eat Diet",
  "head stand",
  "avoid junk food",
  "ensure good sleep",
  "use sulfate-free shampoo",
  "manage stress",
  "increase protein intake",
];

const HISTORY_OPTIONS = [
  "Alopecia Areata",
  "PCOS",
  "Thyroid Disorder",
  "Telogen Effluvium",
  "Nutritional Deficiencies (Iron/Biotin/Zinc)",
  "Family History of Hair Loss",
  "Androgenetic Alopecia",
  "Traction Alopecia",
  "Dandruff / Seborrheic Dermatitis",
  "Scalp Psoriasis",
];

const TREATMENTS = [
  "Cupping",
  "GFC (Growth Factor Concentrate)",
  "PRP (Platelet Rich Plasma)",
  "PRP with Biotin",
  "Mesotherapy",
  "Massage",
  "Other",
];

// Blood test categories
const BLOOD_TEST_CATEGORIES = [
  {
    category: "Hormonal Profile", color: "#7c3aed", bg: "#f5f3ff",
    tests: ["TSH (Thyroid Stimulating Hormone)", "Free T3", "Free T4", "Thyroid Profile (T3, T4, TSH)", "Testosterone (Total)", "Testosterone (Free)", "DHT (Dihydrotestosterone)", "DHEA-S", "Prolactin", "LH (Luteinizing Hormone)", "FSH (Follicle Stimulating Hormone)", "Cortisol (Morning)", "Estradiol (E2)", "Progesterone", "Fasting Insulin", "HOMA-IR", "Androstenedione", "AMH (Anti-Müllerian Hormone)"],
  },
  {
    category: "Nutritional Deficiencies", color: "#d97706", bg: "#fffbeb",
    tests: ["Serum Ferritin", "Serum Iron", "TIBC (Total Iron Binding Capacity)", "Vitamin D (25-OH)", "Vitamin B12", "Folic Acid (Folate)", "Zinc (Serum)", "Copper (Serum)", "Biotin (Vitamin B7)", "Selenium", "Serum Calcium", "Magnesium", "Phosphorus"],
  },
  {
    category: "Complete Blood Count", color: "#dc2626", bg: "#fef2f2",
    tests: ["CBC (Complete Blood Count)", "Hemoglobin", "Hematocrit (PCV)", "ESR (Erythrocyte Sedimentation Rate)", "Peripheral Smear"],
  },
  {
    category: "Blood Sugar & Metabolic", color: "#0891b2", bg: "#f0fdfe",
    tests: ["Fasting Blood Sugar (FBS)", "Post-Prandial Blood Sugar (PPBS)", "HbA1c (Glycated Hemoglobin)", "Lipid Profile", "CRP (C-Reactive Protein)", "IL-6 (Interleukin-6)"],
  },
  {
    category: "Liver & Kidney", color: "#16a34a", bg: "#f0fdf4",
    tests: ["LFT (Liver Function Test)", "KFT (Kidney Function Test)", "SGOT (AST)", "SGPT (ALT)", "Serum Albumin", "Bilirubin (Total & Direct)"],
  },
  {
    category: "Autoimmune & Allergy", color: "#db2777", bg: "#fdf2f8",
    tests: ["ANA (Antinuclear Antibody)", "Anti-ds DNA", "IgE (Total)", "Specific IgE Panel", "ANCA", "Complement C3", "Complement C4", "RF (Rheumatoid Factor)"],
  },
  {
    category: "PCOS Panel", color: "#9333ea", bg: "#faf5ff",
    tests: ["PCOS Panel (LH, FSH, Testosterone, DHEA-S, Insulin)", "Fasting Insulin (PCOS)", "Androstenedione (PCOS)"],
  },
];

function emptyForm() {
  return {
    full_name: "", age: "", gender: "", whatsapp: "", email: "", address: "",
    medical_history: "", current_issues: "", doctor_notes: "", doctor_advice: "", treatment: "",
    payment_datetime: "", amount_paid: "", dispatch_date: "", tracking_id: "",
  };
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

export function render(container, { mode = "offline", prefillData = null } = {}) {
  const isOnline = mode === "online";
  let form = emptyForm();
  if (prefillData) {
    form = {
      ...form,
      full_name: prefillData.patient_name || "",
      whatsapp: prefillData.phone || "",
      email: prefillData.email || "",
      age: prefillData.age || "",
      gender: prefillData.gender || "",
      address: prefillData.address || "",
      current_issues: prefillData.message || "",
      medical_history: prefillData.message || "",
      treatment: prefillData.treatment || "",
    };
  }

  let photos = [];
  let videos = [];
  let selectedMedicines = [];
  let selectedBloodTests = [];
  let uploadLoading = false;
  let otherTreatment = "";
  let medicines = [];
  let selectedMedicineId = "";
  let medsError = "";

  const wrap = document.createElement("div");
  wrap.className = "paper";
  wrap.innerHTML = `
    <h3 class="mb-3">Create New Patient</h3>
    <form id="pf-form">
      <h4 class="mt-3 mb-2">Basic Information</h4>
      <div class="grid-2 mb-3">
        <div class="field"><label class="field-label">Full Name *</label><input class="input" id="pf-full_name" required /></div>
        <div class="field"><label class="field-label">WhatsApp Number *</label><input class="input" id="pf-whatsapp" required placeholder="+919876543210" /></div>
        <div class="field"><label class="field-label">Email</label><input class="input" id="pf-email" type="email" /></div>
        <div class="grid-2" style="grid-column: span 1;">
          <div class="field"><label class="field-label">Age *</label><input class="input" id="pf-age" type="number" min="0" required /></div>
          <div class="field">
            <label class="field-label">Gender *</label>
            <select class="select" id="pf-gender" required>
              <option value="">Select</option>
              ${GENDERS.map((g) => `<option value="${g}">${g}</option>`).join("")}
            </select>
          </div>
        </div>
      </div>
      <div class="field mb-3"><label class="field-label">Address</label><textarea class="textarea" id="pf-address" rows="2" placeholder="House no., Street, Area, City, State, Pincode"></textarea></div>

      <hr class="divider" />

      <h4 class="mt-3 mb-2">Medical History</h4>
      <div class="mb-2" style="font-weight:600;font-size:0.85rem;">Common Conditions:</div>
      <div class="flex gap-2 mb-2" id="pf-history-chips" style="flex-wrap:wrap;"></div>
      <div class="field mb-3"><label class="field-label">Complete Medical History &amp; Current Issues</label><textarea class="textarea" id="pf-medical_history" rows="4" placeholder="Past illnesses, allergies, medications, and current symptoms..."></textarea></div>

      <hr class="divider" />

      <h4 class="mt-3 mb-2">Visit Details</h4>
      <div class="grid-2 mb-3">
        <div class="field">
          <label class="field-label">Treatment Type *</label>
          <select class="select" id="pf-treatment" required>
            <option value="">Select treatment</option>
            ${TREATMENTS.map((t) => `<option value="${t}">${t}</option>`).join("")}
          </select>
          <div class="field-error" id="pf-treatment-custom" style="color:var(--primary);display:none;"></div>
        </div>
        <div></div>
        <div class="field" style="grid-column: 1 / -1;"><label class="field-label">Doctor's Notes</label><textarea class="textarea" id="pf-doctor_notes" rows="2"></textarea></div>
        <div style="grid-column: 1 / -1;">
          <div class="mb-2" style="font-weight:600;font-size:0.85rem;">Quick Advice Options:</div>
          <div class="flex gap-2 mb-2" id="pf-advice-chips" style="flex-wrap:wrap;"></div>
          <div class="field"><label class="field-label">Doctor's Advice</label><textarea class="textarea" id="pf-doctor_advice" rows="2" placeholder="e.g., Head wash by RO water, Derma roller, advised diet and yoga"></textarea></div>
        </div>
      </div>

      <hr class="divider" />

      <div id="pf-bloodtests-section"></div>

      <div id="pf-online-section"></div>

      <h4 class="mt-3 mb-2">Photos &amp; Videos</h4>
      <div class="mb-3">
        <div class="flex gap-2 mb-2" id="pf-photos-preview" style="flex-wrap:wrap;"></div>
        <div class="flex gap-2 mb-2" id="pf-videos-preview" style="flex-wrap:wrap;"></div>
        <div class="flex gap-2" style="flex-wrap:wrap;">
          <label class="btn btn-primary">Upload Photo<input hidden type="file" id="pf-photo-input" accept="image/*" /></label>
          <label class="btn btn-outline">Upload Video<input hidden type="file" id="pf-video-input" accept="video/*" /></label>
        </div>
      </div>

      <div class="mt-4" style="border-top:1px solid var(--border);padding-top:16px;">
        <div class="flex items-center gap-2 mb-2">
          <h4>Medicines &amp; Billing</h4>
        </div>
        <div id="pf-medicines-section"></div>
      </div>

      <div class="flex gap-2 mt-4">
        <button type="submit" class="btn btn-primary">Create Patient</button>
      </div>
    </form>
  `;
  container.appendChild(wrap);

  const el = (sel) => wrap.querySelector(sel);

  // field bindings
  el("#pf-full_name").addEventListener("input", (e) => (form.full_name = e.target.value));
  el("#pf-whatsapp").addEventListener("input", (e) => (form.whatsapp = e.target.value));
  el("#pf-email").addEventListener("input", (e) => (form.email = e.target.value));
  el("#pf-age").addEventListener("input", (e) => (form.age = e.target.value));
  el("#pf-gender").addEventListener("change", (e) => (form.gender = e.target.value));
  el("#pf-address").addEventListener("input", (e) => (form.address = e.target.value));
  el("#pf-medical_history").addEventListener("input", (e) => (form.medical_history = e.target.value));
  el("#pf-doctor_notes").addEventListener("input", (e) => (form.doctor_notes = e.target.value));
  el("#pf-doctor_advice").addEventListener("input", (e) => (form.doctor_advice = e.target.value));

  // pre-fill values
  el("#pf-full_name").value = form.full_name;
  el("#pf-whatsapp").value = form.whatsapp;
  el("#pf-email").value = form.email;
  el("#pf-age").value = form.age;
  el("#pf-gender").value = form.gender;
  el("#pf-address").value = form.address;
  el("#pf-medical_history").value = form.medical_history;
  el("#pf-doctor_advice").value = form.doctor_advice;

  // history / advice quick chips
  const historyChips = el("#pf-history-chips");
  HISTORY_OPTIONS.forEach((hist) => {
    const chip = document.createElement("span");
    chip.className = "chip chip-default";
    chip.style.cursor = "pointer";
    chip.style.border = "1px solid var(--secondary)";
    chip.style.color = "var(--secondary)";
    chip.style.background = "transparent";
    chip.textContent = hist;
    chip.addEventListener("click", () => {
      form.medical_history = form.medical_history ? `${form.medical_history}, ${hist}` : hist;
      el("#pf-medical_history").value = form.medical_history;
    });
    historyChips.appendChild(chip);
  });

  const adviceChips = el("#pf-advice-chips");
  ADVICE_OPTIONS.forEach((adv) => {
    const chip = document.createElement("span");
    chip.className = "chip chip-default";
    chip.style.cursor = "pointer";
    chip.style.border = "1px solid var(--primary)";
    chip.style.color = "var(--primary)";
    chip.style.background = "transparent";
    chip.textContent = adv;
    chip.addEventListener("click", () => {
      form.doctor_advice = form.doctor_advice ? `${form.doctor_advice}, ${adv}` : adv;
      el("#pf-doctor_advice").value = form.doctor_advice;
    });
    adviceChips.appendChild(chip);
  });

  // treatment select
  const treatmentSelect = el("#pf-treatment");
  const treatmentCustomLabel = el("#pf-treatment-custom");
  function syncTreatmentSelect() {
    treatmentSelect.value = TREATMENTS.includes(form.treatment) ? form.treatment : (form.treatment ? "Other" : "");
    if (form.treatment && !TREATMENTS.includes(form.treatment)) {
      treatmentCustomLabel.style.display = "block";
      treatmentCustomLabel.style.color = "var(--primary)";
      treatmentCustomLabel.textContent = `Custom: ${form.treatment}`;
    } else {
      treatmentCustomLabel.style.display = "none";
    }
  }
  treatmentSelect.addEventListener("change", (e) => {
    if (e.target.value === "Other") {
      openOtherTreatmentDialog();
    } else {
      form.treatment = e.target.value;
      syncTreatmentSelect();
    }
  });
  syncTreatmentSelect();

  function openOtherTreatmentDialog() {
    const overlay = document.createElement("div");
    overlay.className = "dialog-overlay";
    overlay.innerHTML = `
      <div class="dialog">
        <div class="dialog-title">Specify Custom Treatment</div>
        <div class="dialog-content">
          <div class="field"><label class="field-label">Treatment Name</label><input class="input" id="pf-other-treatment-input" autofocus /></div>
        </div>
        <div class="dialog-actions">
          <button type="button" class="btn btn-ghost" id="pf-other-cancel">Cancel</button>
          <button type="button" class="btn btn-primary" id="pf-other-ok">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const input = overlay.querySelector("#pf-other-treatment-input");
    input.value = otherTreatment;
    overlay.addEventListener("click", (e) => { if (e.target === overlay) { overlay.remove(); syncTreatmentSelect(); } });
    overlay.querySelector("#pf-other-cancel").addEventListener("click", () => { overlay.remove(); syncTreatmentSelect(); });
    overlay.querySelector("#pf-other-ok").addEventListener("click", () => {
      otherTreatment = input.value;
      form.treatment = otherTreatment;
      overlay.remove();
      syncTreatmentSelect();
    });
  }

  // Blood Test Prescriptions (offline only)
  const bloodSection = el("#pf-bloodtests-section");
  if (!isOnline) {
    bloodSection.innerHTML = `
      <div class="flex items-center gap-2 mt-3 mb-2">
        <div style="width:32px;height:32px;border-radius:6px;background:linear-gradient(135deg, #7c3aed, #6d28d9);display:flex;align-items:center;justify-content:center;"><span style="font-size:16px;">\u{1F9EA}</span></div>
        <h4>Blood Test Prescriptions</h4>
      </div>
      <div id="pf-bt-selected" class="mb-2"></div>
      <div id="pf-bt-categories" class="mb-2"></div>
      <div class="field" style="position:relative;">
        <label class="field-label">Add custom test</label>
        <div style="display:flex;gap:8px;">
          <input class="input" id="pf-bt-custom-input" placeholder="Type test name and press Enter" />
          <button type="button" class="btn btn-outline" id="pf-bt-custom-add">Add</button>
        </div>
      </div>
      <hr class="divider" />
    `;

    const selectedBox = bloodSection.querySelector("#pf-bt-selected");
    const categoriesBox = bloodSection.querySelector("#pf-bt-categories");
    const customInput = bloodSection.querySelector("#pf-bt-custom-input");

    function toggleTest(test) {
      if (selectedBloodTests.includes(test)) {
        selectedBloodTests = selectedBloodTests.filter((t) => t !== test);
      } else {
        selectedBloodTests = [...selectedBloodTests, test];
      }
      renderBloodTests();
    }

    function addCustomTest() {
      const t = customInput.value.trim();
      if (!t || selectedBloodTests.includes(t)) return;
      selectedBloodTests = [...selectedBloodTests, t];
      customInput.value = "";
      renderBloodTests();
    }
    bloodSection.querySelector("#pf-bt-custom-add").addEventListener("click", addCustomTest);
    customInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addCustomTest(); }
    });

    function renderBloodTests() {
      if (selectedBloodTests.length > 0) {
        selectedBox.innerHTML = `
          <div style="background:linear-gradient(135deg, #f8faff, #eff6ff);border:1.5px solid #bfdbfe;border-radius:8px;padding:12px;">
            <div style="color:#1d4ed8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;font-size:0.7rem;margin-bottom:8px;">\u{1F9EA} Prescribed Tests (${selectedBloodTests.length})</div>
            <div class="flex gap-2" style="flex-wrap:wrap;">
              ${selectedBloodTests
                .map(
                  (t, i) => `<span class="chip" data-remove-idx="${i}" style="background:#1d4ed8;color:#fff;cursor:pointer;">${esc(t)} ✕</span>`
                )
                .join("")}
            </div>
          </div>
        `;
        selectedBox.querySelectorAll("[data-remove-idx]").forEach((chipEl) => {
          chipEl.addEventListener("click", () => toggleTest(selectedBloodTests[Number(chipEl.dataset.removeIdx)]));
        });
      } else {
        selectedBox.innerHTML = "";
      }

      categoriesBox.innerHTML = BLOOD_TEST_CATEGORIES.map((cat) => {
        const selectedInCat = cat.tests.filter((t) => selectedBloodTests.includes(t)).length;
        return `
          <details style="border:1px solid var(--border);margin-bottom:4px;border-radius:8px;overflow:hidden;">
            <summary style="background:${cat.bg};padding:10px 12px;cursor:pointer;font-weight:700;color:${cat.color};display:flex;align-items:center;justify-content:space-between;">
              <span>${cat.category}</span>
              ${selectedInCat > 0 ? `<span class="chip" style="background:${cat.color};color:#fff;font-size:0.7rem;">${selectedInCat} selected</span>` : ""}
            </summary>
            <div style="padding:10px 16px;display:flex;flex-wrap:wrap;gap:6px;">
              ${cat.tests
                .map((test) => {
                  const isSelected = selectedBloodTests.includes(test);
                  return `<span class="chip" data-test="${esc(test)}" style="cursor:pointer;border:1px solid ${cat.color};color:${isSelected ? "#fff" : cat.color};background:${isSelected ? cat.color : "transparent"};font-weight:${isSelected ? 700 : 400};">${esc(test)}</span>`;
                })
                .join("")}
            </div>
          </details>
        `;
      }).join("");
      categoriesBox.querySelectorAll("[data-test]").forEach((chipEl) => {
        chipEl.addEventListener("click", () => toggleTest(chipEl.dataset.test));
      });
    }
    renderBloodTests();
  }

  // Online Order & Payment Details
  const onlineSection = el("#pf-online-section");
  if (isOnline) {
    onlineSection.innerHTML = `
      <h4 class="mt-3 mb-2" style="color:#0891b2;">\u{1F4B3} Order &amp; Payment Details</h4>
      <div class="grid-2 mb-3" style="background:linear-gradient(135deg, #f0fdfe 0%, #e0f7fa 100%);border:1.5px solid #a5f3fc;border-radius:8px;padding:16px;">
        <div class="field"><label class="field-label">Payment Date &amp; Time *</label><input class="input" id="pf-payment_datetime" type="datetime-local" required /></div>
        <div class="field"><label class="field-label">Amount Paid (₹) *</label><input class="input" id="pf-amount_paid" type="number" min="0" step="0.01" placeholder="e.g. 1500" required /></div>
        <div class="field"><label class="field-label">Dispatch Date (optional)</label><input class="input" id="pf-dispatch_date" type="date" /><div class="text-muted" style="font-size:0.75rem;">Fill when order is shipped</div></div>
        <div class="field"><label class="field-label">Tracking ID (optional)</label><input class="input" id="pf-tracking_id" placeholder="e.g. DTDC123456789IN" /><div class="text-muted" style="font-size:0.75rem;">Fill when order is shipped</div></div>
      </div>
      <hr class="divider" />
    `;
    onlineSection.querySelector("#pf-payment_datetime").addEventListener("input", (e) => (form.payment_datetime = e.target.value));
    onlineSection.querySelector("#pf-amount_paid").addEventListener("input", (e) => (form.amount_paid = e.target.value));
    onlineSection.querySelector("#pf-dispatch_date").addEventListener("input", (e) => (form.dispatch_date = e.target.value));
    onlineSection.querySelector("#pf-tracking_id").addEventListener("input", (e) => (form.tracking_id = e.target.value));
  }

  // Photo / video upload
  const photosPreview = el("#pf-photos-preview");
  const videosPreview = el("#pf-videos-preview");
  function renderMedia() {
    photosPreview.innerHTML = photos.map((p) => `<div style="width:80px;height:80px;background-image:url('${esc(p)}');background-size:cover;background-position:center;border-radius:6px;"></div>`).join("");
    videosPreview.innerHTML = videos.map((v) => `<div style="width:140px;height:90px;border-radius:6px;overflow:hidden;border:1px solid var(--border);background:#0f172a;"><video src="${esc(v)}" controls muted preload="metadata" style="width:100%;height:100%;object-fit:cover;display:block;"></video></div>`).join("");
  }

  async function handleMediaFile(inputEl, mediaType) {
    const file = inputEl.files[0];
    inputEl.value = "";
    if (!file) return;

    if (mediaType === "photo" && !file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (mediaType === "video" && !file.type.startsWith("video/")) { toast.error("Please select a video file."); return; }

    uploadLoading = true;
    try {
      const uploaded = await uploadCloudinaryMedia(file);
      if (mediaType === "video") {
        videos = [...videos, uploaded.url];
        toast.success("Video uploaded successfully");
      } else {
        photos = [...photos, uploaded.url];
        toast.success("Photo uploaded successfully");
      }
      renderMedia();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Upload error");
    } finally {
      uploadLoading = false;
    }
  }
  el("#pf-photo-input").addEventListener("change", (e) => handleMediaFile(e.target, "photo"));
  el("#pf-video-input").addEventListener("change", (e) => handleMediaFile(e.target, "video"));

  // Medicines & Billing
  const medsSection = el("#pf-medicines-section");
  medsSection.innerHTML = `
    <div id="pf-meds-alert"></div>
    <div class="flex items-center gap-2 mb-2">
      <select class="select" id="pf-meds-select" style="flex:1;">
        <option value="">Select a medicine</option>
      </select>
      <span class="text-muted" style="font-size:0.8rem;">(select to add to bill)</span>
      <button type="button" class="btn btn-primary" id="pf-meds-add" style="display:none;">Add</button>
    </div>
    <div id="pf-meds-list"></div>
  `;
  const medsAlert = medsSection.querySelector("#pf-meds-alert");
  const medsSelect = medsSection.querySelector("#pf-meds-select");
  const medsAddBtn = medsSection.querySelector("#pf-meds-add");
  const medsList = medsSection.querySelector("#pf-meds-list");

  async function fetchMedicines() {
    try {
      const res = await api.get("/api/medicines");
      medicines = res.data.medicines || [];
      medsSelect.innerHTML = `<option value="">Select a medicine</option>` +
        medicines.map((m) => `<option value="${esc(m._id)}">${esc(m.name)} (₹${Number(m.price).toFixed(2)})</option>`).join("");
    } catch (err) {
      medsError = "Failed to fetch medicines";
      renderMedsAlert();
    }
  }
  function renderMedsAlert() {
    medsAlert.innerHTML = medsError ? `<div class="alert alert-error">${medsError}</div>` : "";
  }
  medsSelect.addEventListener("change", (e) => {
    selectedMedicineId = e.target.value;
    medsAddBtn.style.display = selectedMedicineId ? "inline-flex" : "none";
  });
  medsAddBtn.addEventListener("click", () => {
    if (!selectedMedicineId) return;
    const medicine = medicines.find((m) => m._id === selectedMedicineId);
    if (!medicine) return;
    if (selectedMedicines.some((m) => m._id === selectedMedicineId)) {
      medsError = "This medicine is already selected";
      renderMedsAlert();
      return;
    }
    selectedMedicines = [...selectedMedicines, medicine];
    selectedMedicineId = "";
    medsError = "";
    medsSelect.value = "";
    medsAddBtn.style.display = "none";
    renderMedsAlert();
    renderMedsList();
  });
  function renderMedsList() {
    if (selectedMedicines.length === 0) { medsList.innerHTML = ""; return; }
    const total = selectedMedicines.reduce((sum, m) => sum + m.price, 0);
    medsList.innerHTML = `
      <div class="mt-2" style="background:#fcfcfc;border:1px solid var(--border);border-radius:6px;padding:12px;">
        ${selectedMedicines
          .map(
            (m) => `
          <div class="flex justify-between items-center mb-2">
            <div class="flex items-center gap-2">
              <button type="button" class="btn-ghost" data-remove-med="${esc(m._id)}" style="border:none;background:none;color:var(--danger);cursor:pointer;">✕</button>
              <span>${esc(m.name)} — ₹${Number(m.price).toFixed(2)}</span>
            </div>
          </div>`
          )
          .join("")}
        <div class="flex justify-between" style="border-top:1px dashed #cbd5e1;padding-top:12px;margin-top:8px;">
          <strong style="color:#475569;">Total Bill</strong>
          <strong style="color:#1e293b;font-size:1.1em;">₹${total.toFixed(2)}</strong>
        </div>
      </div>
    `;
    medsList.querySelectorAll("[data-remove-med]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedMedicines = selectedMedicines.filter((m) => m._id !== btn.dataset.removeMed);
        renderMedsList();
      });
    });
  }
  fetchMedicines();

  // Duplicate patient dialog
  function showDupDialog(patientId, name) {
    const overlay = openDialog({
      iconBg: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
      icon: "\u{1F50D}",
      title: "Patient Already Registered",
      subtitle: "Record found in the system",
      bodyHtml: `
        <div class="alert alert-info">
          <div style="font-weight:600;color:#1e40af;margin-bottom:4px;">This patient is already in our records.</div>
          <div style="color:#1d4ed8;">Please visit the patient's details page to log the new visit.</div>
        </div>
        <div style="background:#f8fafc;border-radius:8px;padding:16px;border:1px solid var(--border);">
          <div style="color:#64748b;text-transform:uppercase;letter-spacing:1px;font-size:0.7rem;">Existing Record</div>
          <div style="font-weight:700;color:#0f172a;margin-top:4px;">${esc(name)}</div>
          <div style="color:#6366F1;font-family:monospace;margin-top:2px;">ID: ${esc(patientId)}</div>
        </div>
      `,
      actionsHtml: `
        <button type="button" class="btn btn-outline" id="dup-goback-btn">Go Back</button>
        <button type="button" class="btn btn-primary" id="dup-goto-btn">Go to Patient Record →</button>
      `,
    });
    overlay.querySelector("#dup-goback-btn").addEventListener("click", () => overlay.remove());
    overlay.querySelector("#dup-goto-btn").addEventListener("click", () => {
      overlay.remove();
      navigate(`/admin/patients/${patientId}`);
    });
  }

  // Success dialog
  function showSuccessDialog(patientId, name) {
    const overlay = openDialog({
      iconBg: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
      icon: "✓",
      title: "Patient Added Successfully!",
      subtitle: "Record has been saved to the system",
      bodyHtml: `
        <div class="alert alert-success">
          <div style="font-weight:600;color:#166534;margin-bottom:4px;">This patient has been added successfully.</div>
          <div style="color:#15803d;">You can now schedule appointments or log future visits from the patient's detail page.</div>
        </div>
        <div style="background:#f8fafc;border-radius:8px;padding:16px;border:1px solid var(--border);">
          <div style="color:#64748b;text-transform:uppercase;letter-spacing:1px;font-size:0.7rem;">New Patient Record</div>
          <div style="font-weight:700;color:#0f172a;margin-top:4px;">${esc(name)}</div>
          <div style="color:#6366F1;font-family:monospace;margin-top:2px;">Patient ID: ${esc(patientId)}</div>
        </div>
      `,
      actionsHtml: `
        <button type="button" class="btn btn-outline" id="success-again-btn">Add Another Patient</button>
        <button type="button" class="btn btn-primary" id="success-view-btn" style="background:linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">View Patient Record →</button>
      `,
    });
    overlay.querySelector("#success-again-btn").addEventListener("click", () => overlay.remove());
    overlay.querySelector("#success-view-btn").addEventListener("click", () => {
      overlay.remove();
      navigate(`/admin/patients/${patientId}`);
    });
  }

  // Submit
  el("#pf-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.whatsapp || !form.age || !form.gender || !form.treatment) {
      toast.error("Full name, WhatsApp, Age, Gender and Treatment are required fields.");
      return;
    }
    if (isOnline && (!form.payment_datetime || !form.amount_paid)) {
      toast.error("Payment Date/Time and Amount Paid are required for online patients.");
      return;
    }
    try {
      const payload = { ...form, photos, videos, medicines: selectedMedicines, patient_type: mode, blood_tests: selectedBloodTests };
      const res = await api.post("/api/patients", payload);

      if (prefillData && prefillData._id) {
        try {
          await api.put(`/api/appointments/${prefillData._id}`, {
            patient_id: res.data.patient_id,
            status: "Consultation Started",
            source: "Registered from Website",
          });
        } catch (linkErr) {
          console.error("Failed to link appointment:", linkErr);
        }
      }

      showSuccessDialog(res.data.patient_id, form.full_name);

      form = emptyForm();
      photos = [];
      videos = [];
      selectedMedicines = [];
      selectedBloodTests = [];
      wrap.querySelector("#pf-form").reset();
      renderMedia();
      renderMedsList();
      syncTreatmentSelect();
    } catch (err) {
      const raw = err.response?.data;
      // FastAPI puts the HTTPException payload under "detail"
      const data = (raw && raw.detail && typeof raw.detail === "object") ? raw.detail : raw;
      if (err.response?.status === 409 && data?.duplicate) {
        showDupDialog(data.patient_id, form.full_name);
      } else {
        toast.error(data?.msg || "Create failed: " + err.message);
      }
    }
  });
}
