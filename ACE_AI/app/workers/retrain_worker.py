"""Autonomous Background Retraining Worker.

Periodically collects feedback signals from event outcomes, updates decision thresholds,
and retrains auto-decision classification models without human intervention.
"""

import asyncio
import structlog
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.services.self_learning import retrain_classifier, update_decision_thresholds

logger = structlog.get_logger(__name__)


def execute_retrain_cycle() -> dict:
    """Execute complete retraining and threshold adjustment cycle."""
    db: Session = SessionLocal()
    try:
        thresholds = update_decision_thresholds(db)
        retrain_stats = retrain_classifier(db)
        logger.info("retrain_worker_cycle_complete", thresholds=thresholds, stats=retrain_stats)
        return {"thresholds": thresholds, "stats": retrain_stats}
    finally:
        db.close()


async def run_retrain_worker_loop(interval_seconds: int = 86400):
    """Continuous background worker loop for 24h periodic retraining."""
    logger.info("starting_retrain_worker_loop", interval=interval_seconds)
    while True:
        try:
            res = execute_retrain_cycle()
            logger.info("completed_retrain_worker_cycle", result=res)
        except Exception as e:
            logger.error("retrain_worker_error", error=str(e))
        await asyncio.sleep(interval_seconds)
