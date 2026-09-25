"""Unit tests for app/services/external_validator.py."""

import pytest
from app.services.external_validator import run_all_external_checks, validate_college_website, validate_linkedin


class DummyOrganizer:
    def __init__(self, email_domain="stanford.edu", linkedin_url="https://linkedin.com/in/test", linkedin_active=True):
        self.email_domain = email_domain
        self.linkedin_url = linkedin_url
        self.linkedin_active = linkedin_active
        self.name = "Stanford Tech Club"


@pytest.mark.asyncio
async def test_validate_college_website_edu_domain():
    org = DummyOrganizer(email_domain="stanford.edu")
    match = await validate_college_website(org)
    assert match is True


@pytest.mark.asyncio
async def test_validate_linkedin():
    org = DummyOrganizer()
    info = await validate_linkedin(org)
    assert info["exists"] is True
    assert info["active"] is True


@pytest.mark.asyncio
async def test_run_all_external_checks():
    org = DummyOrganizer()
    signals = await run_all_external_checks(org)
    assert signals["college_website_match"] is True
    assert signals["linkedin_active"] is True
    assert "domain_age_days" in signals
