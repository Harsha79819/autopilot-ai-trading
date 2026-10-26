"""Market Research, News Sentiment & Company Profiles API Router."""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Query
from backend.app.services.news_service import NewsResearchService
from backend.app.market_data import market_provider

router = APIRouter(prefix="/api/research", tags=["Market Research & News"])


@router.get("/news")
def get_news(symbol: Optional[str] = None):
    """Returns curated financial news with sentiment tags and market implications."""
    news = NewsResearchService.get_market_news(symbol)
    return {
        "count": len(news),
        "articles": news
    }


@router.get("/company/{symbol}")
def get_company(symbol: str):
    """Returns in-depth fundamental thesis, balance sheet health, and risks."""
    sym = symbol.strip().upper()
    profile = NewsResearchService.get_company_profile(sym)
    quotes = market_provider.get_quotes([sym])
    quote = quotes.get(sym)

    return {
        **profile,
        "live_price": quote.current_price if quote else None,
        "daily_change_pct": quote.change_pct if quote else None
    }


@router.get("/compare")
def compare_companies(symbols: str = Query("INFY,TCS,ITC")):
    """Compares key valuation and balance sheet metrics across multiple tickers."""
    sym_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    quotes = market_provider.get_quotes(sym_list)

    comparison = []
    for s in sym_list:
        prof = NewsResearchService.get_company_profile(s)
        q = quotes.get(s)
        comparison.append({
            "symbol": s,
            "name": prof.get("name"),
            "sector": prof.get("sector"),
            "current_price": q.current_price if q else 0.0,
            "change_pct": q.change_pct if q else 0.0,
            "pe_ratio": prof.get("pe_ratio"),
            "debt_to_equity": prof.get("debt_to_equity"),
            "roe_pct": prof.get("roe_pct"),
            "dividend_yield_pct": prof.get("dividend_yield_pct"),
            "market_cap_crores": prof.get("market_cap_crores")
        })
    return comparison
