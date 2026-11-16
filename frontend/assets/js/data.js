// Content rendered by site.js (slider, services, why-us, testimonials, booking options).
// The FAQ, conditions and process sections are written directly in index.html.
// The API is served from the same origin as the site.

export const API = "/api";

// Unsplash stock photos, used only as illustrative backgrounds for the treatment
// topics. Replace them with the clinic's own photos when available.
export const IMG = {
  clinic: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85",
  hair: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?crop=entropy&cs=srgb&fm=jpg&w=900&q=85",
  skin: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?crop=entropy&cs=srgb&fm=jpg&w=900&q=85",
  prp: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?crop=entropy&cs=srgb&fm=jpg&w=900&q=85",
  cupping: "https://images.unsplash.com/photo-1745327883389-17150e99dcf7?crop=entropy&cs=srgb&fm=jpg&w=900&q=85",
};

export const SLIDER_IMAGES = [IMG.clinic, IMG.hair, IMG.skin, IMG.prp, IMG.cupping];

export const SERVICES = [
  {
    group: "Hair Treatments",
    icon: "sparkles",
    items: [
      { name: "Hair Fall Treatment", symptoms: "Excess shedding, thinning, weak strands", benefits: "Reduces hair fall, strengthens roots", process: "Scalp evaluation → nutrient therapy → topical regimen", results: "Noticeable reduction in 6–10 weeks" },
      { name: "PRP Therapy for Hair Regrowth", symptoms: "Receding hairline, bald patches, diffuse thinning", benefits: "Stimulates dormant follicles, thicker growth", process: "Blood draw → centrifuge → micro-injection sessions", results: "Visible regrowth in 3–6 sessions" },
      { name: "Alopecia Treatment", symptoms: "Patchy bald spots, autoimmune hair loss", benefits: "Restores follicular activity", process: "Diagnosis → personalized therapy → monitoring", results: "Improvement over a sustained plan" },
      { name: "Dandruff & Scalp Infection", symptoms: "Flaking, itching, inflammation", benefits: "Calms scalp, removes infection", process: "Antifungal regimen + scalp care", results: "Clear, healthy scalp within weeks" },
      { name: "Hair Strengthening & Growth Therapy", symptoms: "Dull, brittle, slow-growing hair", benefits: "Boosts thickness, vitality and growth", process: "Custom serums + scalp therapy", results: "Thicker, healthier hair" },
    ],
  },
  {
    group: "Skin Treatments",
    icon: "sun",
    items: [
      { name: "Acne & Pimples Treatment", symptoms: "Cystic, hormonal, comedonal acne", benefits: "Clears active acne, prevents flare-ups", process: "Skin analysis → medical + topical regimen", results: "Clearer skin in 4–8 weeks" },
      { name: "Acne Scar Management", symptoms: "Pitted, rolling, boxcar scars", benefits: "Smoother skin texture", process: "Targeted therapies, peels", results: "Progressive smoothing over sessions" },
      { name: "Pigmentation & Melasma", symptoms: "Dark patches, uneven tone", benefits: "Brighter, even-toned skin", process: "Skin lightening protocols", results: "Visible reduction in pigmentation" },
      { name: "Fungal Infection & Allergies", symptoms: "Itching, rashes, ringworm, redness", benefits: "Resolves infection at source", process: "Diagnosis + targeted medication", results: "Lasting relief and clear skin" },
      { name: "Eczema & Psoriasis Care", symptoms: "Dry patches, scaling, flare-ups", benefits: "Soothes inflammation, controls flares", process: "Long-term management plan", results: "Controlled, comfortable skin" },
      { name: "Skin Rejuvenation Therapy", symptoms: "Dull, aging, tired skin", benefits: "Glow, hydration, firmness", process: "Custom rejuvenation sessions", results: "Refreshed, radiant skin" },
    ],
  },
  {
    group: "Therapy Services",
    icon: "leaf",
    items: [
      { name: "PRP Therapy", symptoms: "Hair loss, skin rejuvenation needs", benefits: "Natural growth factor stimulation", process: "Draw → spin → inject", results: "Improvement across sessions" },
      { name: "Cupping Therapy (Hijama)", symptoms: "Pain, fatigue, stress, detox needs", benefits: "Improves circulation, releases toxins", process: "Sterile cupping by MD specialist", results: "Relief and wellness boost" },
      { name: "Scalp Therapy", symptoms: "Unhealthy scalp, oiliness, dryness", benefits: "Restores scalp balance", process: "Massage + therapeutic actives", results: "Healthier scalp environment" },
      { name: "Wellness & Rejuvenation", symptoms: "General fatigue, stress, dullness", benefits: "Holistic wellbeing", process: "Personalized therapy plan", results: "Energized body and mind" },
    ],
  },
];

export const WHY = [
  { icon: "stethoscope", title: "Personalized Treatment Plans", desc: "Every patient receives a plan tailored to their condition and goals." },
  { icon: "droplet", title: "Advanced PRP Therapy", desc: "Modern growth-factor therapy for hair regrowth and skin rejuvenation." },
  { icon: "leaf", title: "Specialized Cupping Therapy", desc: "MD-qualified expertise in therapeutic Hijama and wellness cupping." },
  { icon: "microscope", title: "Modern Clinical Approach", desc: "Evidence-led diagnosis combined with personalized therapeutics." },
  { icon: "shield", title: "Hygienic Environment", desc: "Sterile, safety-first clinic with strict hygiene protocols." },
  { icon: "heartPulse", title: "Patient-Centered Care", desc: "Compassionate, transparent and result-focused consultations." },
  { icon: "award", title: "Proven Treatment Results", desc: "Documented patient outcomes across hair and skin treatments." },
  { icon: "activity", title: "Affordable Consultation", desc: "Accessible expert care without compromising on quality." },
];

// Real, verified patient reviews only, shared with the patient's consent:
// { name, text, rating (1-5), treatment }. While this list is empty the Reviews
// section and its menu links are hidden.
export const TESTIMONIALS = [];

export const TREATMENT_OPTIONS = [
  "Hair Fall / Hair Loss",
  "PRP Therapy",
  "Alopecia",
  "Dandruff / Scalp Care",
  "Acne / Pimples",
  "Acne Scars",
  "Pigmentation / Melasma",
  "Fungal Infection",
  "Eczema / Psoriasis",
  "Cupping Therapy (Hijama)",
  "General Consultation",
];
