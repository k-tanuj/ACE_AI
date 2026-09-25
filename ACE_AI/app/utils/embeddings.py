"""Sentence transformer embedding generation and vector similarity calculations."""

import math
from typing import List, Optional
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)

_model_instance = None


def get_embedding_model():
    """Retrieve or lazily initialize the SentenceTransformer model singleton.

    Returns:
        SentenceTransformer: Loaded embedding model.
    """
    global _model_instance
    if _model_instance is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("loading_embedding_model", model_name=settings.EMBEDDING_MODEL_NAME)
            _model_instance = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
        except Exception as e:
            logger.error("embedding_model_load_failed", error=str(e))
            raise
    return _model_instance


def generate_embedding(text: Optional[str]) -> List[float]:
    """Generate normalized 384-dimensional vector embedding for a given text.

    Args:
        text: Text string to embed.

    Returns:
        List[float]: 384-dimensional float vector.
    """
    if not text or not text.strip():
        return [0.0] * settings.EMBEDDING_DIM

    try:
        model = get_embedding_model()
        vec = model.encode(text.strip(), normalize_embeddings=True)
        return [float(x) for x in vec.tolist()]
    except Exception as e:
        logger.warning("generate_embedding_fallback", error=str(e))
        # Fallback to reproducible hash-based deterministic unit vector for testing/offline mode
        import hashlib
        seed_hash = hashlib.sha256(text.strip().encode("utf-8")).digest()
        raw_vec = [(seed_hash[i % len(seed_hash)] - 128) / 128.0 for i in range(settings.EMBEDDING_DIM)]
        norm = math.sqrt(sum(x * x for x in raw_vec)) or 1.0
        return [x / norm for x in raw_vec]


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Compute cosine similarity between two float vectors.

    Args:
        vec1: First vector.
        vec2: Second vector.

    Returns:
        float: Cosine similarity score between -1.0 and 1.0 (0.0 if either norm is zero).
    """
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0

    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm_a = math.sqrt(sum(a * a for a, b in zip(vec1, vec2)))  # wait! norm_a should be sum(a * a for a in vec1)
    norm_b = math.sqrt(sum(b * b for b in vec2))
    norm_a = math.sqrt(sum(a * a for a in vec1))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    similarity = dot_product / (norm_a * norm_b)
    return max(-1.0, min(1.0, float(similarity)))
