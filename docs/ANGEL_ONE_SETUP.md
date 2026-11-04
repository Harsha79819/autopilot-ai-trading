# Angel One SmartAPI Real-Time Feed Setup Guide

AutoPilot AI supports sub-second, real-time market data feeds via **Angel One SmartAPI** WebSocket (`SmartWebSocketV2`).

By default, without broker credentials, the platform runs on the **Free Live NSE Public Feed** (Yahoo Finance `.NS`), which is delayed by approximately **15 minutes** (900 seconds).

To enable 0-delay real-time equity quotes and live tick streaming:

---

## Prerequisites

1. An active **Angel One** trading account.
2. SmartAPI Developer Account created at [smartapi.angelbroking.com](https://smartapi.angelbroking.com/).
3. TOTP authentication enabled on your Angel One account via an authenticator app (e.g., Google Authenticator).

---

## Step 1: Create a SmartAPI App

1. Log in to [SmartAPI Portal](https://smartapi.angelbroking.com/).
2. Click **Create an App**.
3. Fill in the details:
   - **App Name**: `AutoPilot AI Platform`
   - **App Type**: `Trading` (or `Publisher`)
   - **Redirect URL**: `http://localhost:8000/api/auth/angelone/callback`
4. Click **Create App**.
5. Save your generated **API Key** (and API Secret if provided).

---

## Step 2: Retrieve your TOTP Secret Key

1. Log into your Angel One account profile or security settings.
2. Under Two-Factor Authentication (2FA), click **Enable/View TOTP QR code**.
3. Copy the **alphanumeric Base32 Secret Key** displayed under the QR code.
   *(This secret is used by `pyotp` in `smartapi_provider.py` to generate the 6-digit TOTP automatically on every token refresh).*

---

## Step 3: Configure Environment Variables

Open your `.env` file (or set environment variables in your deployment settings) with the following keys:

```bash
# Market Data Provider Selection
MARKET_DATA_PROVIDER="angel_one"

# Angel One SmartAPI Credentials
ANGEL_ONE_API_KEY="your_smartapi_api_key_here"
ANGEL_ONE_CLIENT_CODE="your_angel_one_client_code" # e.g., A123456
ANGEL_ONE_MPIN="your_4_digit_mpin"                 # e.g., 1234
ANGEL_ONE_TOTP_TOKEN="your_base32_totp_secret_key" # e.g., JBSWY3DPEHPK3PXP
```

---

## Step 4: Verification

1. Start or restart the backend:
   ```bash
   python -m backend.run
   ```
2. Check the logs. You should see:
   ```
   [INFO] Market data provider selected: Angel One SmartAPI
   [INFO] Angel One SmartAPI login successful. JWT and feed tokens cached.
   [INFO] SmartWebSocketV2 connected. Subscribed to live NSE universe ticks.
   ```
3. Query the health endpoint:
   ```bash
   curl http://localhost:8000/api/health
   ```
   Output:
   ```json
   {
     "status": "healthy",
     "data_provider": "Angel One SmartAPI (Live NSE Stream)",
     "is_realtime": true,
     "data_delay_seconds": 0
   }
   ```
4. On the frontend dashboard:
   - The top warning banner (*"Delayed data: about 15 min"*) will disappear.
   - The status badge will show `REAL-TIME STREAM (0s delay)`.

---

## Fallback Safety

If credentials are invalid, expired, or if Angel One servers are unreachable:
- AutoPilot AI automatically falls back to `LiveNseMarketDataProvider`.
- The platform flags `is_realtime: false` and `data_delay_seconds: 900`.
- The warning banner reappears to maintain transparent, honest disclosure.
- Orders remain strictly in paper mode (`STRICT_PAPER_TRADING_ONLY=true`).
