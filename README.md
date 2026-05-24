# HabitFlow — Habit Tracker

A full-stack habit tracking app with a Flask + Supabase backend and a pure HTML/CSS/JS frontend.

---

## Project Structure

```
Mini_Project_HabbitsTracker/
├── backend/
│   ├── app.py            # Flask REST API
│   ├── requirements.txt
│   ├── Procfile          # Railway / Heroku deploy
│   ├── .env.example      # Copy → .env and fill in values
│   └── .gitignore
├── frontend/
│   ├── index.html        # Login / Register page
│   ├── dashboard.html    # Main habit dashboard
│   ├── style.css
│   └── app.js            # Shared fetch() API client
├── supabase/
│   └── schema.sql        # Run this in Supabase SQL Editor
└── README.md
```

---

## 1. Supabase Setup

1. Create a free project at <https://supabase.com>.
2. In the **SQL Editor**, run the contents of `supabase/schema.sql`.
3. Copy your **Project URL** and **anon public key** from  
   *Project Settings → API*.

---

## 2. Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and fill in:
#   SUPABASE_URL=https://<project-ref>.supabase.co
#   SUPABASE_KEY=<your-anon-key>
#   FLASK_SECRET_KEY=<any-random-string>

# Run locally
python app.py
```

The API will be available at `http://localhost:5000`.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login and receive JWT |
| GET | `/habits` | List today's habits + completion status |
| POST | `/habits` | Create a new habit |
| POST | `/habits/:id/check` | Toggle today's completion |
| GET | `/habits/:id/streak` | Get current streak |
| DELETE | `/habits/:id` | Delete a habit |
| GET | `/health` | Health check |

All habit endpoints require `Authorization: Bearer <token>` header.

---

## 3. Frontend Setup

The frontend is static HTML — no build step required.

1. Open `frontend/index.html` in your browser **or** serve it with any static server:

```bash
# Python one-liner
cd frontend
python -m http.server 8080
# Then open http://localhost:8080
```

2. **Point the frontend at your backend.** By default `app.js` calls `http://localhost:5000`.  
   To change this (e.g. for a deployed backend), add this block **before** the `<script src="app.js">` tag in both HTML files:

```html
<script>
  window._env = { BACKEND_URL: "https://your-api.railway.app" };
</script>
```

---

## 4. Deploy to Railway

### Backend

1. Push the `backend/` folder to a GitHub repo (or push the whole monorepo).
2. Create a new Railway project → *Deploy from GitHub repo*.
3. Set the root directory to `backend/`.
4. Add environment variables in Railway:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `FLASK_SECRET_KEY`
5. Railway detects the `Procfile` and runs `gunicorn app:app` automatically.

### Frontend

1. Create a second Railway service (or use any static host: Netlify, Vercel, GitHub Pages).
2. Set the root directory to `frontend/`.
3. Update `window._env.BACKEND_URL` in both HTML files to your Railway backend URL.

---

## 5. Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL (`https://<ref>.supabase.co`) |
| `SUPABASE_KEY` | Supabase anon public key |
| `FLASK_SECRET_KEY` | Any random secret string for Flask sessions |
| `PORT` | (optional) Port for gunicorn — Railway sets this automatically |

---

## Demo

Try the app with this test account:

| Field | Value |
|-------|-------|
| Email | `test@habitflow.com` |
| Password | `Test1234!` |

---

## Features

- Email + password authentication via Supabase Auth
- Add, complete, and delete habits
- Daily completion toggle (check/uncheck)
- Streak counter per habit
- Progress bar for the day
- Mobile-friendly responsive design
- Row-Level Security (RLS) — users can only access their own data
