from flask import Flask, request, jsonify
import mysql.connector
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from datetime import datetime
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import random

app = Flask(__name__)
bcrypt = Bcrypt(app)
CORS(app)

# ============================================
# DATABASE CONNECTION
# ============================================

db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="Root@123",
    database="traffic_system"
)

def get_cursor():
    if not db.is_connected():
        db.reconnect()
    return db.cursor(dictionary=True)

# ============================================
# HOME ROUTE
# ============================================

@app.route("/")
def home():
    return "Traffic Congestion Prediction API 🚦 Running!"

# ============================================
# HELPER FUNCTIONS
# ============================================

def get_congestion_level(vehicle_count, capacity):
    if capacity == 0:
        return "Low"
    ratio = vehicle_count / capacity
    if ratio < 0.5:
        return "Low"
    elif ratio < 0.75:
        return "Medium"
    elif ratio < 0.9:
        return "High"
    else:
        return "Critical"

def get_suggestion(level):
    suggestions = {
        "Low":      "✅ Traffic flowing smoothly! No action needed.",
        "Medium":   "⚠️ Moderate traffic. Consider carpooling or alternate routes.",
        "High":     "🔴 Heavy traffic! Use public transport. Avoid peak hours 8-10 AM and 5-7 PM.",
        "Critical": "🚨 Emergency! Deploy traffic police immediately. Activate alternate route signals!"
    }
    return suggestions.get(level, "No suggestion available")

# ============================================
# AUTH APIS
# ============================================

