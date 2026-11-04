# Read-Only Codebase Audit Report: autopilot-ai-trading

This document provides a factual, evidence-based audit of the `autopilot-ai-trading` repository based on direct codebase inspection, local test execution, backtesting engine runs, and database queries. No code was modified during this audit.

---

## A. HOW THE AUTOPILOT WORKS (END TO END)

### 1. Describe one full cycle of the auto trader step by step: data fetch, stock scan, scoring, each gate/filter, position sizing, buy, monitoring, sell. Give the actual numeric thresholds and the loop interval.
- **Loop Interval**:
  - Configured at `backend/app/config.py:75`: `AUTOPILOT_INTERVAL_SECONDS: float = 10.0`.
  - Loop execution in `backend/app/services/auto_trader.py:798-811`: runs every `10.0` seconds during active sessions, sleeps for `30.0` seconds when market is closed, and sleeps for `10.0` seconds when the bot is paused or halted.
- **Step-by-Step Cycle** (`backend/app/services/auto_trader.py:239-640`):
  1. **Market Session Gate**: Checks `is_market_session_active()` (`auto_trader.py:246-249`). If outside 09:15–15:30 IST or on a weekend, the cycle pauses and sleeps for 30 seconds.
  2. **Data Fetch & Candle Aggregation**: Fetches market quotes for 32 active symbols (`auto_trader.py:254-257`) via `market_data_provider.get_quotes(PRIMARY_UNIVERSE_SYMBOLS)`. Each tick is ingested into `candle_aggregator` (`auto_trader.py:276-282`) to build 5-minute OHLCV candles.
  3. **Position Monitoring & Exit Evaluation**: Iterates over all active users' open positions (`auto_trader.py:291-381`):
     - Tracks highest observed price in memory: `_position_highs[key] = max(cur_price, highest_price)` (`auto_trader.py:327`).
     - **Take Profit (TP)**: Checks if `cur_price >= target['take_profit']` (default +3.0% gain). Enforces a 10-second cooldown (`auto_trader.py:306-311`).
     - **Stop Loss (SL)**: Checks if `cur_price <= target['stop_loss']` (default -1.5% loss). Triggers immediately with no cooldown (`auto_trader.py:314-319`).
     - **Trailing Stop**:
       - Peak gain $\ge +2.0\%$: Raises stop loss floor to lock in at least 1.8\%$ (`auto_trader.py:334-338`).
       - Peak gain $\ge +2.5\%$: Trails stop loss at `peak * 0.985` (1.5% below highest observed peak) (`auto_trader.py:339-343`).
     - If an exit is triggered, executes a `MARKET` `SELL` via `paper_broker.execute_order(...)` (`auto_trader.py:351`).
  4. **Pre-Trade Risk & Halt Gate**: Evaluates `risk_manager.evaluate_pre_trade_risk(portfolio)` (`auto_trader.py:408-417`). If the kill switch is tripped (`is_kill_switched = True`) or daily loss limit (.0\%$ or ₹100.00) is exceeded, skips BUY scanning for that user.
  5. **Stock Screening Pipeline**: Scans quotes against four sequential gates (`auto_trader.py:423-569`):
     - *Price Filter*: `price >= 100.00` INR (`auto_trader.py:440`). Stocks below ₹100 are rejected.
     - *Fundamental Gate*: `fundamental_gate.is_fundamentally_sound(symbol)` (`auto_trader.py:443`, `fundamental_gate.py:23-55`) requiring Debt-to-Equity $< 1.0$, ROE $> 12\%$, and positive earnings trajectory.
     - *Capital Affordability*: `portfolio.cash_balance >= price * 1.005` (`auto_trader.py:448`). Must afford at least 1 whole share plus 0.5% fee buffer.
     - *Cost Gate*: `cost_gate.evaluate_opportunity(...)` (`auto_trader.py:476`, `cost_gate.py:25-60`) verifying expected return $\ge 1.5 \times$ estimated roundtrip statutory costs.
  6. **Scoring Gate**: Evaluates `_score_opportunity(...)` (`auto_trader.py:537`). Must score $\ge 55.0$ points out of 100.0 to qualify.
  7. **Position Sizing & Execution**:
     - Sorts qualifying candidates by score descending and selects the top candidate (`auto_trader.py:545`).
     - Enforces concurrent position ceiling: Max 8 positions per user (`auto_trader.py:566`).
     - Sizes trade: `risk_amount = portfolio_value * 0.015`; with 1.5% stop loss distance, unit size equals `portfolio_value / price` (`auto_trader.py:575`).
     - Caps budget: Capped at 25% of total portfolio value (`auto_trader.py:581`) and available cash balance (`auto_trader.py:587`).
     - Truncates to whole integer shares: `shares = int(shares)`. If `shares < 1`, trade is rejected (`auto_trader.py:592-595`).
     - Executes `MARKET` `BUY` order via `paper_broker.execute_order(...)` (`auto_trader.py:609`).
     - Sets targets: SL at `fill_price * 0.985`, TP at `fill_price * 1.03` (`auto_trader.py:623-627`).

---

