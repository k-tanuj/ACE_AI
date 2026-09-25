"""Services package exposing all verification and scoring engines."""

from app.services.anti_gaming import apply_decay, cap_ocs_delta, detect_sybil, is_verified_rating
from app.services.duplicate_detector import detect_duplicate
from app.services.eqs_engine import compute_eqs
from app.services.fraud_detector import detect_fraud
from app.services.ocs_engine import (
    community_score,
    compute_confidence,
    compute_ocs,
    content_score,
    external_score,
    historical_score,
    identity_score,
    persist_ocs,
)
from app.services.trust_tiers import assign_tier, auto_approval_recommendation

__all__ = [
    "identity_score",
    "historical_score",
    "content_score",
    "community_score",
    "external_score",
    "compute_confidence",
    "compute_ocs",
    "persist_ocs",
    "assign_tier",
    "auto_approval_recommendation",
    "compute_eqs",
    "detect_duplicate",
    "detect_fraud",
    "is_verified_rating",
    "cap_ocs_delta",
    "apply_decay",
    "detect_sybil",
]
