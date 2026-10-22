# AutoPilot AI Trading Platform — System Architecture & Quantitative Design

## 1. Executive Summary

**AutoPilot AI Trading Platform** is a mobile-responsive, quantitative stock market analysis and automated **PAPER TRADING** system designed for Indian equities (NSE).

The platform operates under a strict virtual constraint: every account begins with **exactly INR 500.00** in virtual capital. Real brokerage orders and live execution paths are disabled at the structural level.

To solve the mathematical reality of micro-capital accounts (where transaction fees, taxes, bid-ask spreads, and slippage rapidly erode small gains), AutoPilot incorporates a formal **Cost-Aware Gate** and a **2-Stage Market Scanner** that enforces Indian equity whole-share constraints.

---

## 2. High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                        APPLE LIQUID GLASS FRONTEND (React 18)                     |
|  - Liquid Glass UI (#080B12, 16px blur)       - Real-Time WebSocket Hook (/ws)    |
|  - Responsive Mobile Bottom Glass Bar         - Equity Trajectory & Cost Modals   |
|  - 2-Stage Market Scanner Table               - Strategy Lab & Backtest Viewer    |
+-----------------------------------------------------------------------------------+
                                      |
                     REST APIs & Full-Duplex WebSockets
                                      |
+-----------------------------------------------------------------------------------+
|                               FASTAPI ENGINE LAYER                                |
|                                                                                   |
|  +---------------------------+  +----------------------------------------------+  |
|  |     Security & Auth       |  |          Market Data Engine                  |  |
|  | - JWT Bearer Tokens       |  | - Stochastic NSE Generator (is_demo=True)    |  |
|  | - Multi-User Isolation    |  | - TickStream (1-sec ticks)                   |  |
|  | - Non-bypassable Guards   |  | - CandleAggregator (1m, 5m, 15m bars)        |  |
|  +---------------------------+  | - StalenessDetector (>30s quote rejection)   |  |
|                                 +----------------------------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                            Quantitative Core                                |  |
|  |  +---------------------+  +------------------------+  +------------------+  |  |
|  |  | 2-Stage Scanner     |  | Strategy Engine        |  | Cost-Aware Gate  |  |  |
|  |  | Stage 1: <= Rs 500  |  | - MomentumBreakout     |  | expected_move >= |  |  |
|  |  | Stage 2: Technical  |  | - MeanReversionRSI     |  | K * friction     |  |  |
|  |  +---------------------+  | - TrendFollowing       |  +------------------+  |  |
|  |                           +------------------------+                        |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                          Paper Execution Engine                             |  |
|  |  +------------------------+  +-------------------+  +--------------------+  |  |
|  |  | Risk Manager Guard     |  | Execution Sim     |  | Indian Fee Model   |  |  |
|  |  | - Max Loss Limit (5%)  |  | - Whole-share int |  | - STT, GST, SEBI   |  |  |
|  |  | - Max Drawdown (15%)   |  | - Dynamic Slippage|  | - Turnover, Stamp  |  |  |
|  |  | - Kill Switch Halt     |  | - Bid/Ask Spread  |  | - DP charges (CNC) |  |  |
|  |  +------------------------+  +-------------------+  +--------------------+  |  |
|  |                                         |                                   |  |
|  |                                         v                                   |  |
|  |                      Double-Entry Portfolio Ledger                          |  |
|  |                      - Realized / Unrealized P&L                            |  |
|  |                      - Cash debits/credits & Peak Watermarks                |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                                      |
                           SQLAlchemy ORM (Async)
                                      |
+-----------------------------------------------------------------------------------+
|                        PERSISTENCE & AUDIT TRAILS                                 |
|  - PostgreSQL / Supabase Schema (or zero-config local SQLite: autopilot.db)        |
|  - Users, Portfolios, Positions, Orders, Trades, Immutable AuditLogs              |
+-----------------------------------------------------------------------------------+
```

---

## 3. Quantitative Financial Modeling for Small Capital (INR 500)

### 3.1 The Micro-Account Friction Paradox
On an initial capital of ₹500.00:
- **Whole-share Constraint**: Fractional shares do not exist on the National Stock Exchange of India (NSE). An investor cannot purchase ₹845.00 of Tata Motors or ₹2,850.00 of Reliance with ₹500. The investor can only buy stocks priced $\le ₹500.00$ (e.g., DEMO.AAA @ ₹187.62, Suzlon Energy @ ₹54.50, Vodafone Idea @ ₹7.50, Yes Bank @ ₹19.20, Zomato @ ₹92.80).
- **Delivery vs Intraday Charges**:
  - In Delivery (CNC) equity, depositories (CDSL/NSDL) levy a **DP Charge of ₹15.93 flat per sell trade**. On small accounts, delivery sells consume excessive fixed overhead.
  - Therefore, AutoPilot models Intraday (MIS) mechanics with strict whole-share sizing to avoid destructive flat DP charges.

### 3.2 Indian Statutory Charge Model
Every simulated transaction computes regulatory fees according to SEBI and NSE guidelines:

| Charge Type | Rate / Basis | Applicable Leg |
|---|---|---|
| **Brokerage** | 0.03% or ₹20.00 (whichever is lower) | Buy & Sell |
| **STT (Securities Transaction Tax)** | 0.025% on turnover | Sell (Intraday) |
| **Exchange Turnover Fee (NSE)** | 0.00325% on turnover | Buy & Sell |
| **GST** | 18% on (Brokerage + Exchange Fee) | Buy & Sell |
| **SEBI Turnover Fee** | 0.0001% (₹10 / crore) | Buy & Sell |
| **Stamp Duty** | 0.003% on turnover | Buy |
| **DP Charge** | ₹15.93 flat | Sell (Delivery only) |
| **Simulated Slippage** | 5 basis points (0.05%) | Buy (ask+) / Sell (bid-) |
| **Bid-Ask Spread** | 10 basis points (0.10%) | Dynamic market depth |

### 3.3 The Cost-Aware Gate
Trading strategies that fail to consider friction generate high win-rates in gross backtests but cause catastrophic net drawdowns on live execution.

AutoPilot enforces the **Cost-Aware Gate**:
$$\text{Expected Move \%} \ge K \times \left( \text{Round-Trip Statutory Fees \%} + \text{Bid-Ask Spread \%} + \text{Slippage \%} \right)$$
where $K = 3.0$ by default.

If a technical breakout expects an upward price move of $0.50\%$, but total round-trip friction is $0.25\%$, the hurdle rate is:
$$\text{Hurdle Rate} = 3.0 \times 0.25\% = 0.75\%$$
Because $0.50\% < 0.75\%$, the trade is mathematically unsound. The Strategy Engine automatically rejects the trade with a transparent `NO_TRADE (Cost Gate Failed)` decision.

---

## 4. 2-Stage Market Scanner

The scanner evaluates the market universe through two sequential filters:

1. **Stage 1: Universe Gating**:
   - Computes $\text{Affordable Shares} = \lfloor \frac{\text{Available Cash}}{\text{Current Market Price}} \rfloor$.
   - Flags stocks where $\text{Affordable Shares} < 1$ with explicit rejection reason `Price above cash`.
   - Rejects instruments with wide bid-ask spreads ($> 0.35\%$).
2. **Stage 2: Technical & Cost Gate Gating**:
   - Calculates 14-period RSI, 9/21 Exponential Moving Averages, and ATR bands.
   - Evaluates active strategies for entry triggers.
   - Validates the Cost-Aware Gate (`Edge below 3x costs`). Only opportunities clearing all filters are labeled `Eligible` with `Decision: BUY <SYM>`.

---

## 5. Non-Bypassable Risk Management

Server-side risk checks run prior to every simulated order:

1. **Emergency Kill Switch**: Immediately halts order simulation, cancels pending orders, and freezes auto-trading. Accessible via UI and `/api/risk/kill-switch`.
2. **Configurable Daily Loss Trigger**: Restricts daily cumulative net loss to $2.0\%$ of capital (₹10.00 trigger on ₹500). Auto-halts if exceeded.
3. **Max Portfolio Drawdown Cutoff**: Restricts peak-to-trough drawdown to $15.0\%$ (₹75.00 on ₹500).
4. **Stale Data Rejection**: Rejects orders if quote timestamp is $> 30$ seconds old.
5. **Anti-Martingale Rule**: Position sizing never increases after losing trades.

---

## 6. Modular Quantitative Strategies

1. **MomentumBreakout**:
   - *Entry*: 9 EMA crosses above 21 EMA + 20-period close breakout + volume $\ge 1.15\times$ 20-period average.
   - *Exit*: 9 EMA crosses below 21 EMA or trailing stop.
2. **MeanReversionRSI**:
   - *Entry*: RSI(14) $\le 35$ + price touches lower Bollinger Band (2-sigma) + green reversal candle.
   - *Exit*: RSI $\ge 55$ or price touches 20 SMA middle band.
3. **TrendFollowing (Supertrend)**:
   - *Entry*: Price crosses above dynamic ATR(10) upper resistance band.
   - *Exit*: Price closes below dynamic ATR trailing support band.

---

## 7. Backtesting Methodology

- **Chronological Partitions**: 60% Train, 20% Validation, 20% Test partitions to eliminate look-ahead bias and survivorship bias.
- **Tick/Bar Stepping**: Sequential bar-by-bar evaluation with real statutory fee deductions on every fill.
- **Reporting**: Full equity trajectory, win rate, Sharpe ratio, profit factor, max drawdown, and cost drag analysis.