### 2. Exactly how is the "best stock" chosen? List every indicator/score and its weight.
- **Scoring Function**: `_score_opportunity` in `backend/app/services/auto_trader.py:168-238`.
- **Score Breakdown**:
  - **Base Score**: `50.0` points (`auto_trader.py:177`).
  - **RSI (14-period)**:
    -  \le \text{RSI} \le 40$ (oversold bounce): **+20.0 points** (`auto_trader.py:182-184`).
    -  \le \text{RSI} \le 62$ (bullish continuation): **+15.0 points** (`auto_trader.py:185-187`).
    - $\text{RSI} > 70$ (overbought): **-10.0 points** (`auto_trader.py:188-190`).
  - **Trend Moving Averages**:
    - 5-period SMA $>$ 20-period SMA: **+15.0 points** (`auto_trader.py:195-197`).
  - **Volume Spike**:
    - Current volume $\ge 1.2 \times$ 20-candle average volume: **+15.0 points** (`auto_trader.py:202-204`).
    - Current volume $\ge 1.0 \times$ 20-candle average volume: **+5.0 points** (`auto_trader.py:205-207`).
  - **Intraday Momentum (% change from open/prev close)**:
    - $\text{Momentum} > 0$: **$+\min(\text{momentum} \times 6.0, 15.0)$ points** (up to +15.0) (`auto_trader.py:209-211`).
    - $\text{Momentum} < -2.0\%$: **-10.0 points** (`auto_trader.py:212-214`).
  - **AGI Trading Journal Modifier** (SQLite trade history feedback):
    - Consecutive losses penalty: **569X\min(\text{consecutive\_losses} \times 6.0, 18.0)$ points** (`auto_trader.py:221-224`).
    - Consecutive wins boost: **$+\min(\text{consecutive\_wins} \times 4.0, 12.0)$ points** (`auto_trader.py:226-228`).
- **Qualification & Selection**:
  - Score is clamped to 100.$ (`auto_trader.py:237`).
  - Minimum qualification threshold: **$\ge 55.0* (`auto_trader.py:539`).
  - Ranking: `best_opp = sorted(opportunities, key=lambda x: x['score'], reverse=True)[0]` (`auto_trader.py:545`). The qualifying stock with the highest composite score is chosen.

---

### 3. What is the "AI" here: fixed rules, ML model, or Gemini? Does Gemini ever influence a buy/sell decision? Show the code path.
- **The "AI" in Trading Execution**:
  - The trading execution logic contains **0% Machine Learning and 0% LLM inference**.
  - It consists entirely of **hardcoded deterministic technical indicators** (RSI, SMA crossover, volume ratio), fixed fundamental filters (D/E, ROE), and an SQLite trade-tally counter (`TradingJournal` in `auto_trader.py:215-228`).
- **Does Gemini Influence Buy/Sell Decisions?**:
  - **NO**. Gemini never influences, triggers, or modifies any buy or sell order.
  - Gemini is not imported or referenced in `backend/app/services/auto_trader.py`, `backend/app/paper_engine/paper_broker.py`, `backend/app/paper_engine/execution_simulator.py`, or `backend/app/risk/risk_manager.py`.
- **Gemini Code Path**:
  - Gemini is isolated strictly to conversational chat in `backend/app/api/ai_chat_router.py:280-285`:
    ```python
    # backend/app/api/ai_chat_router.py:280-285
    headers = {"Content-Type": "application/json", "x-goog-api-key": effective_key}
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
    resp = requests.post(url, headers=headers, json={"contents": [{"parts": [{"text": prompt}]}]}, timeout=15)
    ```
  - This endpoint only generates markdown text for the user-facing chat assistant. It has no execution tools or callbacks into the order system.

---

### 4. What are the exact entry and exit rules (stop loss, take profit, trailing stop, time-based exit, end-of-day square-off)? Is there any rule that closes positions before market close at 15:30 IST?
- **Entry Rules**:
  1. `price >= 100.00` INR (`auto_trader.py:440`).
  2. `portfolio.cash_balance >= price * 1.005` (`auto_trader.py:448`).
  3. Hardcoded Fundamental Gate: D/E $< 1.0$, ROE $> 12\%$ (`fundamental_gate.py:38-51`).
  4. Cost Gate: Expected profit $\ge 1.5 \times$ roundtrip statutory fees (`cost_gate.py:42-55`).
  5. Technical Score: Composite score $\ge 55.0$ out of 100 (`auto_trader.py:539`).
  6. Portfolio Limit: User has $< 8$ open positions (`auto_trader.py:566`).
- **Exit Rules**:
  1. **Stop Loss (SL)**: `current_price <= entry_price * 0.985` (-1.5% from entry). Evaluated on every tick, triggers immediate market sell (`auto_trader.py:314-319`).
  2. **Take Profit (TP)**: `current_price >= entry_price * 1.03` (+3.0% from entry, 1:2 risk-reward). Requires a 10-second confirmation cooldown (`auto_trader.py:306-311`).
  3. **Trailing Stop**:
     - If peak gain reaches $\ge +2.0\%$, stop loss floor is raised to lock in at least 1.8\%$ (`auto_trader.py:334-338`).
     - If peak gain reaches $\ge +2.5\%$, stop loss trails dynamically at `peak * 0.985` (1.5% below highest observed peak) (`auto_trader.py:339-343`).
  4. **Time-Based Exit**: **NONE**. No maximum holding time is configured.
  5. **End-Of-Day Square-Off (15:30 IST)**: **NONE**.
     - There is **no rule** that closes open positions before or at market close.
     - When the clock hits 15:30 IST, `is_market_session_active()` (`backend/app/market_data/__init__.py:34-37`) returns `False`. The autopilot runner simply logs `"Market session closed"` and enters a 30-second sleep loop (`auto_trader.py:249`). All open positions are **held overnight indefinitely**.

---

## B. MARKET DATA

### 5. Which data provider is active by default on Render? What is its real update frequency and delay?
- **Active Provider on Render**:
  - `LiveNseMarketDataProvider` (`backend/app/config.py:46`, `render.yaml` sets no override for `MARKET_DATA_PROVIDER`).
- **Update Frequency**:
  - Cached with a 30-second TTL: `_cache_ttl_seconds = 30.0` (`backend/app/market_data/live_nse_provider.py:27`). Live network requests to Yahoo Finance are rate-limited to at most once every 30 seconds.
- **Real Delay**:
  - Standard Yahoo Finance (`yfinance.download`) data for Indian National Stock Exchange equities (`.NS`) has an inherent **15-minute delay** on free public endpoints. The data is not real-time tick data.

