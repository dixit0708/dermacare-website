import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Phone, MapPin, Clock, Calendar as CalendarIcon, MessageCircle, Star,
  Check, ChevronRight, Sparkles, Stethoscope, Activity, Award, Shield,
  HeartPulse, Microscope, Droplet, Sun, Leaf, FlaskConical, Users, ArrowRight,
  Menu, X
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API = `${BACKEND_URL}/api`;

const PHONE = "7579781961";
const WHATSAPP = "917579781961";
const CLINIC_ADDRESS = "Chauhan Hair & Skin Clinic, Opposite Bank Of Baroda, Near Bhoor Chauraha, Bulandshahr – 203001, Uttar Pradesh";

const IMG = {
  doctor: "https://images.unsplash.com/photo-1637059824899-a441006a6875?crop=entropy&cs=srgb&fm=jpg&w=900&q=85",
  clinic: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85",
  hair: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?crop=entropy&cs=srgb&fm=jpg&w=900&q=85",
  skin: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?crop=entropy&cs=srgb&fm=jpg&w=900&q=85",
  prp: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?crop=entropy&cs=srgb&fm=jpg&w=900&q=85",
  cupping: "https://images.unsplash.com/photo-1745327883389-17150e99dcf7?crop=entropy&cs=srgb&fm=jpg&w=900&q=85",
  ba1: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?crop=entropy&cs=srgb&fm=jpg&w=700&q=85",
  ba2: "https://images.unsplash.com/photo-1505028108420-96f1255e2d14?crop=entropy&cs=srgb&fm=jpg&w=700&q=85",
};

const SERVICES = [
  {
    group: "Hair Treatments",
    icon: Sparkles,
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
    icon: Sun,
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
    icon: Leaf,
    items: [
      { name: "PRP Therapy", symptoms: "Hair loss, skin rejuvenation needs", benefits: "Natural growth factor stimulation", process: "Draw → spin → inject", results: "Improvement across sessions" },
      { name: "Cupping Therapy (Hijama)", symptoms: "Pain, fatigue, stress, detox needs", benefits: "Improves circulation, releases toxins", process: "Sterile cupping by MD specialist", results: "Relief and wellness boost" },
      { name: "Scalp Therapy", symptoms: "Unhealthy scalp, oiliness, dryness", benefits: "Restores scalp balance", process: "Massage + therapeutic actives", results: "Healthier scalp environment" },
      { name: "Wellness & Rejuvenation", symptoms: "General fatigue, stress, dullness", benefits: "Holistic wellbeing", process: "Personalized therapy plan", results: "Energized body and mind" },
    ],
  },
];

const CONDITIONS = {
  hair: ["Hair Fall", "Male Pattern Baldness", "Female Hair Thinning", "Alopecia", "Dandruff", "Scalp Disorders"],
  skin: ["Acne", "Pimples", "Acne Scars", "Pigmentation", "Melasma", "Fungal Infections", "Eczema", "Psoriasis", "Skin Allergies", "Rashes", "Itching"],
};

const WHY = [
  { icon: Stethoscope, title: "Personalized Treatment Plans", desc: "Every patient receives a plan tailored to their condition and goals." },
  { icon: Droplet, title: "Advanced PRP Therapy", desc: "Modern growth-factor therapy for hair regrowth and skin rejuvenation." },
  { icon: Leaf, title: "Specialized Cupping Therapy", desc: "MD-qualified expertise in therapeutic Hijama and wellness cupping." },
  { icon: Microscope, title: "Modern Clinical Approach", desc: "Evidence-led diagnosis combined with personalized therapeutics." },
  { icon: Shield, title: "Hygienic Environment", desc: "Sterile, safety-first clinic with strict hygiene protocols." },
  { icon: HeartPulse, title: "Patient-Centered Care", desc: "Compassionate, transparent and result-focused consultations." },
  { icon: Award, title: "Proven Treatment Results", desc: "Documented patient outcomes across hair and skin treatments." },
  { icon: Activity, title: "Affordable Consultation", desc: "Accessible expert care without compromising on quality." },
];

