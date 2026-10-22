# AutoPilot AI Trading Platform 🚀

[![Paper Trading](https://img.shields.io/badge/Mode-Paper%20Trading%20Only-emerald.svg)](#)
[![Capital](https://img.shields.io/badge/Initial%20Virtual%20Capital-INR%20500.00-cyan.svg)](#)
[![Backend Tests](https://img.shields.io/badge/Pytest-23%20Passed-brightgreen.svg)](#)
[![Frontend Tests](https://img.shields.io/badge/Vitest-5%20Passed-brightgreen.svg)](#)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](#)

A modern, mobile-responsive AI-assisted stock market analysis and automated **PAPER TRADING** platform built for Indian equities (NSE).

> [!IMPORTANT]
> **STRICT PAPER TRADING ONLY**: This platform operates strictly in paper-trading simulation mode. Real brokerage order execution is permanently disabled at the code level. Every user begins with exactly **INR 500.00** in virtual capital.

---

## ✨ Key Highlights

- 🍏 **Apple Liquid Glass Interface**: Dark glassmorphic design (`#080B12`, `backdrop-filter: blur(16px)`, cyan and violet ambient glow accents, Inter typography) fully responsive across mobile, tablet, and desktop.
- 📡 **Real-Time Live NSE Market Feed**:
  - **Primary**: Angel One SmartAPI integration with TOTP automation (`ANGEL_ONE_API_KEY`, `ANGEL_ONE_CLIENT_CODE`, `ANGEL_ONE_MPIN`, `ANGEL_ONE_TOTP_TOKEN`).
  - **Fallback / Zero-Login Mode**: Instant public NSE live tick stream using session pooling & 3s TTL caching (`yfinance`). Requires **zero paid API keys** to run.
  - **Session Gate**: Active 09:15 to 15:30 IST (Mon-Fri). Automatically pauses automated buying outside hours with `"MARKET CLOSED (PAPER PAUSED)"`.
- 💰 **Exact ₹500.00 Virtual Capital**: Realistic micro-portfolio simulation enforcing Indian equity **whole-share constraints** (no fractional shares).
- ⚖️ **Indian Regulatory Fee Engine & Realistic Slippage**: Precise modeling of statutory charges:
  - Brokerage: 0.03% or ₹20/order max
  - STT: 0.025% on Intraday sell turnover; 0.1% on delivery
  - Exchange Charges: NSE 0.00325%
  - GST: 18% on (Brokerage + Exchange Charges)
  - SEBI Turnover Fees & Stamp Duty
  - DP Charges: ₹15.93 flat on delivery sell
  - Bid-Ask Spread & 7.5 bps (0.075%) execution slippage buffer
- 🎯 **Automated Target (+2.2%) & Stop-Loss (-1.5%) Triggers**: Autonomous engine continuously monitors live quotes against open position entry prices and executes automatic paper profit-taking or risk-limiting exits.
- 🛡️ **Cost-Aware Gate**:
  $$\text{Expected Move \%} \ge K \times (\text{Statutory Fees \%} + \text{Spread \%} + \text{Slippage \%})$$
  Automatically triggers **NO TRADE** when transaction drag outweighs potential statistical edge.
- 📡 **2-Stage Market Scanner**: Pre-filters universe for real NSE stocks affordable with available cash (e.g., Suzlon, Idea, Yes Bank, IRFC, NHPC, Zomato) while transparently displaying explicit rejection reasons (`Price above cash`, `No setup pattern`, `Stale quote`, `Eligible`).
- 🛑 **Non-Bypassable Risk Controls**:
  - Emergency Kill Switch (instant one-click halt)
  - Configurable Daily Loss Trigger ($2.0\% = ₹10.00$ on ₹500)
  - Max Portfolio Drawdown Cutoff ($15.0\% = ₹75.00$ on ₹500)
  - Stale Data Guard ($> 30\text{s}$ quote rejection)
- 🧪 **Quantitative Backtesting Lab**: Sequential train (60%), validation (20%), and test (20%) chronological data partitioning eliminating look-ahead and survivorship bias.
- ⚡ **Continuous AutoPilot Background Worker**: Async loop executing tick streaming, candle aggregation, scanner evaluations, and paper order fulfillment.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons |
| **Backend** | Python 3.9+, FastAPI, SQLAlchemy, Pydantic v2, Pytest, WebSockets |
| **Database** | SQLite (persistent default for zero-config local run) / PostgreSQL / Supabase |
| **Testing** | Pytest (Backend, 21 tests), Vitest (Frontend, 5 tests) |
| **DevOps** | Multi-stage Dockerfile, Docker Compose |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python**: 3.9 or higher (`python3 --version`)
- **Node.js**: v18 or higher (`node -v`, `npm -v`)

---

### 2. Backend Setup

1. **Activate Python Virtual Environment & Install Dependencies**:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   cd ..
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```

3. **Run Backend Test Suite**:
   ```bash
   backend/.venv/bin/pytest backend/tests -v
   ```
   *Expected result: 21 passed.*

4. **Launch Backend Server**:
   ```bash
   backend/.venv/bin/python backend/run.py
   ```
   *The FastAPI server starts on `http://localhost:8000`. OpenAPI docs available at `http://localhost:8000/docs`.*

---

### 3. Frontend Setup

1. **Install Frontend Dependencies**:
   ```bash
   npm --prefix frontend install
   ```

2. **Run Frontend Tests**:
   ```bash
   npm --prefix frontend test
   ```
   *Expected result: 5 passed.*

3. **Launch Frontend Development Server**:
   ```bash
   npm --prefix frontend run dev
   ```
   *The frontend starts on `http://localhost:5173` with proxy routing to the backend.*

---

## 🧪 Automated Test Verification Results

### Backend Pytest Suite (23 Tests)
```
backend/tests/test_api_integration.py::test_health_endpoint PASSED
backend/tests/test_api_integration.py::test_auth_and_portfolio_lifecycle PASSED
backend/tests/test_cost_gate.py::test_cost_gate_rejects_insufficient_edge PASSED
backend/tests/test_cost_gate.py::test_cost_gate_passes_strong_edge PASSED
backend/tests/test_fee_calculator.py::test_intraday_buy_charges PASSED
backend/tests/test_fee_calculator.py::test_intraday_sell_charges PASSED
backend/tests/test_fee_calculator.py::test_delivery_sell_dp_charges PASSED
backend/tests/test_fee_calculator.py::test_round_trip_cost_pct PASSED
backend/tests/test_portfolio_accounting.py::test_initial_portfolio_balance PASSED
backend/tests/test_portfolio_accounting.py::test_buy_accounting_debit PASSED
backend/tests/test_portfolio_accounting.py::test_sell_accounting_credit_and_pnl PASSED
backend/tests/test_risk_management.py::test_kill_switch_blocks_trade PASSED
backend/tests/test_risk_management.py::test_daily_loss_limit_blocks_trade PASSED
backend/tests/test_risk_management.py::test_portfolio_drawdown_limit_blocks_trade PASSED
backend/tests/test_stale_data.py::test_staleness_detector PASSED
backend/tests/test_stale_data.py::test_execution_simulator_rejects_stale_quote PASSED
backend/tests/test_user_isolation.py::test_user_data_isolation PASSED
backend/tests/test_whole_share.py::test_reject_fractional_shares PASSED
backend/tests/test_whole_share.py::test_reject_unaffordable_stock_above_100_inr PASSED
backend/tests/test_whole_share.py::test_reject_unaffordable_stock_above_500_inr PASSED
backend/tests/test_whole_share.py::test_allow_affordable_stock_under_500_inr PASSED
backend/tests/test_whole_share.py::test_allow_affordable_stock_under_100_inr PASSED
backend/tests/test_whole_share.py::test_multiple_affordable_shares PASSED
============================== 23 passed in 1.89s ==============================
```

### Frontend Vitest Suite (5 Tests)
```
 ✓ src/tests/CurrencyFormatter.test.ts (5)
   ✓ formats exactly INR 100.00 initial capital properly
   ✓ formats zero and negative numbers properly
   ✓ formats Indian numbering system commas properly
   ✓ formats percentages with signs
   ✓ returns appropriate color styles for positive, negative, and zero PnL
============================== 5 passed in 0.16s ===============================
```

---

## 🐳 Docker Deployment

To launch the complete platform in a single command using Docker Compose:

```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API & WebSockets: `http://localhost:8000`

---

## ☁️ Cloud & Free-Tier Deployment Notes

When deploying to free cloud providers (e.g. Render, Railway, Vercel, Supabase):

1. **Database Persistence**: Ensure `DATABASE_URL` points to a persistent PostgreSQL database (such as Supabase or Neon). Local SQLite files are ephemeral on free PaaS instances.
2. **Service Sleeping**: Free instances (e.g., Render free web services) spin down after 15 minutes of inactivity. For continuous 24/7 background trade scanning, deploy on an **Oracle Cloud Always Free VM** or keep the backend awake with a cron ping.
3. **API Quotas & Broker Credentials**: Keep broker credentials strictly inside environment variables. Free data APIs have strict rate limits; the built-in `DemoMarketDataProvider` requires zero external API keys and runs with zero external cost.
4. **Paper Trading Lock**: Never disable `STRICT_PAPER_TRADING_ONLY`. Live capital execution is disabled.

---

## 📜 License

Distributed under the MIT License. Designed for quantitative analysis and educational paper trading.