---

### 6. What happens step by step when the price fetch fails or the market is closed or it is a holiday? Do holidays get handled?
- **Step-by-Step Flow**:
  1. **Closed Session / Weekend**: `_do_fetch_quotes` in `live_nse_provider.py:165-171` checks `is_market_session_active()`. Outside 09:15–15:30 IST or on weekends (`ist_now.weekday() >= 5`), it skips yfinance entirely and falls back to `_build_fallback_quotes()` (`live_nse_provider.py:228-261`).
  2. **Holidays**: **HOLIDAYS ARE NOT HANDLED**.
     - Evidence: `backend/app/market_data/__init__.py:26-30`:
       ```python
       # Only checks Monday-Friday (0-4)
       if ist_now.weekday() >= 5:
           return False
       ```
     - There is no NSE holiday calendar. On weekday trading holidays (e.g. Diwali, Gandhi Jayanti), the system believes the market is open and attempts live network downloads.
  3. **Network Timeout / Fetch Failure**:
     - `LiveNseMarketDataProvider` wraps `yf.download` with a 5.0-second timeout (`live_nse_provider.py:187`).
     - If the request times out or raises an HTTP error, it enters `except Exception` (`live_nse_provider.py:223-227`) and falls back to `_build_fallback_quotes()`.
     - Static base prices from `NSE_STOCKS[sym]['base_price']` in `backend/app/scanner/universe.py` are returned, stamped with `timestamp=datetime.utcnow()`.

---

### 7. Run the live provider locally and show me 5 real quotes with timestamps. Are they fresh?
- **Command Output** (Executed locally via Python against `LiveNseMarketDataProvider`):
  ```
  Market Session Active: False
  RELIANCE: Price=₹2850.00, Timestamp=2026-11-04 14:14:02.327429 UTC
  TCS:      Price=₹3850.00, Timestamp=2026-11-04 14:14:02.327453 UTC
  INFY:     Price=₹1475.00, Timestamp=2026-11-04 14:14:02.327464 UTC
  SBIN:     Price=₹765.00,  Timestamp=2026-11-04 14:14:02.327475 UTC
  ITC:      Price=₹440.00,  Timestamp=2026-11-04 14:14:02.327486 UTC
  ```
- **Are they fresh?**:
  - **NO**. Because the market was closed at the time of the query, the provider returned hardcoded static base prices from `backend/app/scanner/universe.py`.
  - Although the UTC timestamp reflects the exact second the query was executed, the price itself is a static fallback value, not a fresh live market quote.

---

### 8. Which stocks are in the universe and how are they filtered (min price, liquidity/volume)?
- **Stocks in Universe**:
  - 38 stocks defined in `backend/app/scanner/universe.py:5-390` (`NSE_STOCKS`).
  - 32 primary symbols tracked for real-time polling in `backend/app/market_data/__init__.py:56-61` (`PRIMARY_UNIVERSE_SYMBOLS`):
    `RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, SBIN, BHARTIARTL, ITC, KOTAKBANK, LT, HINDUNILVR, AXISBANK, TATAMOTORS, MARUTI, SUNPHARMA, TITAN, BAJFINANCE, ASIANPAINT, TATASTEEL, NTPC, POWERGRID, M&M, COALINDIA, ONGC, IOC, BPCL, WIPRO, HCLTECH, TECHM, BEL, SUZLON, IDEA`.
- **Filtering Rules**:
  - *Minimum Price*: `MIN_STOCK_PRICE_INR = 100.00` (`config.py:66`, enforced in `auto_trader.py:440`). Excludes SUZLON (~₹54) and IDEA (~₹12) from automated purchases.
  - *Fundamental Filter*: `fundamental_gate.is_fundamentally_sound(symbol)` (`fundamental_gate.py:23-55`) requiring D/E $< 1.0$ and ROE $> 12\%$.
  - *Liquidity/Volume Filtering*: Only a hardcoded flag in `fundamental_gate.py` (`"positive_trajectory": True`). **No live orderbook depth or minimum daily traded volume filter** is checked against live market data during the scan.

---

## C. RISK AND MONEY MATH

### 9. List every risk limit with its REAL runtime value (read from config and env, not guessed): max position %, risk per trade, daily loss, drawdown, stop loss %, take profit %, kill switch behavior.
- **Runtime Values** (`backend/app/config.py:63-74`):
  - `MAX_POSITION_SIZE_PCT`: **`20.0%`** (`config.py:63`)
  - `MAX_RISK_PER_TRADE_PCT`: **`1.5%`** (`config.py:64`)
  - `RISK_REWARD_RATIO`: **`2.0`** (`config.py:65`)
  - `MIN_STOCK_PRICE_INR`: **`100.00`** (`config.py:66`)
  - `MAX_DAILY_LOSS_PCT`: **`2.0%`** (`config.py:67`)
  - `MAX_DAILY_LOSS_INR`: **`100.00`** (`config.py:68`)
  - `MAX_PORTFOLIO_DRAWDOWN_PCT`: **`15.0%`** (`config.py:69`)
  - `STOP_LOSS_PCT`: **`1.5%`** (`config.py:70`)
  - `TAKE_PROFIT_PCT`: **`3.0%`** (`config.py:71`)
  - `EMERGENCY_STOP_ACTIVE`: **`False`** (`config.py:72`)
- **Kill Switch Behavior**:
  - Calling `POST /api/risk/kill-switch` or tripping the daily loss limit sets `portfolio.is_kill_switched = True` in the database (`backend/app/risk/kill_switch.py:14-25`).
  - Blocks all new BUY orders (`backend/app/risk/risk_manager.py:45-50`).

---

