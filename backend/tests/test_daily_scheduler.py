import pytest
from datetime import datetime, time
from unittest.mock import patch, MagicMock

from backend.app.database import SessionLocal
from backend.app.models.options_models import OptionsPortfolio
from backend.app.models.watchlist_alert import NotificationLog
from backend.app.services.daily_scheduler_service import DailySchedulerService


def test_schedule_slots_configuration():
    slots = DailySchedulerService.SLOTS_CONFIG
    assert "MORNING_BRIEF" in slots
    assert "EOD_SQUARE_OFF" in slots
    assert "EOD_WATCHDOG" in slots
    assert "MARKET_WRAP" in slots
    assert "EVENING_DIGEST" in slots
    assert "WEEKEND_MORNING" in slots
    assert "WEEKEND_EVENING" in slots

    assert slots["MORNING_BRIEF"]["target_time"] == time(9, 0)
    assert slots["EOD_SQUARE_OFF"]["target_time"] == time(15, 10)
    assert slots["EOD_WATCHDOG"]["target_time"] == time(15, 12)
    assert slots["MARKET_WRAP"]["target_time"] == time(15, 30)
    assert slots["EVENING_DIGEST"]["target_time"] == time(19, 0)
    assert slots["WEEKEND_MORNING"]["target_time"] == time(10, 0)
    assert slots["WEEKEND_EVENING"]["target_time"] == time(18, 0)


def test_get_schedule_status():
    db = SessionLocal()
    try:
        status = DailySchedulerService.get_schedule_status(db)
        assert "current_time_ist" in status
        assert "is_trading_day" in status
        assert "slots" in status
        assert len(status["slots"]) == 7
    finally:
        db.close()


def test_duplicate_prevention_logic():
    db = SessionLocal()
    try:
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        slot_key = "TEST_SLOT"

        # Clean up any leftover test row from previous runs
        db.query(NotificationLog).filter(NotificationLog.category == f"SCHEDULED_{slot_key}").delete()
        db.commit()

        # Initially not dispatched
        assert DailySchedulerService.has_slot_dispatched_today(db, slot_key, today_str) is False

        # Record dispatch
        DailySchedulerService.record_slot_dispatch(
            db=db,
            user_id=1,
            slot_key=slot_key,
            title="Test Slot Dispatch",
            message="Test message body"
        )

        # Now should be True
        assert DailySchedulerService.has_slot_dispatched_today(db, slot_key, today_str) is True

        # Clean up test row
        db.query(NotificationLog).filter(NotificationLog.category == f"SCHEDULED_{slot_key}").delete()
        db.commit()
    finally:
        db.close()


def test_message_and_voice_builder():
    db = SessionLocal()
    try:
        opt_port = db.query(OptionsPortfolio).first()
        now_ist = datetime(2026, 11, 21, 18, 0, 0)

        # Weekend evening
        res = DailySchedulerService.build_message_and_voice("WEEKEND_EVENING", now_ist, opt_port, None)
        assert "వీకెండ్ ఈవెనింగ్ బ్రీఫింగ్" in res["text"]
        assert "ఫ్రెండ్" in res["voice"]

        # Morning brief
        res_m = DailySchedulerService.build_message_and_voice("MORNING_BRIEF", now_ist, opt_port, None)
        assert "హలో హర్ష గారు" in res_m["text"]
        assert "9:15 AM" in res_m["text"]
    finally:
        db.close()
