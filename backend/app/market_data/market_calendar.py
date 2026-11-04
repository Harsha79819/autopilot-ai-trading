"""
Official NSE Market Calendar & Session Verifier for 2026.
Source: https://www.nseindia.com/resources/exchange-communication-holidays
Circular Ref: Download Ref No: NSE/CMTR/71775, Circular Ref. No: 172/2025
"""
import json
import logging
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Dict, Optional, Tuple, Union

try:
    from zoneinfo import ZoneInfo
    IST = ZoneInfo("Asia/Kolkata")
except ImportError:
    import pytz
    IST = pytz.timezone("Asia/Kolkata")

logger = logging.getLogger("autopilot.market_calendar")

_CALENDAR_PATH = Path(__file__).resolve().parent.parent / "data" / "nse_holidays_2026.json"

_HOLIDAYS_MAP: Dict[str, str] = {}
_MUHURAT_CONFIG: Optional[Dict[str, str]] = None


def _load_calendar_data():
    global _HOLIDAYS_MAP, _MUHURAT_CONFIG
    if _HOLIDAYS_MAP:
        return
    try:
        if _CALENDAR_PATH.exists():
            with open(_CALENDAR_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                for h in data.get("trading_holidays", []):
                    _HOLIDAYS_MAP[h["date"]] = h["description"]
                _MUHURAT_CONFIG = data.get("muhurat_trading")
        else:
            logger.warning(f"NSE holidays file not found at {_CALENDAR_PATH}")
    except Exception as e:
        logger.error(f"Failed to load NSE calendar data: {e}")


def _to_ist_datetime(dt: Optional[Union[datetime, date]]) -> datetime:
    """Normalize input to timezone-aware datetime in Asia/Kolkata."""
    if dt is None:
        return datetime.now(IST)
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            # Assume UTC if naive, and convert to IST
            dt = dt.replace(tzinfo=ZoneInfo("UTC") if "ZoneInfo" in globals() else pytz.UTC)
        return dt.astimezone(IST)
    # date instance
    return datetime.combine(dt, time(0, 0), tzinfo=IST)


to_ist_datetime = _to_ist_datetime


def is_trading_day(d: Optional[Union[datetime, date]] = None) -> bool:
    """
    Check if a given calendar day is an active NSE trading day.
    Weekends are non-trading days except for the Muhurat Trading session.
    Official NSE holidays are non-trading days.
    """
    _load_calendar_data()
    dt_ist = _to_ist_datetime(d)
    date_str = dt_ist.strftime("%Y-%m-%d")

    # Check for Muhurat Trading special Sunday session
    if _MUHURAT_CONFIG and _MUHURAT_CONFIG.get("date") == date_str:
        return True

    # Check weekend (5 = Saturday, 6 = Sunday)
    if dt_ist.weekday() >= 5:
        return False

    # Check NSE official trading holiday
    if date_str in _HOLIDAYS_MAP:
        return False

    return True


def is_market_open(dt: Optional[datetime] = None) -> bool:
    """Check if the NSE equity market is open right now (or at specified datetime)."""
    is_open, _ = get_market_status(dt)
    return is_open


def get_market_status(dt: Optional[datetime] = None) -> Tuple[bool, str]:
    """
    Returns (is_open: bool, description: str) with precise reason.
    """
    _load_calendar_data()
    dt_ist = _to_ist_datetime(dt)
    date_str = dt_ist.strftime("%Y-%m-%d")
    cur_time = dt_ist.time()

    # 1. Muhurat Trading session handling
    if _MUHURAT_CONFIG and _MUHURAT_CONFIG.get("date") == date_str:
        m_start = time(18, 0)
        m_end = time(19, 15)
        if m_start <= cur_time <= m_end:
            return True, "Market Open (Muhurat Trading Session 18:00 - 19:15 IST)"
        elif cur_time < m_start:
            return False, f"Pre-market (Diwali Muhurat Trading opens at 18:00 IST)"
        else:
            return False, "Market Closed (Diwali Muhurat Trading session ended at 19:15 IST)"

    # 2. Weekend check
    weekday = dt_ist.weekday()
    if weekday == 5:
        next_open = get_next_open_time(dt_ist)
        return False, f"Market Closed (Saturday Weekend. Opens {next_open.strftime('%a, %b %d at %H:%M IST')})"
    elif weekday == 6:
        next_open = get_next_open_time(dt_ist)
        return False, f"Market Closed (Sunday Weekend. Opens {next_open.strftime('%a, %b %d at %H:%M IST')})"

    # 3. Holiday check
    if date_str in _HOLIDAYS_MAP:
        holiday_name = _HOLIDAYS_MAP[date_str]
        next_open = get_next_open_time(dt_ist)
        return False, f"Market Closed (NSE Holiday: {holiday_name}. Opens {next_open.strftime('%a, %b %d at %H:%M IST')})"

    # 4. Standard weekday timings (09:15 to 15:30 IST)
    market_open = time(9, 15)
    market_close = time(15, 30)

    if cur_time < market_open:
        return False, "Pre-market (Regular session opens at 09:15 IST)"
    elif cur_time > market_close:
        next_open = get_next_open_time(dt_ist)
        return False, f"Market Closed (Regular session closed at 15:30 IST. Opens {next_open.strftime('%a, %b %d at %H:%M IST')})"
    else:
        return True, "Market Open (Regular Session 09:15 - 15:30 IST)"


def get_next_open_time(dt: Optional[datetime] = None) -> datetime:
    """
    Calculates the exact next market opening datetime in Asia/Kolkata timezone.
    """
    _load_calendar_data()
    dt_ist = _to_ist_datetime(dt)
    cur_date = dt_ist.date()
    cur_time = dt_ist.time()

    # Check if today is a trading day and market hasn't opened yet
    if is_trading_day(cur_date):
        date_str = cur_date.strftime("%Y-%m-%d")
        if _MUHURAT_CONFIG and _MUHURAT_CONFIG.get("date") == date_str:
            m_start = time(18, 0)
            if cur_time < m_start:
                return datetime.combine(cur_date, m_start, tzinfo=IST)
        else:
            reg_open = time(9, 15)
            if cur_time < reg_open:
                return datetime.combine(cur_date, reg_open, tzinfo=IST)

    # Search next trading days
    candidate = cur_date + timedelta(days=1)
    for _ in range(365):
        if is_trading_day(candidate):
            cand_str = candidate.strftime("%Y-%m-%d")
            if _MUHURAT_CONFIG and _MUHURAT_CONFIG.get("date") == cand_str:
                return datetime.combine(candidate, time(18, 0), tzinfo=IST)
            else:
                return datetime.combine(candidate, time(9, 15), tzinfo=IST)
        candidate += timedelta(days=1)

    # Fallback default
    return datetime.combine(cur_date + timedelta(days=1), time(9, 15), tzinfo=IST)


def get_seconds_until_next_open(dt: Optional[datetime] = None) -> float:
    """Return seconds remaining until next market open (minimum 1.0s)."""
    dt_ist = _to_ist_datetime(dt)
    next_open = get_next_open_time(dt_ist)
    diff = (next_open - dt_ist).total_seconds()
    return max(1.0, diff)