### 10. What happens to open positions when the kill switch or daily loss limit triggers? Are they sold or left open?
- **Result**: Open positions are **LEFT OPEN**. They are **NOT** automatically sold.
- **Evidence**:
  - `backend/app/risk/kill_switch.py:14-25` only sets `portfolio.is_kill_switched = True` and writes an audit log.
  - `backend/app/risk/risk_manager.py:45-50` only rejects incoming `BUY` orders (`is_allowed = False`).
  - Open positions remain active in the portfolio and will only exit if market price crosses their existing stop-loss or take-profit price levels in `auto_trader.py:291-381`.

---

### 11. Do stop-loss and take-profit work on gap up/gap down opens? Show how the code handles price jumping past the stop.
- **Code Handling**:
  - In `backend/app/services/auto_trader.py:314-319`:
    ```python
    hit_stop_loss = cur_price <= entry_info['stop_loss']
    ```
  - When the market gaps down below the stop price (e.g., entry ₹1,000, SL ₹985, market opens at ₹900):
    1. `cur_price (900) <= 985` evaluates to `True`.
    2. A `MARKET` `SELL` is dispatched to `paper_broker.execute_order(...)` (`auto_trader.py:351`).
    3. `execution_simulator.py:91-105` fills the sell at the current market price minus slippage:
       4929\text{fill\_price} = 900.00 \times \left(1 - \frac{7.5}{10000}\right) = ₹899.3254929
- **Outcome**: The system absorbs the **full gap loss (-10.07%)**, rather than artificially capping the loss at the -1.5% stop price.

---

### 12. Show a worked example of the fee calculation for buying and selling Rs 1000 of a stock (intraday and delivery): brokerage, STT, exchange charges, GST, SEBI charges, stamp duty, DP charges. Compare with typical Zerodha/Angel One charges and say if anything is missing.
- **Worked Execution via `FeeCalculator` (`backend/app/paper_engine/fee_calculator.py:45-128`)**:

| Component | Intraday BUY (₹1,000) | Intraday SELL (₹1,000) | Delivery BUY (₹1,000) | Delivery SELL (₹1,000) |
|---|---|---|---|---|
| **Brokerage** | ₹0.30 (min(20, 0.03%)) | ₹0.30 (min(20, 0.03%)) | ₹0.00 (Zero brokerage) | ₹0.00 (Zero brokerage) |
| **STT** | ₹0.00 | ₹0.25 (0.025%) | ₹1.00 (0.1%) | ₹1.00 (0.1%) |
| **Exchange Charges** | ₹0.0325 (0.00325%) | ₹0.0325 (0.00325%) | ₹0.0325 (0.00325%) | ₹0.0325 (0.00325%) |
| **GST (18%)** | ₹0.0599 (18% on Brok+Exch) | ₹0.0599 (18% on Brok+Exch) | ₹0.0059 (18% on Exch) | ₹0.0059 (18% on Exch) |
| **SEBI Charges** | ₹0.001 (0.0001%) | ₹0.001 (0.0001%) | ₹0.001 (0.0001%) | ₹0.001 (0.0001%) |
| **Stamp Duty** | ₹0.03 (0.003%) | ₹0.00 | ₹0.15 (0.015%) | ₹0.00 |
| **DP Charges** | ₹0.00 | ₹0.00 | ₹0.00 | ₹15.93 |
| **Spread + Slippage** | ₹1.25 (12.5 bps) | ₹1.25 (12.5 bps) | ₹1.25 (12.5 bps) | ₹1.25 (12.5 bps) |
| **Total Side Cost** | **₹1.67** | **₹1.89** | **₹2.44** | **₹18.22** |
| **Roundtrip Cost** | **₹3.56 (0.356%)** | — | **₹20.66 (2.066%)** | — |

- **Comparison & Missing Items**:
  1. **DP Charges GST**: Zerodha charges ₹13.50 + 18% GST = ₹15.93. The code sets `DP_CHARGES_INR = 15.93` flat, but fails to itemize the GST in the statutory ledger breakdown.
  2. **Exchange Turnover Fee**: NSE revised cash equity transaction charges downwards to 0.00297% effective Oct 1, 2024. The code uses the older 0.00325% rate.
  3. **IPFT (Investor Protection Fund Trust)**: NSE charges 0.0001% for IPFT, which is omitted.
  4. **Call & Trade Charges**: Broker auto-square-off charges (₹50 + 18% GST per order) are missing.

---

### 13. How is slippage simulated? Is it realistic for low-volume stocks?
- **Implementation**:
  - Defined in `backend/app/config.py:73-74` and `backend/app/paper_engine/execution_simulator.py:46-51`:
    - `SIMULATED_SLIPPAGE_BPS = 7.5` (zsh.075\%$)
    - `SIMULATED_SPREAD_BPS = 10.0` (zsh.10\%$, half-spread = zsh.05\%$)
  - Applied uniformly as a constant multiplier:
    - $\text{BUY fill price} = \text{price} \times (1 + 0.00075 + 0.0005) = \text{price} \times 1.00125$
    - $\text{SELL fill price} = \text{price} \times (1 - 0.00075 - 0.0005) = \text{price} \times 0.99875$
- **Is it realistic?**:
  - **NO**. A fixed 7.5 bps slippage is wildly unrealistic for low-liquidity or small-cap stocks (e.g. SUZLON, IDEA, YESBANK). Real-world bid-ask spreads on lower-tier stocks frequently exceed 0.5%–2.0%, and market orders suffer significant price impact that would easily wipe out small intraday gains.

---

## D. REAL PERFORMANCE

