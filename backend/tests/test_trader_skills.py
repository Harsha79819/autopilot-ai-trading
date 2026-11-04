"""
Unit and integration tests for TraderSkillEngine (11 adapted Claude skills)
and AI Chat Copilot overall PnL query response.
"""
import pytest
from backend.app.skills.trader_skill_engine import TraderSkillEngine
from backend.app.api.ai_chat_router import generate_copilot_response


def test_trader_skill_analyst():
    quotes = {}
    te_res = TraderSkillEngine.analyst_skill("ITC", quotes, is_te=True)
    en_res = TraderSkillEngine.analyst_skill("ITC", quotes, is_te=False)

    assert "trader-analyst" in te_res
    assert "ITC" in te_res
    assert "Take Profit" in en_res or "1:2 Risk-Reward" in en_res
    assert "20-డే EMA" in te_res


def test_trader_skill_budget_and_sizing():
    res = TraderSkillEngine.budget_skill("BEL", price=288.0, cash=3178.75, is_te=True)
    assert "trader-budget" in res
    assert "BEL" in res
    assert "Whole Shares" in res or "పూర్తి షేర్లు" in res
    assert "Van Tharp 1.5% రిస్క్ పరిమితి" in res


def test_trader_skill_broker_safety():
    res = TraderSkillEngine.broker_skill("BEL", "BUY", 3, 288.0, 3178.75, is_te=True)
    assert "trader-broker" in res
    assert "STRICT PAPER ONLY" in res
    assert "ఆటోపైలట్ (AutoPilot) బ్యాక్‌గ్రౌండ్ ట్రేడింగ్" in res
    assert "కొనసాగుతూనే ఉంటుంది" in res


def test_trader_skill_tax_budget_2024():
    res = TraderSkillEngine.tax_skill(realized_gains=88.04, is_te=True)
    assert "trader-tax" in res
    assert "STCG @ 20%" in res
    assert "₹17.61" in res


def test_trader_skill_pelosi_institutional():
    res = TraderSkillEngine.pelosi_skill(is_te=True)
    assert "trader-pelosi" in res
    assert "FII" in res
    assert "DII" in res


def test_overall_pnl_query_resolution():
    mock_ctx = {
        "portfolio": None,
        "metrics": None,
        "positions": [],
        "quotes": {},
        "today_logs": [],
        "historical_errors": [],
        "recent_trades": [],
        "db": None
    }
    
    # Empty portfolio test: honest data reporting
    query = "overal ga total lo profit entha loss entha"
    reply = generate_copilot_response(query, mock_ctx)
    
    assert "No data yet" in reply or "డేటా లభించలేదు" in reply
    assert "5,727.75" not in reply
    assert "+₹227.75" not in reply


def test_slash_trader_command_dispatch():
    mock_ctx = {
        "portfolio": None,
        "metrics": None,
        "positions": [],
        "quotes": {},
        "today_logs": [],
        "historical_errors": [],
        "recent_trades": [],
        "db": None
    }
    
    reply = generate_copilot_response("/trader-analyst BEL", mock_ctx)
    assert "trader-analyst" in reply
    assert "BEL" in reply
