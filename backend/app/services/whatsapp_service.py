"""WhatsApp Real-Time Notification & Alert Dispatcher Service."""
import logging
import os
import re
import tempfile
import subprocess
import json
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
import socket
from sqlalchemy.orm import Session

# Force IPv4 preference to prevent TLS handshake hangs on macOS / cloud networks
try:
    _orig_getaddrinfo = socket.getaddrinfo
    def _ipv4_preferred_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
        target_family = socket.AF_INET if isinstance(host, str) and any(h in host for h in ["bing.com", "microsoft.com", "azure", "facebook.com", "whatsapp.com"]) else family
        return _orig_getaddrinfo(host, port, target_family, type, proto, flags)
    socket.getaddrinfo = _ipv4_preferred_getaddrinfo
except Exception:
    pass

from backend.app.models.watchlist_alert import NotificationLog
from backend.app.market_data.market_calendar import to_ist_datetime

logger = logging.getLogger("autopilot.whatsapp")


class WhatsAppAlertService:
    """Manages real-time WhatsApp alert formatting, link generation, and delivery."""

    @staticmethod
    def clean_phone(phone: str) -> str:
        """Strip non-numeric characters; default to Indian 91 country code if missing."""
        digits = "".join(ch for ch in phone if ch.isdigit())
        if len(digits) == 10:
            return f"91{digits}"
        return digits

    @classmethod
    def generate_wa_link(cls, phone: str, message: str) -> str:
        """Generate a 1-click WhatsApp Web / mobile direct dispatch URL."""
        cleaned = cls.clean_phone(phone)
        encoded_msg = urllib.parse.quote(message)
        return f"https://api.whatsapp.com/send?phone={cleaned}&text={encoded_msg}"

    @classmethod
    def get_ist_time_str(cls) -> str:
        """Returns current Indian Standard Time string (e.g. '03:45 PM IST')."""
        ist = timezone(timedelta(hours=5, minutes=30))
        return datetime.now(ist).strftime("%I:%M %p IST")

    @classmethod
    def format_buy_alert(
        cls,
        symbol: str,
        underlying: str,
        strike: float,
        option_type: str,
        premium: float,
        quantity: int,
        margin: float,
        stop_loss: float,
        target: float,
        reason: str = "AI Momentum Signal",
        strategy: str = "NAKED"
    ) -> str:
        """Format an easy-to-read, crystal-clear Telugu + English trade entry WhatsApp message."""
        opt_name = "కాల్ ఆప్షన్ (CE)" if option_type.upper() == "CE" else "పుట్ ఆప్షన్ (PE)"
        strike_fmt = int(strike) if isinstance(strike, (int, float)) and float(strike).is_integer() else strike
        time_str = cls.get_ist_time_str()

        target_gain_rs = max(0.0, (target - premium) * quantity)
        sl_risk_rs = max(0.0, (premium - stop_loss) * quantity)

        strat_badge = "🛡️ హెడ్జ్డ్ స్ప్రెడ్ (Hedged Spread)" if strategy != "NAKED" else "⚡ ఆప్షన్ కొనుగోలు (1-Lot Buy)"

        return (
            f"👋 *హలో హర్ష గారు! నేను మీ ఫ్రెండ్ ని, ప్రెసెంట్ అప్‌డేట్:* 📊\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"⚡ *కొత్త ఆప్షన్స్ ట్రేడ్ తీసుకున్నాం!* 🟢\n"
            f"📌 *రకం:* {strat_badge}\n\n"
            f"📊 *ఏం కొన్నాం:* *{underlying}* ({opt_name} @ {strike_fmt})\n"
            f"🏷️ *కాంట్రాక్ట్:* `{symbol}`\n"
            f"💵 *కొన్న ప్రీమియం ధర:* ₹{premium:.2f}\n"
            f"📦 *పరిమాణం (Qty):* {quantity} షేర్లు (1 Lot)\n"
            f"💼 *వాడిన పెట్టుబడి:* ₹{margin:,.2f}\n\n"
            f"🎯 *లాభం టార్గెట్ (+40%):* ₹{target:.2f} (+₹{target_gain_rs:,.2f} లాభం రావచ్చు)\n"
            f"🛑 *స్టాప్ లాస్ రక్షణ (-20%):* ₹{stop_loss:.2f} (రిస్క్ లిమిట్: -₹{sl_risk_rs:,.2f})\n\n"
            f"💡 *కొనడానికి కారణం:* {reason}\n"
            f"⏰ *సమయం:* {time_str}\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🛡️ _రక్షణ నిబంధన: ఈ రోజు మధ్యాహ్నం 03:10 PM కల్లా ఆటోమేటిక్‌గా క్లోజ్ అవుతుంది. ఓవర్‌నైట్ రిస్క్ ఏమీ ఉండదు._\n"
            f"🎧 _వాయిస్ అప్‌డేట్ కింద వినండి!_"
        )

    @classmethod
    def format_sell_alert(
        cls,
        symbol: str,
        exit_price: float,
        realized_pnl: float,
        return_pct: float,
        exit_reason: str,
        current_balance: Optional[float] = None,
        entry_price: Optional[float] = None
    ) -> str:
        """Format an exit / profit booking / stop-loss WhatsApp message in simple Telugu."""
        is_profit = realized_pnl >= 0
        icon = "🎉" if is_profit else "🛑"
        sign = "+" if is_profit else ""
        time_str = cls.get_ist_time_str()

        reason_display = {
            "TARGET_HIT": "🎯 టార్గెట్ రీచ్ అయ్యింది! పూర్తి లాభం బుక్ చేశాం",
            "STOP_LOSS_HIT": "🛑 స్టాప్‌లాస్ ట్రిగ్గర్ అయ్యింది - క్యాపిటల్ రక్షించబడింది",
            "TRAILING_STOP_HIT": "🟡 ట్రైలింగ్ స్టాప్‌లాస్ హిట్ అయ్యింది - గరిష్ట లాభం లాక్ చేశాం",
            "INTRADAY_SQUARE_OFF": "⚡ 15:10 IST ముగింపు - ఓవర్‌నైట్ రిస్క్ లేకుండా క్లోజ్ చేశాం",
            "MANUAL_EXIT": "👤 మీ ఆదేశానుసారం క్లోజ్ చేయబడింది"
        }.get(exit_reason, exit_reason)

        header = "ఆప్షన్స్ లాభం బుక్ చేశాం (Profit Booked) 💰" if is_profit else "స్టాప్‌లాస్ రక్షణ (Position Closed) 🛡️"
        pnl_badge = f"🟢 *వచ్చిన నికర లాభం (Net Profit):* +₹{realized_pnl:,.2f} (+{return_pct:.1f}%)" if is_profit else f"🔴 *ముగిసిన ఫలితం:* -₹{abs(realized_pnl):,.2f} ({return_pct:.1f}%)"

        entry_line = f"📥 *కొన్న ప్రీమియం ధర:* ₹{entry_price:.2f}\n" if entry_price is not None else ""
        bal_line = f"💼 *ప్రస్తుత ఖాతా నగదు బ్యాలెన్స్:* ₹{current_balance:,.2f}\n" if current_balance else ""

        return (
            f"👋 *హలో హర్ష గారు! నేను మీ ఫ్రెండ్ ని, ప్రెసెంట్ అప్‌డేట్:* 📊\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"{icon} *{header}*\n\n"
            f"📊 *ట్రేడ్:* `{symbol}`\n"
            f"{entry_line}"
            f"📤 *అమ్మిన ప్రీమియం ధర:* ₹{exit_price:.2f}\n"
            f"{pnl_badge}\n\n"
            f"📋 *క్లోజ్ అయిన కారణం:* {reason_display}\n"
            f"{bal_line}"
            f"⏰ *సమయం:* {time_str}\n"
            f"🌐 *లైవ్ ప్లాట్‌ఫారమ్:* https://autopilot-ai-trading.onrender.com\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"✅ _పెట్టుబడి మరియు లాభం మొత్తం మీ ఖాతాలో సురక్షితంగా జమ అయ్యాయి._\n"
            f"🎧 _వాయిస్ అప్‌డేట్ కింద వినండి!_"
        )

    @classmethod
    def format_trailing_sl_alert(
        cls,
        symbol: str,
        new_sl: float,
        current_premium: float,
        profit_pct: float
    ) -> str:
        """Format a trailing stop loss elevation alert in simple Telugu."""
        time_str = cls.get_ist_time_str()
        return (
            f"👋 *హలో హర్ష గారు! నేను మీ ఫ్రెండ్ ని, ప్రెసెంట్ అప్‌డేట్:* 📊\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🟡 *లాభం రక్షణ పెంచబడింది (Trailing Stop Locked)* 📈\n\n"
            f"⚡ *ట్రేడ్:* `{symbol}`\n"
            f"🚀 *ప్రస్తుత ధర:* ₹{current_premium:.2f} (+{profit_pct:.1f}% లాభంలో దూసుకుపోతోంది)\n"
            f"🔒 *కొత్త స్టాప్‌లాస్ రక్షణ ఫ్లోర్:* ₹{new_sl:.2f}\n\n"
            f"⏰ *సమయం:* {time_str}\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"💡 _85% గరిష్ట లాభం లాక్ చేయబడింది. మార్కెట్ ఎటు కదిలినా మీ లాభం సురక్షితం!_"
        )

    @classmethod
    def format_digest_alert(
        cls,
        cash_balance: float,
        total_equity: float,
        win_rate: float,
        total_trades: int,
        realized_pnl: float,
        open_pos_str: str = "ఏమీ లేవు (Zero Risk)"
    ) -> str:
        """Format a periodic daily summary digest in simple Telugu."""
        sign = "+" if realized_pnl >= 0 else ""
        time_str = cls.get_ist_time_str()
        return (
            f"👋 *హలో హర్ష గారు! నేను మీ ఫ్రెండ్ ని, ప్రెసెంట్ అప్‌డేట్:* 📊\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"📊 *పోర్ట్‌ఫోలియో తాజా స్థితి (Live Digest)* 🕒\n\n"
            f"💼 *నగదు బ్యాలెన్స్:* ₹{cash_balance:,.2f}\n"
            f"📈 *మొత్తం పోర్ట్‌ఫోలియో విలువ:* ₹{total_equity:,.2f}\n"
            f"🏆 *విజయం రేటు (Win Rate):* {win_rate:.1f}% ({total_trades} ట్రేడ్లు)\n"
            f"💵 *నికర లాభనష్టం:* {sign}₹{realized_pnl:,.2f}\n"
            f"🎯 *యాక్టివ్ పొజిషన్లు:* {open_pos_str}\n\n"
            f"⏰ *సమయం:* {time_str}\n"
            f"🌐 *లైవ్ ప్లాట్‌ఫారమ్:* https://autopilot-ai-trading.onrender.com\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🤖 _AutoPilot AI రక్షణ వ్యవస్థ 100% యాక్టివ్‌గా ఉంది._\n"
            f"🎧 _వాయిస్ అప్‌డేట్ కింద వినండి!_"
        )

    @classmethod
    def format_equity_buy_alert(
        cls,
        symbol: str,
        quantity: int,
        price: float,
        total_value: float,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None,
        reason: str = "AI Opportunity Momentum"
    ) -> str:
        """Format an equity stock buy order WhatsApp message."""
        time_str = cls.get_ist_time_str()
        sl_str = f"₹{stop_loss:.2f} (-2.0% SL)" if stop_loss else "ఆటోమేటిక్ డైనమిక్ SL"
        tp_str = f"₹{take_profit:.2f} (+4.0% TP)" if take_profit else "ట్రైలింగ్ రన్నర్"
        return (
            f"👋 *హలో హర్ష గారు! నేను మీ ఫ్రెండ్ ని, ప్రెసెంట్ అప్‌డేట్:* 📊\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"📈 *ఈక్విటీ స్టాక్ కొనుగోలు (Equity Buy)* 🟢\n\n"
            f"📊 *స్టాక్:* *{symbol}* ({quantity} షేర్లు)\n"
            f"💵 *కొన్న ధర:* ₹{price:.2f}\n"
            f"💼 *మొత్తం వాడిన పెట్టుబడి:* ₹{total_value:,.2f}\n"
            f"🛑 *స్టాప్ లాస్ రక్షణ:* {sl_str}\n"
            f"🎯 *టార్గెట్ లాభం:* {tp_str}\n"
            f"💡 *కారణం:* {reason}\n"
            f"⏰ *సమయం:* {time_str}\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🛡️ _క్రమశిక్షణతో కూడిన స్వింగ్ ట్రేడింగ్ రక్షణ యాక్టివ్‌గా ఉంది._\n"
            f"🎧 _వాయిస్ అప్‌డేట్ కింద వినండి!_"
        )

    @classmethod
    def format_equity_sell_alert(
        cls,
        symbol: str,
        quantity: int,
        exit_price: float,
        realized_pnl: float,
        return_pct: float,
        reason: str = "PROFIT_BOOKED",
        buy_price: Optional[float] = None
    ) -> str:
        """Format an equity stock sell/exit WhatsApp message."""
        is_profit = realized_pnl >= 0
        icon = "🎉" if is_profit else "🛑"
        time_str = cls.get_ist_time_str()
        header = "ఈక్విటీ లాభం బుక్ చేశాం (Profit Booked) 💰" if is_profit else "ఈక్విటీ పొజిషన్ క్లోజ్ అయ్యింది 🛡️"
        pnl_badge = f"🟢 *నికర లాభం (Net Profit):* +₹{realized_pnl:,.2f} (+{return_pct:.2f}%)" if is_profit else f"🔴 *ముగిసిన ఫలితం:* -₹{abs(realized_pnl):,.2f} ({return_pct:.2f}%)"

        buy_line = f"📥 *కొన్న ధర:* ₹{buy_price:.2f}\n" if buy_price is not None else ""

        return (
            f"👋 *హలో హర్ష గారు! నేను మీ ఫ్రెండ్ ని, ప్రెసెంట్ అప్‌డేట్:* 📊\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"{icon} *{header}*\n\n"
            f"📊 *స్టాక్:* *{symbol}* ({quantity} షేర్లు)\n"
            f"{buy_line}"
            f"📤 *అమ్మిన ధర:* ₹{exit_price:.2f}\n"
            f"{pnl_badge}\n\n"
            f"📋 *కారణం:* {reason}\n"
            f"⏰ *సమయం:* {time_str}\n"
            f"🌐 *లైవ్ ప్లాట్‌ఫారమ్:* https://autopilot-ai-trading.onrender.com\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"💡 _పెట్టుబడి నగదు మీ ఈక్విటీ బ్యాలెన్స్‌లో జమ చేయబడింది._\n"
            f"🎧 _వాయిస్ అప్‌డేట్ కింద వినండి!_"
        )

    @classmethod
    def format_risk_alert(
        cls,
        event_type: str,
        reason: str,
        portfolio_value: Optional[float] = None
    ) -> str:
        """Format a critical risk management alert in simple Telugu."""
        time_str = cls.get_ist_time_str()
        val_str = f"\n💼 *పోర్ట్‌ఫోలియో విలువ:* ₹{portfolio_value:,.2f}" if portfolio_value else ""
        return (
            f"👋 *హలో హర్ష గారు! నేను మీ ఫ్రెండ్ ని, ప్రెసెంట్ అప్‌డేట్:* 📊\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"⚠️ *అత్యవసర భద్రతా అలర్ట్ (Risk Guardian Alert)* 🛑\n\n"
            f"🚨 *ఈవెంట్:* {event_type}\n"
            f"📋 *వివరాలు:* {reason}{val_str}\n"
            f"🔒 *ట్రేడింగ్ రక్షణ వ్యవస్థ ఆన్ చేయబడింది - క్యాపిటల్ పూర్తిగా సురక్షితం.*\n"
            f"⏰ *సమయం:* {time_str}\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🎧 _వాయిస్ అప్‌డేట్ కింద వినండి!_"
        )

    @classmethod
    def send_direct_whatsapp_http(cls, phone: str, message: str, api_key: str) -> Dict[str, Any]:
        """
        Sends an automated HTTP push to WhatsApp via CallMeBot gateway
        so the message lands directly in the user's phone inbox without clicking.
        """
        try:
            import urllib.request
            import urllib.parse
            clean = cls.clean_phone(phone)
            encoded_text = urllib.parse.quote(message)
            url = f"https://api.callmebot.com/whatsapp.php?phone=+{clean}&text={encoded_text}&apikey={api_key}"
            req = urllib.request.Request(url, headers={"User-Agent": "AutoPilotAI/1.0"})
            with urllib.request.urlopen(req, timeout=10) as response:
                body = response.read().decode('utf-8')
                logger.info(f"Direct WhatsApp gateway response: {body[:100]}")
                return {"success": True, "response": body[:100]}
        except Exception as e:
            logger.error(f"Failed to push direct WhatsApp HTTP alert: {e}")
            return {"success": False, "error": str(e)}

    @classmethod
    def is_weekend_sleep_mode(cls) -> bool:
        """Returns True if current IST time is during weekend sleep mode (Sat/Sun)."""
        from datetime import datetime, timezone, timedelta
        ist = timezone(timedelta(hours=5, minutes=30))
        return datetime.now(ist).weekday() >= 5

    @classmethod
    def clean_text_for_speech(cls, text: str) -> str:
        """
        Convert alert markdown and abbreviations into clear, natural spoken sentences for Anu.
        Handles both Telugu and English fluently.
        """
        has_telugu = any('\u0c00' <= char <= '\u0c7f' for char in text)

        t = text
        if has_telugu:
            # Replace tickers before short symbols
            t = t.replace('RELIANCE', 'రిలయన్స్ ')
            t = t.replace('BANKNIFTY', 'బ్యాంక్ నిఫ్టీ ')
            t = t.replace('NIFTY', 'నిఫ్టీ ')
            t = t.replace('TCS', 'టీసీఎస్ ')
            t = t.replace('INFY', 'ఇన్ఫోసిస్ ')
            t = t.replace('HDFCBANK', 'హెచ్‌డీఎఫ్‌సీ బ్యాంక్ ')
            t = t.replace('ICICIBANK', 'ఐసీఐసీఐ బ్యాంక్ ')
            t = t.replace('ITC', 'ఐటీసీ ')
            t = t.replace('SBIN', 'ఎస్‌బీఐ ')
            t = t.replace('₹', ' రూపాయలు ')
            t = t.replace('%', ' శాతం ')
            t = re.sub(r'(\d+)\s*CE\b', r'\1 కాల్ ఆప్షన్ ', t)
            t = re.sub(r'(\d+)\s*PE\b', r'\1 పుట్ ఆప్షన్ ', t)
            t = re.sub(r'\bCE\b', 'కాల్ ఆప్షన్', t)
            t = re.sub(r'\bPE\b', 'పుట్ ఆప్షన్', t)
            t = re.sub(r'\bSL\b', 'స్టాప్ లాస్', t)
            t = re.sub(r'\bTP\b', 'టార్గెట్', t)
            t = t.replace('P&L', 'లాభ నష్టాలు')
            t = re.sub(r'\bQty\b', 'పరిమాణం', t)
            t = re.sub(r'\bEOD\b', 'మార్కెట్ ముగింపు', t)
        else:
            t = t.replace('₹', 'Rupees ')
            t = t.replace('%', ' percent ')
            t = re.sub(r'\bCE\b', 'Call Option', t)
            t = re.sub(r'\bPE\b', 'Put Option', t)
            t = re.sub(r'\bSL\b', 'Stop Loss', t)
            t = re.sub(r'\bTP\b', 'Target Profit', t)
            t = t.replace('P&L', 'Profit and Loss')
            t = re.sub(r'\bEOD\b', 'End of Day', t)
            t = t.replace('NIFTY', 'Nifty')
            t = t.replace('BANKNIFTY', 'Bank Nifty')

        lines = []
        for line in t.split('\n'):
            line_str = line.strip()
            if not line_str:
                continue
            # Strip URLs and website links completely from voice audio
            if any(u in line_str.lower() for u in ['http://', 'https://', 'www.', '.onrender.com', 'onrender']):
                continue
            # Skip UI / instruction hints / footers / slogans from spoken audio
            if any(hint in line_str for hint in [
                'లైవ్ ప్లాట్‌ఫారమ్',
                'లైవ్ ప్లాట్ఫారమ్',
                'లైవ్ డ్యాష్‌బోర్డ్',
                'ప్లాట్‌ఫారమ్',
                'ప్లాట్ఫారమ్',
                'వాయిస్ రిపోర్ట్',
                'వాయిస్ ఆడియో',
                'వాయిస్ అప్‌డేట్',
                'వాయిస్ అప్డేట్',
                'ప్లే చేసి వినవచ్చు',
                'ప్రథమ ప్రాధాన్యం',
                'క్యాపిటల్ రక్షణే',
                'AutoPilot AI',
                'Audio voice note sent below',
                'Voice audio briefing',
                'Tap play while travelling',
                'SEBI Top 7%',
                'SEBI Discipline'
            ]):
                continue
            cleaned = re.sub(r'https?://\S+', '', line_str)
            cleaned = re.sub(r'www\.\S+', '', cleaned)
            cleaned = re.sub(r'[*_~`•━]+', ' ', cleaned)
            cleaned = re.sub(r'[\U00010000-\U0010ffff]', '', cleaned)
            cleaned = re.sub(r'[^\w\s.,;:!?\u0c00-\u0c7f-]', ' ', cleaned).strip()
            cleaned = re.sub(r'\s+', ' ', cleaned).strip()
            if cleaned:
                lines.append(cleaned)

        spoken = '. '.join(lines)
        if has_telugu:
            if not any(spoken.startswith(g) for g in ["హలో", "నమస్కారం", "శుభోదయం"]):
                spoken = f"హలో హర్ష గారు, నేను మీ ఫ్రెండ్ ని. ప్రెసెంట్ అప్‌డేట్: {spoken}"
        else:
            if not spoken.startswith("Hello Harsha"):
                spoken = f"Hello Harsha garu! Nenu mee friend ni, present update: {spoken}"
        return spoken

    @classmethod
    def generate_anu_voice_mp3(cls, spoken_text: str) -> Optional[str]:
        """
        Synthesizes high-fidelity, ultra-natural neural speech for voice updates using Microsoft Azure Neural TTS (edge-tts),
        with fallback to macOS Indian Siri voice (Tara) or local TTS.
        """
        try:
            fd_mp3, mp3_path = tempfile.mkstemp(suffix=".mp3", prefix="voice_update_")
            os.close(fd_mp3)

            # 1. Studio-grade Neural Voice (te-IN-ShrutiNeural for Telugu, NeerjaExpressive for Indian English)
            try:
                import asyncio
                import edge_tts

                # Detect if Telugu or Indian English
                has_telugu = any('\u0c00' <= char <= '\u0c7f' for char in spoken_text)
                voice_name = "te-IN-ShrutiNeural" if has_telugu else "en-IN-NeerjaExpressiveNeural"

                import concurrent.futures

                async def _synthesize():
                    communicate = edge_tts.Communicate(spoken_text, voice=voice_name, rate="+14%", pitch="+0Hz")
                    await communicate.save(mp3_path)

                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                    pool.submit(lambda: asyncio.run(_synthesize())).result(timeout=25)

                if os.path.exists(mp3_path) and os.path.getsize(mp3_path) > 1024:
                    logger.info(f"Anu studio-grade Neural Voice synthesized successfully with {voice_name}")
                    return mp3_path
            except Exception as edge_err:
                logger.warning(f"edge-tts neural synthesis fallback to local engine: {edge_err}")

            # 2. Local Fallback: macOS Indian Siri voice (Tara) or Samantha
            fd_m4a, m4a_path = tempfile.mkstemp(suffix=".m4a", prefix="anu_voice_")
            os.close(fd_m4a)

            try:
                subprocess.run(['say', '-v', 'Tara', spoken_text, '-o', m4a_path], check=True, timeout=15)
            except Exception:
                try:
                    subprocess.run(['say', '-v', 'Samantha', spoken_text, '-o', m4a_path], check=True, timeout=15)
                except Exception:
                    subprocess.run(['say', spoken_text, '-o', m4a_path], check=True, timeout=15)

            subprocess.run([
                'ffmpeg', '-y', '-i', m4a_path,
                '-codec:a', 'libmp3lame', '-b:a', '64k',
                mp3_path
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)

            if os.path.exists(m4a_path):
                os.remove(m4a_path)

            if os.path.exists(mp3_path) and os.path.getsize(mp3_path) > 0:
                return mp3_path
        except Exception as e:
            logger.error(f"Failed to generate Anu voice MP3: {e}")
        return None

    @classmethod
    def upload_media_to_meta(
        cls,
        file_path: str,
        access_token: str,
        phone_number_id: str,
        mime_type: str = "audio/mpeg"
    ) -> Optional[str]:
        """
        Uploads an audio/media file to Meta WhatsApp Cloud API /media endpoint using requests.
        Returns the uploaded media_id string.
        """
        try:
            import requests
            url = f"https://graph.facebook.com/v19.0/{phone_number_id.strip()}/media"
            headers = {
                "Authorization": f"Bearer {access_token.strip()}",
                "User-Agent": "AutoPilotAI/1.0"
            }
            with open(file_path, "rb") as f:
                files = {
                    "file": ("voice_update.mp3", f, mime_type)
                }
                data = {
                    "messaging_product": "whatsapp",
                    "type": mime_type
                }
                resp = requests.post(url, headers=headers, files=files, data=data, timeout=45)
            if resp.status_code == 200:
                resp_json = resp.json()
                media_id = resp_json.get("id")
                logger.info(f"Meta media upload successful: media_id={media_id}")
                return media_id
            else:
                logger.error(f"Failed to upload media to Meta Cloud API: {resp.status_code} {resp.text}")
                return None
        except Exception as e:
            logger.error(f"Failed to upload media to Meta Cloud API: {e}")
            return None

    @classmethod
    def send_meta_audio_message(
        cls,
        phone: str,
        media_id: str,
        access_token: str,
        phone_number_id: str
    ) -> Dict[str, Any]:
        """
        Sends an audio voice note to user's WhatsApp using Meta WhatsApp Cloud API via requests.
        """
        try:
            import requests
            clean = cls.clean_phone(phone)
            url = f"https://graph.facebook.com/v19.0/{phone_number_id.strip()}/messages"
            headers = {
                "Authorization": f"Bearer {access_token.strip()}",
                "Content-Type": "application/json",
                "User-Agent": "AutoPilotAI/1.0"
            }
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": clean,
                "type": "audio",
                "audio": {
                    "id": media_id
                }
            }
            resp = requests.post(url, json=payload, headers=headers, timeout=15)
            if resp.status_code == 200:
                resp_data = resp.json()
                logger.info(f"Meta WhatsApp Audio Voice Note dispatched to {clean}: {resp_data}")
                return {
                    "success": True,
                    "media_id": media_id,
                    "meta_audio_id": resp_data.get("messages", [{}])[0].get("id", ""),
                    "raw": resp_data
                }
            else:
                logger.error(f"Meta Audio Note HTTP error {resp.status_code}: {resp.text}")
                return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text}"}
        except Exception as e:
            logger.error(f"Meta Audio Note unexpected error: {e}")
            return {"success": False, "error": str(e)}

    @classmethod
    def send_meta_voice_note(
        cls,
        phone: str,
        message: str,
        access_token: str,
        phone_number_id: str
    ) -> Dict[str, Any]:
        """
        Convenience pipeline: converts text message to spoken audio MP3,
        uploads to Meta Cloud API, and sends playable voice note to user's WhatsApp.
        """
        spoken_text = cls.clean_text_for_speech(message)
        mp3_path = cls.generate_anu_voice_mp3(spoken_text)
        if not mp3_path:
            return {"success": False, "error": "Could not synthesize voice MP3"}

        try:
            media_id = cls.upload_media_to_meta(mp3_path, access_token, phone_number_id)
            if not media_id:
                return {"success": False, "error": "Could not upload audio to Meta Cloud API"}

            return cls.send_meta_audio_message(phone, media_id, access_token, phone_number_id)
        finally:
            if os.path.exists(mp3_path):
                try:
                    os.remove(mp3_path)
                except Exception:
                    pass

    @classmethod
    def send_meta_cloud_api(
        cls,
        phone: str,
        message: str,
        access_token: str,
        phone_number_id: str
    ) -> Dict[str, Any]:
        """
        Sends an official direct WhatsApp Cloud API message via Meta's Graph API.
        Delivers straight to user's phone inbox with 1,000 free conversations/month.
        """
        try:
            import requests
            clean = cls.clean_phone(phone)
            url = f"https://graph.facebook.com/v19.0/{phone_number_id.strip()}/messages"
            headers = {
                "Authorization": f"Bearer {access_token.strip()}",
                "Content-Type": "application/json",
                "User-Agent": "AutoPilotAI/1.0"
            }
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": clean,
                "type": "text",
                "text": {
                    "preview_url": False,
                    "body": message
                }
            }
            res = requests.post(url, json=payload, headers=headers, timeout=12)
            resp_data = res.json()
            if res.status_code == 200:
                logger.info(f"Meta WhatsApp Cloud API delivery success for {clean}: {resp_data}")
                return {
                    "success": True,
                    "provider": "META_CLOUD_API",
                    "meta_message_id": resp_data.get("messages", [{}])[0].get("id", ""),
                    "raw": resp_data
                }
            else:
                err_msg = resp_data.get("error", {}).get("message", f"HTTP {res.status_code}")
                logger.error(f"Meta WhatsApp Cloud API error {res.status_code}: {err_msg}")
                return {"success": False, "provider": "META_CLOUD_API", "error": f"HTTP {res.status_code}: {err_msg}", "raw": resp_data}
        except Exception as e:
            logger.error(f"Meta WhatsApp Cloud API unexpected error: {e}")
            return {"success": False, "provider": "META_CLOUD_API", "error": str(e)}

    @classmethod
    def dispatch_alert(
        cls,
        db: Session,
        user_id: int,
        phone: str,
        message: str,
        category: str = "OPTIONS_TRADE",
        api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Record the alert in NotificationLog and dispatch via Meta Cloud API or gateway.
        Delivers both text and hands-free audio voice notes.
        """
        # Weekend sleep mode check (protect user sleep on Sat/Sun when markets are closed)
        if category != "WHATSAPP_TEST" and cls.is_weekend_sleep_mode() and category not in ("WEEKEND_DIGEST", "RISK_ALERT"):
            logger.info("Weekend sleep mode active: routine trade alert suppressed.")
            return {
                "status": "SLEEP_MODE",
                "phone": phone,
                "direct_sent": False,
                "message": "Market closed: weekend sleep mode active",
                "timestamp": datetime.utcnow().isoformat()
            }

        # Suppress noisy intermediate trailing SL alerts to save quota
        if category == "TRAILING_SL":
            logger.info("Trailing SL update recorded internally; suppressed WhatsApp delivery to preserve message quota.")
            return {
                "status": "SUPPRESSED_TRAILING_SL",
                "phone": phone,
                "direct_sent": False,
                "message": "Trailing SL updated internally",
                "timestamp": datetime.utcnow().isoformat()
            }

        # Strict Daily Quota Guard (Strictly <= 20 messages/day per user)
        MAX_DAILY_WHATSAPP_ALERTS = 20
        if category not in ("EMERGENCY_HALT", "CIRCUIT_BREAKER", "WHATSAPP_TEST"):
            try:
                now_ist = to_ist_datetime(datetime.utcnow())
                today_start_utc = datetime(now_ist.year, now_ist.month, now_ist.day) - timedelta(hours=5, minutes=30)
                today_count = db.query(NotificationLog).filter(
                    NotificationLog.user_id == user_id,
                    NotificationLog.created_at >= today_start_utc
                ).count()
                if today_count >= MAX_DAILY_WHATSAPP_ALERTS:
                    logger.warning(
                        f"Daily WhatsApp limit of {MAX_DAILY_WHATSAPP_ALERTS} messages reached for user {user_id}. "
                        f"Suppressing {category} to protect monthly quota."
                    )
                    return {
                        "status": "DAILY_QUOTA_REACHED",
                        "phone": phone,
                        "direct_sent": False,
                        "message": f"Daily quota limit ({MAX_DAILY_WHATSAPP_ALERTS}/day) reached. Preserved monthly allowance.",
                        "timestamp": datetime.utcnow().isoformat()
                    }
            except Exception as quota_err:
                logger.debug(f"Daily quota check error: {quota_err}")

        try:
            log_entry = NotificationLog(
                user_id=user_id,
                title="WhatsApp Trade Alert",
                message=message[:490],
                severity="SUCCESS" if "BOUGHT" in message or "🎉" in message else "INFO",
                category=category,
                is_read=False,
                created_at=datetime.utcnow()
            )
            db.add(log_entry)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to log notification: {e}")

        # Check Meta Cloud API credentials or CallMeBot
        direct_sent = False
        direct_resp = None
        delivery_provider = "WHATSAPP_LINK"

        try:
            from backend.app.models.options_models import OptionsPortfolio
            opt = db.query(OptionsPortfolio).filter(OptionsPortfolio.user_id == user_id).first()
            if opt:
                meta_token = getattr(opt, "whatsapp_access_token", None)
                meta_phone_id = getattr(opt, "whatsapp_phone_number_id", None)
                if meta_token and meta_phone_id and meta_token.strip() and meta_phone_id.strip():
                    meta_res = cls.send_meta_cloud_api(phone, message, meta_token, meta_phone_id)
                    if meta_res.get("success"):
                        direct_sent = True
                        direct_resp = meta_res
                        delivery_provider = "META_CLOUD_API"

                        # Deliver hands-free Anu audio voice note alongside text message
                        try:
                            audio_res = cls.send_meta_voice_note(phone, message, meta_token, meta_phone_id)
                            direct_resp["audio_voice_note"] = audio_res
                        except Exception as ae:
                            logger.warning(f"Voice note delivery skipped: {ae}")
                elif not api_key and getattr(opt, "whatsapp_api_key", None):
                    api_key = opt.whatsapp_api_key.strip()
        except Exception as e:
            logger.debug(f"Credentials lookup error: {e}")

        if not direct_sent and api_key:
            push_res = cls.send_direct_whatsapp_http(phone, message, api_key)
            direct_sent = push_res.get("success", False)
            direct_resp = push_res
            if direct_sent:
                delivery_provider = "CALLMEBOT"

        wa_link = cls.generate_wa_link(phone, message) if phone else ""
        logger.info(f"WhatsApp Alert prepared for {phone} (provider={delivery_provider}, direct_sent={direct_sent}): {message[:60]}...")

        return {
            "status": "DISPATCHED",
            "phone": phone,
            "direct_sent": direct_sent,
            "direct_resp": direct_resp,
            "wa_link": wa_link,
            "whatsapp_link": wa_link,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }

    @classmethod
    def get_user_phone_and_status(cls, db: Session, user_id: int) -> tuple:
        """Fetch user's configured WhatsApp phone number and check if alerts are active."""
        try:
            from backend.app.models.options_models import OptionsPortfolio
            opt = db.query(OptionsPortfolio).filter(OptionsPortfolio.user_id == user_id).first()
            if opt and getattr(opt, "whatsapp_phone", None) and getattr(opt, "whatsapp_alerts_enabled", True):
                return opt.whatsapp_phone.strip(), True
        except Exception as e:
            logger.debug(f"Could not load whatsapp config for user {user_id}: {e}")
        return "", False

    @classmethod
    def notify_user_if_enabled(
        cls,
        db: Session,
        user_id: int,
        message: str,
        category: str = "PLATFORM_TRADE"
    ) -> Optional[Dict[str, Any]]:
        """
        Unified dispatch: automatically looks up user's phone across the platform
        and sends real-time WhatsApp alert if configured.
        """
        phone, enabled = cls.get_user_phone_and_status(db, user_id)
        if phone and enabled:
            try:
                return cls.dispatch_alert(db, user_id, phone, message, category)
            except Exception as e:
                logger.warning(f"Unified WhatsApp alert skipped: {e}")
        return None

