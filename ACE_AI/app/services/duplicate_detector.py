"""Embedding and fuzzy-title duplicate event detector."""

from typing import Any, Dict, List, Optional
import uuid
from rapidfuzz import fuzz
import structlog

from app.config import settings
from app.utils.embeddings import cosine_similarity, generate_embedding

logger = structlog.get_logger(__name__)


def detect_duplicate(
    event: Any,
    existing_events: List[Any],
    threshold: Optional[float] = None,
) -> Dict[str, Any]:
    """Detect whether candidate event is a duplicate among recent events.

    Decision Criteria:
        1. Cosine similarity of sentence-transformer embeddings > threshold (default 0.85), OR
        2. Fuzzy title match ratio >= 90.0 AND hosted by the same organizer.

    Args:
        event: Candidate event instance or dictionary.
        existing_events: Pool of recent events to compare against (up to 1000).
        threshold: Embedding similarity threshold (default 0.85).

    Returns:
        dict: Containing 'is_duplicate', 'duplicate_of', 'similarity', 'fuzzy_title_ratio', and 'matched_reason'.
    """
    sim_threshold = threshold if threshold is not None else settings.DUPLICATE_EMBEDDING_THRESHOLD

    event_id = getattr(event, "event_id", None)
    event_title = (getattr(event, "title", "") or "").strip()
    event_desc = (getattr(event, "description", "") or "").strip()
    event_org_id = getattr(event, "organizer_id", None)

    # Candidate embedding
    event_embedding = getattr(event, "embedding", None)
    if not event_embedding or len(event_embedding) != settings.EMBEDDING_DIM:
        event_embedding = generate_embedding(f"{event_title}. {event_desc}")

    best_match_id = None
    best_similarity = 0.0
    best_fuzzy_ratio = 0.0
    matched_reason = None
    is_dupe = False

    # Limit search to the latest DUPLICATE_HISTORY_LIMIT events
    candidate_pool = existing_events[: settings.DUPLICATE_HISTORY_LIMIT]

    for existing in candidate_pool:
        curr_id = getattr(existing, "event_id", None)
        # Skip self-comparison
        if event_id and curr_id and str(event_id) == str(curr_id):
            continue

        curr_title = (getattr(existing, "title", "") or "").strip()
        curr_desc = (getattr(existing, "description", "") or "").strip()
        curr_org_id = getattr(existing, "organizer_id", None)

        # 1. Fuzzy title match calculation
        fuzzy_ratio = float(fuzz.token_sort_ratio(event_title.lower(), curr_title.lower()))
        if fuzzy_ratio > best_fuzzy_ratio:
            best_fuzzy_ratio = fuzzy_ratio

        # 2. Embedding similarity calculation
        curr_embedding = getattr(existing, "embedding", None)
        if not curr_embedding or len(curr_embedding) != settings.EMBEDDING_DIM:
            curr_embedding = generate_embedding(f"{curr_title}. {curr_desc}")

        sim = cosine_similarity(event_embedding, curr_embedding)
        if sim > best_similarity:
            best_similarity = sim

        # Condition A: Semantic embedding match exceeds threshold
        if sim >= sim_threshold:
            is_dupe = True
            best_match_id = curr_id
            matched_reason = f"High semantic embedding similarity ({sim:.3f} >= {sim_threshold})"
            break

        # Condition B: High fuzzy title similarity by the same organizer
        same_organizer = (
            event_org_id is not None
            and curr_org_id is not None
            and str(event_org_id) == str(curr_org_id)
        )
        if fuzzy_ratio >= settings.DUPLICATE_FUZZY_TITLE_THRESHOLD and same_organizer:
            is_dupe = True
            best_match_id = curr_id
            matched_reason = (
                f"Fuzzy title match ({fuzzy_ratio:.1f} >= {settings.DUPLICATE_FUZZY_TITLE_THRESHOLD}) "
                f"by identical organizer ({event_org_id})"
            )
            break

    logger.debug(
        "duplicate_detection_complete",
        is_duplicate=is_dupe,
        duplicate_of=str(best_match_id) if best_match_id else None,
        best_similarity=best_similarity,
        best_fuzzy_ratio=best_fuzzy_ratio,
    )

    return {
        "is_duplicate": is_dupe,
        "duplicate_of": best_match_id,
        "similarity": round(best_similarity, 4),
        "fuzzy_title_ratio": round(best_fuzzy_ratio, 2),
        "matched_reason": matched_reason,
    }
