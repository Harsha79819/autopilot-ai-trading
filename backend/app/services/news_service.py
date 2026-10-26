"""Financial News Aggregation, Sentiment Analysis & Company Research Service."""
from typing import List, Dict, Any
from datetime import datetime, timedelta


class NewsResearchService:
    """Provides market news analysis, sentiment classification, and company profiles."""

    # Curated Indian market news stream with sentiment and implications
    CURATED_NEWS: List[Dict[str, Any]] = [
        {
            "id": 1,
            "title": "RBI Maintains Repo Rate at 6.50%; Emphasizes Inflation Glide Path to 4%",
            "source": "Reserve Bank of India Bulletin",
            "url": "https://www.rbi.org.in",
            "summary": "The Monetary Policy Committee unanimously kept the benchmark repo rate unchanged. Governor highlighted resilient domestic GDP growth at 7.2% while keeping liquidity watchful.",
            "sentiment": "BULLISH",
            "sentiment_score": 0.65,
            "symbols": ["SBIN", "HDFCBANK", "ICICIBANK"],
            "impact_implications": "Steady borrowing costs benefit banking net interest margins and capital-intensive infrastructure firms. Positive for equity valuations.",
            "published_at": (datetime.utcnow() - timedelta(hours=2)).isoformat()
        },
        {
            "id": 2,
            "title": "Indian IT Services Sector Sees Strong Q3 Cloud & AI Deal Wins in North America",
            "source": "Economic Times Tech",
            "url": "https://economictimes.indiatimes.com",
            "summary": "Large Indian tech majors reported robust sequential total contract values (TCV), driven by enterprise generative AI modernizations and legacy cloud migrations.",
            "sentiment": "BULLISH",
            "sentiment_score": 0.75,
            "symbols": ["INFY", "TCS", "WIPRO"],
            "impact_implications": "Signals cyclical rebound in IT spending. Favorable for margin expansion and operating cash flows.",
            "published_at": (datetime.utcnow() - timedelta(hours=5)).isoformat()
        },
        {
            "id": 3,
            "title": "Global Crude Oil Swings Amid Geopolitical Supply Risks",
            "source": "Financial Express Commodities",
            "url": "https://www.financialexpress.com",
            "summary": "Brent crude volatility prompts caution across domestic oil marketing companies and transport logistics sectors.",
            "sentiment": "BEARISH",
            "sentiment_score": -0.45,
            "symbols": ["RELIANCE"],
            "impact_implications": "Higher import bills could pressure gross margins for petrochemical refiners and fuel distributors.",
            "published_at": (datetime.utcnow() - timedelta(hours=8)).isoformat()
        },
        {
            "id": 4,
            "title": "Defence Procurement Council Clears ₹45,000 Crore Domestic Indigenous Orders",
            "source": "Press Information Bureau",
            "url": "https://pib.gov.in",
            "summary": "Ministry of Defence approved major capital acquisitions for next-generation electronic warfare systems and radar payloads under Make in India.",
            "sentiment": "BULLISH",
            "sentiment_score": 0.85,
            "symbols": ["BEL"],
            "impact_implications": "Multi-year revenue visibility for domestic PSU defense electronics manufacturers with zero debt.",
            "published_at": (datetime.utcnow() - timedelta(hours=14)).isoformat()
        },
        {
            "id": 5,
            "title": "FII Inflows Rebound into Indian Equities on Solid Domestic Consumption Trends",
            "source": "NSE Market Pulse",
            "url": "https://www.nseindia.com",
            "summary": "Foreign Institutional Investors recorded net purchases of ₹3,400 Cr in cash equities, supported by strong festival demand and rural purchasing power.",
            "sentiment": "BULLISH",
            "sentiment_score": 0.58,
            "symbols": ["ITC", "HDFCBANK"],
            "impact_implications": "Broader index liquidity support; reduces downside volatility across quality Nifty 50 counters.",
            "published_at": (datetime.utcnow() - timedelta(hours=22)).isoformat()
        }
    ]

    COMPANY_PROFILES: Dict[str, Dict[str, Any]] = {
        "INFY": {
            "symbol": "INFY",
            "name": "Infosys Limited",
            "sector": "Information Technology",
            "industry": "IT Consulting & Software",
            "market_cap_crores": 685000.0,
            "pe_ratio": 26.4,
            "debt_to_equity": 0.08,
            "roe_pct": 31.8,
            "dividend_yield_pct": 2.2,
            "business_summary": "Global leader in digital consulting, cloud services, and next-generation artificial intelligence platforms for Fortune 500 enterprises.",
            "bullish_thesis": "Pristine debt-free balance sheet, high ROE (>30%), and accelerating enterprise AI integration deals.",
            "bearish_risks": "Potential slowdown in European client discretionary budgets and currency exchange headwinds."
        },
        "TCS": {
            "symbol": "TCS",
            "name": "Tata Consultancy Services Ltd",
            "sector": "Information Technology",
            "industry": "IT Services & Solutions",
            "market_cap_crores": 1420000.0,
            "pe_ratio": 29.8,
            "debt_to_equity": 0.04,
            "roe_pct": 48.2,
            "dividend_yield_pct": 1.6,
            "business_summary": "Largest IT services organization in India with industry-leading operating profit margins and massive long-term public and private client relationships.",
            "bullish_thesis": "Exceptional return on equity (48%), strong free cash flow generation, and high dividend payout consistency.",
            "bearish_risks": "Extended deal decision cycles among banking/financial services clients."
        },
        "ITC": {
            "symbol": "ITC",
            "name": "ITC Limited",
            "sector": "Fast Moving Consumer Goods (FMCG)",
            "industry": "Diversified Conglomerate",
            "market_cap_crores": 570000.0,
            "pe_ratio": 27.5,
            "debt_to_equity": 0.01,
            "roe_pct": 28.5,
            "dividend_yield_pct": 3.1,
            "business_summary": "Diversified Indian conglomerate with market leadership in FMCG foods, personal care, paperboards, packaging, and agricultural export businesses.",
            "bullish_thesis": "Virtually zero debt (0.01), strong rural consumption recovery, robust dividend yield (>3%), and steady cash generation.",
            "bearish_risks": "Raw material commodity inflation and taxation policy changes."
        },
        "BEL": {
            "symbol": "BEL",
            "name": "Bharat Electronics Limited",
            "sector": "Defence & Aerospace",
            "industry": "Defence Electronics",
            "market_cap_crores": 215000.0,
            "pe_ratio": 38.2,
            "debt_to_equity": 0.0,
            "roe_pct": 26.4,
            "dividend_yield_pct": 1.1,
            "business_summary": "Navratna PSU under the Ministry of Defence specializing in advanced radar, electronic warfare systems, avionics, and naval sonars.",
            "bullish_thesis": "Zero debt, massive order book exceeding 3x annual revenue, and strong Make-in-India indigenization mandates.",
            "bearish_risks": "Dependence on government budget allocations and order execution timeline delays."
        },
        "HDFCBANK": {
            "symbol": "HDFCBANK",
            "name": "HDFC Bank Limited",
            "sector": "Financial Services",
            "industry": "Private Sector Bank",
            "market_cap_crores": 1280000.0,
            "pe_ratio": 18.9,
            "debt_to_equity": 0.85,
            "roe_pct": 16.5,
            "dividend_yield_pct": 1.2,
            "business_summary": "India's largest private sector bank providing retail banking, wholesale lending, mortgage finance, and nationwide digital payment services.",
            "bullish_thesis": "Market-leading credit quality, best-in-class low NPA ratios, and attractive valuation post-merger integration.",
            "bearish_risks": "Deposit growth competition putting transient pressure on net interest margins."
        }
    }

    @classmethod
    def get_market_news(cls, symbol: str = None) -> List[Dict[str, Any]]:
        if not symbol:
            return cls.CURATED_NEWS
        return [n for n in cls.CURATED_NEWS if symbol.upper() in n.get("symbols", [])]

    @classmethod
    def get_company_profile(cls, symbol: str) -> Dict[str, Any]:
        return cls.COMPANY_PROFILES.get(symbol.upper(), {
            "symbol": symbol.upper(),
            "name": f"{symbol.upper()} Equity",
            "sector": "Indian Equities",
            "industry": "NSE Listed",
            "market_cap_crores": 50000.0,
            "pe_ratio": 22.0,
            "debt_to_equity": 0.5,
            "roe_pct": 15.0,
            "dividend_yield_pct": 1.0,
            "business_summary": "Actively tracked equity counter in the Nifty universe.",
            "bullish_thesis": "Established operations with steady institutional presence.",
            "bearish_risks": "Market beta and sector cyclicality."
        })
