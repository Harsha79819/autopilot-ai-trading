"""API endpoints for the Automated Trading Journal."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.models.trading_journal import TradingJournal
from backend.app.schemas.trading_journal import TradingJournalResponse, TradingJournalSummary

router = APIRouter(prefix="/api/journal", tags=["Trading Journal"])


@router.get("", response_model=TradingJournalSummary)
def get_trading_journal(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve full trading journal entries and performance analytics for current user."""
    portfolio = current_user.portfolio
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found for current user."
        )

    entries = db.query(TradingJournal).filter(
        TradingJournal.user_id == current_user.id
    ).order_by(desc(TradingJournal.closed_at)).limit(limit).all()

    total_count = len(entries)
    winning_count = sum(1 for e in entries if e.realized_pnl > 0)
    losing_count = sum(1 for e in entries if e.realized_pnl < 0)
    win_rate = round((winning_count / total_count * 100.0), 1) if total_count > 0 else 0.0
    total_pnl = round(sum(e.realized_pnl for e in entries), 2)
    avg_rr = round(sum(e.risk_reward_ratio for e in entries) / total_count, 2) if total_count > 0 else 2.0
    disciplined_count = sum(1 for e in entries if e.emotion_tag == "DISCIPLINED")
    disciplined_pct = round((disciplined_count / total_count * 100.0), 1) if total_count > 0 else 100.0

    return TradingJournalSummary(
        total_trades_logged=total_count,
        winning_trades=winning_count,
        losing_trades=losing_count,
        win_rate_pct=win_rate,
        average_risk_reward=avg_rr,
        total_realized_pnl=total_pnl,
        disciplined_trades_pct=disciplined_pct,
        recent_entries=[TradingJournalResponse.model_validate(e) for e in entries]
    )


@router.post("/{entry_id}/emotion")
def update_journal_emotion(
    entry_id: int,
    emotion_tag: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Allow user to update emotional self-reflection tag on a journal entry."""
    entry = db.query(TradingJournal).filter(
        TradingJournal.id == entry_id,
        TradingJournal.user_id == current_user.id
    ).first()

    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found.")

    valid_tags = ["DISCIPLINED", "PATIENT", "GREED", "FOMO", "FEAR", "REVENGE"]
    normalized = emotion_tag.upper().strip()
    if normalized not in valid_tags:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid emotion tag. Must be one of: {', '.join(valid_tags)}"
        )

    entry.emotion_tag = normalized
    db.commit()
    db.refresh(entry)
    return {"status": "success", "emotion_tag": entry.emotion_tag}
