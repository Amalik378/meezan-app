"""
Shariah Compliance Classifier — XGBoost Training Script

Dataset (app/ml/training_data.csv):
  - 110+ real companies labelled against DJIM / MSCI Islamic Index criteria
  - Positive (compliant, label=1): tech, pharma, healthcare, logistics, EVs
  - Negative (non-compliant, label=0): banking, insurance, alcohol, tobacco,
    gambling, defence, companies with excessive debt ratios

Features:
  debt_to_assets      AAOIFI threshold: < 0.33
  interest_to_revenue AAOIFI threshold: < 0.05
  receivables_to_assets AAOIFI threshold: < 0.49
  sector_is_haram     Binary flag from business-activity screen

Note: Pipeline is intentionally avoided — XGBoost 2.1.x + sklearn 1.6.x have
a tag-API incompatibility that breaks Pipeline.check_is_fitted.  We use a
lightweight ScaledXGB wrapper instead, which is fully compatible with the
screening service (same .predict_proba() interface).

Usage:
  # Use the built-in labelled dataset (recommended):
  python -m app.ml.train

  # Or provide your own CSV:
  python -m app.ml.train path/to/custom_data.csv

Output: app/ml/shariah_classifier.pkl
"""

import logging
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, f1_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

# Import from app.ml.model so pickle always stores the canonical module path
# (app.ml.model.ScaledXGB), not __main__.ScaledXGB which would break loading
# from screening_service or any other entry point.
from app.ml.model import ScaledXGB  # noqa: F401 — re-exported for pickle compat

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parent / "shariah_classifier.pkl"
DEFAULT_DATA_PATH = Path(__file__).parent / "training_data.csv"

FEATURE_COLS = [
    "debt_to_assets",
    "interest_to_revenue",
    "receivables_to_assets",
    "sector_is_haram",
]
LABEL_COL = "label"


def load_training_data(csv_path: Path) -> tuple[np.ndarray, np.ndarray]:
    """Load and validate training data from CSV."""
    df = pd.read_csv(csv_path)

    missing = [c for c in FEATURE_COLS + [LABEL_COL] if c not in df.columns]
    if missing:
        raise ValueError(f"CSV is missing required columns: {missing}")

    df[FEATURE_COLS] = df[FEATURE_COLS].clip(lower=0).fillna(df[FEATURE_COLS].median())
    X = df[FEATURE_COLS].values.astype(np.float32)
    y = df[LABEL_COL].values.astype(np.int32)

    logger.info(
        "Loaded %d samples — %d compliant (%.0f%%), %d non-compliant (%.0f%%)",
        len(y),
        y.sum(), y.mean() * 100,
        (~y.astype(bool)).sum(), (1 - y.mean()) * 100,
    )
    return X, y


def _make_clf() -> XGBClassifier:
    return XGBClassifier(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.04,
        subsample=0.85,
        colsample_bytree=0.85,
        min_child_weight=3,
        gamma=0.1,
        reg_alpha=0.05,
        reg_lambda=1.0,
        eval_metric="logloss",
        random_state=42,
        verbosity=0,
    )


def _fit_model(X: np.ndarray, y: np.ndarray) -> ScaledXGB:
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    clf = _make_clf()
    clf.fit(X_scaled, y)
    return ScaledXGB(scaler, clf)


def train(csv_path: Path | None = None) -> None:
    data_path = csv_path or DEFAULT_DATA_PATH
    logger.info("Loading training data from %s", data_path)

    X, y = load_training_data(data_path)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # ── Cross-validation (manual fold loop — avoids Pipeline/sklearn tag bug) ─
    logger.info("Running 5-fold stratified cross-validation…")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_auc_scores, cv_f1_scores = [], []
    for fold_train_idx, fold_val_idx in cv.split(X_train, y_train):
        fold_model = _fit_model(X_train[fold_train_idx], y_train[fold_train_idx])
        fold_proba = fold_model.predict_proba(X_train[fold_val_idx])[:, 1]
        fold_pred  = fold_model.predict(X_train[fold_val_idx])
        cv_auc_scores.append(roc_auc_score(y_train[fold_val_idx], fold_proba))
        cv_f1_scores.append(f1_score(y_train[fold_val_idx], fold_pred, zero_division=0))

    cv_auc = np.array(cv_auc_scores)
    cv_f1  = np.array(cv_f1_scores)
    logger.info("  ROC-AUC : %.3f ± %.3f", cv_auc.mean(), cv_auc.std())
    logger.info("  F1      : %.3f ± %.3f", cv_f1.mean(),  cv_f1.std())

    # ── Final fit on full training split ──────────────────────────────────────
    model = _fit_model(X_train, y_train)

    # ── Evaluation on hold-out ─────────────────────────────────────────────────
    y_pred  = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]
    test_auc = roc_auc_score(y_test, y_proba)

    print("\n── Hold-out evaluation ─────────────────────────────────────")
    print(classification_report(y_test, y_pred, target_names=["Non-compliant", "Compliant"]))
    print(f"ROC-AUC: {test_auc:.4f}")

    # ── Feature importance ─────────────────────────────────────────────────────
    importance = model.clf.feature_importances_
    print("\n── Feature importance ──────────────────────────────────────")
    for name, score in sorted(zip(FEATURE_COLS, importance, strict=False), key=lambda x: -x[1]):
        bar = "█" * int(score * 40)
        print(f"  {name:<30} {bar} {score:.4f}")

    # ── Save ───────────────────────────────────────────────────────────────────
    joblib.dump(model, MODEL_PATH)
    logger.info("Model saved → %s", MODEL_PATH)
    print(f"\nModel saved to {MODEL_PATH}")


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-8s  %(message)s",
        datefmt="%H:%M:%S",
    )
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    train(csv_path)
