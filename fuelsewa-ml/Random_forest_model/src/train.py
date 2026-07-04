import sys, json, os, warnings
warnings.filterwarnings("ignore")

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score, confusion_matrix, classification_report
from sklearn.preprocessing import StandardScaler
import joblib

from plot_utils import generate_heatmap, generate_feature_importance, save_confusion_matrix_to_file

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(DATA_DIR, "model")
SRC_DIR = os.path.join(BASE_DIR, "src")

CSV_PATH = os.path.join(DATA_DIR, "fuelsewa_synthetic_orders.csv")
NEW_DATA_PATH = os.path.join(DATA_DIR, "new_order_outcomes.csv")
MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")
PREPROCESSOR_PATH = os.path.join(MODEL_DIR, "preprocessor.pkl")
METRICS_PATH = os.path.join(SRC_DIR, "metrics.json")
BEST_SCORE_PATH = os.path.join(MODEL_DIR, "best_score.txt")
CLASSIFICATION_REPORT_PATH = os.path.join(MODEL_DIR, "classification_report.txt")
CONFUSION_MATRIX_PATH = os.path.join(MODEL_DIR, "confusion_matrix.png")
AUTO_RETRAIN_THRESHOLD = 5

def extract_hour(ts: str) -> float:
    return float(ts.split("T")[1].split(":")[0])

def extract_dow(ts: str) -> float:
    from datetime import datetime
    parts = ts.split("T")[0].split("-")
    y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
    return float(datetime(y, m, d).weekday())

def load_all_data():
    original = pd.read_csv(CSV_PATH)
    if os.path.exists(NEW_DATA_PATH) and os.path.getsize(NEW_DATA_PATH) > 0:
        new_data = pd.read_csv(NEW_DATA_PATH)
        combined = pd.concat([original, new_data], ignore_index=True)
        return combined, len(new_data)
    return original, 0

def train_model(csv_path: str = None):
    if csv_path is None:
        df, new_count = load_all_data()
    else:
        df = pd.read_csv(csv_path)
        new_count = 0

    df["target"] = (df["status"] == "cancelled").astype(int)

    for col in ["isEmergency", "isFarZone"]:
        df[col] = df[col].astype(float)

    cat_map = {
        "fuelType": {"petrol": 0.0, "diesel": 1.0},
        "requestSource": {"home": 0.0, "office": 1.0, "other": 2.0, "roadside": 3.0},
        "priority": {"normal": 0.0, "high": 1.0},
    }
    for col, mapping in cat_map.items():
        df[col] = df[col].fillna("unknown").astype(str).str.strip().map(mapping).fillna(-1.0)

    df["hour_of_day"] = df["createdAt"].apply(extract_hour)
    df["day_of_week"] = df["createdAt"].apply(extract_dow)
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(float)

    feature_cols = [
        "quantity", "pricing_totalPrice", "pricing_deliveryFee",
        "pricing_emergencyFee", "estimatedDeliveryMinutes", "distance_km",
        "hour_of_day", "day_of_week", "is_weekend",
        "isEmergency", "isFarZone",
        "fuelType", "requestSource", "priority",
    ]

    X = df[feature_cols].values.astype(np.float64)
    y = df["target"].values.astype(np.int32)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=1,
    )
    model.fit(X_train_s, y_train)

    y_pred = model.predict(X_test_s)
    f1 = f1_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred).tolist()
    report_dict = classification_report(y_test, y_pred, output_dict=True, target_names=["delivered", "cancelled"])
    report_text = classification_report(y_test, y_pred, target_names=["delivered", "cancelled"])

    accuracy = (y_test == y_pred).mean()

    importances = model.feature_importances_.tolist()

    heatmap_b64 = generate_heatmap(cm, ["Delivered", "Cancelled"])
    importance_b64 = generate_feature_importance(feature_cols, importances)

    prep = {"feature_cols": feature_cols, "scaler": scaler}
    joblib.dump(prep, PREPROCESSOR_PATH)
    joblib.dump(model, MODEL_PATH)

    save_confusion_matrix_to_file(cm, ["Delivered", "Cancelled"], CONFUSION_MATRIX_PATH)
    with open(BEST_SCORE_PATH, "w") as f:
        f.write(f"F1 Score: {f1:.4f}\nAccuracy: {accuracy:.4f}\n")
    with open(CLASSIFICATION_REPORT_PATH, "w") as f:
        f.write(report_text)

    metrics = {
        "f1_score": round(f1, 4),
        "confusion_matrix": cm,
        "classification_report": report_dict,
        "heatmap": heatmap_b64,
        "feature_importance": importance_b64,
        "feature_importance_data": list(zip(feature_cols, [round(v, 4) for v in importances])),
        "n_samples": len(df),
        "n_cancelled": int(df["target"].sum()),
        "new_samples": new_count,
    }

    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f)

    return metrics

def load_metrics():
    if os.path.exists(METRICS_PATH):
        with open(METRICS_PATH, "r") as f:
            return json.load(f)
    return None

def record_outcome(data: dict):
    import csv
    from datetime import datetime

    now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    status = "cancelled" if data.get("target", 0) == 1 else "delivered"

    row = {
        "order_id": data.get("orderId", ""),
        "userId": data.get("userId", ""),
        "fuelType": data.get("fuelType", "petrol"),
        "quantity": data.get("quantity", 0),
        "deliveryLocation_latitude": data.get("lat", 0),
        "deliveryLocation_longitude": data.get("lng", 0),
        "deliveryLocation_address": data.get("address", ""),
        "requestSource": data.get("requestSource", "home"),
        "pricing_pricePerLiter": data.get("pricePerLiter", 0),
        "pricing_fuelCost": data.get("fuelCost", 0),
        "pricing_deliveryFee": data.get("deliveryFee", 0),
        "pricing_emergencyFee": data.get("emergencyFee", 0),
        "pricing_totalPrice": data.get("totalPrice", 0),
        "status": status,
        "priority": data.get("priority", "normal"),
        "isEmergency": str(data.get("isEmergency", False)),
        "isFarZone": str(data.get("isFarZone", False)),
        "cancelReason": data.get("cancelReason", ""),
        "estimatedDeliveryMinutes": data.get("estimatedDeliveryMinutes", 0),
        "distance_km": data.get("distance_km", 0),
        "createdAt": now,
    }

    write_header = not (os.path.exists(NEW_DATA_PATH) and os.path.getsize(NEW_DATA_PATH) > 0)
    with open(NEW_DATA_PATH, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(row.keys()))
        if write_header:
            writer.writeheader()
        writer.writerow(row)

    if os.path.exists(NEW_DATA_PATH):
        with open(NEW_DATA_PATH, "r") as f:
            n = sum(1 for _ in f) - 1
        if n >= AUTO_RETRAIN_THRESHOLD:
            train_model()
            return {"recorded": True, "auto_retrained": True, "new_count": n}
    return {"recorded": True, "auto_retrained": False, "new_count": n}

def get_new_data_count():
    if not os.path.exists(NEW_DATA_PATH):
        return 0
    with open(NEW_DATA_PATH, "r") as f:
        return max(0, sum(1 for _ in f) - 1)

if __name__ == "__main__":
    result = train_model()
    print(json.dumps(result, indent=2))
