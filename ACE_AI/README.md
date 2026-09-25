# ACE_AI Module 5: Fully Automated AI Event Verification & Organizer Trust Engine

Production-grade 100% automated verification, duplicate detection, and trust scoring engine for [AllCollegeEvent.com](https://allcollegeevent.com/).

---

## ⚡ Quickstart Setup (In 5 Steps)

### 1. Prerequisites
- Python 3.11+
- PostgreSQL with `pgvector` extension (or local SQLite for lightweight testing)

### 2. Create Virtual Environment
```bash
# In the ACE_AI directory:
python -m venv .venv

# Activate on Windows:
.\.venv\Scripts\activate
# Activate on Linux/macOS:
# source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment
```bash
cp .env.example .env
```
*(Optionally set `DATABASE_URL` to your PostgreSQL database with pgvector, or keep default SQLite for local development).*

### 5. Run the Application & Autonomous Background Workers
```bash
uvicorn app.main:app --reload --port 8000
```
Interactive Swagger documentation is available at: **[http://localhost:8000/docs](http://localhost:8000/docs)**.

To launch periodic scanning and retraining workers in background:
```bash
python -c "import asyncio; from app.workers.scan_worker import scan_all_pending_events; asyncio.run(scan_all_pending_events())"
python -c "from app.workers.retrain_worker import execute_retrain_cycle; execute_retrain_cycle()"
```

---

## 🧪 Running Automated Tests

Run the complete test suite with coverage report:

```bash
pytest app/tests/ -v --cov=app --cov-report=term-missing
```

The test suite covers:
- **Zero-State**: Unverified organizer initial state (`OCS = 0`).
- **Perfect Organizer**: Full verifications + 10 events (`OCS ≈ 100`).
- **Autonomous Decisions**: `AUTO_APPROVE`, `AUTO_REJECT`, `AUTO_FLAG`, `AUTO_QUARANTINE`.
- **Fraud History**: Automatic 70% credibility reduction (`OCS *= 0.3`).
- **Blacklist**: Zero score (`OCS = 0`, Tier = `Banned`).
- **Delta Cap**: Rate-limiting OCS shifts to $\pm 5.0$ points per update.
- **Inactivity Decay**: Automatic 5% score decay after 180 days of inactivity.
- **Duplicate Detection**: Embedding cosine similarity $> 0.85$ & RapidFuzz title match $> 90$.
- **External Validation**: College website, LinkedIn, domain age WHOIS, cross-platform checks.
- **Self-Learning Retraining**: Outcome-reward model training.

---

## 📡 API Reference & Example Requests

### 1. Submit Event for Fully Autonomous Verification
Submits event payload, runs duplicate check, fraud heuristics, EQS/OCS engines, and returns immediate auto-decision (`AUTO_APPROVE`, `AUTO_REJECT`, `AUTO_FLAG`, `AUTO_QUARANTINE`).

```bash
curl -X POST "http://localhost:8000/api/verify/submit" \
     -H "Content-Type: application/json" \
     -d '{
       "organizer_id": "11111111-1111-1111-1111-111111111111",
       "title": "National AI Hackathon 2026",
       "description": "Comprehensive 48-hour AI hackathon.",
       "registration_url": "https://hackathon.edu/register"
     }'
```

### 2. Get Organizer Credibility Score (OCS) & Signal Breakdown
Returns continuous OCS (0–100), trust tier, confidence, and 5-signal layer scores.

```bash
curl -X GET "http://localhost:8000/api/verify/organizer/11111111-1111-1111-1111-111111111111"
```

### 3. Trigger External Verification Refresh
Performs automated external checks across college websites, LinkedIn, domain age WHOIS, and news mentions.

```bash
curl -X POST "http://localhost:8000/api/verify/external-refresh/11111111-1111-1111-1111-111111111111"
```

### 4. Read-Only Observability Statistics
Returns decision rates (approval, rejection, flag, quarantine) and platform trust distribution.

```bash
curl -X GET "http://localhost:8000/api/obs/decisions/stats"
curl -X GET "http://localhost:8000/api/obs/trust-distribution"
curl -X GET "http://localhost:8000/api/obs/model/health"
```

---

## 🗄 Database Migrations

For PostgreSQL deployments with `pgvector`:
```bash
psql -U postgres -d ace_ai -f migrations/001_init_trust_tables.sql
```
Creates:
- `organizers`, `events`, `ratings`, and `trust_audits` tables.
- `idx_organizer_ocs`, `idx_organizer_tier`, `idx_event_status`, and `idx_trust_audit_org` indexes.
- `idx_event_embedding` vector index using `ivfflat` (`vector_cosine_ops`).
