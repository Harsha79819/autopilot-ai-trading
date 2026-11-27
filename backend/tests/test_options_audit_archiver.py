"""Unit and integration tests for Options Audit Archiver & Cold Storage."""
import os
import gzip
import csv
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.models.options_models import OptionsPortfolio, OptionTrade
from backend.app.services.options_audit_archiver import OptionsAuditArchiver, AUDIT_CSV_COLUMNS
from backend.app.auth.security import create_access_token


def test_archiver_record_and_gzip_compression(tmp_path, monkeypatch):
    """Verify that recording a closed trade creates an authentic .csv.gz file with all columns."""
    monkeypatch.setattr(OptionsAuditArchiver, "get_archive_dir", classmethod(lambda cls: tmp_path))

    trade = OptionTrade(
        id=999,
        portfolio_id=1,
        symbol="NIFTY24000CE",
        underlying="NIFTY",
        strike_price=24000.0,
        option_type="CE",
        expiry_date="2026-12-03",
        lot_size=25,
        quantity=25,
        entry_premium=100.0,
        exit_premium=140.0,
        realized_pnl=1000.0,
        gross_pnl=1050.0,
        net_pnl=1000.0,
        return_pct=40.0,
        fees=50.0,
        brokerage=40.0,
        stt=2.5,
        exchange_charges=3.0,
        gst=4.0,
        stamp_duty=0.5,
        sebi_charges=0.0,
        entry_time=datetime(2026, 11, 27, 9, 30, tzinfo=timezone.utc),
        exit_time=datetime(2026, 11, 27, 10, 30, tzinfo=timezone.utc),
        exit_reason="TARGET_HIT",
        trade_notes="Exited NIFTY24000CE at +40%"
    )

    file_path = OptionsAuditArchiver.record_closed_trade(trade)
    assert file_path.exists()
    assert file_path.suffix == ".gz"

    # Read back and decompress
    with gzip.open(file_path, "rt", newline="", encoding="utf-8") as gz_in:
        reader = list(csv.DictReader(gz_in))
        assert len(reader) == 1
        row = reader[0]
        assert row["trade_id"] == "999"
        assert row["symbol"] == "NIFTY24000CE"
        assert float(row["exit_premium"]) == 140.0
        assert float(row["realized_pnl"]) == 1000.0
        assert row["exit_reason"] == "TARGET_HIT"

    # Record second trade in same week
    trade2 = OptionTrade(
        id=1000,
        portfolio_id=1,
        symbol="BANKNIFTY51000PE",
        underlying="BANKNIFTY",
        strike_price=51000.0,
        option_type="PE",
        expiry_date="2026-12-03",
        lot_size=15,
        quantity=15,
        entry_premium=200.0,
        exit_premium=160.0,
        realized_pnl=-600.0,
        gross_pnl=-550.0,
        net_pnl=-600.0,
        return_pct=-20.0,
        fees=50.0,
        entry_time=datetime(2026, 11, 27, 11, 0, tzinfo=timezone.utc),
        exit_time=datetime(2026, 11, 27, 11, 30, tzinfo=timezone.utc),
        exit_reason="STOP_LOSS_HIT",
        trade_notes="Exited BANKNIFTY51000PE at -20%"
    )
    OptionsAuditArchiver.record_closed_trade(trade2)

    with gzip.open(file_path, "rt", newline="", encoding="utf-8") as gz_in:
        reader = list(csv.DictReader(gz_in))
        assert len(reader) == 2
        assert reader[1]["trade_id"] == "1000"

    archives = OptionsAuditArchiver.list_weekly_archives()
    assert len(archives) == 1
    assert archives[0]["trade_count"] == 2
    assert archives[0]["file_size_kb"] > 0.0


def test_audit_api_endpoints_integration(db, test_user):
    """Verify FastAPI audit endpoints: list weeks, download full CSV, and download weekly .csv.gz."""
    client = TestClient(app)
    token = create_access_token(test_user.id)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. List weeks
    res_weeks = client.get("/api/options/audit/weeks", headers=headers)
    assert res_weeks.status_code == 200
    weeks_json = res_weeks.json()
    assert weeks_json["status"] == "SUCCESS"
    assert isinstance(weeks_json["archives"], list)

    # 2. Download Full CSV
    res_csv = client.get("/api/options/audit/download/csv", headers=headers)
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "Content-Disposition" in res_csv.headers
    csv_text = res_csv.text
    header_line = csv_text.splitlines()[0]
    for col in ["trade_id", "symbol", "realized_pnl", "fees"]:
        assert col in header_line

    # 3. Download Weekly Archive
    if weeks_json["archives"]:
        week_id = weeks_json["archives"][0]["week"]
        res_week_gz = client.get(f"/api/options/audit/download/week?week={week_id}", headers=headers)
        assert res_week_gz.status_code == 200
        assert len(res_week_gz.content) > 0
        # First 2 bytes of valid Gzip are 0x1f 0x8b
        assert res_week_gz.content[:2] == b"\x1f\x8b"
