import { ICONS } from "./icons.js";
import {
  API, SLIDER_IMAGES, SERVICES, WHY, TESTIMONIALS, TREATMENT_OPTIONS,
} from "./data.js";

// Inline icons
document.querySelectorAll("[data-icon]").forEach((el) => {
  const svg = ICONS[el.dataset.icon];
  if (svg) el.innerHTML = svg;
});

// Navbar mobile menu
const navToggle = document.getElementById("navbar-toggle");
const navPanel = document.getElementById("navbar-mobile-panel");
let navOpen = false;
function setNavOpen(open) {
  navOpen = open;
  navPanel.classList.toggle("hidden", !open);
  navToggle.innerHTML = "";
  const iconSpan = document.createElement("span");
  iconSpan.innerHTML = open ? ICONS.x : ICONS.menu;
  navToggle.appendChild(iconSpan.firstChild);
}
navToggle.addEventListener("click", () => setNavOpen(!navOpen));
navPanel.querySelectorAll(".mobile-nav-link").forEach((a) => {
  a.addEventListener("click", () => setNavOpen(false));
});

// Hero slider
const heroSlidesEl = document.getElementById("hero-slides");
const heroDotsEl = document.getElementById("hero-dots");
let currentSlide = 0;
let heroTimer = null;

SLIDER_IMAGES.forEach((src, idx) => {
  const slide = document.createElement("div");
  slide.className = "hero-slide" + (idx === 0 ? " is-active" : "");
  const img = document.createElement("img");
  img.src = src;
  img.alt = `Clinic Slider ${idx + 1}`;
  slide.appendChild(img);
  heroSlidesEl.appendChild(slide);

  const dot = document.createElement("button");
  dot.setAttribute("aria-label", `Go to slide ${idx + 1}`);
  dot.className = idx === 0
    ? "h-1.5 rounded-full transition-all duration-500 bg-white w-8"
    : "h-1.5 rounded-full transition-all duration-500 bg-white/40 hover:bg-white/60 w-3";
  dot.addEventListener("click", () => goToSlide(idx));
  heroDotsEl.appendChild(dot);
});

function goToSlide(idx) {
  currentSlide = idx;
  const slides = heroSlidesEl.querySelectorAll(".hero-slide");
  const dots = heroDotsEl.querySelectorAll("button");
  slides.forEach((s, i) => s.classList.toggle("is-active", i === idx));
  dots.forEach((d, i) => {
    d.className = i === idx
      ? "h-1.5 rounded-full transition-all duration-500 bg-white w-8"
      : "h-1.5 rounded-full transition-all duration-500 bg-white/40 hover:bg-white/60 w-3";
  });
}

function startHeroTimer() {
  clearInterval(heroTimer);
  heroTimer = setInterval(() => {
    goToSlide((currentSlide + 1) % SLIDER_IMAGES.length);
  }, 3500);
}
heroDotsEl.querySelectorAll("button").forEach((dot) => {
  dot.addEventListener("click", startHeroTimer);
});
startHeroTimer();

// Scroll reveal
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("in-view");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

function observeReveal(el) {
  revealObserver.observe(el);
}

// Services
const servicesGroupsEl = document.getElementById("services-groups");
SERVICES.forEach((group) => {
  const groupEl = document.createElement("div");

  const header = document.createElement("div");
  header.className = "flex items-center gap-3 mb-6";
  header.innerHTML = `
    <div class="h-10 w-10 rounded-xl btn-gradient flex items-center justify-center text-white [&>svg]:h-5 [&>svg]:w-5">${ICONS[group.icon] || ""}</div>
    <h3 class="text-2xl md:text-3xl font-semibold text-slate-900">${group.group}</h3>
  `;
  groupEl.appendChild(header);

  const grid = document.createElement("div");
  grid.className = "grid md:grid-cols-2 lg:grid-cols-3 gap-6";
  group.items.forEach((s, i) => {
    const card = document.createElement("div");
    card.className = "reveal card-3d";
    card.style.transitionDelay = `${i * 0.05}s`;
    card.innerHTML = `
      <div class="glass-3d rounded-2xl p-6 card-3d-inner">
        <div class="flex items-start justify-between">
          <h4 class="text-lg font-semibold text-slate-900">${s.name}</h4>
          <span class="h-4 w-4 text-emerald-600 mt-1 [&>svg]:h-4 [&>svg]:w-4">${ICONS.chevronRight}</span>
        </div>
        <div class="mt-4 space-y-3 text-sm">
          <div><span class="text-emerald-700 font-semibold">Symptoms:</span> <span class="text-slate-600">${s.symptoms}</span></div>
          <div><span class="text-emerald-700 font-semibold">Benefits:</span> <span class="text-slate-600">${s.benefits}</span></div>
          <div><span class="text-emerald-700 font-semibold">Process:</span> <span class="text-slate-600">${s.process}</span></div>
          <div><span class="text-emerald-700 font-semibold">Results:</span> <span class="text-slate-600">${s.results}</span></div>
        </div>
      </div>
    `;
    grid.appendChild(card);
    observeReveal(card);
  });
  groupEl.appendChild(grid);
  servicesGroupsEl.appendChild(groupEl);
});

