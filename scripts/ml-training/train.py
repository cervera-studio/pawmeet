"""
PawMeet ML Training Script
Trains a LightGBM regressor on match outcome data and exports to ONNX for serving.
Runs in an isolated Fly Machine — not part of the Node.js monorepo.
"""

import json
import os
import sys
from datetime import datetime, timezone

import boto3
import lightgbm as lgb
import numpy as np
import onnxmltools
import pandas as pd
import psycopg2
from lightgbm import LGBMRegressor
from onnxmltools.convert.lightgbm.operator_converters.LightGbm import convert_lightgbm
from sklearn.metrics import mean_squared_error, roc_auc_score
from sklearn.model_selection import train_test_split

# ── Feature schema ───────────────────────────────────────────────────────────

FEATURE_COLUMNS = [
    "compatibilityScore",
    "sizeScore",
    "energyScore",
    "behaviorScore",
    "walkScore",
    "distanceScore",
    "leashScore",
    "overallScore",
]

MIN_SAMPLES = 100


def log(msg: str) -> None:
    print(f"[{datetime.now(timezone.utc).isoformat()}] {msg}", flush=True)


def get_env(name: str, default: str | None = None) -> str:
    value = os.environ.get(name, default)
    if value is None:
        log(f"ERROR: Missing required env var: {name}")
        sys.exit(1)
    return value


# ── 1. Fetch training data ──────────────────────────────────────────────────


def fetch_samples(database_url: str) -> pd.DataFrame:
    log("Connecting to database...")
    conn = psycopg2.connect(database_url)
    try:
        query = """
            SELECT feature_vector, outcome_label
            FROM ml_training_samples
            ORDER BY matured_at DESC
        """
        df = pd.read_sql(query, conn)
    finally:
        conn.close()

    log(f"Fetched {len(df)} samples from ml_training_samples")

    if len(df) < MIN_SAMPLES:
        log(f"ERROR: Need at least {MIN_SAMPLES} samples, got {len(df)}")
        sys.exit(1)

    return df


# ── 2. Parse features ───────────────────────────────────────────────────────


def parse_features(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    log("Parsing feature vectors...")

    rows = []
    for _, row in df.iterrows():
        fv = row["feature_vector"]
        if isinstance(fv, str):
            fv = json.loads(fv)
        rows.append([fv.get(col) for col in FEATURE_COLUMNS])

    X = np.array(rows, dtype=np.float32)
    y = df["outcome_label"].values.astype(np.float32)

    # Replace None/NaN with column medians
    for col_idx in range(X.shape[1]):
        col = X[:, col_idx]
        mask = np.isnan(col)
        if mask.any():
            median = np.nanmedian(col)
            col[mask] = median

    log(f"Feature matrix shape: {X.shape}, labels shape: {y.shape}")
    return X, y


# ── 3. Train model ──────────────────────────────────────────────────────────


def train_model(
    X_train: np.ndarray, y_train: np.ndarray
) -> LGBMRegressor:
    log("Training LightGBM regressor...")

    params = {
        "objective": "regression",
        "metric": "rmse",
        "num_leaves": 31,
        "learning_rate": 0.05,
        "n_estimators": 200,
        "min_child_samples": 20,
        "reg_alpha": 0.1,
        "reg_lambda": 0.1,
        "subsample": 0.8,
        "verbose": -1,
    }

    model = LGBMRegressor(**params)
    model.fit(X_train, y_train)

    log("Training complete")
    return model


# ── 4. Evaluate ─────────────────────────────────────────────────────────────


def evaluate(
    model: LGBMRegressor,
    X_test: np.ndarray,
    y_test: np.ndarray,
) -> dict:
    log("Evaluating model...")

    y_pred = model.predict(X_test)

    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))

    # AUC-ROC: binarize at 0.5 threshold
    y_binary = (y_test > 0.5).astype(int)
    unique_classes = np.unique(y_binary)

    auc_roc = None
    if len(unique_classes) == 2:
        auc_roc = float(roc_auc_score(y_binary, y_pred))
    else:
        log("WARNING: Only one class in test set, skipping AUC-ROC")

    # Feature importance
    importance = dict(zip(FEATURE_COLUMNS, model.feature_importances_.tolist()))

    metrics = {
        "rmse": round(rmse, 6),
        "auc_roc": round(auc_roc, 6) if auc_roc is not None else None,
        "test_samples": len(y_test),
        "feature_importance": importance,
    }

    log(f"  RMSE: {metrics['rmse']}")
    log(f"  AUC-ROC: {metrics['auc_roc']}")
    log(f"  Feature importance: {json.dumps(importance, indent=2)}")

    return metrics


# ── 5. Export to ONNX ────────────────────────────────────────────────────────


def export_onnx(model: LGBMRegressor) -> bytes:
    log("Exporting model to ONNX...")

    from skl2onnx.common.data_types import FloatTensorType

    initial_type = [("features", FloatTensorType([None, len(FEATURE_COLUMNS)]))]
    onnx_model = onnxmltools.convert_lightgbm(model, initial_types=initial_type)

    return onnx_model.SerializeToString()


# ── 6. Upload to R2 ─────────────────────────────────────────────────────────


