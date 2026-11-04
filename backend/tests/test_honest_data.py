import pytest
from backend.app.skills.trader_skill_engine import TraderSkillEngine
from backend.app.api.ai_chat_router import generate_copilot_response
from backend.app.models.portfolio import Portfolio


def test_pelosi_skill_does_not_fabricate_turnover():
    """Verify pelosi skill clearly states institutional data is not available."""
    res_en = TraderSkillEngine.pelosi_skill(is_te=False)
    assert "1,245" not in res_en
    assert "2,180" not in res_en
    assert "not available" in res_en.lower()

    res_te = TraderSkillEngine.pelosi_skill(is_te=True)
    assert "1,245" not in res_te
    assert "అందుబాటులో లేదు" in res_te


def test_compounding_skill_zero_deposit():
    """Verify compounding skill handles zero or empty initial capital honestly."""
    res = TraderSkillEngine.compounding_skill(current_val=0.0, total_deposited=0.0, is_te=False)
    assert "No data yet" in res
    assert "27.30" not in res


def test_tax_skill_zero_realized():
    """Verify tax skill reports no data yet when realized gain is zero."""
    res = TraderSkillEngine.tax_skill(realized_gains=0.0, total_fees=0.0, is_te=False)
    assert "No data yet" in res


def test_rebalance_skill_zero_value():
    """Verify rebalance skill handles zero portfolio value without div-by-zero or fake allocations."""
    res = TraderSkillEngine.rebalance_skill(portfolio_val=0.0, cash=0.0, is_te=False)
    assert "No data yet" in res


def test_overall_pnl_chat_empty_portfolio():
    """Verify overall profit query for brand new user with no trades returns clean empty state."""
    portfolio = Portfolio(id=1, user_id=1, initial_cash=5000.0, cash_balance=5000.0)
    ctx = {
        "portfolio": portfolio,
        "metrics": None,
        "positions": [],
        "recent_trades": [],
    }
    reply = generate_copilot_response("overall profit entha", ctx)
    assert "5,727.75" not in reply
    assert "227.75" not in reply
    assert "No data yet" in reply or "డేటా లభించలేదు" in reply
