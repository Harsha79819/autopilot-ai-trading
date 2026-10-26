"""Database models for News, Sentiment Analysis, and Company Research Profiles."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
from backend.app.database import Base


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    source = Column(String(100), nullable=False)
    url = Column(String(500), nullable=True)
    summary = Column(Text, nullable=False)
    sentiment = Column(String(20), default="NEUTRAL")  # BULLISH, BEARISH, NEUTRAL
    sentiment_score = Column(Float, default=0.0)  # -1.0 to +1.0
    symbols = Column(JSON, default=list)  # ["INFY", "TCS"]
    impact_implications = Column(Text, nullable=True)
    published_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CompanyProfile(Base):
    __tablename__ = "company_profiles"

    symbol = Column(String(20), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    sector = Column(String(50), nullable=False)
    industry = Column(String(100), nullable=True)
    market_cap_crores = Column(Float, nullable=False)
    pe_ratio = Column(Float, nullable=True)
    debt_to_equity = Column(Float, nullable=True)
    roe_pct = Column(Float, nullable=True)
    dividend_yield_pct = Column(Float, default=0.0)
    business_summary = Column(Text, nullable=False)
    bullish_thesis = Column(Text, nullable=True)
    bearish_risks = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
