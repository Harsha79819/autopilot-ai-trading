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
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from backend.app.models.watchlist_alert import NotificationLog

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
        """Format an emoji-rich trade entry WhatsApp message."""
        strat_badge = "🛡️ 1-Click Hedged Spread" if strategy != "NAKED" else "⚡ 1-Lot Option BUY"
        return (
            f"👩‍💼 *Hello Boss! This is Anu reporting today...*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"⚡ *OPTIONS TRADE ALERT:* {strat_badge}\n"
            f"🟢 *ACTION:* BOUGHT {symbol}\n"
            f"📊 *Asset:* {underlying} ({option_type} @ strike {strike})\n"
            f"💵 *Entry Premium:* ₹{premium:.2f}\n"
            f"📦 *Quantity:* {quantity} shares\n"
            f"💼 *Margin Invested:* ₹{margin:.2f}\n"
            f"🛑 *Stop-Loss:* ₹{stop_loss:.2f} (-20% Hard SL)\n"
            f"🎯 *Target 1:* ₹{target:.2f} (+40% Profit Goal)\n"
            f"💡 *AI Logic:* {reason}\n"
            f"⏰ *Time:* {datetime.utcnow().strftime('%H:%M:%S UTC')}\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🛡️ _SEBI Top 7% Discipline: Intraday square-off at 15:10 IST guaranteed._\n"
            f"🎧 _Audio voice note sent below. Tap play while travelling!_"
        )

    @classmethod
    def format_sell_alert(
        cls,
        symbol: str,
        exit_price: float,
        realized_pnl: float,
        return_pct: float,
        exit_reason: str
    ) -> str:
        """Format an exit / profit booking / stop-loss WhatsApp message."""
        is_profit = realized_pnl >= 0
        icon = "🎉" if is_profit else "🛑"
        sign = "+" if is_profit else ""

        reason_display = {
            "TARGET_HIT": "🎯 Target 1 (+40%) Hit - Profit Booked!",
            "STOP_LOSS_HIT": "🔴 Hard Stop-Loss (-20%) Hit - Capital Protected!",
            "TRAILING_STOP_HIT": "🟡 Trailing Stop Hit - Peak Profit Locked!",
            "INTRADAY_SQUARE_OFF": "⚡ 15:10 IST EOD Square-off - Zero Overnight Decay!",
            "MANUAL_EXIT": "👤 Manual Square-Off by Trader"
        }.get(exit_reason, exit_reason)

        return (
            f"👩‍💼 *Hello Boss! This is Anu reporting today...*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"{icon} *OPTIONS POSITION CLOSED:* {symbol}\n"
            f"💵 *Exit Premium:* ₹{exit_price:.2f}\n"
            f"{'🟢' if is_profit else '🔴'} *Realized P&L:* {sign}₹{realized_pnl:.2f} ({sign}{return_pct:.1f}%)\n"
            f"📋 *Reason:* {reason_display}\n"
            f"⏰ *Time:* {datetime.utcnow().strftime('%H:%M:%S UTC')}\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"💡 _All funds safely credited back to your Options Capital buffer._\n"
            f"🎧 _Audio voice note sent below. Tap play while travelling!_"
        )

    @classmethod
    def format_trailing_sl_alert(
        cls,
        symbol: str,
        new_sl: float,
        current_premium: float,
        profit_pct: float
    ) -> str:
        """Format a trailing stop loss elevation alert."""
        return (
            f"👩‍💼 *Hello Boss! This is Anu reporting today...*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🟡 *OPTIONS TRAILING STOP ELEVATED!* 📈\n"
            f"⚡ *Symbol:* {symbol}\n"
            f"🚀 *Surge Premium:* ₹{current_premium:.2f} (+{profit_pct:.1f}% profit)\n"
            f"🔒 *New Locked-In SL Floor:* ₹{new_sl:.2f}\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"💡 _85% of peak gains are now locked. No matter where market moves, profit is protected!_"
        )

    @classmethod
    def format_digest_alert(
        cls,
        cash_balance: float,
        total_equity: float,
        win_rate: float,
        total_trades: int,
        realized_pnl: float,
        open_pos_str: str = "None"
    ) -> str:
        """Format a periodic daily / hourly summary digest."""
        sign = "+" if realized_pnl >= 0 else ""
        return (
            f"👩‍💼 *Hello Boss! This is Anu reporting today...*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"📊 *PORTFOLIO LIVE DIGEST* 🕒\n"
            f"💼 *Cash Balance:* ₹{cash_balance:.2f}\n"
            f"📈 *Total Portfolio Value:* ₹{total_equity:.2f}\n"
            f"🏆 *Win Rate:* {win_rate:.1f}% ({total_trades} trades)\n"
            f"💵 *Net Realized P&L:* {sign}₹{realized_pnl:.2f}\n"
            f"🎯 *Active Contracts:* {open_pos_str}\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🤖 _AutoPilot background risk guardian active._"
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
        sl_str = f"₹{stop_loss:.2f} (-2.0% SL)" if stop_loss else "Automated Dynamic SL"
        tp_str = f"₹{take_profit:.2f} (+4.0% TP)" if take_profit else "Trailing Runner"
        return (
            f"👩‍💼 *Hello Boss! This is Anu reporting today...*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"📈 *EQUITY BUY FILLED:* {quantity} shares of *{symbol}*\n"
            f"💵 *Fill Price:* ₹{price:.2f}\n"
            f"💼 *Total Capital Used:* ₹{total_value:.2f}\n"
            f"🛑 *Stop-Loss:* {sl_str}\n"
            f"🎯 *Take-Profit:* {tp_str}\n"
            f"💡 *AI Logic:* {reason}\n"
            f"⏰ *Time:* {datetime.utcnow().strftime('%H:%M:%S UTC')}\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🛡️ _AutoPilot disciplined swing trading active._\n"
            f"🎧 _Audio voice note sent below. Tap play while travelling!_"
        )

    @classmethod
    def format_equity_sell_alert(
        cls,
        symbol: str,
        quantity: int,
        exit_price: float,
        realized_pnl: float,
        return_pct: float,
        reason: str = "PROFIT_BOOKED"
    ) -> str:
        """Format an equity stock sell/exit WhatsApp message."""
        is_profit = realized_pnl >= 0
        icon = "🎉" if is_profit else "🛑"
        sign = "+" if is_profit else ""
        return (
            f"👩‍💼 *Hello Boss! This is Anu reporting today...*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"{icon} *EQUITY POSITION CLOSED:* {quantity} shares of *{symbol}*\n"
            f"💵 *Exit Price:* ₹{exit_price:.2f}\n"
            f"{'🟢' if is_profit else '🔴'} *Realized P&L:* {sign}₹{realized_pnl:.2f} ({sign}{return_pct:.2f}%)\n"
            f"📋 *Reason:* {reason}\n"
            f"⏰ *Time:* {datetime.utcnow().strftime('%H:%M:%S UTC')}\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"💡 _Funds credited back to your Equity Cash Balance._\n"
            f"🎧 _Audio voice note sent below. Tap play while travelling!_"
        )

    @classmethod
    def format_risk_alert(
        cls,
        event_type: str,
        reason: str,
        portfolio_value: Optional[float] = None
    ) -> str:
        """Format a critical risk management alert."""
        val_str = f"\n💼 *Portfolio Equity:* ₹{portfolio_value:.2f}" if portfolio_value else ""
        return (
            f"👩‍💼 *Hello Boss! This is Anu reporting today...*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"⚠️ *AUTO-PILOT RISK GUARDIAN ALERT* 🛑\n"
            f"🚨 *EVENT:* {event_type}\n"
            f"📋 *Details:* {reason}{val_str}\n"
            f"⏰ *Time:* {datetime.utcnow().strftime('%H:%M:%S UTC')}\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🔒 _Trading safety interlock engaged._\n"
            f"🎧 _Audio voice note sent below. Tap play while travelling!_"
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
        """
        t = text
        t = t.replace('₹', 'Rupees ')
        t = t.replace('CE', 'Call Option')
        t = t.replace('PE', 'Put Option')
        t = t.replace('SL', 'Stop Loss')
        t = t.replace('TP', 'Target Profit')
        t = t.replace('P&L', 'Profit and Loss')
        t = t.replace('EOD', 'End of Day')
        t = t.replace('NIFTY', 'Nifty')
        t = t.replace('BANKNIFTY', 'Bank Nifty')

        lines = []
        for line in t.split('\n'):
            # Skip UI hints from spoken audio
            if any(hint in line for hint in [
                'Audio voice note sent below',
                'Voice audio briefing',
                'Tap play while travelling',
                'SEBI Top 7%',
                'SEBI Discipline'
            ]):
                continue
            cleaned = re.sub(r'[*_~`•━]+', ' ', line)
            cleaned = re.sub(r'[\U00010000-\U0010ffff]', '', cleaned)
            cleaned = re.sub(r'[^\w\s.,;:!?-]', ' ', cleaned).strip()
            if cleaned:
                lines.append(cleaned)

        spoken = '. '.join(lines)
        if not spoken.startswith("Hello Boss"):
            spoken = f"Hello Boss! This is Anu reporting today. {spoken}"
        return spoken

    @classmethod
    def generate_anu_voice_mp3(cls, spoken_text: str) -> Optional[str]:
        """
        Synthesizes high-fidelity, ultra-natural neural speech for Anu using Microsoft Azure Neural TTS (edge-tts),
        with fallback to macOS Indian Siri voice (Tara) or local TTS.
        """
        try:
            fd_mp3, mp3_path = tempfile.mkstemp(suffix=".mp3", prefix="anu_neural_voice_")
            os.close(fd_mp3)

            # 1. Studio-grade Neural Voice (Neerja Expressive - natural, warm Indian female assistant)
            try:
                import asyncio
                import edge_tts

                # Detect if Telugu or Indian English
                has_telugu = any('\u0c00' <= char <= '\u0c7f' for char in spoken_text)
                voice_name = "te-IN-ShrutiNeural" if has_telugu else "en-IN-NeerjaExpressiveNeural"

                async def _synthesize():
                    communicate = edge_tts.Communicate(spoken_text, voice=voice_name, rate="+5%", pitch="+0Hz")
                    await communicate.save(mp3_path)

                asyncio.run(_synthesize())

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
                    "file": ("anu_voice_report.mp3", f, mime_type)
                }
                data = {
                    "messaging_product": "whatsapp",
                    "type": mime_type
                }
                resp = requests.post(url, headers=headers, files=files, data=data, timeout=20)
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

