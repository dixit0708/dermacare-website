// Site content. The API is served from the same origin as the site.

export const API = "/api";

export const PHONE = "9876543210";
export const WHATSAPP = "919876543210";
export const CLINIC_ADDRESS = "DermaCare Clinic, MG Road, Sample City – 000001, Sample State";

export const IMG = {
  doctor: "https://images.unsplash.com/photo-1637059824899-a441006a6875?crop=entropy&cs=srgb&fm=jpg&w=900&q=85",
  clinic: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85",
  hair: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?crop=entropy&cs=srgb&fm=jpg&w=900&q=85",
  skin: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?crop=entropy&cs=srgb&fm=jpg&w=900&q=85",
  prp: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?crop=entropy&cs=srgb&fm=jpg&w=900&q=85",
  cupping: "https://images.unsplash.com/photo-1745327883389-17150e99dcf7?crop=entropy&cs=srgb&fm=jpg&w=900&q=85",
  ba1: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?crop=entropy&cs=srgb&fm=jpg&w=700&q=85",
  ba2: "https://images.unsplash.com/photo-1505028108420-96f1255e2d14?crop=entropy&cs=srgb&fm=jpg&w=700&q=85",
};

export const SLIDER_IMAGES = [IMG.clinic, IMG.doctor, IMG.hair, IMG.skin, IMG.prp, IMG.cupping];

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

export const CONDITIONS = {
  hair: ["Hair Fall", "Male Pattern Baldness", "Female Hair Thinning", "Alopecia", "Dandruff", "Scalp Disorders"],
  skin: ["Acne", "Pimples", "Acne Scars", "Pigmentation", "Melasma", "Fungal Infections", "Eczema", "Psoriasis", "Skin Allergies", "Rashes", "Itching"],
};

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

export const TESTIMONIALS = [
  { name: "Aman S.", text: "After 4 PRP sessions my hairline filled in significantly. DermaCare Doctor is patient and explains every step.", rating: 5, treatment: "PRP Therapy" },
  { name: "Priya K.", text: "I struggled with acne for years. Within two months my skin is clear and confident again.", rating: 5, treatment: "Acne Treatment" },
  { name: "Rahul M.", text: "Cupping therapy gave me relief I had not felt in years. The clinic is clean and professional.", rating: 5, treatment: "Cupping Therapy" },
  { name: "Neha T.", text: "Melasma reduced dramatically. The plan was simple, kind and effective.", rating: 5, treatment: "Pigmentation" },
  { name: "Imran A.", text: "Receding hairline was my biggest worry. The DermaCare Specialist's plan delivered real visible growth.", rating: 5, treatment: "Hair Regrowth" },
];

export const PROCESS = [
  { step: "01", title: "Consultation", desc: "In-depth conversation to understand your condition, history and goals." },
  { step: "02", title: "Diagnosis", desc: "Detailed evaluation of scalp / skin to identify the precise cause." },
  { step: "03", title: "Personalized Plan", desc: "Custom treatment protocol crafted around you, with clear timelines." },
  { step: "04", title: "Therapy Sessions", desc: "Carefully delivered therapy in a hygienic, comfortable setting." },
  { step: "05", title: "Follow-Up & Monitoring", desc: "Ongoing reviews and adjustments to ensure sustained results." },
];

export const FAQ = [
  { q: "What is PRP therapy?", a: "PRP (Platelet-Rich Plasma) uses growth factors from your own blood to stimulate hair follicles and skin rejuvenation. It is natural and minimally invasive." },
  { q: "Is PRP effective for hair loss?", a: "Yes — most patients see noticeable reduction in hair fall and visible regrowth across 3–6 sessions when paired with a tailored plan." },
  { q: "How many sessions are needed?", a: "Typically 4–6 PRP sessions spaced 3–4 weeks apart, with maintenance sessions as advised by DermaCare Doctor." },
  { q: "Can acne scars be treated?", a: "Yes. We use a combination of targeted therapies to progressively smooth pitted, rolling and boxcar scars." },
  { q: "What skin conditions do you treat?", a: "Acne, pigmentation, melasma, fungal infections, eczema, psoriasis, allergies, rashes and itching, among others." },
  { q: "What is cupping therapy?", a: "Cupping (Hijama) is a therapeutic technique that improves circulation, relieves pain and supports natural detoxification. At DermaCare it is performed in a sterile setting under the care of our MD dermatologist." },
  { q: "How long does a treatment take?", a: "Most consultations take 20–30 minutes. Sessions range 30–60 minutes depending on the treatment." },
  { q: "Is consultation available for both men and women?", a: "Yes — we treat patients of all ages and genders in a private, respectful environment." },
];

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
