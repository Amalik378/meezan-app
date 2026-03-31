"""
Serialisable model wrapper — must live in a dedicated module so that joblib
pickling always stores the fully-qualified class path (app.ml.model.ScaledXGB),
not '__main__.ScaledXGB' which would break loading from other entry points.

Import this wherever you need to load or save the Shariah classifier.
"""
import numpy as np
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier


class ScaledXGB:
    """StandardScaler + XGBClassifier bundle.

    Exposes the same .predict_proba() / .predict() interface as a
    sklearn Pipeline without triggering the XGBoost 2.x / sklearn 1.6.x
    __sklearn_tags__ incompatibility.
    """

    def __init__(self, scaler: StandardScaler, clf: XGBClassifier) -> None:
        self.scaler = scaler
        self.clf = clf

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self.clf.predict_proba(self.scaler.transform(X))

    def predict(self, X: np.ndarray) -> np.ndarray:
        return self.clf.predict(self.scaler.transform(X))
