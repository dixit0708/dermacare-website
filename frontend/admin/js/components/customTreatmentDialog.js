// "Specify Custom Treatment" dialog, opened by choosing "Other" in a treatment
// select on the registration form or the New Consultation tab.

import { openDialog } from "../dialog.js";
import { esc } from "../escape.js";

// onSave(name) runs on OK. onCancel(typedText) runs on Cancel or a backdrop click,
// so a caller can remember what was typed.
export function openCustomTreatmentDialog({ initial = "", onSave, onCancel, closeOnBackdrop = true }) {
  let saved = false;
  const { overlay, close } = openDialog({
    title: "Specify Custom Treatment",
    content: `
      <div class="field">
        <label class="field-label" for="custom-treatment-input">Treatment Name</label>
        <input type="text" class="input" id="custom-treatment-input" value="${esc(initial)}" />
      </div>`,
    actions: `
      <button type="button" class="btn btn-ghost" data-action="cancel">Cancel</button>
      <button type="button" class="btn btn-primary" data-action="ok">OK</button>`,
    closeOnBackdrop,
    onClose: () => { if (!saved && onCancel) onCancel(input.value); },
  });

  const input = overlay.querySelector("#custom-treatment-input");
  input.focus();
  overlay.querySelector('[data-action="cancel"]').addEventListener("click", close);
  overlay.querySelector('[data-action="ok"]').addEventListener("click", () => {
    saved = true;
    close();
    onSave(input.value);
  });
}
