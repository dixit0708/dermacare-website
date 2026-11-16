import { APPOINTMENT_STATUS } from "./constants.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The website's booking form sends a date only ("2026-12-15"). new Date() would read
// that as UTC midnight: 5:30 AM in India, and the previous day west of UTC. A date-only
// value means that calendar day, so it is read in local time and has no time of day.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
export const isDateOnly = (value) => typeof value === "string" && DATE_ONLY.test(value);

function toDate(value) {
  if (!isDateOnly(value)) return new Date(value);
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// formatDate(value, "DD MMM YYYY, h:mm A") -> "01 Dec 2026, 10:30 AM", in the browser's
// time zone. Tokens: YYYY MM MMM DD HH h mm A. Returns "" for a missing or invalid date.
export function formatDate(value, pattern) {
  const d = toDate(value);
  if (value == null || value === "" || isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const tokens = {
    YYYY: d.getFullYear(),
    MMM: MONTHS[d.getMonth()],
    MM: pad(d.getMonth() + 1),
    DD: pad(d.getDate()),
    HH: pad(d.getHours()),
    h: d.getHours() % 12 || 12,
    mm: pad(d.getMinutes()),
    A: d.getHours() >= 12 ? "PM" : "AM",
  };
  return pattern.replace(/YYYY|MMM|MM|DD|HH|mm|h|A/g, (t) => String(tokens[t]));
}

// Value for an <input type="datetime-local">.
export const toDateTimeInput = (value) => formatDate(value, "YYYY-MM-DDTHH:mm");

const STATUS_CHIPS = {
  [APPOINTMENT_STATUS.COMPLETED]: "chip-success",
  [APPOINTMENT_STATUS.CANCELLED]: "chip-danger",
  [APPOINTMENT_STATUS.NO_SHOW]: "chip-warning",
  [APPOINTMENT_STATUS.STARTED]: "chip-primary",
};

// CSS chip class for an appointment status; New and unknown values use the default chip.
export const statusChipClass = (status) => STATUS_CHIPS[status] || "chip-default";
