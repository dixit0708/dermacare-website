# MediStream : Full-Stack Digital Health Platform (Website & DPMS)

Clinic website with online appointment booking, plus an admin panel (DPMS) for
managing patients, consultations, medicines and appointments.

- **Backend:** FastAPI + MongoDB (Motor)
- **Frontend:** plain HTML / CSS / JavaScript, Tailwind for the public site styles

## Project structure

```
backend/
  server.py        FastAPI app, also serves the frontend
  app/routes/      auth, patients, appointments, medicines APIs
  app/services/    email, SMS and reminder scheduler
frontend/
  index.html       public website
  admin/           DPMS admin panel (served at /admin)
  build-css.mjs    builds assets/css/site.css from source.css
```

## Running locally

1. Create `backend/.env` with at least `MONGO_URL`, `DB_NAME` and `JWT_SECRET`.
   Optional: `ADMIN_TOKEN`, `SMTP_*` for email, `MSG91_*` for SMS.
2. Install and start the backend:

   ```
   cd backend
   pip install -r requirements.txt
   python server.py
   ```

3. Open http://localhost:8000 for the website and http://localhost:8000/admin for the admin panel.

## Rebuilding the site CSS

Only needed after changing Tailwind classes or `source.css`:

```
cd frontend
npm install postcss @tailwindcss/postcss autoprefixer
node build-css.mjs
```
