import os, warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS

from train import (
    train_model, MODEL_PATH, PREPROCESSOR_PATH,
    load_metrics, record_outcome, get_new_data_count, NEW_DATA_PATH,
    load_training_history,
)

app = Flask(__name__)
CORS(app)

def get_risk_tag(prob: float) -> str:
    if prob < 0.2:
        return "Low"
    elif prob < 0.4:
        return "Medium"
    elif prob < 0.6:
        return "High"
    return "Very High"

cat_encode = {
    "fuelType": {"petrol": 0.0, "diesel": 1.0},
    "requestSource": {"home": 0.0, "office": 1.0, "other": 2.0, "roadside": 3.0},
    "priority": {"normal": 0.0, "high": 1.0},
}
feature_cols = [
    "quantity", "pricing_totalPrice", "pricing_deliveryFee",
    "pricing_emergencyFee", "estimatedDeliveryMinutes", "distance_km",
    "hour_of_day", "day_of_week", "is_weekend",
    "isEmergency", "isFarZone",
    "fuelType", "requestSource", "priority",
    "cost_per_km", "delivery_fee_ratio", "is_night", "quantity_x_distance",
    "is_peak_hour", "is_late_night",
    "past_orders", "past_cancellations", "past_cancellation_rate",
]

def build_input_array(data: dict) -> np.ndarray:
    row = []
    hour = float(data.get("hour_of_day", 0))
    qty = float(data.get("quantity", 0))
    dist = float(data.get("distance_km", 0))
    total = float(data.get("totalPrice", 0))
    fee = float(data.get("deliveryFee", 0))
    p_orders = int(data.get("pastOrders", 0))
    p_cancels = int(data.get("pastCancellations", 0))
    for col in feature_cols:
        if col in cat_encode:
            val = cat_encode[col].get(str(data.get(col, "unknown")).strip(), -1.0)
        elif col in ("isEmergency", "isFarZone"):
            val = float(bool(data.get(col, False)))
        elif col in ("is_weekend",):
            val = float(bool(data.get(col, False)))
        elif col == "cost_per_km":
            val = total / dist if dist > 0 else 0.0
        elif col == "delivery_fee_ratio":
            val = fee / total if total > 0 else 0.0
        elif col == "is_night":
            val = 1.0 if (hour < 6 or hour > 22) else 0.0
        elif col == "quantity_x_distance":
            val = qty * dist
        elif col == "is_peak_hour":
            val = 1.0 if (7 <= hour < 9) or (17 <= hour < 19) else 0.0
        elif col == "is_late_night":
            val = 1.0 if hour < 5 else 0.0
        elif col == "past_orders":
            val = float(p_orders)
        elif col == "past_cancellations":
            val = float(p_cancels)
        elif col == "past_cancellation_rate":
            val = float(p_cancels / p_orders) if p_orders > 0 else 0.0
        else:
            val = float(data.get(col, 0.0))
        row.append(val)
    return np.array([row], dtype=np.float64)

def load_model_and_prep():
    if not os.path.exists(MODEL_PATH) or not os.path.exists(PREPROCESSOR_PATH):
        return None, None
    model = joblib.load(MODEL_PATH)
    prep = joblib.load(PREPROCESSOR_PATH)
    return model, prep

@app.route("/train", methods=["POST"])
def train():
    try:
        result = train_model()
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/metrics", methods=["GET"])
def metrics():
    try:
        saved = load_metrics()
        if saved:
            return jsonify({"success": True, "data": saved})
        result = train_model()
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No JSON body"}), 400

        model, prep = load_model_and_prep()
        if model is None:
            return jsonify({"success": False, "error": "Model not trained yet. Call POST /train first."}), 503

        scaler = prep["scaler"]
        input_array = build_input_array(data)
        input_scaled = scaler.transform(input_array)

        prob = model.predict_proba(input_scaled)[0][1]
        probability = round(float(prob) * 100, 1)
        riskTag = get_risk_tag(prob)

        return jsonify({"probability": probability, "riskTag": riskTag})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/record-outcome", methods=["POST"])
def record():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No JSON body"}), 400
        result = record_outcome(data)
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/training-stats", methods=["GET"])
def training_stats():
    try:
        new_count = get_new_data_count()
        metrics_data = load_metrics()
        return jsonify({
            "success": True,
            "data": {
                "new_samples": new_count,
                "auto_retrain_threshold": 20,
                "model_trained": os.path.exists(MODEL_PATH),
                "last_metrics": metrics_data,
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/training-history", methods=["GET"])
def training_history():
    try:
        history = load_training_history()
        return jsonify({"success": True, "data": history})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    model_exists = os.path.exists(MODEL_PATH)
    return jsonify({"status": "ok", "model_trained": model_exists})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8001, debug=False)
