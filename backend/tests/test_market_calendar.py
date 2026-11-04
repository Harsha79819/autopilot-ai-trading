import pytest
from datetime import datetime
from zoneinfo import ZoneInfo
from backend.app.market_data.market_calendar import (
    is_trading_day,
    is_market_open,
    get_market_status,
    get_next_open_time,
    get_seconds_until_next_open,
)

IST = ZoneInfo("Asia/Kolkata")


def test_regular_weekday_market_hours():
    # Wednesday at 10:30 AM IST (trading session)
    wed_open = datetime(2026, 1, 14, 10, 30, tzinfo=IST)
    assert is_trading_day(wed_open) is True
    assert is_market_open(wed_open) is True
    is_open, msg = get_market_status(wed_open)
    assert is_open is True
    assert "09:15 - 15:30 IST" in msg

    # Wednesday pre-market (08:45 AM IST)
    wed_pre = datetime(2026, 1, 14, 8, 45, tzinfo=IST)
    assert is_market_open(wed_pre) is False
    is_open, msg = get_market_status(wed_pre)
    assert is_open is False
    assert "Pre-market" in msg

    # Wednesday post-market (16:00 IST)
    wed_post = datetime(2026, 1, 14, 16, 0, tzinfo=IST)
    assert is_market_open(wed_post) is False
    is_open, msg = get_market_status(wed_post)
    assert is_open is False
    assert "Market Closed (Regular session closed at 15:30 IST" in msg


def test_weekend_closure():
    # Saturday
    sat = datetime(2026, 1, 17, 11, 0, tzinfo=IST)
    assert is_trading_day(sat) is False
    assert is_market_open(sat) is False
    _, msg = get_market_status(sat)
    assert "Saturday Weekend" in msg

    # Sunday (regular)
    sun = datetime(2026, 1, 18, 11, 0, tzinfo=IST)
    assert is_trading_day(sun) is False
    assert is_market_open(sun) is False
    _, msg = get_market_status(sun)
    assert "Sunday Weekend" in msg


def test_official_nse_holidays_2026():
    # Republic Day: 2026-01-26 (Monday)
    rep_day = datetime(2026, 1, 26, 11, 0, tzinfo=IST)
    assert is_trading_day(rep_day) is False
    assert is_market_open(rep_day) is False
    _, msg = get_market_status(rep_day)
    assert "NSE Holiday: Republic Day" in msg

    # Holi: 2026-03-03 (Tuesday)
    holi = datetime(2026, 3, 3, 11, 0, tzinfo=IST)
    assert is_trading_day(holi) is False
    assert is_market_open(holi) is False
    _, msg = get_market_status(holi)
    assert "NSE Holiday: Holi" in msg

    # Mahatma Gandhi Jayanti: 2026-10-02 (Friday)
    gandhi = datetime(2026, 10, 2, 11, 0, tzinfo=IST)
    assert is_trading_day(gandhi) is False
    assert is_market_open(gandhi) is False
    _, msg = get_market_status(gandhi)
    assert "NSE Holiday: Mahatma Gandhi Jayanti" in msg


def test_muhurat_trading_session_diwali():
    # Sunday, Nov 8, 2026 is Diwali Laxmi Pujan (Muhurat session: 18:00 - 19:15 IST)
    sun_muhurat_day = datetime(2026, 11, 8, 12, 0, tzinfo=IST)
    assert is_trading_day(sun_muhurat_day) is True

    # Pre-muhurat: 17:30 IST
    pre_muhurat = datetime(2026, 11, 8, 17, 30, tzinfo=IST)
    assert is_market_open(pre_muhurat) is False
    _, msg = get_market_status(pre_muhurat)
    assert "Pre-market" in msg

    # During Muhurat: 18:30 IST
    in_muhurat = datetime(2026, 11, 8, 18, 30, tzinfo=IST)
    assert is_market_open(in_muhurat) is True
    is_open, msg = get_market_status(in_muhurat)
    assert is_open is True
    assert "Muhurat Trading Session" in msg

    # Post Muhurat: 19:30 IST
    post_muhurat = datetime(2026, 11, 8, 19, 30, tzinfo=IST)
    assert is_market_open(post_muhurat) is False
    _, msg = get_market_status(post_muhurat)
    assert "Diwali Muhurat Trading session ended at 19:15 IST" in msg


def test_get_next_open_time_and_seconds():
    # Friday post-market: Friday 2026-01-23 16:00 IST
    # Saturday 2026-01-24: Weekend
    # Sunday 2026-01-25: Weekend
    # Monday 2026-01-26: Republic Day (Holiday!)
    # Next open must be Tuesday 2026-01-27 09:15 IST
    fri_post = datetime(2026, 1, 23, 16, 0, tzinfo=IST)
    next_open = get_next_open_time(fri_post)
    assert next_open.year == 2026
    assert next_open.month == 1
    assert next_open.day == 27
    assert next_open.hour == 9
    assert next_open.minute == 15

    seconds = get_seconds_until_next_open(fri_post)
    assert seconds > 0
    expected_seconds = (next_open - fri_post).total_seconds()
    assert abs(seconds - expected_seconds) < 1.0
