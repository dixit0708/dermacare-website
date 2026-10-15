// Login page (Sign In / Doctor Sign Up).
// Has its own dark styles here instead of using admin.css.

import api from "../api.js";
import { login } from "../auth.js";
import { navigate } from "../router.js";

const STYLE = `
.login-page { min-height: 100vh; background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%); display: flex; align-items: center; justify-content: center; padding: 16px; }
.login-wrap { width: 100%; max-width: 420px; }
.login-logo-box { text-align: center; margin-bottom: 32px; }
.login-logo-card { background: #fff; border-radius: 12px; padding: 16px 24px; display: inline-block; margin-bottom: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
.login-logo-card img { width: 220px; object-fit: contain; display: block; }
.login-logo-caption { color: #64748b; font-size: 12px; }
.login-card { border-radius: 12px; background: rgba(255,255,255,0.04); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 25px 50px rgba(0,0,0,0.4); overflow: hidden; }
.login-tabs { display: flex; border-bottom: 1px solid rgba(255,255,255,0.08); }
.login-tab { flex: 1; padding: 14px; background: none; border: none; border-bottom: 3px solid transparent; color: #94a3b8; font-weight: 500; font-size: 0.95rem; font-family: inherit; cursor: pointer; }
.login-tab.active { color: #fff; font-weight: 700; border-bottom-color: #6366F1; }
.login-body { padding: 32px; }
.login-title { font-weight: 700; color: #fff; margin-bottom: 4px; font-size: 1.25rem; }
.login-subtitle { color: #94a3b8; margin-bottom: 24px; font-size: 0.875rem; }
.login-field { margin: 16px 0; }
.login-field label { display: block; color: #94a3b8; font-size: 0.8rem; margin-bottom: 6px; }
.login-input-wrap { position: relative; display: flex; align-items: center; }
.login-input-wrap .login-icon-start { position: absolute; left: 12px; color: #6366F1; font-size: 16px; pointer-events: none; }
.login-input-wrap .login-icon-end { position: absolute; right: 10px; color: #64748b; font-size: 16px; background: none; border: none; cursor: pointer; padding: 4px; line-height: 1; }
.login-input-wrap input { width: 100%; box-sizing: border-box; padding: 10px 12px 10px 36px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); background: transparent; color: #fff; font-size: 0.9rem; font-family: inherit; }
.login-input-wrap input:focus { outline: none; border-color: #6366F1; }
.login-alert { margin-top: 12px; padding: 12px; border-radius: 8px; font-size: 0.85rem; }
.login-alert-error { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171; }
.login-alert-success { background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3); color: #4ade80; }
.login-submit { width: 100%; margin-top: 24px; padding: 12px; font-weight: 700; font-size: 1rem; border-radius: 8px; border: none; color: #fff; cursor: pointer; background: linear-gradient(135deg, #6366F1 0%, #4f46e5 100%); box-shadow: 0 4px 15px rgba(99,102,241,0.4); }
.login-submit:hover { background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); }
`;

function field({ id, label, type = "text", icon, toggle = false }) {
  return `
    <div class="login-field">
      <label for="${id}">${label}</label>
      <div class="login-input-wrap">
        <span class="login-icon-start">${icon}</span>
        <input id="${id}" type="${type}" required />
        ${toggle ? `<button type="button" class="login-icon-end" data-toggle="${id}">\u{1F441}️</button>` : ""}
      </div>
    </div>
  `;
}

