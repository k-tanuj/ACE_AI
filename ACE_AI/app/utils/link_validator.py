"""URL validation and suspicious link detection utilities."""

from typing import Optional
from urllib.parse import urlparse
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)


def is_valid_url(url: Optional[str]) -> bool:
    """Validate whether a string is a well-formed HTTP/HTTPS URL.

    Args:
        url: The candidate URL string to validate.

    Returns:
        bool: True if the URL contains valid scheme and network location, False otherwise.
    """
    if not url or not isinstance(url, str):
        return False

    trimmed = url.strip()
    if len(trimmed) < 4:
        return False

    try:
        parsed = urlparse(trimmed)
        if parsed.scheme.lower() not in ("http", "https"):
            return False
        if not parsed.netloc or "." not in parsed.netloc:
            return False
        return True
    except Exception as e:
        logger.warning("url_parse_error", url=url, error=str(e))
        return False


def is_shortened_url(url: Optional[str]) -> bool:
    """Check if the URL originates from known URL shortening services.

    Args:
        url: The URL string to inspect.

    Returns:
        bool: True if the domain matches suspicious or URL shortening patterns.
    """
    if not url or not isinstance(url, str):
        return False

    try:
        parsed = urlparse(url.strip())
        netloc = parsed.netloc.lower()
        return any(pattern.lower() in netloc for pattern in settings.SUSPICIOUS_URL_PATTERNS)
    except Exception:
        return False
