"""Text quality, readability, and heuristic grammar analysis utilities."""

import re
from typing import Dict, Optional


def analyze_text_quality(text: Optional[str]) -> Dict[str, float]:
    """Analyze text for length, structural quality, and grammar heuristics.

    Args:
        text: Input string to evaluate.

    Returns:
        dict: A dictionary containing:
            - length (int): Total character count.
            - word_count (int): Total word count.
            - grammar_quality (float): Heuristic score between 0.0 and 1.0.
            - readability_score (float): Score between 0.0 and 100.0.
    """
    if not text or not isinstance(text, str):
        return {
            "length": 0,
            "word_count": 0,
            "grammar_quality": 0.0,
            "readability_score": 0.0,
        }

    cleaned = text.strip()
    char_len = len(cleaned)
    if char_len == 0:
        return {
            "length": 0,
            "word_count": 0,
            "grammar_quality": 0.0,
            "readability_score": 0.0,
        }

    words = re.findall(r"\b[A-Za-z0-9'-]+\b", cleaned)
    word_count = len(words)
    if word_count == 0:
        return {
            "length": char_len,
            "word_count": 0,
            "grammar_quality": 0.1,
            "readability_score": 10.0,
        }

    sentences = [s.strip() for s in re.split(r"[.!?]+", cleaned) if s.strip()]
    sentence_count = max(len(sentences), 1)

    # Heuristic Checks:
    # 1. Capitalization score
    properly_capitalized = sum(1 for s in sentences if s[0].isupper())
    cap_ratio = properly_capitalized / sentence_count

    # 2. Punctuation score (ends with punctuation)
    has_terminal_punct = 1.0 if cleaned[-1] in ".!?" else 0.5

    # 3. Uppercase penalty (detect SHOUTING SPAM)
    letters = re.findall(r"[A-Za-z]", cleaned)
    upper_ratio = sum(1 for c in letters if c.isupper()) / max(len(letters), 1)
    shout_penalty = 0.3 if upper_ratio > 0.4 else 0.0

    # 4. Lexical diversity
    unique_words = len(set(w.lower() for w in words))
    diversity = min(unique_words / word_count, 1.0)

    # 5. Sentence length reasonability (words per sentence between 5 and 35)
    avg_words_per_sentence = word_count / sentence_count
    if 5 <= avg_words_per_sentence <= 35:
        sentence_structure_score = 1.0
    elif avg_words_per_sentence < 5:
        sentence_structure_score = 0.5
    else:
        sentence_structure_score = max(0.2, 1.0 - (avg_words_per_sentence - 35) * 0.02)

    # Composite Grammar Score (0.0 to 1.0)
    raw_grammar = (
        0.30 * cap_ratio
        + 0.20 * has_terminal_punct
        + 0.25 * diversity
        + 0.25 * sentence_structure_score
        - shout_penalty
    )
    grammar_quality = round(max(0.0, min(1.0, raw_grammar)), 2)

    # Readability score (0.0 to 100.0)
    readability = round(
        max(0.0, min(100.0, (grammar_quality * 70.0) + min(char_len / 10.0, 30.0))),
        2,
    )

    return {
        "length": char_len,
        "word_count": word_count,
        "grammar_quality": grammar_quality,
        "readability_score": readability,
    }
