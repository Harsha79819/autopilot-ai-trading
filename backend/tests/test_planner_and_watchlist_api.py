"""Automated API integration tests for Planner, Research, and Reports endpoints."""
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import get_db

client = TestClient(app)


def test_planner_sip_api():
    res = client.post("/api/planner/calculate/sip", json={
        "monthly_investment": 5000.0,
        "expected_annual_return_pct": 12.0,
        "tenure_years": 10,
        "annual_inflation_pct": 6.0
    })
    assert res.status_code == 200
    data = res.json()
    assert data["invested_amount"] == 600000.0
    assert data["total_value"] > 1150000.0


def test_planner_emi_api():
    res = client.post("/api/planner/calculate/emi", json={
        "principal": 1000000.0,
        "annual_interest_rate_pct": 8.5,
        "tenure_months": 120
    })
    assert res.status_code == 200
    data = res.json()
    assert 12000.0 <= data["emi"] <= 13000.0


def test_research_endpoints():
    news_res = client.get("/api/research/news")
    assert news_res.status_code == 200
    news_data = news_res.json()
    assert news_data["count"] >= 3

    comp_res = client.get("/api/research/company/INFY")
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    assert comp_data["symbol"] == "INFY"
    assert "Infosys" in comp_data["name"]

    compare_res = client.get("/api/research/compare?symbols=INFY,TCS")
    assert compare_res.status_code == 200
    compare_data = compare_res.json()
    assert len(compare_data) == 2
