# Running AutoPilot AI Trading Platform

This guide covers running AutoPilot AI Trading in **low-CPU / low-heat production preview mode** on your laptop, configuring free real-time market data streaming via **Angel One SmartAPI**, and understanding the **Strict Paper Trading Guarantee**.

---

## 1. Quick Start (Low-Heat Mode)

To start both the FastAPI backend and React frontend with minimal battery and CPU usage:

```bash
./start.sh
```

### What `./start.sh` does to minimize heat and resource usage:
1. **Frontend**: Compiles the React bundle (`npm --prefix frontend run build`) and serves it using lightweight `vite preview` instead of the CPU-heavy Vite HMR dev server.
2. **Backend**: Runs `uvicorn` with `reload=False`, disabling file watcher polling threads that keep CPU cores awake.
3. **Animations**: Automatically pauses UI animations and tickers when the browser tab is hidden or backgrounded.

---

## 2. Strict Paper Trading Guarantee

> **Zero Live Order Execution:** Even when connected to a live broker API (such as Angel One), the platform strictly forbids sending real orders to exchange order books.

- `STRICT_PAPER_TRADING_ONLY = True` is enforced at the core engine level.
- All buy/sell orders, fills, stop-losses, and profit calculations are simulated locally using paper trading accounts.
- Your broker credentials are used **strictly read-only** to receive real-time market quotes (via WebSocket) or historical daily candles.

---

## 3. Market Data Providers

AutoPilot AI Trading supports multiple market data backends controlled by the `MARKET_DATA_PROVIDER` environment variable in `.env`.

### Supported Providers:
- `simulated` (Default): Generates synthetic realistic price ticks. Perfect for testing and offline development.
- `angel_one`: Connects to Angel One SmartAPI using `SmartWebSocketV2` for zero-cost, real-time live streaming quotes.
- `nse_live`: Fallback HTTP scraper for NSE India quotes.
- `yfinance`: Fallback historical and end-of-day quotes.

---

## 4. Angel One SmartAPI Setup (Free Live Streaming)

Angel One provides free API access with real-time WebSocket market feeds.

### Step 1: Obtain API Credentials
1. Register/login at [smartapi.angelbroking.com](https://smartapi.angelbroking.com/).
2. Create an App under "My Applications" and note down your **API Key**.
3. Enable TOTP (Time-based One Time Password) in your Angel One profile to get your TOTP secret key.

### Step 2: Configure Environment Variables
Edit your `.env` file in the project root:

```env
# Enable Angel One as the live market feed
MARKET_DATA_PROVIDER=angel_one

# Angel One SmartAPI Credentials (Read-only quotes)
ANGEL_ONE_API_KEY=your_smartapi_api_key
ANGEL_ONE_CLIENT_ID=your_client_id
ANGEL_ONE_PASSWORD=your_mpin_or_password
ANGEL_ONE_TOTP_KEY=your_totp_secret_key
```

### How SmartWebSocketV2 Works:
- Automatically authenticates with Angel One using your TOTP token.
- Subscribes to NSE Cash Market instruments (`exchangeType: 1`, `mode: 2` Quote Mode).
- Dynamically filters the subscribed symbol list to symbols within your available paper capital and open positions (capped to 50 active tokens) to conserve network bandwidth and memory.
- In-memory thread-safe dictionary cache (`{symbol: Quote}`) allows zero-network latency reads across all strategies and scanner cycles.

---

## 5. Offline Backtesting with History Cache

Backtesting requests automatically utilize an SQLite cache to avoid redundant network hits:
- **Location**: `backend/data/history_cache.db`
- **Table**: `candles (symbol, timeframe, timestamp, open, high, low, close, volume)`
- When a strategy backtest is executed for a date range, the engine first checks the local SQLite cache. Any already cached candles are returned instantly with zero network delay and zero CPU overhead.

---

## 6. Accessing the Platform

- **Dashboard**: http://localhost:5173
- **Demo User**: `demo@autopilot.ai`
- **Demo Password**: `demo1234`
- **API Health**: http://localhost:8000/api/health
- **Interactive API Docs**: http://localhost:8000/docs