const TESTIMONIALS = [
  { name: "Aman S.", text: "After 4 PRP sessions my hairline filled in significantly. Dr. Chauhan is patient and explains every step.", rating: 5, treatment: "PRP Therapy" },
  { name: "Priya K.", text: "I struggled with acne for years. Within two months my skin is clear and confident again.", rating: 5, treatment: "Acne Treatment" },
  { name: "Rahul M.", text: "Cupping therapy gave me relief I had not felt in years. The clinic is clean and professional.", rating: 5, treatment: "Cupping Therapy" },
  { name: "Neha T.", text: "Melasma reduced dramatically. The plan was simple, kind and effective.", rating: 5, treatment: "Pigmentation" },
  { name: "Imran A.", text: "Receding hairline was my biggest worry. Dr. Danish's plan delivered real visible growth.", rating: 5, treatment: "Hair Regrowth" },
];

const PROCESS = [
  { step: "01", title: "Consultation", desc: "In-depth conversation to understand your condition, history and goals." },
  { step: "02", title: "Diagnosis", desc: "Detailed evaluation of scalp / skin to identify the precise cause." },
  { step: "03", title: "Personalized Plan", desc: "Custom treatment protocol crafted around you, with clear timelines." },
  { step: "04", title: "Therapy Sessions", desc: "Carefully delivered therapy in a hygienic, comfortable setting." },
  { step: "05", title: "Follow-Up & Monitoring", desc: "Ongoing reviews and adjustments to ensure sustained results." },
];

const FAQ = [
  { q: "What is PRP therapy?", a: "PRP (Platelet-Rich Plasma) uses growth factors from your own blood to stimulate hair follicles and skin rejuvenation. It is natural and minimally invasive." },
  { q: "Is PRP effective for hair loss?", a: "Yes — most patients see noticeable reduction in hair fall and visible regrowth across 3–6 sessions when paired with a tailored plan." },
  { q: "How many sessions are needed?", a: "Typically 4–6 PRP sessions spaced 3–4 weeks apart, with maintenance sessions as advised by Dr. Chauhan." },
  { q: "Can acne scars be treated?", a: "Yes. We use a combination of targeted therapies to progressively smooth pitted, rolling and boxcar scars." },
  { q: "What skin conditions do you treat?", a: "Acne, pigmentation, melasma, fungal infections, eczema, psoriasis, allergies, rashes and itching, among others." },
  { q: "What is cupping therapy?", a: "Cupping (Hijama) is a therapeutic technique that improves circulation, relieves pain and supports natural detoxification. Dr. Chauhan holds an MD in Cupping Therapy." },
  { q: "How long does a treatment take?", a: "Most consultations take 20–30 minutes. Sessions range 30–60 minutes depending on the treatment." },
  { q: "Is consultation available for both men and women?", a: "Yes — we treat patients of all ages and genders in a private, respectful environment." },
];