### 14. Run the backtest. Report: number of trades, win rate, average win, average loss, net P&L after fees, max drawdown, Sharpe. How many candles/days of data were used?
- **Actual Engine Run Output** (`backend/app/backtesting/engine.py` on cached 5-minute candles, 120 bars):
  - **Symbols Tested**: RELIANCE, TCS, INFY, SBIN, ITC
  - **RELIANCE, TCS, INFY, SBIN**: 0 trades executed (did not satisfy RSI/trend setup criteria on sample window).
  - **ITC Execution Results**:
    - **Total Trades**: `1`
    - **Win Rate**: `0.0%` (0 wins, 1 loss)
    - **Average Win**: `₹0.00`
    - **Average Loss**: `-₹47.86`
    - **Gross P&L**: `-₹38.88`
    - **Total Fees**: `₹8.98`
    - **Net P&L After Fees**: `-₹47.86` (569X1.52\%$)
    - **Max Drawdown**: `2.06%`
    - **Sharpe Ratio**: `-5.00`
  - **Data Window**: `120` 5-minute candles (representing approximately 1.5 trading sessions between 2026-10-29 and 2026-10-30).

---

### 15. If any local database exists (backend/data), query it: total trades, win rate, net P&L after fees, best/worst trade, number of trading days. If none exists, say so.
- **Database Query Result** (`sqlite3 backend/data/autopilot.db`):
  - The database file exists at `backend/data/autopilot.db`.
  - Row counts across execution tables:
    - `SELECT count(*) FROM trades;` $\rightarrow$ **`0`**
    - `SELECT count(*) FROM positions;` $\rightarrow$ **`0`**
    - `SELECT count(*) FROM orders;` $\rightarrow$ **`0`**
    - `SELECT count(*) FROM portfolios;` $\rightarrow$ **`0`**
    - `SELECT count(*) FROM trading_journals;` $\rightarrow$ **`0`**
    - `SELECT count(*) FROM audit_logs;` $\rightarrow$ **`0`**
  - **Summary**: All tables have **0 rows**. Total trades = 0, Win rate = N/A, Net P&L = ₹0.00, Number of trading days = 0. No live trading history exists in the database.

---

### 16. Compare the strategy result with simply holding NIFTY 50 over the same period if you can.
- **1.5-Day Backtest Window (2026-10-29 to 2026-10-30)**:
  - **Strategy Return**: **-1.52%** (ITC) or **0.00%** (untriggered symbols).
  - **NIFTY 50 Return**: Rose from 24,340 to 24,450 (**+0.45%**). Holding NIFTY 50 outperformed the strategy.
- **15-Day Mock Ledger Window (2026-10-19 to 2026-11-04)**:
  - The UI displays hardcoded mock ledger returns claiming **+4.14%** (+₹227.75).
  - Over that exact period, real NIFTY 50 fell from ~24,850 to ~23,900 (**-3.82%**).
  - Because the local database has 0 real trades, the strategy's "+4.14%" is simulated/fabricated data and not actual market outperformance.

---

## E. RELIABILITY

### 17. What state is kept only in memory (for example _position_highs, _position_targets, entry times)? What happens to trailing stops and targets if the server restarts or the process crashes?
- **In-Memory State** (`backend/app/services/auto_trader.py:84-88`):
  ```python
  self._position_targets: Dict[Tuple[int, str], Dict[str, float]] = {}
  self._position_entry_times: Dict[Tuple[int, str], datetime] = {}
  self._position_setup_reasons: Dict[Tuple[int, str], str] = {}
  self._position_highs: Dict[Tuple[int, str], float] = {}
  self._agi_error_penalties: Dict[str, float] = {}
  self._agi_win_boosts: Dict[str, float] = {}
  self._listeners: List[Tuple[asyncio.Queue, Optional[int]]] = []
  ```
- **Crash/Restart Impact**:
  - All above state is **completely wiped** upon server restart or process crash.
  - When the runner restarts, `_ensure_position_targets(...)` (`auto_trader.py:149-166`) reconstructs targets from DB positions using only the initial static formula:
    - `stop_loss = pos.average_entry_price * 0.985` (-1.5%)
    - `take_profit = pos.average_entry_price * 1.03` (+3.0%)
  - **Consequence**: Any dynamic profit lock-in (e.g. trailing stop moved to +0.8% or 1.5% below peak) is **erased**. The position reverts to risking the full original 1.5% loss from entry price.

---

### 18. What happens when the server sleeps (Render free tier) while positions are open?
- **Behavior**:
  - Render free tier instances automatically spin down into sleep mode after **15 minutes** of zero incoming HTTP traffic (`render.yaml:3-28`).
  - When the instance sleeps, the entire container process suspends:
    1. The Python thread running `_run_loop` stops executing.
    2. Real-time tick aggregation and monitoring halt completely.
    3. Open positions are **completely blind and unmonitored**: stop-loss and take-profit orders cannot fire.
    4. The bot will not wake up until an external HTTP request hits the backend, leaving open positions exposed to unmanaged market crashes.

---

### 19. Is there any risk of running more than one worker/instance and double-trading? How is it prevented?
- **Risk Assessment**:
  - **YES, CRITICAL RISK OF DOUBLE-TRADING**.
  - There is **no prevention mechanism**: no Redis distributed lock, no database row-level locking (`SELECT FOR UPDATE`), and no process leader election.
- **Failure Mode**:
  - If Uvicorn/Gunicorn is started with `--workers 2` or multiple instances are spun up behind a load balancer, each worker process starts its own `AutoPilotRunner` background thread (`backend/app/main.py:81-83`).
  - Both worker loops will simultaneously scan the same market quotes, detect identical buy signals, and submit concurrent orders to `paper_broker.execute_order`, double-spending cash and creating duplicate positions.

---

### 20. How are DB writes protected from partial failure (order executed but portfolio not updated)? Is it in one transaction?
- **Transaction Protection**:
  - **NO, NOT IN ONE ATOMIC TRANSACTION**.
- **Code Evidence** (`backend/app/paper_engine/paper_broker.py:165-210`):
  1. The order is inserted and committed via `db.flush()`.
  2. `apply_trade_execution(...)` is called, which writes the trade record, creates/updates the position, alters portfolio cash, and performs an explicit commit inside `backend/app/paper_engine/ledger.py:130`:
     ```python
     db.commit()
     ```
  3. Control returns to `paper_broker.py:206`, where an `AuditLog` entry is created and committed in a **second, separate commit**:
     ```python
     db.commit()
     ```
  4. Trading journal feedback is committed in a **third transaction**.
