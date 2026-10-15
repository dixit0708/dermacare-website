// Blood test picker. Calls onChange(selectedTests) whenever the selection changes.

export const BLOOD_TEST_CATEGORIES = [
  {
    category: 'Hormonal Profile',
    color: '#7c3aed',
    bg: '#f5f3ff',
    tests: [
      'TSH (Thyroid Stimulating Hormone)',
      'Free T3',
      'Free T4',
      'Thyroid Profile (T3, T4, TSH)',
      'Testosterone (Total)',
      'Testosterone (Free)',
      'DHT (Dihydrotestosterone)',
      'DHEA-S',
      'Prolactin',
      'LH (Luteinizing Hormone)',
      'FSH (Follicle Stimulating Hormone)',
      'Cortisol (Morning)',
      'Estradiol (E2)',
      'Progesterone',
      'Fasting Insulin',
      'HOMA-IR',
      'Androstenedione',
      'AMH (Anti-Müllerian Hormone)',
    ]
  },
  {
    category: 'Nutritional Deficiencies',
    color: '#d97706',
    bg: '#fffbeb',
    tests: [
      'Serum Ferritin',
      'Serum Iron',
      'TIBC (Total Iron Binding Capacity)',
      'Vitamin D (25-OH)',
      'Vitamin B12',
      'Folic Acid (Folate)',
      'Zinc (Serum)',
      'Copper (Serum)',
      'Biotin (Vitamin B7)',
      'Selenium',
      'Serum Calcium',
      'Magnesium',
      'Phosphorus',
    ]
  },
  {
    category: 'Complete Blood Count',
    color: '#dc2626',
    bg: '#fef2f2',
    tests: [
      'CBC (Complete Blood Count)',
      'Hemoglobin',
      'Hematocrit (PCV)',
      'ESR (Erythrocyte Sedimentation Rate)',
      'Peripheral Smear',
    ]
  },
  {
    category: 'Blood Sugar & Metabolic',
    color: '#0891b2',
    bg: '#f0fdfe',
    tests: [
      'Fasting Blood Sugar (FBS)',
      'Post-Prandial Blood Sugar (PPBS)',
      'HbA1c (Glycated Hemoglobin)',
      'Lipid Profile',
      'CRP (C-Reactive Protein)',
      'IL-6 (Interleukin-6)',
    ]
  },
  {
    category: 'Liver & Kidney',
    color: '#16a34a',
    bg: '#f0fdf4',
    tests: [
      'LFT (Liver Function Test)',
      'KFT (Kidney Function Test)',
      'SGOT (AST)',
      'SGPT (ALT)',
      'Serum Albumin',
      'Bilirubin (Total & Direct)',
    ]
  },
  {
    category: 'Autoimmune & Allergy',
    color: '#db2777',
    bg: '#fdf2f8',
    tests: [
      'ANA (Antinuclear Antibody)',
      'Anti-ds DNA',
      'IgE (Total)',
      'Specific IgE Panel',
      'ANCA',
      'Complement C3',
      'Complement C4',
      'RF (Rheumatoid Factor)',
    ]
  },
  {
    category: 'PCOS Panel',
    color: '#9333ea',
    bg: '#faf5ff',
    tests: [
      'PCOS Panel (LH, FSH, Testosterone, DHEA-S, Insulin)',
      'Fasting Insulin (PCOS)',
      'Androstenedione (PCOS)',
    ]
  },
];

function esc(v) {
  return v == null ? '' : String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function render(container, initialSelected = [], onChange) {
  let selectedTests = [...initialSelected];
  let customTest = '';

  function notify() {
    if (onChange) onChange([...selectedTests]);
  }

  function toggleTest(test) {
    if (selectedTests.includes(test)) {
      selectedTests = selectedTests.filter((t) => t !== test);
    } else {
      selectedTests = [...selectedTests, test];
    }
    notify();
    paint();
  }

  function addCustom() {
    const t = customTest.trim();
    if (!t || selectedTests.includes(t)) return;
    selectedTests = [...selectedTests, t];
    customTest = '';
    notify();
    paint();
  }

  function buildHtml() {
    const selectedBlock = selectedTests.length > 0 ? `
      <div style="background:linear-gradient(135deg,#f8faff,#eff6ff);border:1.5px solid #bfdbfe;border-radius:8px;padding:12px;margin-bottom:16px;">
        <div style="color:#1d4ed8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;font-size:0.72rem;margin-bottom:8px;">🧪 Prescribed Tests (${selectedTests.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${selectedTests.map((t, i) => `
            <span class="chip" data-remove-idx="${i}" style="background:#1d4ed8;color:#fff;cursor:pointer;">${esc(t)} <span aria-hidden="true">✕</span></span>
          `).join('')}
        </div>
      </div>
    ` : '';

    const categories = BLOOD_TEST_CATEGORIES.map((cat) => {
      const selectedInCat = cat.tests.filter((t) => selectedTests.includes(t)).length;
      return `
        <details class="bts-accordion" style="border:1px solid #e2e8f0;margin-bottom:4px;border-radius:8px;overflow:hidden;">
          <summary style="background:${cat.bg};padding:10px 12px;min-height:24px;cursor:pointer;list-style:none;display:flex;align-items:center;gap:8px;">
            <span style="font-weight:700;color:${cat.color};flex:1;font-size:0.875rem;">${esc(cat.category)}</span>
            ${selectedInCat > 0 ? `<span class="chip" style="background:${cat.color};color:#fff;font-weight:700;font-size:0.7rem;">${selectedInCat} selected</span>` : ''}
          </summary>
          <div style="padding:8px 16px 12px;display:flex;flex-wrap:wrap;gap:6px;">
            ${cat.tests.map((test) => {
              const isSelected = selectedTests.includes(test);
              return `<span class="chip bts-test-chip" data-test="${esc(test)}" style="cursor:pointer;border:1px solid ${cat.color};color:${isSelected ? '#fff' : cat.color};background:${isSelected ? cat.color : 'transparent'};font-weight:${isSelected ? 700 : 400};">${esc(test)}</span>`;
            }).join('')}
          </div>
        </details>
      `;
    }).join('');

    return `
      ${selectedBlock}
      <div style="margin-bottom:16px;">${categories}</div>
      <div class="field" style="margin-bottom:0;">
        <label class="field-label">Add custom test</label>
        <div class="flex gap-2">
          <input type="text" class="input bts-custom-input" placeholder="Type test name and press Enter" value="${esc(customTest)}" />
          <button type="button" class="btn btn-outline bts-add-btn" ${!customTest.trim() ? 'disabled' : ''}>Add</button>
        </div>
      </div>
    `;
  }

  function wire() {
    container.querySelectorAll('[data-remove-idx]').forEach((el) => {
      el.addEventListener('click', () => toggleTest(selectedTests[parseInt(el.dataset.removeIdx, 10)]));
    });
    container.querySelectorAll('.bts-test-chip').forEach((el) => {
      el.addEventListener('click', () => toggleTest(el.dataset.test));
    });
    const input = container.querySelector('.bts-custom-input');
    const addBtn = container.querySelector('.bts-add-btn');
    if (input) {
      input.addEventListener('input', (e) => {
        customTest = e.target.value;
        addBtn.disabled = !customTest.trim();
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addCustom();
        }
      });
    }
    if (addBtn) addBtn.addEventListener('click', addCustom);
  }

  function paint() {
    container.innerHTML = buildHtml();
    wire();
  }

  paint();
}
