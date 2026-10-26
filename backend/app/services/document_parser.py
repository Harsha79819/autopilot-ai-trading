"""Document Intelligence & Safe Financial File Parser with Prompt Injection Guards."""
import csv
import io
import re
from typing import Dict, Any, List


class DocumentParserService:
    """Safe ingestion and parsing for financial CSVs and broker trade books."""

    # Disallowed tokens for prompt injection prevention
    PROMPT_INJECTION_PATTERNS = [
        re.compile(r"ignore\s+(all\s+)?previous\s+instructions", re.IGNORECASE),
        re.compile(r"system\s*prompt", re.IGNORECASE),
        re.compile(r"you\s+are\s+now", re.IGNORECASE),
        re.compile(r"bypass\s+safety", re.IGNORECASE),
        re.compile(r"delete\s+from", re.IGNORECASE),
        re.compile(r"<script.*?>", re.IGNORECASE),
    ]

    @classmethod
    def sanitize_text(cls, text: str) -> str:
        """Sanitizes document text to prevent prompt injection and XSS."""
        sanitized = text
        for pattern in cls.PROMPT_INJECTION_PATTERNS:
            sanitized = pattern.sub("[FILTERED_INPUT]", sanitized)
        return sanitized.strip()

    @classmethod
    def parse_csv_transactions(cls, file_content: str) -> Dict[str, Any]:
        """
        Parses a transaction CSV string, extracting structured trade records.
        Expected headers (flexible): date/timestamp, symbol/stock, side/type, quantity/qty, price/rate.
        """
        file_io = io.StringIO(file_content)
        reader = csv.DictReader(file_io)

        records: List[Dict[str, Any]] = []
        total_turnover = 0.0
        buy_count = 0
        sell_count = 0

        for row in reader:
            normalized_row = {k.strip().lower(): v.strip() for k, v in row.items() if k}

            # Flexible header matching
            symbol = (
                normalized_row.get("symbol") or
                normalized_row.get("stock") or
                normalized_row.get("ticker") or
                "UNKNOWN"
            ).upper()

            side = (
                normalized_row.get("side") or
                normalized_row.get("type") or
                normalized_row.get("action") or
                "BUY"
            ).upper()

            try:
                qty_str = normalized_row.get("quantity") or normalized_row.get("qty") or "1"
                quantity = int(float(qty_str))
            except (ValueError, TypeError):
                quantity = 1

            try:
                price_str = normalized_row.get("price") or normalized_row.get("rate") or "0.0"
                price = float(price_str)
            except (ValueError, TypeError):
                price = 0.0

            date_str = (
                normalized_row.get("date") or
                normalized_row.get("timestamp") or
                normalized_row.get("trade_date") or
                "2026-10-26"
            )

            record = {
                "symbol": cls.sanitize_text(symbol),
                "side": "BUY" if "BUY" in side else "SELL",
                "quantity": quantity,
                "price": round(price, 2),
                "turnover": round(quantity * price, 2),
                "date": cls.sanitize_text(date_str)
            }
            records.append(record)
            total_turnover += record["turnover"]
            if record["side"] == "BUY":
                buy_count += 1
            else:
                sell_count += 1

        summary = (
            f"Parsed {len(records)} transactions ({buy_count} buys, {sell_count} sells) "
            f"with total traded volume of ₹{total_turnover:,.2f}."
        )

        return {
            "status": "SUCCESS",
            "total_records": len(records),
            "buy_count": buy_count,
            "sell_count": sell_count,
            "total_turnover_inr": round(total_turnover, 2),
            "summary": summary,
            "records": records[:100]  # First 100 preview
        }