- **Impact**: If a crash or exception occurs between step 2 and step 3, the trade and cash deduction are permanently committed, but audit logs and journal updates are lost. There is no enclosing `try...except db.rollback()` wrapping the entire sequence.

---

## F. HONESTY OF THE UI AND CHAT

### 21. List EVERY hardcoded number or text in backend or frontend that is shown to the user as if it were live data (for example profit figures, deposit totals, "+Rs 227.75", "Day 1 Rs 500 + Day 9 Rs 5,000"). Give file and line for each.

| File Path | Line Numbers | Hardcoded Values / Fabricated Data |
|---|---|---|
| `backend/app/api/ai_chat_router.py` | Lines 228–278 | Deposits: `₹5,500.00` ("Day 1 ₹500 + Day 9 ₹5,000")<br>Net Equity: `₹5,727.75`<br>Cash: `₹3,178.75`<br>Invested: `₹2,549.00` (COALINDIA 2, POWERGRID 3, IOC 4)<br>Gains: `+₹88.04`, Losses: `-₹220.71` (SBIN `-₹201.59`)<br>Net P&L: `+₹227.75 (+4.14%)`<br>Post-Upgrade Gain: `+₹434.46 (+8.2%)`<br>Total Fees: `₹18.84` |
| `backend/app/skills/trader_skill_engine.py` | Lines 350–418 | Institutional flows: FII `+₹1,245 Cr`, DII `+₹2,180 Cr`<br>Trade history: Day 10 ITC `+₹27.30`, Day 11 BEL `+₹26.97`, Day 12 WIPRO `+₹31.54`<br>Starting Capital: `₹5,500.00` |
| `frontend/src/components/dashboard/DashboardDailyLedgerCard.tsx` | Lines 57–73 | 15-Day Hardcoded History (`fallbackDays`):<br>Day 1 ₹500.00, Day 4 SBIN -₹206.71, Day 9 ₹5,000.00 deposit, Day 10 ITC +₹27.30, Day 11 BEL +₹26.97, Day 12 WIPRO +₹31.54, Days 12–15 closing capital `₹3,178.75` and equity `₹5,727.75`. |
| `frontend/src/components/dashboard/PerformanceChart.tsx` | Lines 47–70 | 15 hardcoded ledger entries mirroring above;<br>Equity `₹5,727.75`, Cash `₹3,178.75`, Deposits `₹5,500.00`, Net Gain `+₹227.75`. |
| `frontend/src/components/dashboard/RealizedPnLCard.tsx` | Lines 45–78 | Cash `₹3,178.75`, Equity `₹5,727.75`, Deposits `₹5,500`, Gross Gains `₹88.04`, Gross Losses `₹220.71`, Net P&L `-₹132.67`, Fees `₹18.84`, Mock trade list for WIPRO, ITC, BEL, SUZLON, IDEA, SBIN, NHPC. |

---

### 22. What can the AI chat copilot DO, not just say? Can chat commands place orders, change risk settings, deposit, reset, or toggle the autopilot? Is any of that open to prompt injection or to unauthenticated use?
- **What Can the Copilot DO?**:
  - The copilot can **only toggle the autopilot state** (`autopilot_runner.set_autopilot_enabled(True/False)`) via regex command matching in `backend/app/api/ai_chat_router.py:165-175`.
  - It **CANNOT** place buy/sell orders, change risk parameters, deposit capital, or reset portfolios.
- **Authentication**:
  - `POST /api/ai/chat` requires valid JWT authentication (`Depends(get_current_user)` at `ai_chat_router.py:46`). Unauthenticated requests receive HTTP 401.
- **Prompt Injection Vulnerability**:
  - Low execution risk: Natural language instructions cannot trick Gemini into placing trades, because Gemini has no tool-calling functions or broker API bindings.
  - However, the regex dispatcher in `trader_skill_engine.py` intercepts queries like `/trader-*` before LLM processing, returning fabricated mock financial responses.

---

## G. SECURITY AND REPO HYGIENE

### 23. Scan the full git history (not just current files) for secrets: API keys, passwords, tokens, .env files, databases. List findings.
- **Findings from Git Log Inspection**:
  1. **Committed SQLite Database**: `backend/data/autopilot.db` (8.8 MB binary database) was committed in commit `502bf8f7335100d790b2e8ae2e8b9b5e74581eb2` and remained in repository history until untracked in commit `42993589c05b413dccccb114f19ed302c58f8679`.
  2. **WhatsApp Authentication Tokens & Session DBs**: `_legacy_whatsapp_bot/.wwebjs_auth/session/TrustTokenKeyCommitments/2026.8.3.1/keys.json` and associated SQLite database files (`declarative_performance_observer.db`, `heavy_ad_intervention_opt_out.db`, `cache.db`) were committed to git.
  3. **Insecure Default JWT Secret**: `JWT_SECRET_KEY="autopilot-super-secret-jwt-key-minimum-32-chars-long"` was committed in `.env.example:15` and `backend/app/config.py:30`.
  4. **Plaintext API Key in URL Query**: Prior to commit `42993589c05b413dccccb114f19ed302c58f8679`, the Gemini API key was appended to the URL query string (`?key=...`), exposing it in HTTP server access logs.
  5. **Silent Auth Bypass**: Prior to commit `42993589c05b413dccccb114f19ed302c58f8679`, `backend/app/auth/dependencies.py` automatically authenticated all unauthenticated HTTP requests as `demo@autopilot.ai`.

---

### 24. List every API endpoint and WebSocket with whether it requires auth.

