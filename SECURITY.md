# Security Policy & Architecture Guardrails

## 1. Strict Paper Trading Lockout

The AutoPilot platform is designed strictly for **paper trading and quantitative research**. Live broker order execution is prevented at the structural level:

- **Hard-Coded Safety Assertion**:
  ```python
  assert settings.STRICT_PAPER_TRADING_ONLY is True, "Live execution is prohibited."
  ```
- **Order Routing Lock**: Orders can only be submitted to `PaperBroker.execute_paper_order()`. There is no outbound broker order routing path.
- **Read-Only Broker Hooks**: Any live market data provider integration (e.g. Upstox/Angel One) is configured strictly for reading market quotes, never for order dispatch.

---

## 2. Multi-User Privacy & Data Isolation

AutoPilot is built for complete tenant data isolation:

- **Per-User Database Foreign Keys**: Every Portfolio, Position, Order, Trade, and AuditLog row is explicitly keyed to `user_id`.
- **Server-Side Authorization**: API endpoints do not accept client-provided `user_id` query parameters; all operations resolve the user identity from the cryptographically verified JWT bearer token:
  ```python
  @router.get("/portfolio")
  def get_portfolio(current_user: User = Depends(get_current_user)):
      # Only current_user's portfolio is accessible
  ```
- **Cross-User Protection**: Automated unit tests (`test_user_isolation.py`) systematically verify that User A cannot read or modify User B's portfolio or order records.

---

## 3. Authentication & Secret Management

- **Password Hashing**: User passwords are encrypted using `bcrypt` / PBKDF2 with unique cryptographic salt per user.
- **JWT Signatures**: Tokens are signed using HMAC-SHA256 (`HS256`) with a 256-bit secret key.
- **No Credentials in Frontend**: API keys, broker tokens, and database connection strings exist exclusively in backend `.env` variables and are never transmitted to client bundles.
- **Logging Sanitization**: Structured logs are forbidden from printing passwords, raw JWT tokens, or broker API secrets.

---

## 4. Input Validation & Defense in Depth

- **Pydantic Validation**: All incoming requests pass through validated Pydantic schemas. Invalid types, negative quantities, or unsupported order sides are rejected before reaching business logic.
- **Integer Whole-Share Enforcement**: Quantities are strictly validated as positive integers ($\ge 1$). Fractional shares are rejected at both API schema and simulator levels.
- **Idempotency Keys**: All order requests require or generate unique idempotency keys (`idempotency_key`), preventing double-submits from network retries.

---

## 5. Non-Bypassable Risk Controls

- **Pre-Trade Risk Verification**: Orders cannot bypass risk checks. The risk manager executes *before* any order simulation can occur.
- **Emergency Kill Switch**: Accessible directly from UI and REST API (`/api/risk/kill-switch`). When engaged, all auto-trading and manual submissions are instantly blocked.
- **Immutable Audit Logging**: Every signal, risk rejection, and executed trade is recorded to the `AuditLog` table with UTC timestamp and diagnostic JSON.
