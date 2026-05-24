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
        # Set the user JWT directly on the PostgREST client so auth.uid()
        # works in RLS policies.
        supabase.postgrest.auth(token)
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
        .insert({
            "user_id": request.user_id,
            "name": name,
            "emoji": data.get("emoji", "✅"),
            "bio_age_field": data.get("bio_age_field"),
            "bio_age_inverse": bool(data.get("bio_age_inverse", False)),
        })
        .execute()
        .data[0]
    )
    habit["completed_today"] = False
    return jsonify(habit), 201


@app.route("/habits/<habit_id>/check", methods=["POST"])
@require_auth
def check_habit(habit_id):
    row = (
        supabase.table("habits")
        .select("id, bio_age_field, bio_age_inverse")
        .eq("id", habit_id)
        .eq("user_id", request.user_id)
        .execute()
        .data
    )
    if not row:
        return jsonify({"error": "Habit not found"}), 404

    habit_meta = row[0]
    today = date.today().isoformat()
    body = request.get_json(silent=True) or {}
    duration_minutes = body.get("duration_minutes")
    notes = body.get("notes")

    existing = (
        supabase.table("habit_logs")
        .select("*")
        .eq("habit_id", habit_id)
        .eq("date", today)
        .execute()
        .data
    )

    if existing:
        new_state = not existing[0]["completed"]
        upd = {"completed": new_state}
        if duration_minutes is not None:
            upd["duration_minutes"] = duration_minutes if new_state else None
        if notes is not None:
            upd["notes"] = notes
        supabase.table("habit_logs").update(upd).eq("id", existing[0]["id"]).execute()
        completed = new_state
    else:
        ins = {"habit_id": habit_id, "date": today, "completed": True}
        if duration_minutes is not None:
            ins["duration_minutes"] = duration_minutes
        if notes is not None:
            ins["notes"] = notes
        supabase.table("habit_logs").insert(ins).execute()
        completed = True

    # Auto-sync to daily_inputs so bio age updates automatically
    bio_field = habit_meta.get("bio_age_field")
    if bio_field:
        is_inverse = bool(habit_meta.get("bio_age_inverse", False))
        field_value = (not completed) if is_inverse else completed
        di = (
            supabase.table("daily_inputs")
            .select("id")
            .eq("user_id", request.user_id)
            .eq("date", today)
            .execute()
            .data
        )
        if di:
            supabase.table("daily_inputs").update({bio_field: field_value}).eq("id", di[0]["id"]).execute()
        else:
            supabase.table("daily_inputs").insert({
                "user_id": request.user_id, "date": today, bio_field: field_value,
            }).execute()

    return jsonify({"habit_id": habit_id, "date": today, "completed": completed}), 200


@app.route("/habits/<habit_id>/stats", methods=["GET"])
@require_auth
def get_habit_stats(habit_id):
    row = (
        supabase.table("habits")
        .select("id, name, emoji")
        .eq("id", habit_id)
        .eq("user_id", request.user_id)
        .execute()
        .data
    )
    if not row:
        return jsonify({"error": "Habit not found"}), 404

    logs = (
        supabase.table("habit_logs")
        .select("date, completed, duration_minutes")
        .eq("habit_id", habit_id)
        .eq("completed", True)
        .order("date", desc=True)
        .limit(30)
        .execute()
        .data
    )

    total_completions = len(logs)
    total_minutes = sum(l["duration_minutes"] or 0 for l in logs)

    from datetime import timedelta, date as date_type
    streak = 0
    check_date = date_type.today()
    completed_dates = {l["date"] for l in logs}
    while check_date.isoformat() in completed_dates:
        streak += 1
        check_date -= timedelta(days=1)

    return jsonify({
        "habit_id": habit_id,
        "name": row[0]["name"],
        "emoji": row[0].get("emoji", "✅"),
        "streak": streak,
        "total_completions": total_completions,
        "total_minutes": total_minutes,
        "recent_logs": logs[:14],
    }), 200


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
# Profile endpoints
# ---------------------------------------------------------------------------

@app.route("/profile", methods=["GET"])
@require_auth
def get_profile():
    row = (
        supabase.table("user_profiles")
        .select("*")
        .eq("user_id", request.user_id)
        .execute()
        .data
    )
    if not row:
        return jsonify({"real_age": None, "gender": None}), 200
    return jsonify(row[0]), 200


