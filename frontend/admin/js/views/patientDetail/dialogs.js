// Dialogs opened from the patient page. These don't close on a backdrop click, so a
// stray click can't throw away a half-filled form or a pending delete.

import api from "../../api.js";
import { esc } from "../../escape.js";
import { toast } from "../../toast.js";
import { openDialog } from "../../dialog.js";

// onConfirm(close) runs the delete; the dialog stays open if it fails.
export function openDeletePatientDialog(onConfirm) {
  const { overlay, close } = openDialog({
    title: "Confirm Delete",
    content: "Are you sure you want to delete this patient? This action cannot be undone.",
    actions: `
      <button type="button" class="btn btn-ghost" data-action="cancel">Cancel</button>
      <button type="button" class="btn btn-danger" data-action="delete">Delete</button>`,
    closeOnBackdrop: false,
  });
  overlay.querySelector('[data-action="cancel"]').addEventListener("click", close);
  overlay.querySelector('[data-action="delete"]').addEventListener("click", () => onConfirm(close));
}

// Dispatch date and tracking ID of one online-order visit.
export function openDispatchDialog({ patientId, visitId, dispatchDate, trackingId, onSaved }) {
  const { overlay, close } = openDialog({
    title: "\u{1F69A} Update Dispatch Info",
    content: `
      <div class="field">
        <label class="field-label" for="dispatch-date">Dispatch Date</label>
        <input type="date" class="input" id="dispatch-date" value="${esc(dispatchDate)}" />
      </div>
      <div class="field">
        <label class="field-label" for="dispatch-tracking">Tracking ID</label>
        <input type="text" class="input" id="dispatch-tracking" placeholder="e.g. DTDC123456789IN" value="${esc(trackingId)}" />
      </div>`,
    actions: `
      <button type="button" class="btn btn-ghost" data-action="cancel">Cancel</button>
      <button type="button" class="btn btn-primary" data-action="save">Save Dispatch Info</button>`,
    closeOnBackdrop: false,
  });

  const saveBtn = overlay.querySelector('[data-action="save"]');
  overlay.querySelector('[data-action="cancel"]').addEventListener("click", close);
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
    try {
      await api.patch(`/api/patients/${patientId}/visit-dispatch`, {
        visit_id: visitId,
        dispatch_date: overlay.querySelector("#dispatch-date").value,
        tracking_id: overlay.querySelector("#dispatch-tracking").value,
      });
      close();
      onSaved();
    } catch (e) {
      toast.error(`Failed to update dispatch info: ${e.message}`);
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Dispatch Info";
    }
  });
}

// Full-size photo. Not a .dialog: a dark full-screen overlay that closes on any
// click outside the image. Added to the page container, so leaving the page removes it.
export function openLightbox(src, host) {
  const overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";
  overlay.innerHTML = `
    <div style="position:absolute;top:16px;right:16px;">
      <button type="button" class="btn btn-ghost" style="color:#fff;">✕ Close</button>
    </div>
    <img src="${esc(src)}" alt="full view" />
  `;
  overlay.querySelector("button").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  host.appendChild(overlay);
}
