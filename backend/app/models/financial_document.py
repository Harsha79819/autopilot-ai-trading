"""Database models for Document Intelligence & Uploads."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base


class FinancialDocument(Base):
    __tablename__ = "financial_documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    doc_type = Column(String(50), nullable=False)  # BROKER_STATEMENT, TRANSACTION_CSV, ANNUAL_REPORT, TAX_SUMMARY
    file_size_bytes = Column(Integer, nullable=False)
    summary = Column(Text, nullable=True)
    parsed_transactions = Column(JSON, default=list)  # e.g. [{"date": "...", "symbol": "...", "qty": 10, "price": 100}]
    status = Column(String(20), default="PARSED")  # UPLOADED, PARSED, ERROR
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")