@app.route("/profile", methods=["POST"])
@require_auth
def save_profile():
    data = request.get_json(silent=True) or {}
    real_age = data.get("real_age")
    try:
        real_age = int(real_age)
    except (TypeError, ValueError):
        real_age = None
    if real_age is None or not (1 <= real_age <= 120):
        return jsonify({"error": "valid real_age (1–120) required"}), 400
    gender = data.get("gender")

    existing = (
        supabase.table("user_profiles")
        .select("user_id")
        .eq("user_id", request.user_id)
        .execute()
        .data
    )
    if existing:
        result = (
            supabase.table("user_profiles")
            .update({"real_age": real_age, "gender": gender})
            .eq("user_id", request.user_id)
            .execute()
        )
    else:
        result = (
            supabase.table("user_profiles")
            .insert({"user_id": request.user_id, "real_age": real_age, "gender": gender})
            .execute()
        )
    return jsonify(result.data[0] if result.data else {}), 200


# ---------------------------------------------------------------------------
# Daily inputs endpoints
# ---------------------------------------------------------------------------

@app.route("/daily-inputs", methods=["GET"])
@require_auth
def get_daily_inputs():
    target_date = request.args.get("date", date.today().isoformat())
    row = (
        supabase.table("daily_inputs")
        .select("*")
        .eq("user_id", request.user_id)
        .eq("date", target_date)
        .execute()
        .data
    )
    if not row:
        return jsonify({
            "date": target_date, "sleep_hours": 7, "coffee_cups": 0,
            "screen_before_bed": False, "alcohol": False, "smoking": False,
            "steps_10k": False, "reading": False, "meditation": False,
            "learning": False, "exercise": False, "stretching": False, "outdoor": False,
        }), 200
    return jsonify(row[0]), 200


@app.route("/daily-inputs/history", methods=["GET"])
@require_auth
def get_daily_inputs_history():
    from datetime import timedelta
    days = int(request.args.get("days", 7))
    start_date = (date.today() - timedelta(days=days)).isoformat()
    rows = (
        supabase.table("daily_inputs")
        .select("*")
        .eq("user_id", request.user_id)
        .gte("date", start_date)
        .order("date")
        .execute()
        .data
    )
    return jsonify(rows), 200


@app.route("/daily-inputs", methods=["POST"])
@require_auth
def save_daily_inputs():
    data = request.get_json(silent=True) or {}
    target_date = data.get("date", date.today().isoformat())
    payload = {
        "user_id": request.user_id,
        "date": target_date,
        "sleep_hours": data.get("sleep_hours", 7),
        "coffee_cups": data.get("coffee_cups", 0),
        "screen_before_bed": bool(data.get("screen_before_bed", False)),
        "alcohol": bool(data.get("alcohol", False)),
        "smoking": bool(data.get("smoking", False)),
        "steps_10k": bool(data.get("steps_10k", False)),
        "reading": bool(data.get("reading", False)),
        "meditation": bool(data.get("meditation", False)),
        "learning": bool(data.get("learning", False)),
        "exercise": bool(data.get("exercise", False)),
        "stretching": bool(data.get("stretching", False)),
        "outdoor": bool(data.get("outdoor", False)),
    }
    existing = (
        supabase.table("daily_inputs")
        .select("id")
        .eq("user_id", request.user_id)
        .eq("date", target_date)
        .execute()
        .data
    )
    if existing:
        result = supabase.table("daily_inputs").update(payload).eq("id", existing[0]["id"]).execute()
    else:
        result = supabase.table("daily_inputs").insert(payload).execute()
    return jsonify(result.data[0] if result.data else payload), 200


# ---------------------------------------------------------------------------
# Bio age snapshot endpoints
# ---------------------------------------------------------------------------

@app.route("/bio-age-snapshots", methods=["GET"])
@require_auth
def get_bio_age_snapshots():
    from datetime import timedelta
    days = int(request.args.get("days", 30))
    start_date = (date.today() - timedelta(days=days)).isoformat()
    rows = (
        supabase.table("bio_age_snapshots")
        .select("*")
        .eq("user_id", request.user_id)
        .gte("date", start_date)
        .order("date")
        .execute()
        .data
    )
    return jsonify(rows), 200


@app.route("/bio-age-snapshots", methods=["POST"])
@require_auth
def save_bio_age_snapshot():
    data = request.get_json(silent=True) or {}
    target_date = data.get("date", date.today().isoformat())
    payload = {
        "user_id": request.user_id,
        "date": target_date,
        "heart_age": data.get("heart_age"),
        "brain_age": data.get("brain_age"),
        "fitness_age": data.get("fitness_age"),
    }
    existing = (
        supabase.table("bio_age_snapshots")
        .select("id")
        .eq("user_id", request.user_id)
        .eq("date", target_date)
        .execute()
        .data
    )
    if existing:
        result = supabase.table("bio_age_snapshots").update(payload).eq("id", existing[0]["id"]).execute()
    else:
        result = supabase.table("bio_age_snapshots").insert(payload).execute()
    return jsonify(result.data[0] if result.data else payload), 200


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
