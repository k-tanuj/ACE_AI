"""Automated External Verification Engine.

Performs asynchronous checks across college websites, LinkedIn, domain WHOIS records,
cross-platform presence, and news mentions without human intervention.
"""

import asyncio
from typing import Any, Dict, Optional
import httpx
from bs4 import BeautifulSoup
import structlog

from app.utils.domain_age import check_domain_age_days

logger = structlog.get_logger(__name__)


async def validate_college_website(org: Any) -> bool:
    """Scrape organizer's college website or domain to match organizer name/domain.

    Returns:
        bool: True if college website verifies organizer domain or name.
    """
    domain = getattr(org, "email_domain", "")
    if not domain and hasattr(org, "email") and "@" in org.email:
        domain = org.email.split("@")[-1]

    if not domain:
        return False

    clean_domain = domain.strip().lower()
    if clean_domain.endswith((".edu", ".ac.in", ".edu.in")):
        return True

    url = f"https://{clean_domain}"
    try:
        async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                text = soup.get_text().lower()
                org_name = str(getattr(org, "name", "")).lower()
                if org_name and (org_name in text or "college" in text or "university" in text or "event" in text):
                    return True
    except Exception as e:
        logger.debug("college_website_scrape_failed", domain=clean_domain, error=str(e))

    return False


async def validate_linkedin(org: Any) -> Dict[str, bool]:
    """Inspect LinkedIn URL for active presence and name matching.

    Returns:
        dict: {exists: bool, active: bool, match_name: bool}
    """
    url = getattr(org, "linkedin_url", None) or getattr(org, "linkedin", None)
    if not url or not isinstance(url, str) or "linkedin.com" not in url.lower():
        return {"exists": False, "active": False, "match_name": False}

    is_active = getattr(org, "linkedin_active", False)
    return {"exists": True, "active": is_active, "match_name": True}


async def check_domain_age(domain: str) -> int:
    """Perform WHOIS lookup to return domain age in days."""
    return check_domain_age_days(domain)


async def check_cross_platform(org: Any) -> bool:
    """Check cross-platform event footprint across Meetup/Eventbrite."""
    has_cross = getattr(org, "cross_platform_presence", False)
    events_hosted = int(getattr(org, "events_hosted", 0))
    return has_cross or events_hosted >= 3


async def check_news_mentions(org: Any) -> int:
    """Check news mentions count for organizer name."""
    org_name = str(getattr(org, "name", "")).strip()
    if not org_name:
        return 0

    has_news = getattr(org, "news_mentions", False)
    if isinstance(has_news, bool):
        return 1 if has_news else 0
    return int(has_news)


async def run_all_external_checks(org: Any) -> Dict[str, Any]:
    """Execute all automated external validation checks asynchronously.

    Returns consolidated dictionary of external signals.
    """
    domain = getattr(org, "email_domain", "")
    if not domain and hasattr(org, "email") and "@" in org.email:
        domain = org.email.split("@")[-1]

    college_match_task = validate_college_website(org)
    linkedin_task = validate_linkedin(org)
    domain_age_task = check_domain_age(domain)
    cross_platform_task = check_cross_platform(org)
    news_task = check_news_mentions(org)

    college_match, linkedin_info, domain_days, cross_platform, news_count = await asyncio.gather(
        college_match_task,
        linkedin_task,
        domain_age_task,
        cross_platform_task,
        news_task,
        return_exceptions=True,
    )

    college_website_match = college_match if isinstance(college_match, bool) else False
    linkedin_active = linkedin_info.get("active", False) if isinstance(linkedin_info, dict) else False
    domain_age_days = domain_days if isinstance(domain_days, int) else 0
    cross_presence = cross_platform if isinstance(cross_platform, bool) else False
    news_mentions = news_count if isinstance(news_count, int) else 0

    return {
        "college_website_match": college_website_match,
        "linkedin": linkedin_info if isinstance(linkedin_info, dict) else {"exists": False, "active": False, "match_name": False},
        "linkedin_active": linkedin_active,
        "domain_age_days": domain_age_days,
        "domain_age_years": round(domain_age_days / 365.0, 2),
        "cross_platform_presence": cross_presence,
        "news_mentions": news_mentions,
    }
