"""
Live AI News & Sentiment Gate.
Analyzes real-time news headlines, FII flow sentiment, and sector catalysts for NSE symbols.
Blocks autonomous BUY orders if high-severity negative news or bearish sentiment is detected.
"""
from typing import Dict, Any, List, Tuple
import logging
from datetime import datetime

logger = logging.getLogger("autopilot.news_sentiment_gate")

# Critical negative risk keywords that signal dangerous headwinds
NEGATIVE_HEADLINE_KEYWORDS = [
    "crash", "plunge", "plunges", "slump", "sharp fall", "tumble",
    "fii outflow", "fii selling", "fii exit", "heavy selling",
    "probe", "investigation", "raid", "cbi", "ed probe", "sebi penalty",
    "downgrade", "downgraded", "target cut", "sell rating",
    "default", "fraud", "scam", "loss", "net loss", "profit drops", "earnings miss",
    "strike", "halt", "shutdown", "caution", "warning", "distress"
]

POSITIVE_HEADLINE_KEYWORDS = [
    "rally", "surge", "surges", "breakout", "jump", "record profit",
    "order win", "contract win", "expansion", "dividend", "upgrade", "buy rating",
    "fii inflow", "bullish", "strong results", "growth"
]

class NewsSentimentGate:
    """Pre-trade safety gate checking real-time news & institutional sentiment."""
    
    def __init__(self):
        self._cached_sentiments: Dict[str, Tuple[bool, float, str, datetime]] = {}

    def evaluate_news_safety(self, symbol: str) -> Tuple[bool, float, str]:
        """
        Evaluates whether a symbol is safe to buy from a headline/sentiment perspective.
        Returns: (is_safe: bool, sentiment_score: float (-1.0 to 1.0), reason: str)
        """
        try:
            from backend.app.services.news_service import NewsResearchService
        except ImportError:
            from app.services.news_service import NewsResearchService
        
        articles = NewsResearchService.get_market_news(symbol)
        
        score = 0.0
        reasons = []
        is_safe = True
        
        for art in articles:
            title = art.get("title", "").lower()
            summary = art.get("summary", "").lower()
            text = f"{title} {summary}"
            
            # Check for negative trigger keywords
            found_negative = [kw for kw in NEGATIVE_HEADLINE_KEYWORDS if kw in text]
            if found_negative:
                score -= 0.5 * len(found_negative)
                reasons.append(f"Negative catalyst: {', '.join(found_negative)}")
                is_safe = False
                
            found_positive = [kw for kw in POSITIVE_HEADLINE_KEYWORDS if kw in text]
            if found_positive:
                score += 0.3 * len(found_positive)
                
            art_score = art.get("sentiment_score", 0.0)
            score += art_score
            
        score = max(-1.0, min(1.0, round(score, 2)))
        
        if score < -0.2:
            is_safe = False
            reasons.append(f"Bearish sentiment score ({score})")
            
        final_reason = "; ".join(reasons) if reasons else "News sentiment neutral/favorable"
        return is_safe, score, final_reason

news_sentiment_gate = NewsSentimentGate()
