import pytest
from backend.app.scanner.news_sentiment_gate import news_sentiment_gate, NewsSentimentGate

def test_news_sentiment_gate_evaluation():
    # Test safe symbol
    is_safe, score, reason = news_sentiment_gate.evaluate_news_safety("INFY")
    assert isinstance(is_safe, bool)
    assert isinstance(score, float)
    assert isinstance(reason, str)

def test_news_sentiment_gate_blocks_negative():
    # Custom test checking negative keyword detection
    gate = NewsSentimentGate()
    # Mock articles with negative crash news
    from backend.app.services.news_service import NewsResearchService
    orig_news = NewsResearchService.CURATED_NEWS
    try:
        NewsResearchService.CURATED_NEWS = [{
            "id": 999,
            "title": "Stock Plunges as FII Selling Triggers Heavy Loss and CBI Probe",
            "source": "Market News",
            "url": "https://example.com",
            "summary": "Heavy crash with SEBI penalty and target cut",
            "sentiment": "BEARISH",
            "sentiment_score": -0.8,
            "symbols": ["BADSTOCK"]
        }]
        is_safe, score, reason = gate.evaluate_news_safety("BADSTOCK")
        assert is_safe is False
        assert score < 0.0
        assert "Negative catalyst" in reason or "Bearish sentiment" in reason
    finally:
        NewsResearchService.CURATED_NEWS = orig_news