def upload_to_r2(
    onnx_bytes: bytes,
    feature_schema: dict,
    metrics: dict,
    version: str,
) -> str:
    log(f"Uploading model artifacts to R2 (version: {version})...")

    s3 = boto3.client(
        "s3",
        endpoint_url=get_env("R2_ENDPOINT"),
        aws_access_key_id=get_env("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=get_env("R2_SECRET_ACCESS_KEY"),
        region_name="auto",
    )

    bucket = get_env("R2_BUCKET", "pawmeet-storage")
    base_path = f"models/matching/{version}"

    s3.put_object(
        Bucket=bucket,
        Key=f"{base_path}/model.onnx",
        Body=onnx_bytes,
        ContentType="application/octet-stream",
    )

    s3.put_object(
        Bucket=bucket,
        Key=f"{base_path}/feature_schema.json",
        Body=json.dumps(feature_schema, indent=2).encode(),
        ContentType="application/json",
    )

    s3.put_object(
        Bucket=bucket,
        Key=f"{base_path}/metrics.json",
        Body=json.dumps(metrics, indent=2).encode(),
        ContentType="application/json",
    )

    r2_path = f"{base_path}/model.onnx"
    log(f"Uploaded to {bucket}/{base_path}/")
    return r2_path


# ── 7. Register in DB ───────────────────────────────────────────────────────


def register_model(
    database_url: str,
    version: str,
    r2_path: str,
    training_samples_count: int,
    metrics: dict,
    feature_schema: dict,
    hyperparameters: dict,
) -> None:
    log("Registering model in ml_model_registry...")

    conn = psycopg2.connect(database_url)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ml_model_registry
                    (version, r2_path, training_samples_count, metrics,
                     feature_schema, hyperparameters, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, false)
                """,
                (
                    version,
                    r2_path,
                    training_samples_count,
                    json.dumps(metrics),
                    json.dumps(feature_schema),
                    json.dumps(hyperparameters),
                ),
            )
            conn.commit()
    finally:
        conn.close()

    log(f"Model {version} registered (is_active=false — promote via admin)")


# ── 8. Auto-increment version ───────────────────────────────────────────────


def resolve_version(database_url: str) -> str:
    env_version = os.environ.get("MODEL_VERSION")
    if env_version:
        return env_version

    log("MODEL_VERSION not set, auto-incrementing from registry...")

    conn = psycopg2.connect(database_url)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT version FROM ml_model_registry ORDER BY created_at DESC LIMIT 1"
            )
            row = cur.fetchone()
    finally:
        conn.close()

    if row is None:
        return "v1.0.0"

    last = row[0]  # e.g. "v1.2.3"
    try:
        parts = last.lstrip("v").split(".")
        major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])
        return f"v{major}.{minor}.{patch + 1}"
    except (IndexError, ValueError):
        return "v1.0.0"


# ── Main ─────────────────────────────────────────────────────────────────────


def main() -> None:
    log("=== PawMeet ML Training Pipeline ===")

    database_url = get_env("DATABASE_URL")
    version = resolve_version(database_url)
    log(f"Model version: {version}")

    # Fetch and parse
    df = fetch_samples(database_url)
    X, y = parse_features(df)

    # Split
    stratify_bins = (y > 0.5).astype(int)
    unique_classes = np.unique(stratify_bins)

    stratify = stratify_bins if len(unique_classes) >= 2 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=stratify
    )
    log(f"Train: {len(X_train)}, Test: {len(X_test)}")

    # Train
    hyperparameters = {
        "objective": "regression",
        "metric": "rmse",
        "num_leaves": 31,
        "learning_rate": 0.05,
        "n_estimators": 200,
        "min_child_samples": 20,
        "reg_alpha": 0.1,
        "reg_lambda": 0.1,
        "subsample": 0.8,
    }
    model = train_model(X_train, y_train)

    # Evaluate
    metrics = evaluate(model, X_test, y_test)

    # Feature schema
    feature_schema = {
        "version": version,
        "features": [
            {"name": col, "type": "float32", "index": i}
            for i, col in enumerate(FEATURE_COLUMNS)
        ],
        "output": {"name": "outcome_score", "type": "float32"},
    }

    # Export ONNX
    onnx_bytes = export_onnx(model)
    log(f"ONNX model size: {len(onnx_bytes)} bytes")

    # Upload to R2
    r2_path = upload_to_r2(onnx_bytes, feature_schema, metrics, version)

    # Register in DB
    register_model(
        database_url=database_url,
        version=version,
        r2_path=r2_path,
        training_samples_count=len(df),
        metrics=metrics,
        feature_schema=feature_schema,
        hyperparameters=hyperparameters,
    )

    # Summary
    log("=== Training Complete ===")
    log(f"  Version:    {version}")
    log(f"  Samples:    {len(df)} ({len(X_train)} train / {len(X_test)} test)")
    log(f"  RMSE:       {metrics['rmse']}")
    log(f"  AUC-ROC:    {metrics['auc_roc']}")
    log(f"  ONNX size:  {len(onnx_bytes)} bytes")
    log(f"  R2 path:    {r2_path}")
    log(f"  Status:     registered (is_active=false)")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log(f"FATAL: {e}")
        sys.exit(1)