const TREATMENT_OPTIONS = [
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

// ====== NAVBAR ======
function Navbar() {
  const [open, setOpen] = useState(false);
  const links = [
    { href: "#services", label: "Services" },
    { href: "#about", label: "Doctor" },
    { href: "#process", label: "Process" },
    { href: "#testimonials", label: "Reviews" },
    { href: "#faq", label: "FAQ" },
    { href: "#contact", label: "Contact" },
    { href: "/admin", label: "Admin" },
  ];
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/75 border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2" data-testid="navbar-logo">
          <div className="h-9 w-9 rounded-xl btn-gradient flex items-center justify-center text-white font-bold shadow-luxe">C</div>
          <div className="leading-tight">
            <div className="font-semibold text-slate-900">Dr Chauhan Clinic</div>
            <div className="text-[10px] tracking-[0.18em] uppercase text-emerald-700">& Therapy Center</div>
          </div>
        </a>
        <nav className="hidden md:flex items-center gap-7 text-sm">
          {links.map(l => (
            <a key={l.href} href={l.href} className="text-slate-700 hover:text-emerald-700 transition-colors" data-testid={`nav-${l.label.toLowerCase()}`}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <a href={`tel:${PHONE}`} className="text-sm text-slate-700 inline-flex items-center gap-2 hover:text-emerald-700" data-testid="navbar-phone">
            <Phone className="h-4 w-4" /> {PHONE}
          </a>
          <a href="#booking">
            <Button className="btn-gradient text-white rounded-full px-5" data-testid="navbar-book-button">Book Appointment</Button>
          </a>
        </div>
        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu" data-testid="navbar-mobile-toggle">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white/95">
          <div className="px-4 py-3 flex flex-col gap-3">
            {links.map(l => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-slate-700 py-1" data-testid={`mobile-nav-${l.label.toLowerCase()}`}>{l.label}</a>
            ))}
            <a href="#booking" onClick={() => setOpen(false)}>
              <Button className="btn-gradient text-white rounded-full w-full" data-testid="mobile-book-button">Book Appointment</Button>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

// ====== HERO ======
const SLIDER_IMAGES = [
  "/slider-1.png",
  "/slider-2.png",
  "/slider-3.png",
  "/slider-4.png",
  "/slider-5.png",
  "/slider-6.png",
  "/slider-7.png"
];

function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDER_IMAGES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <section 
      id="top" 
      className="relative w-full h-[85vh] min-h-[600px] flex items-center overflow-hidden bg-slate-900"
    >
      {/* Background Slider with Ken Burns Effect */}
      {SLIDER_IMAGES.map((img, idx) => (
        <motion.div
          key={idx}
          className="absolute inset-0 w-full h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: currentSlide === idx ? 1 : 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          style={{ zIndex: currentSlide === idx ? 1 : 0 }}
        >
          <motion.img
            src={img}
            alt={`Clinic Slider ${idx + 1}`}
            className="w-full h-full object-cover"
            initial={{ scale: 1.0 }}
            animate={{ scale: currentSlide === idx ? 1.08 : 1.0 }}
            transition={{ duration: 6, ease: "linear" }}
          />
        </motion.div>
      ))}

      {/* Dark Overlay for Text Readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/60 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-black/10 z-10 pointer-events-none" />

      {/* Overlay Content */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center h-full pt-16">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-3xl"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-900/40 backdrop-blur-md border border-emerald-400/30 px-4 py-1.5 text-xs tracking-[0.2em] uppercase text-emerald-100 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" /> Premium Care in Bulandshahr
          </span>
          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
            Advanced Skin, Hair & Wellness Care
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-200 max-w-2xl leading-relaxed">
            Expert treatments for hair restoration, acne, pigmentation, physiotherapy, and holistic wellness.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <a href="#booking">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8 h-14 text-base font-semibold shadow-[0_0_20px_rgba(5,150,105,0.4)] border-0 w-full sm:w-auto transition-transform hover:scale-105">
                Book Consultation
              </Button>
            </a>
            <a href="#services">
              <Button variant="outline" size="lg" className="rounded-full px-8 h-14 text-base font-semibold border-white/40 text-white hover:bg-white/10 hover:text-white bg-white/5 backdrop-blur-md w-full sm:w-auto transition-transform hover:scale-105">
                View Treatments
              </Button>
            </a>
          </div>
        </motion.div>
      </div>

      {/* Slider Navigation Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
        {SLIDER_IMAGES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              currentSlide === idx ? "bg-white w-8" : "bg-white/40 hover:bg-white/60 w-3"
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
}


// ====== ABOUT DOCTOR ======
function AboutDoctor() {
  return (
    <section id="about" className="py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-12 items-center">
        <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="lg:col-span-5">
          <div className="relative rounded-[2rem] overflow-hidden aspect-[4/5] img-depth hero-img-3d">
            <img src={IMG.doctor} alt="Dr. Danish Chauhan" className="w-full h-full object-cover" />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="lg:col-span-7">
          <span className="text-xs font-bold tracking-[0.22em] uppercase text-emerald-700">About the Doctor</span>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold text-slate-900 tracking-tight">Meet <span className="text-gradient">Dr. Danish Chauhan</span></h2>
          <p className="mt-6 text-slate-600 leading-relaxed text-lg">
            Dr. Danish Chauhan is dedicated to providing effective and personalized solutions for hair loss, scalp disorders, acne, skin diseases, and wellness therapies. Combining modern therapeutic approaches with patient-focused care, he delivers safe, result-oriented treatment plans for every patient.
          </p>
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="text-xs uppercase tracking-wider text-emerald-700 font-semibold">Qualifications</div>
              <div className="mt-2 text-slate-900 font-medium">BAMS · MD (Cupping Therapy)</div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="text-xs uppercase tracking-wider text-emerald-700 font-semibold">Expertise</div>
              <div className="mt-2 text-slate-900 font-medium">Hair, Skin, PRP & Cupping</div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="text-xs uppercase tracking-wider text-emerald-700 font-semibold">Consultation</div>
              <div className="mt-2 text-slate-900 font-medium">Mon – Sat, 10AM – 5PM</div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="text-xs uppercase tracking-wider text-emerald-700 font-semibold">Approach</div>
              <div className="mt-2 text-slate-900 font-medium">Modern · Personalized · Holistic</div>
            </div>
          </div>
          <div className="mt-8 flex gap-3">
            <a href="#booking"><Button className="btn-gradient text-white rounded-full px-6" data-testid="about-book-button">Book a Consultation</Button></a>
            <a href={`tel:${PHONE}`}><Button variant="outline" className="rounded-full px-6" data-testid="about-call-button"><Phone className="h-4 w-4 mr-2" />{PHONE}</Button></a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ====== SERVICES ======
function Services() {
  return (
    <section id="services" className="py-24 md:py-32 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-3xl">
          <span className="text-xs font-bold tracking-[0.22em] uppercase text-emerald-700">Our Services</span>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold text-slate-900 tracking-tight">Treatments crafted for <span className="text-gradient">real results</span>.</h2>
          <p className="mt-5 text-slate-600 text-lg">From hair restoration to skin rejuvenation and wellness therapies — every plan is built around you.</p>
        </div>

        <div className="mt-14 space-y-16">
          {SERVICES.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.group}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl btn-gradient flex items-center justify-center text-white"><Icon className="h-5 w-5" /></div>
                  <h3 className="text-2xl md:text-3xl font-semibold text-slate-900">{group.group}</h3>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.items.map((s, i) => (
                    <motion.div
                      key={s.name}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      className="card-3d"
                    >
                    <div className="glass-3d rounded-2xl p-6 card-3d-inner">
                      <div className="flex items-start justify-between">
                        <h4 className="text-lg font-semibold text-slate-900">{s.name}</h4>
                        <ChevronRight className="h-4 w-4 text-emerald-600 mt-1" />
                      </div>
                      <div className="mt-4 space-y-3 text-sm">
                        <div><span className="text-emerald-700 font-semibold">Symptoms:</span> <span className="text-slate-600">{s.symptoms}</span></div>
                        <div><span className="text-emerald-700 font-semibold">Benefits:</span> <span className="text-slate-600">{s.benefits}</span></div>
                        <div><span className="text-emerald-700 font-semibold">Process:</span> <span className="text-slate-600">{s.process}</span></div>
                        <div><span className="text-emerald-700 font-semibold">Results:</span> <span className="text-slate-600">{s.results}</span></div>
                      </div>
                    </div></motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ====== CONDITIONS ======
function Conditions() {
  return (
    <section id="conditions" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="text-xs font-bold tracking-[0.22em] uppercase text-emerald-700">Conditions We Treat</span>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold text-slate-900 tracking-tight">From <span className="text-gradient">hair fall</span> to <span className="text-gradient">stubborn acne</span> — we’ve got you covered.</h2>
        </div>
        <div className="mt-12 grid md:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-slate-200 p-8 bg-gradient-to-br from-emerald-50/60 to-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center"><Sparkles className="h-5 w-5" /></div>
              <h3 className="text-2xl font-semibold text-slate-900">Hair Conditions</h3>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {CONDITIONS.hair.map(c => (
                <span key={c} className="px-4 py-2 rounded-full bg-white border border-emerald-200 text-slate-700 text-sm">{c}</span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 p-8 bg-gradient-to-br from-blue-50/60 to-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-700 text-white flex items-center justify-center"><Sun className="h-5 w-5" /></div>
              <h3 className="text-2xl font-semibold text-slate-900">Skin Conditions</h3>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {CONDITIONS.skin.map(c => (
                <span key={c} className="px-4 py-2 rounded-full bg-white border border-blue-200 text-slate-700 text-sm">{c}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ====== WHY CHOOSE US ======
function WhyChooseUs() {
  return (
    <section className="py-24 md:py-32 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="text-xs font-bold tracking-[0.22em] uppercase text-emerald-700">Why Choose Us</span>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold text-slate-900 tracking-tight">A clinic built around <span className="text-gradient">trust, hygiene & outcomes</span>.</h2>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {WHY.map(({ icon: Icon, title, desc }, i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.05 }}
              className="card-3d">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 card-3d-inner gradient-border">
              <div className="h-11 w-11 rounded-xl btn-gradient text-white flex items-center justify-center icon-3d"><Icon className="h-5 w-5" /></div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-slate-600 text-sm leading-relaxed">{desc}</p>
              </div></motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ====== BEFORE / AFTER ======
function BeforeAfter() {
  const groups = [
    { label: "Hair Loss Treatment", before: IMG.hair, after: IMG.hair },
    { label: "PRP Results", before: IMG.prp, after: IMG.prp },
    { label: "Acne Treatment", before: IMG.skin, after: IMG.skin },
    { label: "Skin Rejuvenation", before: IMG.ba1, after: IMG.ba2 },
  ];
  return (
    <section id="results" className="py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="text-xs font-bold tracking-[0.22em] uppercase text-emerald-700">Before & After</span>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold text-slate-900 tracking-tight">Real patients. <span className="text-gradient">Visible results.</span></h2>
        </div>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {groups.map((g, idx) => (
            <div key={g.label} className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm group">
              <div className="grid grid-cols-2">
                <div className="relative aspect-square overflow-hidden">
                  <img src={g.before} alt="Before" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition" />
                  <div className="absolute top-2 left-2 text-[10px] tracking-widest uppercase bg-white/90 px-2 py-0.5 rounded">Before</div>
                </div>
                <div className="relative aspect-square overflow-hidden">
                  <img src={g.after} alt="After" className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 text-[10px] tracking-widest uppercase bg-emerald-600 text-white px-2 py-0.5 rounded">After</div>
                </div>
              </div>
              <div className="p-4">
                <div className="text-sm font-semibold text-slate-900">{g.label}</div>
                <div className="text-xs text-slate-500 mt-1">Documented patient outcome</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-xs text-slate-500 max-w-2xl">Disclaimer: Results may vary from patient to patient depending on individual condition and treatment response.</p>
      </div>
    </section>
  );
}

// ====== TESTIMONIALS ======
function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 md:py-32 bg-gradient-to-b from-emerald-50/40 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-3xl">
            <span className="text-xs font-bold tracking-[0.22em] uppercase text-emerald-700">Patient Stories</span>
            <h2 className="mt-3 text-3xl md:text-5xl font-semibold text-slate-900 tracking-tight">Hear from our <span className="text-gradient">happy patients</span>.</h2>
          </div>
        </div>
        
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="glass-3d rounded-2xl p-6 gradient-border card-3d"><div className="card-3d-inner">
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star key={idx} className="h-4 w-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-slate-700 italic mb-6">"{t.text}"</p>
              <div className="flex justify-between items-end border-t border-slate-200 pt-4">
                <div className="font-semibold text-slate-900">{t.name}</div>
                <div className="text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-1 rounded">{t.treatment}</div>
              </div>
            </div></div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ====== PROCESS ======
function ProcessSection() {
  return (
    <section id="process" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs font-bold tracking-[0.22em] uppercase text-emerald-700">How It Works</span>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold text-slate-900 tracking-tight">Our <span className="text-gradient">Treatment Process</span>.</h2>
        </div>
        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {PROCESS.map((p, i) => (
            <div key={p.step} className="relative group">
              <div className="text-5xl font-bold text-emerald-200 step-3d group-hover:text-emerald-300 transition-colors">{p.step}</div>
              <div className="mt-4 font-semibold text-slate-900 text-lg">{p.title}</div>
              <p className="mt-2 text-sm text-slate-600">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ====== FAQ ======
function FAQSection() {
  return (
    <section id="faq" className="py-24 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs font-bold tracking-[0.22em] uppercase text-emerald-700">Got Questions?</span>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold text-slate-900 tracking-tight">Frequently Asked <span className="text-gradient">Questions</span></h2>
        </div>
        <Accordion className="w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          {FAQ.map((item, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`}>
              <AccordionTrigger className="text-left font-semibold text-slate-900 hover:text-emerald-700">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 leading-relaxed">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

// ====== BOOKING & CONTACT ======
function BookingSection() {
  const [formData, setFormData] = useState({ full_name: "", phone: "", email: "", age: "", gender: "", address: "", consultation_type: "online", treatment: "", preferred_date: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const payload = { ...formData };
    if (!payload.email) payload.email = null;
    if (!payload.preferred_date) payload.preferred_date = null;
    if (!payload.message) payload.message = null;
    payload.age = parseInt(payload.age, 10);

    try {
      await axios.post(`${API}/appointments`, payload);
      toast.success("Your appointment has been booked successfully.");
      setFormData({ full_name: "", phone: "", email: "", age: "", gender: "", address: "", consultation_type: "online", treatment: "", preferred_date: "", message: "" });
    } catch (err) {
      console.error(err);
      if (err.response?.data?.detail) {
        const details = err.response.data.detail;
        const msg = Array.isArray(details) ? details.map(d => `${d.loc?.[1] || 'Field'}: ${d.msg}`).join(', ') : err.response.data.detail;
        toast.error(`Error: ${msg}`);
      } else {
        toast.error("Failed to send request. Please call us directly.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="booking" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16">
        <div>
          <span className="text-xs font-bold tracking-[0.22em] uppercase text-emerald-700">Book Appointment</span>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold text-slate-900 tracking-tight">Take the first step towards <span className="text-gradient">better health</span>.</h2>
          <p className="mt-6 text-lg text-slate-600">Fill out the form to request a consultation, and our team will get back to you shortly to confirm your time.</p>
          
          <div className="mt-12 space-y-6">
            <div className="flex gap-4 items-start">
              <div className="mt-1 bg-emerald-100 p-3 rounded-full text-emerald-700"><MapPin size={24}/></div>
              <div>
                <div className="font-semibold text-slate-900 text-lg">Clinic Location</div>
                <div className="text-slate-600 mt-1">{CLINIC_ADDRESS}</div>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="mt-1 bg-blue-100 p-3 rounded-full text-blue-700"><Clock size={24}/></div>
              <div>
                <div className="font-semibold text-slate-900 text-lg">Opening Hours</div>
                <div className="text-slate-600 mt-1">Monday – Saturday<br/>10:00 AM – 5:00 PM</div>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="mt-1 bg-emerald-100 p-3 rounded-full text-emerald-700"><Phone size={24}/></div>
              <div>
                <div className="font-semibold text-slate-900 text-lg">Contact</div>
                <div className="text-slate-600 mt-1">+91 {PHONE}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-3d rounded-[2rem] p-8 gradient-border bg-slate-50/50">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input required value={formData.full_name} onChange={e=>setFormData({...formData, full_name: e.target.value})} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input required value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} placeholder="Your mobile number" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label>Age *</Label>
                <Input required type="number" min="1" max="120" value={formData.age} onChange={e=>setFormData({...formData, age: e.target.value})} placeholder="Age" />
              </div>
              <div className="space-y-2">
                <Label>Gender *</Label>
                <select 
                  required
                  value={formData.gender} 
                  onChange={e => setFormData({...formData, gender: e.target.value})}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="" disabled hidden>Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input required type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} placeholder="you@email.com" />
              </div>
            </div>
            {/* Address */}
            <div className="space-y-2">
              <Label>Address *</Label>
              <Input required value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} placeholder="Your complete address" />
            </div>
            {/* Consultation Type */}
            <div className="space-y-2">
              <Label>Consultation Type *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, consultation_type: "online"})}
                  className={`flex items-center justify-center gap-2 h-11 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                    formData.consultation_type === "online"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <MessageCircle className="h-4 w-4" />
                  Online Consultation
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, consultation_type: "walk_in"})}
                  className={`flex items-center justify-center gap-2 h-11 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                    formData.consultation_type === "walk_in"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                  Walk-in Clinic Visit
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Treatment Needed *</Label>
                <select 
                  required 
                  value={formData.treatment} 
                  onChange={e => setFormData({...formData, treatment: e.target.value})}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled hidden>Select Treatment</option>
                  {TREATMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Preferred Date *</Label>
                <Input required type="date" value={formData.preferred_date} onChange={e=>setFormData({...formData, preferred_date: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={formData.message} onChange={e=>setFormData({...formData, message: e.target.value})} placeholder="Any specific concerns?" rows={3} />
            </div>
            <Button disabled={loading} type="submit" className="w-full btn-gradient text-white h-12 text-lg rounded-full btn-3d">
              {loading ? "Sending..." : "Request Appointment"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

// ====== FOOTER ======
function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg btn-gradient flex items-center justify-center text-white font-bold">C</div>
            <div className="font-semibold text-white text-lg">Dr Chauhan Clinic</div>
          </div>
          <p className="text-slate-400 max-w-sm mb-6">Premium Hair Restoration, PRP Therapy, Cupping, Acne & Skin Treatments in Bulandshahr.</p>
          <div className="flex gap-4">
            <a href={`tel:${PHONE}`} className="bg-slate-800 p-2 rounded-full hover:bg-emerald-600 transition text-white"><Phone size={18} /></a>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className="bg-slate-800 p-2 rounded-full hover:bg-[#25D366] transition text-white"><MessageCircle size={18} /></a>
          </div>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Quick Links</h4>
          <ul className="space-y-2">
            <li><a href="#services" className="hover:text-emerald-400 transition">Services</a></li>
            <li><a href="#about" className="hover:text-emerald-400 transition">Doctor Profile</a></li>
            <li><a href="#testimonials" className="hover:text-emerald-400 transition">Reviews</a></li>
            <li><a href="#booking" className="hover:text-emerald-400 transition">Book Appointment</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Clinic Hours</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>Monday: 10AM – 5PM</li>
            <li>Tuesday: 10AM – 5PM</li>
            <li>Wednesday: 10AM – 5PM</li>
            <li>Thursday: 10AM – 5PM</li>
            <li>Friday: 10AM – 5PM</li>
            <li>Saturday: 10AM – 5PM</li>
            <li>Sunday: Closed</li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} Dr Chauhan Clinic & Therapy Center. All rights reserved.</p>
        <p className="mt-2 text-xs text-slate-600">SEO: Hair Loss Treatment in Bulandshahr | PRP Therapy in Bulandshahr | Skin Specialist in Bulandshahr</p>
      </div>
    </footer>
  );
}

// ====== FLOATING ======
function FloatingActions() {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className="bg-[#25D366] text-white p-3.5 rounded-full fab-3d pulse-glow flex items-center justify-center" aria-label="WhatsApp">
        <MessageCircle size={28} />
      </a>
      <a href={`tel:${PHONE}`} className="bg-slate-900 text-white p-3.5 rounded-full fab-3d flex items-center justify-center" aria-label="Call">
        <Phone size={28} />
      </a>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar />
      <main>
        <Hero />
        <AboutDoctor />
        <Services />
        <Conditions />
        <WhyChooseUs />
        <BeforeAfter />
        <TestimonialsSection />
        <ProcessSection />
        <FAQSection />
        <BookingSection />
      </main>
      <Footer />
      <FloatingActions />
    </div>
  );
}
