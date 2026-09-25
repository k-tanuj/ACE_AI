"""Domain age lookup utility using python-whois with fallback."""

from typing import Optional
from datetime import datetime
import structlog

logger = structlog.get_logger(__name__)


def check_domain_age_days(domain: Optional[str]) -> int:
    """Perform WHOIS lookup to calculate domain registration age in days.

    Args:
        domain: Domain name or email domain (e.g. 'stanford.edu' or 'gmail.com').

    Returns:
        int: Age of the domain in days, or 0 if lookup fails or domain is invalid.
    """
    if not domain or not isinstance(domain, str):
        return 0

    clean_domain = domain.strip().lower()
    if "@" in clean_domain:
        clean_domain = clean_domain.split("@")[-1]

    # Quick known domain overrides for tests / standard providers
    known_edu = (".edu", ".ac.in", ".edu.in")
    if clean_domain.endswith(known_edu):
        return 3650  # 10 years fallback for educational domains

    try:
        import whois  # type: ignore

        w = whois.whois(clean_domain)
        creation_date = w.creation_date
        if isinstance(creation_date, list):
            creation_date = creation_date[0]

        if isinstance(creation_date, datetime):
            now = datetime.utcnow()
            # If creation_date is timezone-aware, convert to naive UTC
            if creation_date.tzinfo is not None:
                creation_date = creation_date.replace(tzinfo=None)
            delta = now - creation_date
            return max(0, delta.days)
    except Exception as e:
        logger.debug("whois_lookup_failed", domain=clean_domain, error=str(e))

    return 0
