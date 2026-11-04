"""Tests for Task 6: DB-based leader lock and single runner execution."""
from datetime import datetime, timedelta
from backend.app.models.runner_lock import RunnerLock
from backend.app.services.auto_trader import AutoPilotRunner


def test_runner_leader_lock_mutual_exclusion(db):
    """Two runner instances against the same DB: only the lock holder may execute."""
    runner_a = AutoPilotRunner()
    runner_b = AutoPilotRunner()

    # Clear any existing locks in test db
    db.query(RunnerLock).filter(RunnerLock.lock_key == "autopilot_runner").delete()
    db.commit()

    # Runner A acquires fresh lock
    assert runner_a._acquire_or_renew_leader_lock(db, ttl_seconds=30) is True

    # Runner B attempts to acquire while A's lock is fresh -> must be rejected
    assert runner_b._acquire_or_renew_leader_lock(db, ttl_seconds=30) is False

    # Runner A can successfully renew its own lock
    assert runner_a._acquire_or_renew_leader_lock(db, ttl_seconds=30) is True

    # Check DB state
    lock = db.query(RunnerLock).filter(RunnerLock.lock_key == "autopilot_runner").first()
    assert lock is not None
    assert lock.owner_id == runner_a.runner_id


def test_runner_stale_lock_takeover(db):
    """A stale/expired lock is safely taken over by another runner instance."""
    runner_a = AutoPilotRunner()
    runner_b = AutoPilotRunner()

    db.query(RunnerLock).filter(RunnerLock.lock_key == "autopilot_runner").delete()
    db.commit()

    # Runner A acquires lock
    assert runner_a._acquire_or_renew_leader_lock(db, ttl_seconds=30) is True

    # Manually expire Runner A's lock in DB
    lock = db.query(RunnerLock).filter(RunnerLock.lock_key == "autopilot_runner").first()
    lock.heartbeat = datetime.utcnow() - timedelta(seconds=60)
    lock.expires_at = datetime.utcnow() - timedelta(seconds=30)
    db.commit()

    # Runner B attempts to acquire -> should take over stale lock
    assert runner_b._acquire_or_renew_leader_lock(db, ttl_seconds=30) is True

    # Verify Runner B is now the registered owner
    db.refresh(lock)
    assert lock.owner_id == runner_b.runner_id