// Why choose us
const whyGridEl = document.getElementById("why-grid");
WHY.forEach(({ icon, title, desc }, i) => {
  const card = document.createElement("div");
  card.className = "reveal card-3d";
  card.style.transitionDelay = `${i * 0.05}s`;
  card.innerHTML = `
    <div class="bg-white rounded-2xl p-6 border border-slate-200 card-3d-inner gradient-border">
      <div class="h-11 w-11 rounded-xl btn-gradient text-white flex items-center justify-center icon-3d [&>svg]:h-5 [&>svg]:w-5">${ICONS[icon] || ""}</div>
      <h3 class="mt-5 text-lg font-semibold text-slate-900">${title}</h3>
      <p class="mt-2 text-slate-600 text-sm leading-relaxed">${desc}</p>
    </div>
  `;
  whyGridEl.appendChild(card);
  observeReveal(card);
});

// Testimonials
const testimonialsGridEl = document.getElementById("testimonials-grid");
TESTIMONIALS.forEach((t) => {
  const card = document.createElement("div");
  card.className = "glass-3d rounded-2xl p-6 gradient-border card-3d";
  const stars = Array.from({ length: 5 }).map(() => `<span class="h-4 w-4 text-amber-400 fill-amber-400 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:fill-amber-400">${ICONS.star}</span>`).join("");
  card.innerHTML = `
    <div class="card-3d-inner">
      <div class="flex items-center gap-1 mb-4">${stars}</div>
      <p class="text-slate-700 italic mb-6">"${t.text}"</p>
      <div class="flex justify-between items-end border-t border-slate-200 pt-4">
        <div class="font-semibold text-slate-900">${t.name}</div>
        <div class="text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-1 rounded">${t.treatment}</div>
      </div>
    </div>
  `;
  testimonialsGridEl.appendChild(card);
});

// About doctor / booking-section reveal (left/right slide-in)
document.querySelectorAll(".reveal-left, .reveal-right").forEach(observeReveal);

// Footer year
document.getElementById("footer-year").textContent = `© ${new Date().getFullYear()} DermaCare. All rights reserved.`;

// Treatment select options
const treatmentSelect = document.getElementById("treatment-select");
TREATMENT_OPTIONS.forEach((o) => {
  const opt = document.createElement("option");
  opt.value = o;
  opt.textContent = o;
  treatmentSelect.appendChild(opt);
});

// Consultation type toggle
const consultationHidden = document.querySelector('input[name="consultation_type"]');
document.querySelectorAll(".consultation-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    consultationHidden.value = btn.dataset.consultation;
    document.querySelectorAll(".consultation-toggle").forEach((b) => {
      const active = b === btn;
      b.className = "consultation-toggle flex items-center justify-center gap-2 h-11 rounded-xl border-2 text-sm font-medium transition-all duration-200 " +
        (active
          ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300");
    });
  });
});

// Toast
const toastRoot = document.getElementById("toast-root");
function showToast(message, type = "success") {
  const el = document.createElement("div");
  const colors = type === "error"
    ? "bg-red-600 text-white"
    : "bg-emerald-600 text-white";
  el.className = `${colors} rounded-lg shadow-lg px-4 py-3 text-sm font-medium max-w-sm transition-all duration-300 opacity-0 translate-x-4`;
  el.textContent = message;
  toastRoot.appendChild(el);
  requestAnimationFrame(() => {
    el.classList.remove("opacity-0", "translate-x-4");
  });
  setTimeout(() => {
    el.classList.add("opacity-0", "translate-x-4");
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

// Booking form submit
const bookingForm = document.getElementById("booking-form");
const bookingSubmit = document.getElementById("booking-submit");
bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  bookingSubmit.disabled = true;
  bookingSubmit.textContent = "Sending...";

  const fd = new FormData(bookingForm);
  const payload = {
    full_name: fd.get("full_name") || "",
    phone: fd.get("phone") || "",
    email: fd.get("email") || null,
    age: parseInt(fd.get("age"), 10),
    gender: fd.get("gender") || "",
    address: fd.get("address") || "",
    consultation_type: fd.get("consultation_type") || "online",
    treatment: fd.get("treatment") || "",
    preferred_date: fd.get("preferred_date") || null,
    message: fd.get("message") || null,
  };

  try {
    const res = await fetch(`${API}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const detail = data.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d) => `${d.loc?.[1] || "Field"}: ${d.msg}`).join(", ")
        : (detail || "Failed to send request. Please call us directly.");
      showToast(`Error: ${msg}`, "error");
      return;
    }
    showToast("Your appointment has been booked successfully.", "success");
    bookingForm.reset();
    document.querySelectorAll(".consultation-toggle")[0].click();
  } catch (err) {
    console.error(err);
    showToast("Failed to send request. Please call us directly.", "error");
  } finally {
    bookingSubmit.disabled = false;
    bookingSubmit.textContent = "Request Appointment";
  }
});
