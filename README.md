# EEG Cognitive Assessment System

This repository contains a FastAPI backend that performs simple EEG-based cognitive assessments and serves a static frontend in `backend/static`.

## Quick Start (Local Development)

1. **Create a virtual environment and install dependencies:**
```bash
python -m venv .venv
# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

pip install -r backend/requirements.txt
```

2. **Run the backend:**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

The app will be available at `http://localhost:8000` and the health endpoint at `/health`.

## Project Structure

```
project/
├── backend/
│   ├── main.py                       # FastAPI app with endpoints and Firebase integration
│   ├── train_model.py                # Train EEG models (outputs .pkl artifacts)
│   ├── requirements.txt               # Python dependencies
│   ├── Procfile                       # Start command for repo-based hosts (Render, Railway, etc.)
│   ├── firebase_key.json              # Firebase service account (local dev only; do NOT commit)
│   ├── eeg_data.csv                   # Sample training data
│   ├── eeg_age_classifier.pkl         # Trained model artifact
│   ├── age_group_baselines.pkl        # Baseline metrics
│   └── static/                        # HTML/CSS/JS frontend
├── .env                               # Local env vars (do NOT commit real secrets)
├── .env.example                       # Template for env vars
├── .gitignore                         # Excludes .env, caches, secrets
└── .github/workflows/
    ├── ci-and-deploy-render.yml       # GitHub Actions CI for Render deploys
    └── deploy-railway-example.yml     # Example Railway CI (commented; template only)
```

## Environment Configuration

See `.env.example` for all environment variables. Key ones:

- **`FIREBASE_CREDENTIALS_PATH`:** Path to Firebase service account JSON file.
  - For local dev: set to `firebase_key.json` (file in `backend/` folder).
  - For Render/Railway: upload the file as a secret and set an absolute path, or base64-encode the JSON and paste into `FIREBASE_KEY`.

- **`MODEL_PATH`, `BASELINES_PATH`:** Paths to trained model artifacts.
  - Default: `eeg_age_classifier.pkl` and `age_group_baselines.pkl` in `backend/` folder.

- **`LOG_LEVEL`:** (optional) defaults to `info`.

## Training the Model

To regenerate model artifacts:

```bash
cd backend
python train_model.py
```

This produces `eeg_age_classifier.pkl` and `age_group_baselines.pkl`.

## Deployment to Render or Railway

This project uses **repo-based deployment** (no Docker required). Both Render and Railway automatically build your app using `requirements.txt` and the start command in `Procfile` (or `uvicorn main:app --host 0.0.0.0 --port $PORT`).

### Render Setup (Recommended)

1. **Sign up and create a Web Service:**
   - Go to [render.com](https://render.com), create an account.
   - Click "New +" → "Web Service".
   - Connect your GitHub repo and select the branch (`main`).

2. **Configure the service:**
   - **Name:** e.g., `eeg-cognitive-api`.
   - **Root Directory:** `backend` (so Render builds from `backend/` folder).
   - **Environment:** Python.
   - **Build Command:** (leave blank, Render will use `pip install -r requirements.txt`).
   - **Start Command:** (leave blank, Render will use `Procfile`).

3. **Set environment variables:**
   - Go to the service dashboard → **Environment**.
   - Add:
     - `FIREBASE_CREDENTIALS_PATH`: (if using file upload) `/etc/secrets/firebase_key.json`
     - Or `FIREBASE_KEY`: paste the minified JSON (watch for newline escaping).
     - `MODEL_PATH`: `eeg_age_classifier.pkl` (or adjust if in cloud storage).
     - `BASELINES_PATH`: `age_group_baselines.pkl` (or adjust if in cloud storage).
     - `LOG_LEVEL`: `info` (optional).

4. **(Optional) Upload Firebase credentials as a file:**
   - In Render dashboard → **Files**.
   - Upload `firebase_key.json` and it will appear at `/etc/secrets/firebase_key.json`.
   - Set `FIREBASE_CREDENTIALS_PATH=/etc/secrets/firebase_key.json`.

5. **Deploy:**
   - Render auto-deploys on every push to `main` branch, OR
   - Manually trigger a deploy from the Render dashboard.

### Railway Setup (Alternative)

1. **Sign up and create a service:**
   - Go to [railway.app](https://railway.app), create an account.
   - Create a new project and connect your GitHub repo.

2. **Configure:**
   - Root directory: `backend`.
   - Railway detects Python and installs from `requirements.txt`.
   - Start command: `Procfile` or `uvicorn main:app --host 0.0.0.0 --port $PORT`.

3. **Set secrets/env vars:**
   - In the Railway UI, add environment variables as described above.

4. **Deploy:**
   - Railway auto-deploys on push. Monitor logs in the dashboard.

## GitHub Actions CI (Continuous Integration)

A workflow is included at `.github/workflows/ci-and-deploy-render.yml`. It:

1. On every push to `main`, installs dependencies and runs a smoke import test.
2. (Optional) If `RENDER_API_KEY` and `RENDER_SERVICE_ID` secrets are set in GitHub, it triggers a Render deploy via API.

**To enable automatic CI deploys:**

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**.
2. Add:
   - `RENDER_API_KEY`: Create in Render dashboard → **Account Settings** → **API Key**.
   - `RENDER_SERVICE_ID`: Find in your Render service URL (looks like `srv-...`).

Once set, every push to `main` will trigger the workflow, run tests, and (if secrets are present) deploy to Render.

## Logging & Health Checks

- **Health endpoint:** `GET /health` returns `{"status": "ok", "models_loaded": bool, "firebase_configured": bool}`.
- **Logging:** Structured logging with timestamps. Set `LOG_LEVEL=debug` for verbose output.

## API Endpoints

- **`GET /`** — Redirects to `/static/index.html`.
- **`GET /static/*`** — Serves the frontend (HTML/CSS/JS).
- **`POST /submit-results`** — Main cognitive assessment endpoint.
- **`GET /health`** — Health/readiness check for deployment platforms.

## Model Artifacts & Production

If models are large or need to be updated independently:

- **Option 1 (simple):** Keep `.pkl` files in repo (if small).
- **Option 2 (recommended):** Upload to cloud storage (S3/GCS) and download at app startup.
- **Option 3 (advanced):** Use a separate build step in CI to upload artifacts.

For Option 2 or 3, modify `backend/main.py` to fetch models from URLs. Let me know if you need a template.

## Troubleshooting

**Models not found:** Ensure `train_model.py` has been run locally and artifacts are committed, or they are available at the configured paths on your host.

**Firebase fails to initialize:** Check that `FIREBASE_KEY` or `FIREBASE_CREDENTIALS_PATH` is set correctly and the JSON is valid.

**Port binding errors:** Make sure to use `$PORT` env var (Render/Railway set this automatically). The `Procfile` handles this.

## Next Steps

- Test locally with `uvicorn main:app --reload` in `backend/`.
- Push to GitHub and monitor Render/Railway deploys.
- Check logs in the platform dashboard for any runtime errors.

For questions or advanced configurations (e.g., custom domain, SSL, auto-scaling), refer to Render or Railway documentation.

