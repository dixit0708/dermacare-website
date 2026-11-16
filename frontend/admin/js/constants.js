// Appointment values stored in dpms.appointments. They must match the backend:
//   statuses: AppointmentUpdate.status in backend/app/models.py
//   sources:  SOURCE_* in backend/app/routes/appointments.py ("Registered from
//             Website" is set by the registration form when it links a booking)

export const APPOINTMENT_STATUS = Object.freeze({
  NEW: "New",
  STARTED: "Consultation Started",
  COMPLETED: "Completed",
  NO_SHOW: "No Show",
  CANCELLED: "Cancelled",
});

export const APPOINTMENT_SOURCE = Object.freeze({
  WEBSITE: "Website",                              // new patient, not registered yet
  RETURNING_PATIENT: "Existing Patient Booking",   // linked to an existing patient_id
  REGISTERED_FROM_WEBSITE: "Registered from Website",
});
