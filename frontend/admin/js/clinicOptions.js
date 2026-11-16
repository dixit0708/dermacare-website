// Option lists shared by the registration form and the patient page, so both
// store the same names.

// Procedures recorded on a visit. "Other" opens a dialog for a custom name.
// Visits saved before this list was shared may use the short names "PRP" and
// "GFC"; those records are left as they are and still display normally.
export const TREATMENTS = [
  "Cupping",
  "PRP (Platelet Rich Plasma)",
  "PRP with Biotin",
  "GFC (Growth Factor Concentrate)",
  "Mesotherapy",
  "Biotin",
  "Massage",
  "Other",
];

// Quick-pick chips appended to the Doctor's Advice text.
export const ADVICE_OPTIONS = [
  "use RO water for head wash",
  "eat Diet",
  "head stand",
  "avoid junk food",
  "ensure good sleep",
  "use sulfate-free shampoo",
  "manage stress",
  "increase protein intake",
];

// Quick-pick chips appended to the Medical History text.
export const HISTORY_OPTIONS = [
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