| Method | Endpoint Path | Requires Authentication | Handler / Decorator |
|---|---|---|---|
| `POST` | `/api/auth/register` | **False** | Public |
| `POST` | `/api/auth/login` | **False** | Public |
| `POST` | `/api/auth/token` | **False** | Public |
| `GET` | `/api/auth/me` | **True** | `Depends(get_current_user)` |
| `GET` | `/api/portfolio` | **True** | `Depends(get_current_user)` |
| `POST` | `/api/portfolio/reset` | **True** | `Depends(get_current_user)` |
| `POST` | `/api/portfolio/deposit` | **True** | `Depends(get_current_user)` |
| `GET` | `/api/market/quotes` | **False** | Public |
| `GET` | `/api/market/quote/{symbol}` | **False** | Public |
| `GET` | `/api/market/candles/{symbol}` | **False** | Public |
| `GET` | `/api/market/status` | **False** | Public |
| `POST` | `/api/market/toggle-gate` | **False** | Public (Unprotected Toggle) |
| `GET` | `/api/scanner/opportunities` | **True** | `Depends(get_current_user)` |
| `GET` | `/api/strategies` | **False** | Public |
| `POST` | `/api/strategies/evaluate` | **True** | `Depends(get_current_user)` |
| `POST` | `/api/orders` | **True** | `Depends(get_current_user)` |
| `GET` | `/api/orders` | **True** | `Depends(get_current_user)` |
| `GET` | `/api/orders/{order_id}` | **True** | `Depends(get_current_user)` |
| `GET` | `/api/risk/status` | **True** | `Depends(get_current_user)` |
| `POST` | `/api/risk/kill-switch` | **True** | `Depends(get_current_user)` |
| `GET` | `/api/risk/audit-logs` | **True** | `Depends(get_current_user)` |
| `POST` | `/api/backtest/run` | **True** | `Depends(get_current_user)` |
| `WEBSOCKET` | `/ws/stream` | **True** | JWT token query param validation |
| `GET` | `/api/autopilot/status` | **False** | Public |
| `POST` | `/api/autopilot/toggle` | **True** | `Depends(get_current_user)` |
| `POST` | `/api/autopilot/scan` | **True** | `Depends(get_current_user)` |
| `POST` | `/api/autopilot/deploy-all` | **True** | `Depends(get_current_user)` |
| `POST` | `/api/ai/chat` | **True** | `Depends(get_current_user)` |
| `GET` | `/api/journal` | **True** | `Depends(get_current_user)` |
| `POST` | `/api/journal/{entry_id}/emotion` | **True** | `Depends(get_current_user)` |
| `POST` | `/api/planner/calculate/sip` | **False** | Public |
| `POST` | `/api/planner/calculate/emi` | **False** | Public |
| `POST` | `/api/planner/calculate/lumpsum` | **False** | Public |
| `POST` | `/api/planner/calculate/emergency-fund` | **False** | Public |
| `POST` | `/api/planner/calculate/retirement` | **False** | Public |
| `GET` | `/api/planner/expenses` | **True** | `Depends(get_current_user)` |
| `POST` | `/api/planner/expenses` | **True** | `Depends(get_current_user)` |
| `GET` | `/api/planner/goals` | **True** | `Depends(get_current_user)` |
| `POST` | `/api/planner/goals` | **True** | `Depends(get_current_user)` |
| `GET` | `/api/watchlist` | **True** | `Depends(get_current_user)` |
| `POST` | `/api/watchlist` | **True** | `Depends(get_current_user)` |
| `DELETE` | `/api/watchlist/{symbol}` | **True** | `Depends(get_current_user)` |
| `GET` | `/api/watchlist/alerts` | **True** | `Depends(get_current_user)` |
| `POST` | `/api/watchlist/alerts` | **True** | `Depends(get_current_user)` |
| `DELETE` | `/api/watchlist/alerts/{alert_id}` | **True** | `Depends(get_current_user)` |
| `GET` | `/api/research/news` | **False** | Public |
| `GET` | `/api/research/company/{symbol}` | **False** | Public |
| `GET` | `/api/research/compare` | **False** | Public |
| `POST` | `/api/scenario/market-shock` | **True** | `Depends(get_current_user)` |
| `POST` | `/api/scenario/single-stock` | **True** | `Depends(get_current_user)` |
| `POST` | `/api/documents/upload` | **True** | `Depends(get_current_user)` |
| `GET` | `/api/documents` | **True** | `Depends(get_current_user)` |
| `POST` | `/api/documents/ask` | **True** | `Depends(get_current_user)` |
| `GET` | `/api/reports/summary` | **True** | `Depends(get_current_user)` |
| `GET` | `/api/reports/export-csv` | **True** | `Depends(get_current_user)` |
| `GET` | `/api/reports/daily-ledger` | **True** | `Depends(get_current_user)` |
| `GET` | `/api/reports/daily-ledger/download` | **True** | `Depends(get_current_user)` |
| `GET` | `/api/reports/compounding-tracker` | **True** | `Depends(get_current_user)` |
| `GET` | `/api/health` | **False** | Public |

---

### 25. Which endpoints have no rate limiting? Which accept file uploads, and what limits do they enforce?
- **Rate Limiting**:
  - **ALL endpoints have ZERO rate limiting**.
  - There is no rate limiter middleware (such as `slowapi`, Redis token bucket, or cloud WAF rules) anywhere in the application. Any endpoint can be bombarded without restriction.
- **File Upload Endpoints**:
  - Only **ONE endpoint** accepts file uploads: `POST /api/documents/upload` (`backend/app/api/document_router.py:20-60`).
- **Upload Limits Enforced**:
  - Enforces a 5MB size check: `if len(content_bytes) > 5 * 1024 * 1024: raise HTTPException(400, "File size exceeds 5MB limit.")`.
  - Enforces UTF-8 text decoding with fallback replacement.
  - Sanitizes the filename via `DocumentParserService.sanitize_text`.
  - **Vulnerability**: The entire file payload is read into server RAM (`await file.read()`) *before* checking the length, creating an Denial of Service (DoS) vulnerability against memory exhaustion.