export function render(container) {
  const style = document.createElement("style");
  style.textContent = STYLE;
  container.appendChild(style);

  const page = document.createElement("div");
  page.className = "login-page";
  page.innerHTML = `
    <div class="login-wrap">
      <div class="login-logo-box">
        <div class="login-logo-card">
          <img src="/assets/img/logo.png" alt="DermaCare" />
        </div>
        <div class="login-logo-caption">Patient Management System</div>
      </div>

      <div class="login-card">
        <div class="login-tabs">
          <button type="button" class="login-tab active" data-tab="0">Sign In</button>
          <button type="button" class="login-tab" data-tab="1">Doctor Sign Up</button>
        </div>

        <div class="login-body">
          <div id="panel-signin">
            <div class="login-title">Welcome back</div>
            <div class="login-subtitle">Sign in to access the clinic dashboard</div>
            <form id="signin-form">
              ${field({ id: "si-username", label: "Username", icon: "\u{1F464}" })}
              ${field({ id: "si-password", label: "Password", type: "password", icon: "\u{1F512}", toggle: true })}
              <div id="signin-error"></div>
              <button type="submit" class="login-submit">Sign In</button>
            </form>
          </div>

          <div id="panel-signup" style="display:none">
            <div class="login-title">Doctor Registration</div>
            <div class="login-subtitle">Create your doctor account to access the system</div>
            <form id="signup-form">
              ${field({ id: "su-fullname", label: "Full Name", icon: "\u{1FAAA}" })}
              ${field({ id: "su-username", label: "Username", icon: "\u{1F464}" })}
              ${field({ id: "su-password", label: "Password", type: "password", icon: "\u{1F512}", toggle: true })}
              ${field({ id: "su-confirm", label: "Confirm Password", type: "password", icon: "\u{1F512}" })}
              <div id="signup-error"></div>
              <div id="signup-success"></div>
              <button type="submit" class="login-submit">Create Doctor Account</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;
  container.appendChild(page);

  // Tabs
  const tabs = page.querySelectorAll(".login-tab");
  const panelSignin = page.querySelector("#panel-signin");
  const panelSignup = page.querySelector("#panel-signup");
  const signinError = page.querySelector("#signin-error");
  const signupError = page.querySelector("#signup-error");
  const signupSuccess = page.querySelector("#signup-success");

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const isSignIn = btn.dataset.tab === "0";
      panelSignin.style.display = isSignIn ? "" : "none";
      panelSignup.style.display = isSignIn ? "none" : "";
      signinError.innerHTML = "";
      signupError.innerHTML = "";
      signupSuccess.innerHTML = "";
    });
  });

  // Password visibility toggles
  page.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = page.querySelector(`#${btn.dataset.toggle}`);
      input.type = input.type === "password" ? "text" : "password";
      btn.textContent = input.type === "password" ? "\u{1F441}️" : "\u{1F648}";
    });
  });

  // Sign In submit
  page.querySelector("#signin-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    signinError.innerHTML = "";
    const username = page.querySelector("#si-username").value;
    const password = page.querySelector("#si-password").value;
    try {
      const res = await api.post("/api/auth/login", { username, password });
      login(res.data.access_token);
      navigate("/admin/");
    } catch (err) {
      const msg = err.response?.data?.msg || "Login failed";
      signinError.innerHTML = `<div class="login-alert login-alert-error">${msg}</div>`;
    }
  });

  // Doctor Sign Up submit
  page.querySelector("#signup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    signupError.innerHTML = "";
    signupSuccess.innerHTML = "";
    const regName = page.querySelector("#su-fullname").value;
    const regUsername = page.querySelector("#su-username").value;
    const regPassword = page.querySelector("#su-password").value;
    const regConfirm = page.querySelector("#su-confirm").value;

    if (regPassword !== regConfirm) {
      signupError.innerHTML = `<div class="login-alert login-alert-error">Passwords do not match</div>`;
      return;
    }
    if (regPassword.length < 6) {
      signupError.innerHTML = `<div class="login-alert login-alert-error">Password must be at least 6 characters</div>`;
      return;
    }

    try {
      await api.post("/api/auth/register", {
        username: regUsername,
        password: regPassword,
        full_name: regName,
        role: "Doctor",
      });
      signupSuccess.innerHTML = `<div class="login-alert login-alert-success">Account created successfully! You can now sign in.</div>`;
      page.querySelector("#signup-form").reset();
    } catch (err) {
      const msg = err.response?.data?.msg || "Registration failed";
      signupError.innerHTML = `<div class="login-alert login-alert-error">${msg}</div>`;
    }
  });
}
