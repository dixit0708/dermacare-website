import { registerRoute, startRouter } from "./router.js";
import { withSidebar } from "./components/sidebarLayout.js";
import { render as renderLogin } from "./views/login.js";
import { render as renderDashboard } from "./views/dashboard.js";
import { render as renderPatientDetail } from "./views/patientDetail.js";
import { render as renderWebsiteAppointments } from "./views/websiteAppointments.js";

registerRoute("/admin/login", renderLogin, { protected: false });
registerRoute("/admin/", withSidebar(renderDashboard), { protected: true });
registerRoute("/admin/patients/:patient_id", withSidebar(renderPatientDetail), { protected: true });
registerRoute("/admin/website-appointments", withSidebar(renderWebsiteAppointments), { protected: true });

startRouter();