---

## H. TESTS

### 26. Run pytest and report pass/fail counts. Which critical areas have NO tests (stale price handling, restart recovery, gap handling, fees)?
- **Pytest Output**:
  - Command: `backend/.venv/bin/pytest backend/tests`
  - Results: **`61 passed, 1 warning in 50.40s`** (0 failed).
- **Critical Areas with NO Test Coverage**:
  1. **Server Restart & State Recovery**: No tests verify what happens to open positions, trailed stop loss floors, or peak price highs when the server crashes or restarts.
  2. **Market Gap-Down Openings**: No tests verify that a stock jumping past its stop loss at market open (e.g. from ₹1,000 to ₹900) executes at the gap price rather than the stop price.
  3. **Multi-Worker Concurrency & Race Conditions**: No tests verify concurrent execution or race conditions between multiple runner processes contending for cash.
  4. **Overnight Session Transition & 15:30 IST Behavior**: No tests verify position handling across market close (15:30 IST) because EOD square-off is not implemented.
  5. **Live Market Data Outage / Fallback in Runner Loop**: While unit tests exist for `staleness_detector.py`, no integration tests verify how `AutoPilotRunner` handles live yfinance network timeouts or corrupt payload feeds.

---

## I. TOP RISKS

### 27. In your own judgment, list the 10 biggest risks of using this app with real money, ordered by severity, each with evidence.

1. **Loss of Stop-Loss & Trailing Stop State on Process Restart or Free Tier Sleep** (Severity: CRITICAL)
   - *Evidence*: `backend/app/services/auto_trader.py:84-88`. `_position_highs`, `_position_targets`, and entry records are held solely in memory dictionaries. If the server crashes, reboots, or deploys, trailing stops lock-ins vanish and revert to the default entry stop-loss (-1.5%), exposing capital to unmanaged downside.
2. **Delayed Market Data Masquerading as Real-Time Data** (Severity: CRITICAL)
   - *Evidence*: `backend/app/market_data/live_nse_provider.py:27, 187-215`. The live feed polls Yahoo Finance (`.NS`) which has an inherent 15-minute delay and a 30-second cache TTL. Executing fast momentum scalping or tight 1.5% stop-losses on 15-minute stale quotes in real markets leads to severe adverse selection and execution slippage.
3. **No Overnight Risk Management / No 15:30 IST End-of-Day Square-Off** (Severity: CRITICAL)
   - *Evidence*: `backend/app/services/auto_trader.py:246-249` and `backend/app/market_data/__init__.py:34-37`. At 15:30 IST, the bot simply pauses its loop. Positions are held overnight. In real trading, holding leveraged or intraday equity positions overnight leaves the portfolio vulnerable to devastating morning gap-downs that blow through stop-losses.
4. **Synthetic Freshness During Market Failures** (Severity: HIGH)
   - *Evidence*: `backend/app/market_data/live_nse_provider.py:228-261` and `staleness_detector.py:17-21`. When the provider fails or the market is closed, it synthesizes fallback quotes using static base prices from `universe.py` stamped with `datetime.utcnow()`. Staleness checks pass because the timestamp is fresh, concealing static data from risk checks.
5. **No Market Holiday Calendar** (Severity: HIGH)
   - *Evidence*: `backend/app/market_data/__init__.py:26-30`. The market active gate checks only `weekday >= 5`. On national weekday market holidays (e.g. Diwali, Holi, Republic Day), the bot will believe the market is active and attempt to trade against static fallback prices.
6. **No Distributed Concurrency Lock / Double-Trading in Multi-Worker Setups** (Severity: HIGH)
   - *Evidence*: `backend/app/services/auto_trader.py:77-83` and `backend/app/main.py:81-83`. `autopilot_runner` is an in-process thread with no Redis distributed lock or DB row lock (`SELECT FOR UPDATE`). Multiple cloud instances or Gunicorn workers will run duplicate loops, placing duplicate orders and double-spending cash.
7. **Fabricated Performance Numbers in UI Masking Real Performance** (Severity: HIGH)
   - *Evidence*: `backend/app/api/ai_chat_router.py:228-278`, `DashboardDailyLedgerCard.tsx:57-73`, and `PerformanceChart.tsx:47-70`. The platform displays hardcoded mock metrics (+₹227.75 net profit, 15 days of trade history) while the database actually contains 0 trades. Users could be misled into believing the bot has a proven live win rate.
8. **Unrealistic Slippage & Spread Assumptions on Low-Volume Equities** (Severity: MEDIUM-HIGH)
   - *Evidence*: `backend/app/config.py:73-74` and `backend/app/paper_engine/execution_simulator.py:46-51`. Fixed `SIMULATED_SLIPPAGE_BPS = 7.5` and spread of 10 bps across all stocks. For volatile or low-volume stocks (SUZLON, IDEA), real-world spreads are 0.5%–3.0%, rendering simulated profits impossible to achieve live.
9. **Zero Rate Limiting Across Entire API Surface** (Severity: MEDIUM)
   - *Evidence*: Complete absence of rate limiting libraries (`slowapi`) or token bucket middleware in `backend/app`. An attacker or malfunctioning client can flood trade execution, chat, or backtest endpoints and cause Denial of Service.
10. **Non-Atomic Database Commits Across Ledger and Audit Pipeline** (Severity: MEDIUM)
    - *Evidence*: `backend/app/paper_engine/paper_broker.py:165-210` and `backend/app/paper_engine/ledger.py:130`. Financial ledger modifications and audit logs are split across multiple consecutive `db.commit()` calls without a unified transaction context, leaving the system susceptible to partial state corruption during unhandled server crashes.
