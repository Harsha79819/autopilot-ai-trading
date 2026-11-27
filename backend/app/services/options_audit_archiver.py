"""Options Desk Audit Archiver - Compressed Cold Storage & Weekly Gzip Archiving."""
import os
import csv
import gzip
import io
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.app.models.options_models import OptionTrade

logger = logging.getLogger("autopilot.audit_archiver")

ARCHIVE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "audit_archives"

AUDIT_CSV_COLUMNS = [
    "trade_id",
    "symbol",
    "underlying",
    "strike_price",
    "option_type",
    "strategy_type",
    "expiry_date",
    "lot_size",
    "quantity",
    "entry_premium",
    "exit_premium",
    "realized_pnl",
    "gross_pnl",
    "net_pnl",
    "return_pct",
    "total_fees",
    "brokerage",
    "stt",
    "exchange_charges",
    "gst",
    "stamp_duty",
    "sebi_charges",
    "entry_time",
    "exit_time",
    "exit_reason",
    "trade_notes"
]


class OptionsAuditArchiver:
    """Manages append-only compressed cold storage (.csv.gz) for all closed option trades."""

    @classmethod
    def get_archive_dir(cls) -> Path:
        """Ensure archive directory exists and return Path."""
        ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
        return ARCHIVE_DIR

    @classmethod
    def get_week_identifier(cls, dt: Optional[datetime] = None) -> str:
        """Return ISO calendar week string, e.g. '2026_W48'."""
        if dt is None:
            dt = datetime.now(timezone.utc)
        return dt.strftime("%Y_W%V")

    @classmethod
    def format_trade_row(cls, trade: OptionTrade) -> Dict[str, Any]:
        """Convert OptionTrade ORM model to dictionary row matching AUDIT_CSV_COLUMNS."""
        entry_iso = trade.entry_time.isoformat() if trade.entry_time else ""
        exit_iso = trade.exit_time.isoformat() if trade.exit_time else ""
        return {
            "trade_id": trade.id,
            "symbol": trade.symbol,
            "underlying": trade.underlying,
            "strike_price": round(trade.strike_price, 2),
            "option_type": trade.option_type,
            "strategy_type": getattr(trade, "strategy_type", "NAKED") or "NAKED",
            "expiry_date": trade.expiry_date,
            "lot_size": trade.lot_size,
            "quantity": trade.quantity,
            "entry_premium": round(trade.entry_premium, 2),
            "exit_premium": round(trade.exit_premium, 2),
            "realized_pnl": round(trade.realized_pnl, 2),
            "gross_pnl": round(getattr(trade, "gross_pnl", 0.0) or 0.0, 2),
            "net_pnl": round(getattr(trade, "net_pnl", trade.realized_pnl) or trade.realized_pnl, 2),
            "return_pct": round(trade.return_pct, 2),
            "total_fees": round(trade.fees, 2),
            "brokerage": round(getattr(trade, "brokerage", 40.0) or 40.0, 2),
            "stt": round(getattr(trade, "stt", 0.0) or 0.0, 2),
            "exchange_charges": round(getattr(trade, "exchange_charges", 0.0) or 0.0, 2),
            "gst": round(getattr(trade, "gst", 0.0) or 0.0, 2),
            "stamp_duty": round(getattr(trade, "stamp_duty", 0.0) or 0.0, 2),
            "sebi_charges": round(getattr(trade, "sebi_charges", 0.0) or 0.0, 2),
            "entry_time": entry_iso,
            "exit_time": exit_iso,
            "exit_reason": trade.exit_reason,
            "trade_notes": trade.trade_notes or ""
        }

    @classmethod
    def record_closed_trade(cls, trade: OptionTrade) -> Path:
        """
        Append a closed trade to the corresponding weekly Gzip compressed archive (.csv.gz).
        Guarantees append-only persistence without data loss.
        """
        archive_dir = cls.get_archive_dir()
        week_str = cls.get_week_identifier(trade.exit_time)
        file_path = archive_dir / f"options_audit_{week_str}.csv.gz"

        existing_rows: List[Dict[str, Any]] = []
        if file_path.exists():
            try:
                with gzip.open(file_path, "rt", newline="", encoding="utf-8") as gz_in:
                    reader = csv.DictReader(gz_in)
                    for r in reader:
                        # Avoid duplicates if trade_id already exists in week file
                        if str(r.get("trade_id")) != str(trade.id):
                            existing_rows.append(r)
            except Exception as e:
                logger.warning(f"Error reading existing gzip archive {file_path.name}: {e}")

        # Append new trade row
        new_row = cls.format_trade_row(trade)
        existing_rows.append(new_row)

        # Write back compressed
        try:
            with gzip.open(file_path, "wt", newline="", encoding="utf-8") as gz_out:
                writer = csv.DictWriter(gz_out, fieldnames=AUDIT_CSV_COLUMNS)
                writer.writeheader()
                for r in existing_rows:
                    writer.writerow(r)
            logger.info(f"Recorded trade #{trade.id} ({trade.symbol}) into weekly archive {file_path.name} (Total: {len(existing_rows)} trades)")
        except Exception as e:
            logger.error(f"Failed to write trade to gzip archive {file_path}: {e}")

        return file_path

    @classmethod
    def list_weekly_archives(cls) -> List[Dict[str, Any]]:
        """Return list of all available weekly compressed archives with file metadata."""
        archive_dir = cls.get_archive_dir()
        archives = []

        for gz_file in sorted(archive_dir.glob("options_audit_*.csv.gz"), reverse=True):
            name = gz_file.name
            week_part = name.replace("options_audit_", "").replace(".csv.gz", "")
            size_kb = round(gz_file.stat().st_size / 1024.0, 2)

            trade_count = 0
            try:
                with gzip.open(gz_file, "rt", newline="", encoding="utf-8") as gz_in:
                    reader = csv.reader(gz_in)
                    # Skip header
                    next(reader, None)
                    trade_count = sum(1 for _ in reader)
            except Exception:
                pass

            archives.append({
                "week": week_part.replace("_", "-"),
                "filename": name,
                "trade_count": trade_count,
                "file_size_kb": size_kb,
                "modified_at": datetime.fromtimestamp(gz_file.stat().st_mtime, tz=timezone.utc).isoformat()
            })

        return archives

    @classmethod
    def get_weekly_archive_path(cls, week_str: str) -> Optional[Path]:
        """Resolve path to weekly archive, handling formatting variations like '2026-W48' or '2026_W48'."""
        clean_week = week_str.strip().replace("-", "_")
        file_path = cls.get_archive_dir() / f"options_audit_{clean_week}.csv.gz"
        if file_path.exists() and file_path.is_file():
            return file_path
        return None

    @classmethod
    def export_full_csv_string(cls, db: Session, user_id: Optional[int] = None) -> str:
        """
        Generate complete uncompressed CSV string of all closed option trades for Excel / tax audit.
        Streams from DB ordered chronologically.
        """
        query = db.query(OptionTrade)
        if user_id:
            query = query.filter(OptionTrade.portfolio_id == user_id)
        trades = query.order_by(OptionTrade.exit_time.asc()).all()

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=AUDIT_CSV_COLUMNS)
        writer.writeheader()

        for t in trades:
            writer.writerow(cls.format_trade_row(t))

        return output.getvalue()

    @classmethod
    def backfill_from_db(cls, db: Session):
        """Seed all historical closed trades from DB into weekly compressed archives if missing."""
        trades = db.query(OptionTrade).order_by(OptionTrade.exit_time.asc()).all()
        for t in trades:
            cls.record_closed_trade(t)
