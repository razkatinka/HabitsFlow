import os
from datetime import date
from functools import wraps

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client, Client

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "changeme")
CORS(app, origins="*", supports_credentials=True)

supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_KEY"],
)


# ---------------------------------------------------------------------------
# Auth helper
# ---------------------------------------------------------------------------

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        token = auth_header.split(" ", 1)[1]
        try:
            user_resp = supabase.auth.get_user(token)
            if user_resp is None or user_resp.user is None:
                return jsonify({"error": "Invalid token"}), 401
            request.user_id = user_resp.user.id
            request.token = token
        except Exception as e:
            return jsonify({"error": "Authentication failed", "detail": str(e)}), 401
        return f(*args, **kwargs)
    return decorated


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

@app.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip()
    password = data.get("password", "")
    if not email or not password:
        return jsonify({"error": "email and password required"}), 400
    try:
        resp = supabase.auth.sign_up({"email": email, "password": password})
        return jsonify({"message": "Registration successful. Check your email to confirm."}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip()
    password = data.get("password", "")
    if not email or not password:
        return jsonify({"error": "email and password required"}), 400
    try:
        resp = supabase.auth.sign_in_with_password({"email": email, "password": password})
        return jsonify({
            "access_token": resp.session.access_token,
            "user": {"id": resp.user.id, "email": resp.user.email},
        }), 200
    except Exception as e:
        return jsonify({"error": "Invalid credentials", "detail": str(e)}), 401


# ---------------------------------------------------------------------------
# Habits endpoints
# ---------------------------------------------------------------------------

@app.route("/habits", methods=["GET"])
@require_auth
def get_habits():
    today = date.today().isoformat()
    habits = (
        supabase.table("habits")
        .select("*")
        .eq("user_id", request.user_id)
        .order("created_at")
        .execute()
        .data
    )

    # Attach today's completion status to each habit
    for habit in habits:
        log = (
            supabase.table("habit_logs")
            .select("completed")
            .eq("habit_id", habit["id"])
            .eq("date", today)
            .execute()
            .data
        )
        habit["completed_today"] = bool(log and log[0]["completed"])

    return jsonify(habits), 200


@app.route("/habits", methods=["POST"])
@require_auth
def create_habit():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    habit = (
        supabase.table("habits")
        .insert({"user_id": request.user_id, "name": name})
        .execute()
        .data[0]
    )
    habit["completed_today"] = False
    return jsonify(habit), 201


@app.route("/habits/<habit_id>/check", methods=["POST"])
@require_auth
def check_habit(habit_id):
    # Verify ownership
    row = (
        supabase.table("habits")
        .select("id")
        .eq("id", habit_id)
        .eq("user_id", request.user_id)
        .execute()
        .data
    )
    if not row:
        return jsonify({"error": "Habit not found"}), 404

    today = date.today().isoformat()
    existing = (
        supabase.table("habit_logs")
        .select("*")
        .eq("habit_id", habit_id)
        .eq("date", today)
        .execute()
        .data
    )

    if existing:
        # Toggle
        new_state = not existing[0]["completed"]
        supabase.table("habit_logs").update({"completed": new_state}).eq("id", existing[0]["id"]).execute()
        completed = new_state
    else:
        supabase.table("habit_logs").insert({"habit_id": habit_id, "date": today, "completed": True}).execute()
        completed = True

    return jsonify({"habit_id": habit_id, "date": today, "completed": completed}), 200


@app.route("/habits/<habit_id>/streak", methods=["GET"])
@require_auth
def get_streak(habit_id):
    # Verify ownership
    row = (
        supabase.table("habits")
        .select("id, name")
        .eq("id", habit_id)
        .eq("user_id", request.user_id)
        .execute()
        .data
    )
    if not row:
        return jsonify({"error": "Habit not found"}), 404

    logs = (
        supabase.table("habit_logs")
        .select("date, completed")
        .eq("habit_id", habit_id)
        .eq("completed", True)
        .order("date", desc=True)
        .execute()
        .data
    )

    streak = 0
    if logs:
        from datetime import timedelta, date as date_type
        check_date = date_type.today()
        completed_dates = {entry["date"] for entry in logs}
        while check_date.isoformat() in completed_dates:
            streak += 1
            check_date -= timedelta(days=1)

    return jsonify({"habit_id": habit_id, "name": row[0]["name"], "streak": streak}), 200


@app.route("/habits/<habit_id>", methods=["DELETE"])
@require_auth
def delete_habit(habit_id):
    row = (
        supabase.table("habits")
        .select("id")
        .eq("id", habit_id)
        .eq("user_id", request.user_id)
        .execute()
        .data
    )
    if not row:
        return jsonify({"error": "Habit not found"}), 404

    supabase.table("habit_logs").delete().eq("habit_id", habit_id).execute()
    supabase.table("habits").delete().eq("id", habit_id).execute()
    return jsonify({"message": "Habit deleted"}), 200


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
