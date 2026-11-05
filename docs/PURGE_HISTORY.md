# Git History Purge & Secret Rotation Guide

**Repository**: `Harsha79819/autopilot-ai-trading`  
**Purpose**: Instructions to purge legacy binary session caches, credentials, and SQLite database artifacts from Git commit history, and rotate production secrets.

---

## 1. Why History Purging is Necessary

Although `.gitignore` now ignores:
- `_legacy_whatsapp_bot/.wwebjs_auth/`
- `_legacy_whatsapp_bot/.wwebjs_cache/`
- `*.db`, `*.db-wal`, `*.db-journal`, `*.sqlite`
- `.env*` (except `.env.example`)

Git's internal object store retains historical commits permanently. Anyone cloning the repository with full commit history could theoretically reconstruct older commits containing legacy browser tokens, session cookies, or test databases.

> [!WARNING]
> Rewriting Git history alters commit hashes. Anyone who has cloned the repository will need to re-clone or rebase their local branches after a force-push. Coordinate with all collaborators before executing these steps.

---

## 2. Step-by-Step History Purge Guide

We recommend using [`git-filter-repo`](https://github.com/newren/git-filter-repo), the official, high-performance tool recommended by the Git core team (replacing legacy `git filter-branch` and BFG).

### Step 2.1: Prerequisites & Installation
Ensure Python 3 and Git are installed:
```bash
# macOS (via Homebrew)
brew install git-filter-repo

# Or via Python pip
pip install git-filter-repo
```

### Step 2.2: Create a Clean Mirror Backup
Before modifying history, always create a bare mirror backup of your repository:
```bash
cd ~
git clone --mirror git@github.com:Harsha79819/autopilot-ai-trading.git autopilot-ai-trading-backup.git
```

### Step 2.3: Execute `git-filter-repo` Purge
Clone a fresh copy of your repository for filtering:
```bash
cd ~
git clone git@github.com:Harsha79819/autopilot-ai-trading.git autopilot-ai-trading-purge
cd autopilot-ai-trading-purge
```

Run the following commands to strip tracked artifacts from all past commits, tags, and trees:

```bash
# 1. Purge WhatsApp bot session auth and cache folders
git filter-repo --invert-paths --path-glob '_legacy_whatsapp_bot/.wwebjs_auth*' --path-glob '_legacy_whatsapp_bot/.wwebjs_cache*'

# 2. Purge all SQLite databases, journal, and WAL files
git filter-repo --invert-paths --path-glob '*.db' --path-glob '*.db-wal' --path-glob '*.db-journal' --path-glob '*.sqlite*'

# 3. Purge any accidental local .env files (preserving .env.example)
git filter-repo --invert-paths --path .env --path-glob '.env.local' --path-glob '.env.production'
```

### Step 2.4: Clean and Repack Local Git Database
Reclaim disk space locally and prune dangling reflog pointers:
```bash
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Step 2.5: Force Push Rewritten History to GitHub
`git-filter-repo` automatically removes remote origin configurations as a safety measure. Re-add the remote origin and force-push:

```bash
git remote add origin git@github.com:Harsha79819/autopilot-ai-trading.git
git push origin --force --all
git push origin --force --tags
```

---

## 3. Secret Rotation Checklist

Even after rewriting history, treat any secret that ever existed in code as potentially compromised. Follow this checklist before live paper or real-money trading:

| Secret | Action Required | Status |
| :--- | :--- | :---: |
| **`JWT_SECRET_KEY`** | Generate a fresh 64-character secret with `openssl rand -hex 32` and update in Render / hosting env vars. | [ ] |
| **Angel One SmartAPI Key & Secret** | Log in to [smartapi.angelone.in](https://smartapi.angelone.in/), delete old apps, and generate a new API key and secret. | [ ] |
| **Angel One Trading PIN & TOTP** | Reset your Angel One trading PIN and re-configure your authenticator app (TOTP QR code). | [ ] |
| **Google Gemini API Key** | In Google AI Studio ([aistudio.google.com](https://aistudio.google.com/)), delete older keys and generate a fresh key. | [ ] |
| **AlphaVantage / Finnhub Keys** | Generate new API tokens from provider account dashboards. | [ ] |
| **WhatsApp Bot Sessions** | Delete old session folders and re-scan the QR code if using the legacy bot. | [ ] |

---

## 4. Verification

After force pushing:
1. Clone the repository into a new temporary directory:
   ```bash
   git clone git@github.com:Harsha79819/autopilot-ai-trading.git /tmp/verify-repo
   cd /tmp/verify-repo
   ```
2. Verify that no `.wwebjs_auth` or `.db` files exist in git log:
   ```bash
   git log --all --full-history -- "**/declarative_performance_observer.db"
   # Output should be completely empty
   ```
3. Run the backend test suite:
   ```bash
   pytest backend/tests -q
   ```
