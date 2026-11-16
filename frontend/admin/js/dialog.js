// Builds the .dialog-overlay / .dialog markup from admin.css. Content is HTML, so
// callers escape user data with esc().

const openDialogs = new Set();

// Returns { overlay, close }. Query the dialog's own elements through `overlay`.
//   wide:            the large layout (.dialog-lg), e.g. the medicines catalog
//   titleStyle:      extra inline style for the title bar (the icon headers use it)
//   zIndex:          for a dialog opened on top of another one
//   closeOnBackdrop: clicking outside the dialog closes it (calls onClose)
export function openDialog({ title, content, actions, wide = false, titleStyle = "", zIndex, closeOnBackdrop = true, onClose }) {
  const overlay = document.createElement("div");
  overlay.className = "dialog-overlay";
  if (zIndex) overlay.style.zIndex = String(zIndex);
  overlay.innerHTML = `
    <div class="dialog${wide ? " dialog-lg" : ""}">
      <div class="dialog-title"${titleStyle ? ` style="${titleStyle}"` : ""}>${title}</div>
      <div class="dialog-content">${content}</div>
      <div class="dialog-actions">${actions}</div>
    </div>
  `;

  function close() {
    if (!openDialogs.delete(close)) return; // already closed
    overlay.remove();
    if (onClose) onClose();
  }

  if (closeOnBackdrop) {
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  }
  document.body.appendChild(overlay);
  openDialogs.add(close);
  return { overlay, close };
}

// Dialogs live on <body>, outside the page the router replaces, so the router
// closes them when the user navigates away (e.g. with the Back button).
export function closeAllDialogs() {
  [...openDialogs].forEach((close) => close());
}
