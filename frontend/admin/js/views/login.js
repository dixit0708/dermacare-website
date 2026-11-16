// Styles are in the "Login page" section of admin.css.

import api, { ApiError } from "../api.js";
import { login } from "../auth.js";
import { navigate } from "../router.js";
import { esc } from "../escape.js";

// fetch() itself throws (not an ApiError) when the server can't be reached.
function errorMessage(err) {
  return err instanceof ApiError ? err.message : "Can't reach the server. Is the backend running?";
}

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

  page.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = page.querySelector(`#${btn.dataset.toggle}`);
      input.type = input.type === "password" ? "text" : "password";
      btn.textContent = input.type === "password" ? "\u{1F441}️" : "\u{1F648}";
    });
  });

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
      const msg = errorMessage(err);
      signinError.innerHTML = `<div class="login-alert login-alert-error">${esc(msg)}</div>`;
    }
  });

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
      });
      signupSuccess.innerHTML = `<div class="login-alert login-alert-success">Account created successfully! You can now sign in.</div>`;
      page.querySelector("#signup-form").reset();
    } catch (err) {
      const msg = errorMessage(err);
      signupError.innerHTML = `<div class="login-alert login-alert-error">${esc(msg)}</div>`;
    }
  });
}
