// Simple success / error toasts in the top-right corner.

function ensureRoot() {
  let root = document.getElementById("toast-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "toast-root";
    root.style.cssText = "position:fixed;top:16px;right:16px;z-index:2000;display:flex;flex-direction:column;gap:8px;align-items:flex-end;";
    document.body.appendChild(root);
  }
  return root;
}

const COLORS = {
  success: "#059669",
  error: "#dc2626",
  info: "#1d4ed8",
  warning: "#d97706",
};

function show(message, type) {
  const root = ensureRoot();
  const el = document.createElement("div");
  el.style.cssText = `background:${COLORS[type] || "#334155"};color:#fff;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,.15);padding:10px 16px;font-size:14px;font-weight:500;max-width:360px;line-height:1.4;transition:opacity .3s ease, transform .3s ease;opacity:0;transform:translateX(16px);`;
  el.textContent = message;
  root.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "translateX(0)";
  });
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(16px)";
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

export const toast = {
  success: (msg) => show(msg, "success"),
  error: (msg) => show(msg, "error"),
  info: (msg) => show(msg, "info"),
  warning: (msg) => show(msg, "warning"),
};
