from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
import os
import json
import logging
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import uuid

# Load .env in development if available
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

# Configure structured logging
LOG_LEVEL = os.environ.get("LOG_LEVEL", "info").upper()
logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("eeg_app")

# -------------------- Firebase Initialization --------------------
# -------------------- Firebase Initialization --------------------
def init_firebase():
    if firebase_admin._apps:
        return

    # Support either a JSON string in `FIREBASE_KEY` or a file path in `FIREBASE_CREDENTIALS_PATH`.
    firebase_json = os.environ.get("FIREBASE_KEY")
    firebase_path = os.environ.get("FIREBASE_CREDENTIALS_PATH")
    if not firebase_json and not firebase_path:
        # Firebase is optional — skip initialization if no credentials provided.
        print("FIREBASE_KEY or FIREBASE_CREDENTIALS_PATH not set; skipping Firebase init")
        return

    try:
        if firebase_path:
            # Resolve relative paths from the backend directory
            if not os.path.isabs(firebase_path):
                firebase_path = os.path.join(os.path.dirname(__file__), firebase_path)
            with open(firebase_path, "r", encoding="utf-8") as f:
                cred_dict = json.load(f)
        else:
            cred_dict = json.loads(firebase_json)

        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
    except Exception as e:
        raise RuntimeError(f"Failed to initialize Firebase: {e}")

try:
    init_firebase()
    db = firestore.client()
    logger.info("Firebase initialized successfully")
except Exception as e:
    db = None
    logger.warning("Firebase not initialized: %s", e)



# -------------------- FastAPI Initialization --------------------
app = FastAPI(title="Cognitive Assessment System")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def read_index():
    return RedirectResponse(url="/static/index.html")


# -------------------- Model Loading --------------------
# Configurable model paths via environment
MODEL_PATH = os.environ.get("MODEL_PATH", "eeg_age_classifier.pkl")
BASELINES_PATH = os.environ.get("BASELINES_PATH", "age_group_baselines.pkl")

models_loaded = False
clf = None
baselines = None

def load_models():
    global clf, baselines, models_loaded
    if os.path.exists(MODEL_PATH) and os.path.exists(BASELINES_PATH):
        clf = joblib.load(MODEL_PATH)
        baselines = joblib.load(BASELINES_PATH)
        models_loaded = True
        logger.info("Models loaded from %s and %s", MODEL_PATH, BASELINES_PATH)
    else:
        logger.info("Models not found at %s and %s. Training needed.", MODEL_PATH, BASELINES_PATH)

load_models()


# -------------------- Data Models --------------------
class UserSubmission(BaseModel):
    name: str
    age: int
    memory_score: float
    reaction_time: float
    attention_score: float
    spatial_score: float = 0
    symbol_match_score: float = 0


class AnalysisResult(BaseModel):
    age_group: str
    predicted_cognitive_state: str
    eeg_comparison: dict
    interpretation: str
    firebase_doc_id: str  # <-- Added to track Firestore doc


# -------------------- API Endpoints --------------------
@app.post("/submit-results", response_model=AnalysisResult)
def analyze_performance(submission: UserSubmission):
    if not models_loaded:
        load_models()
        if not models_loaded:
            raise HTTPException(status_code=503, detail="Models not trained yet.")

    # 1. Determine Age Group
    age = submission.age
    if age <= 12:
        user_group = 'Child'
    elif age <= 18:
        user_group = 'Adolescent'
    elif age <= 60:
        user_group = 'Adult'
    else:
        user_group = 'Senior'

    # 2. Get Baselines for this Group
    group_stats = baselines.get(user_group, {})

    avg_delta = group_stats.get('Delta', 0)
    avg_theta = group_stats.get('Theta', 0)
    avg_alpha = group_stats.get('Alpha', 0)
    avg_beta = group_stats.get('Beta', 0)
    avg_entropy = group_stats.get('Entropy', 0)

    # 3. Neural Benchmark (Enhanced)
    neural_benchmark = (avg_beta * 20) + (avg_entropy * 50)
    neural_benchmark = min(100, max(0, neural_benchmark))

    # 4. Calculate User's Overall Score
    rxn_score = max(0, min(100, (1000 - submission.reaction_time) / 8))
    user_overall_score = (
        submission.memory_score +
        rxn_score +
        submission.attention_score +
        submission.spatial_score +
        submission.symbol_match_score
    ) / 5

    # 5. Compare and Determine State
    diff = user_overall_score - neural_benchmark
    focus_index = avg_beta / avg_theta if avg_theta > 0 else 0

    if diff > 10:
        state = "Excelling"
        trend = "exceeds"
    elif diff < -10:
        state = "Needs Improvement"
        trend = "falls below"
    else:
        state = "Consistent"
        trend = "aligns with"

    interpretation = (
        f"Your cognitive profile across 5 dimensions (Memory, Reaction, Attention, Spatial, Processing) "
        f"yields an aggregate score of {int(user_overall_score)}/100. "
        f"Compared to the '{user_group}' EEG benchmark ({int(neural_benchmark)}/100) derived from typical Beta/Entropy levels, "
        f"your performance {trend} expected patterns."
    )

    # -------------------- Save to Firebase (if available) --------------------
    doc_id = ""
    if db is not None:
        try:
            doc_id = str(uuid.uuid4())  # Unique document ID
            db.collection("eeg_results").document(doc_id).set({
                "name": submission.name,
                "age": submission.age,
                "age_group": user_group,
                "scores": {
                    "memory_score": submission.memory_score,
                    "reaction_score": rxn_score,
                    "attention_score": submission.attention_score,
                    "spatial_score": submission.spatial_score,
                    "symbol_match_score": submission.symbol_match_score,
                    "overall_score": user_overall_score
                },
                "neural_benchmark": neural_benchmark,
                "focus_index": round(focus_index, 2),
                "predicted_state": state,
                "interpretation": interpretation,
                "timestamp": datetime.utcnow()
            })
        except Exception as e:
            logger.warning("Failed to save result to Firebase: %s", e)
            doc_id = ""

    return AnalysisResult(
        age_group=user_group,
        predicted_cognitive_state=state,
        eeg_comparison={
            "UserScore": int(user_overall_score),
            "NeuralBenchmark": int(neural_benchmark),
            "TypicalDelta": avg_delta,
            "TypicalTheta": avg_theta,
            "TypicalAlpha": avg_alpha,
            "TypicalBeta": avg_beta,
            "FocusIndex": round(focus_index, 2)
        },
        interpretation=interpretation,
        firebase_doc_id=doc_id  # returned to client (empty if not saved)
    )


@app.get("/health")
def health():
    """Health endpoint used by platforms to check liveness/readiness."""
    status = {
        "status": "ok",
        "models_loaded": bool(models_loaded),
        "firebase_configured": bool(db is not None),
    }
    return status