@app.route("/register", methods=["POST"])
def register():
    try:
        data = request.json
        if not data or not all(k in data for k in ("name","email","password")):
            return jsonify({"error": "Missing fields!"}), 400

        cursor = get_cursor()
        hashed = bcrypt.generate_password_hash(
            data["password"]
        ).decode("utf-8")

        cursor.execute("""
            INSERT INTO users (name, email, password, role)
            VALUES (%s, %s, %s, %s)
        """, (
            data["name"],
            data["email"],
            hashed,
            data.get("role", "admin")
        ))
        db.commit()
        return jsonify({"message": "Registered successfully!"})

    except mysql.connector.IntegrityError:
        return jsonify({"error": "Email already exists!"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.json
        if not data or not all(k in data for k in ("email","password")):
            return jsonify({"error": "Missing fields!"}), 400

        cursor = get_cursor()
        cursor.execute(
            "SELECT * FROM users WHERE email=%s",
            (data["email"],)
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "User not found!"}), 404

        if bcrypt.check_password_hash(user["password"], data["password"]):
            return jsonify({
                "message": "Login successful!",
                "id":      user["id"],
                "name":    user["name"],
                "role":    user["role"]
            })
        else:
            return jsonify({"error": "Invalid password!"}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================
# ROADS APIS
# ============================================

@app.route("/roads", methods=["GET"])
def get_roads():
    cursor = get_cursor()
    cursor.execute("""
        SELECT
            r.*,
            t.vehicle_count,
            t.congestion_level,
            t.weather,
            t.recorded_at
        FROM roads r
        LEFT JOIN traffic_data t ON t.id = (
            SELECT id FROM traffic_data
            WHERE road_id = r.id
            ORDER BY recorded_at DESC
            LIMIT 1
        )
        ORDER BY r.id
    """)
    roads = cursor.fetchall()

    for road in roads:
        if road["congestion_level"]:
            road["suggestion"] = get_suggestion(
                road["congestion_level"]
            )

    return jsonify(roads)


@app.route("/road/add", methods=["POST"])
def add_road():
    try:
        data = request.json
        if not data or not all(k in data for k in
            ("road_name","area","city","capacity")):
            return jsonify({"error": "Missing fields!"}), 400

        cursor = get_cursor()
        cursor.execute("""
            INSERT INTO roads (road_name, area, city, capacity)
            VALUES (%s, %s, %s, %s)
        """, (
            data["road_name"],
            data["area"],
            data["city"],
            data["capacity"]
        ))
        db.commit()
        return jsonify({"message": "Road added successfully!"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================
# TRAFFIC DATA APIS
# ============================================

@app.route("/traffic/add", methods=["POST"])
def add_traffic():
    try:
        data = request.json
        if not data or not all(k in data for k in
            ("road_id","vehicle_count")):
            return jsonify({"error": "Missing fields!"}), 400

        cursor = get_cursor()

        cursor.execute(
            "SELECT capacity FROM roads WHERE id=%s",
            (data["road_id"],)
        )
        road = cursor.fetchone()

        if not road:
            return jsonify({"error": "Road not found!"}), 404

        level = get_congestion_level(
            data["vehicle_count"],
            road["capacity"]
        )

        cursor.execute("""
            INSERT INTO traffic_data
            (road_id, vehicle_count, congestion_level,
             weather, is_holiday, recorded_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            data["road_id"],
            data["vehicle_count"],
            level,
            data.get("weather", "Clear"),
            data.get("is_holiday", False),
            data.get("recorded_at", datetime.now())
        ))
        db.commit()

        return jsonify({
            "message":          "Traffic data added!",
            "congestion_level": level,
            "suggestion":       get_suggestion(level)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/traffic/history", methods=["GET"])
def traffic_history():
    cursor = get_cursor()

    road_id = request.args.get("road_id", "")
    date    = request.args.get("date", "")
    level   = request.args.get("level", "")

    query = """
        SELECT
            t.*,
            r.road_name,
            r.area,
            r.city
        FROM traffic_data t
        JOIN roads r ON t.road_id = r.id
        WHERE 1=1
    """
    params = []

    if road_id:
        query += " AND t.road_id = %s"
        params.append(road_id)
    if date:
        query += " AND DATE(t.recorded_at) = %s"
        params.append(date)
    if level:
        query += " AND t.congestion_level = %s"
        params.append(level)

    query += " ORDER BY t.recorded_at DESC LIMIT 100"

    cursor.execute(query, params)
    return jsonify(cursor.fetchall())

# ============================================
# ML PREDICTION API
# ============================================

@app.route("/predict/<int:road_id>", methods=["GET"])
def predict(road_id):
    cursor = get_cursor()

    hour       = int(request.args.get("hour", datetime.now().hour))
    weather    = request.args.get("weather", "Clear")
    is_holiday = int(request.args.get("is_holiday", 0))

    cursor.execute(
        "SELECT * FROM roads WHERE id=%s", (road_id,)
    )
    road = cursor.fetchone()

    if not road:
        return jsonify({"error": "Road not found!"}), 404

    # Fetch historical data for ML
    cursor.execute("""
        SELECT
            HOUR(recorded_at)      as hour,
            DAYOFWEEK(recorded_at) as day_of_week,
            vehicle_count,
            weather,
            is_holiday,
            congestion_level
        FROM traffic_data
        WHERE road_id = %s
        ORDER BY recorded_at DESC
        LIMIT 200
    """, (road_id,))

    records = cursor.fetchall()

    # Not enough data → rule based
    if len(records) < 10:
        return rule_based_predict(
            road, hour, weather,
            is_holiday, road_id, cursor
        )

    # Convert to DataFrame
    df = pd.DataFrame(records)

    # Encode weather to numbers
    weather_map = {"Clear": 0, "Rain": 1, "Fog": 2}
    df["weather_encoded"] = df["weather"].map(
        weather_map
    ).fillna(0)

    # Encode congestion level to numbers
    level_map = {
        "Low": 0, "Medium": 1,
        "High": 2, "Critical": 3
    }
    df["level_encoded"] = df["congestion_level"].map(level_map)

    # Features and target
    X = df[["hour", "day_of_week",
            "is_holiday", "weather_encoded"]]
    y = df["level_encoded"]

    # Train Random Forest
    model = RandomForestClassifier(
        n_estimators=100,
        random_state=42
    )
    model.fit(X, y)

    # Prepare input
    weather_encoded = weather_map.get(weather, 0)
    day_of_week     = datetime.now().weekday() + 1

    input_data = np.array([[
        hour,
        day_of_week,
        is_holiday,
        weather_encoded
    ]])

    # Predict
    prediction_encoded = model.predict(input_data)[0]

    # Confidence
    probabilities = model.predict_proba(input_data)[0]
    confidence    = round(max(probabilities) * 100, 1)

    # Decode prediction
    reverse_map = {
        0: "Low", 1: "Medium",
        2: "High", 3: "Critical"
    }
    predicted_level = reverse_map[prediction_encoded]

    # Save to database
    cursor.execute("""
        INSERT INTO predictions
        (road_id, predicted_level, confidence,
         hour, weather, is_holiday)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        road_id, predicted_level,
        confidence, hour, weather, is_holiday
    ))
    db.commit()

    return jsonify({
        "road_id":         road_id,
        "road_name":       road["road_name"],
        "hour":            f"{hour}:00",
        "weather":         weather,
        "is_holiday":      bool(is_holiday),
        "predicted_level": predicted_level,
        "confidence":      confidence,
        "suggestion":      get_suggestion(predicted_level)
    })


def rule_based_predict(road, hour, weather,
                        is_holiday, road_id, cursor):
    cursor.execute("""
        SELECT AVG(vehicle_count) as avg
        FROM traffic_data WHERE road_id=%s
    """, (road_id,))

    avg        = cursor.fetchone()["avg"] or road["capacity"] * 0.5
    multiplier = 1.0

    if hour in [8, 9, 10]:
        multiplier += 0.5
    elif hour in [17, 18, 19]:
        multiplier += 0.45
    elif hour in [12, 13]:
        multiplier += 0.2
    elif hour in [0, 1, 2, 3, 4]:
        multiplier -= 0.5

    if weather == "Rain":
        multiplier += 0.3
    elif weather == "Fog":
        multiplier += 0.2

    if is_holiday:
        multiplier -= 0.3

    predicted_vehicles = max(0, int(avg * multiplier))
    predicted_level    = get_congestion_level(
        predicted_vehicles, road["capacity"]
    )
    confidence = round(random.uniform(55, 70), 1)

    cursor.execute("""
        INSERT INTO predictions
        (road_id, predicted_level, confidence,
         hour, weather, is_holiday)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        road_id, predicted_level,
        confidence, hour, weather, is_holiday
    ))
    db.commit()

    return jsonify({
        "road_id":         road_id,
        "road_name":       road["road_name"],
        "hour":            f"{hour}:00",
        "weather":         weather,
        "is_holiday":      bool(is_holiday),
        "predicted_level": predicted_level,
        "confidence":      confidence,
        "suggestion":      get_suggestion(predicted_level),
        "note":            "Rule based prediction used"
    })

# ============================================
# ANALYTICS APIS
# ============================================

@app.route("/analytics/dashboard", methods=["GET"])
def dashboard():
    cursor = get_cursor()

    cursor.execute(
        "SELECT COUNT(*) as total FROM roads"
    )
    total_roads = cursor.fetchone()["total"]

    cursor.execute("""
        SELECT COUNT(*) as critical
        FROM traffic_data t
        WHERE t.id IN (
            SELECT MAX(id)
            FROM traffic_data
            GROUP BY road_id
        )
        AND congestion_level = 'Critical'
    """)
    current_critical = cursor.fetchone()["critical"]

    cursor.execute("""
        SELECT
            HOUR(recorded_at) as hour,
            AVG(vehicle_count) as avg_vehicles
        FROM traffic_data
        WHERE DATE(recorded_at) = CURDATE()
        GROUP BY HOUR(recorded_at)
        ORDER BY avg_vehicles DESC
        LIMIT 1
    """)
    peak      = cursor.fetchone()
    peak_hour = f"{peak['hour']}:00" if peak else "9:00"

    cursor.execute("""
        SELECT congestion_level, COUNT(*) as count
        FROM traffic_data
        WHERE DATE(recorded_at) = CURDATE()
        GROUP BY congestion_level
    """)
    levels = cursor.fetchall()

    today_counts = {
        "Low": 0, "Medium": 0,
        "High": 0, "Critical": 0
    }
    for l in levels:
        today_counts[l["congestion_level"]] = l["count"]

    return jsonify({
        "total_roads":      total_roads,
        "current_critical": current_critical,
        "peak_hour":        peak_hour,
        "today_counts":     today_counts
    })


@app.route("/analytics/roadwise", methods=["GET"])
def roadwise():
    cursor = get_cursor()

    cursor.execute("""
        SELECT
            r.road_name,
            r.area,
            r.capacity,
            ROUND(AVG(t.vehicle_count), 0) as avg_vehicles,
            ROUND(
                (AVG(t.vehicle_count) / r.capacity) * 100,
                1
            ) as usage_percent
        FROM traffic_data t
        JOIN roads r ON t.road_id = r.id
        GROUP BY r.id, r.road_name, r.area, r.capacity
        ORDER BY avg_vehicles DESC
    """)

    roads = cursor.fetchall()
    for road in roads:
        road["congestion_level"] = get_congestion_level(
            road["avg_vehicles"], road["capacity"]
        )
    return jsonify(roads)


@app.route("/analytics/hourly", methods=["GET"])
def hourly():
    cursor = get_cursor()
    road_id = request.args.get("road_id", "")

    if road_id:
        cursor.execute("""
            SELECT
                HOUR(recorded_at) as hour,
                ROUND(AVG(vehicle_count), 0) as avg_vehicles
            FROM traffic_data
            WHERE road_id = %s
            GROUP BY HOUR(recorded_at)
            ORDER BY hour
        """, (road_id,))
    else:
        cursor.execute("""
            SELECT
                HOUR(recorded_at) as hour,
                ROUND(AVG(vehicle_count), 0) as avg_vehicles
            FROM traffic_data
            GROUP BY HOUR(recorded_at)
            ORDER BY hour
        """)

    data = cursor.fetchall()
    for row in data:
        row["hour_label"] = f"{row['hour']}:00"
    return jsonify(data)


@app.route("/analytics/trend", methods=["GET"])
def trend():
    cursor = get_cursor()

    cursor.execute("""
        SELECT
            DATE(recorded_at) as date,
            ROUND(AVG(vehicle_count), 0) as avg_vehicles,
            COUNT(*) as total_records
        FROM traffic_data
        GROUP BY DATE(recorded_at)
        ORDER BY date ASC
        LIMIT 30
    """)
    return jsonify(cursor.fetchall())


@app.route("/analytics/heatmap", methods=["GET"])
def heatmap():
    cursor = get_cursor()

    cursor.execute("""
        SELECT
            HOUR(recorded_at) as hour,
            DAYNAME(recorded_at) as day_name,
            DAYOFWEEK(recorded_at) as day_num,
            ROUND(AVG(vehicle_count), 0) as avg_vehicles
        FROM traffic_data
        GROUP BY
            HOUR(recorded_at),
            DAYNAME(recorded_at),
            DAYOFWEEK(recorded_at)
        ORDER BY day_num, hour
    """)
    return jsonify(cursor.fetchall())


@app.route("/analytics/alerts", methods=["GET"])
def alerts():
    cursor = get_cursor()

    cursor.execute("""
        SELECT
            t.id,
            r.road_name,
            r.area,
            r.city,
            t.vehicle_count,
            t.congestion_level,
            t.weather,
            t.recorded_at,
            r.capacity
        FROM traffic_data t
        JOIN roads r ON t.road_id = r.id
        WHERE t.id IN (
            SELECT MAX(id)
            FROM traffic_data
            GROUP BY road_id
        )
        AND t.congestion_level IN ('Critical','High')
        ORDER BY t.vehicle_count DESC
    """)

    alerts_data = cursor.fetchall()
    for alert in alerts_data:
        alert["suggestion"] = get_suggestion(
            alert["congestion_level"]
        )
    return jsonify(alerts_data)


@app.route("/analytics/compare", methods=["GET"])
def compare():
    cursor = get_cursor()

    road1_id = request.args.get("road1")
    road2_id = request.args.get("road2")

    if not road1_id or not road2_id:
        return jsonify({"error": "Provide road1 and road2!"}), 400

    def get_road_data(rid):
        cursor.execute(
            "SELECT * FROM roads WHERE id=%s", (rid,)
        )
        road = cursor.fetchone()

        cursor.execute("""
            SELECT
                HOUR(recorded_at) as hour,
                ROUND(AVG(vehicle_count), 0) as avg_vehicles
            FROM traffic_data
            WHERE road_id = %s
            GROUP BY HOUR(recorded_at)
            ORDER BY hour
        """, (rid,))
        hourly = cursor.fetchall()

        cursor.execute("""
            SELECT
                ROUND(AVG(vehicle_count), 0) as avg_vehicles,
                MAX(vehicle_count) as max_vehicles,
                MIN(vehicle_count) as min_vehicles,
                COUNT(*) as total_records
            FROM traffic_data
            WHERE road_id = %s
        """, (rid,))
        stats = cursor.fetchone()

        return {
            "road":   road,
            "hourly": hourly,
            "stats":  stats
        }

    return jsonify({
        "road1": get_road_data(road1_id),
        "road2": get_road_data(road2_id)
    })

# ============================================
# RUN APP
# ============================================

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
