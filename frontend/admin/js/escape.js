// Escapes text before it goes into innerHTML, so data typed by a user (e.g. a
// patient name from the public booking form) is shown as text, never run as HTML.

export function esc(v) {
  return v == null ? "" : String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
