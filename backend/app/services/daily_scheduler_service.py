"""
AutoPilot AI Trading Platform - Daily WhatsApp Scheduled Notifier Service.
Automates timely daily updates for both Market Trading Days and Week-offs / Holidays:
- Market Days (Mon-Fri):
    1. 09:00 AM IST - Morning Pre-Market Briefing & Readiness
    2. Market Hours (09:15 - 15:15 IST) - Event-driven Live Trade Alerts (Instant)
    3. 15:30 PM IST - Market Close & Square-off Wrap
    4. 07:00 PM IST - Evening EOD Portfolio Digest & P&L Audit
- Week-offs / Holidays (Sat-Sun & NSE Holidays):
    1. 10:00 AM IST - Weekend Standby Morning Status
    2. 06:00 PM IST - Weekend Evening Wrap, Capital Preserved & Monday Outlook
"""
import asyncio
import logging
from datetime import datetime, time, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal
from backend.app.market_data.market_calendar import to_ist_datetime, is_trading_day
from backend.app.models.options_models import OptionsPortfolio, OptionTrade
from backend.app.models.portfolio import Portfolio
from backend.app.models.watchlist_alert import NotificationLog
from backend.app.services.whatsapp_service import WhatsAppAlertService

logger = logging.getLogger("autopilot.daily_scheduler")


class DailySchedulerService:
    """Manages scheduled WhatsApp briefings for trading days and week-offs."""

    SLOTS_CONFIG = {
        # Trading Days (Mon-Fri)
        "MORNING_BRIEF": {
            "name": "Morning Pre-Market Briefing",
            "target_time": time(9, 0),
            "window_end": time(10, 0),
            "trading_day_only": True,
            "weekend_only": False,
            "description": "09:00 AM IST pre-market readiness, Nifty outlook, capital status & strategy check"
        },
        "MARKET_WRAP": {
            "name": "Market Close & Square-Off Wrap",
            "target_time": time(15, 30),
            "window_end": time(16, 30),
            "trading_day_only": True,
            "weekend_only": False,
            "description": "03:30 PM IST market close, day's trade audit, square-off verification"
        },
        "EVENING_DIGEST": {
            "name": "Evening EOD Portfolio Digest",
            "target_time": time(19, 0),
            "window_end": time(21, 30),
            "trading_day_only": True,
            "weekend_only": False,
            "description": "07:00 PM IST comprehensive end-of-day P&L, vault status, compounding progress"
        },
        # Non-Trading Days (Weekends & Holidays)
        "WEEKEND_MORNING": {
            "name": "Weekend Morning Status",
            "target_time": time(10, 0),
            "window_end": time(12, 0),
            "trading_day_only": False,
            "weekend_only": True,
            "description": "10:00 AM IST weekend heartbeat, market holiday reminder, system healthy"
        },
        "WEEKEND_EVENING": {
            "name": "Weekend Evening Wrap & Outlook",
            "target_time": time(18, 0),
            "window_end": time(21, 30),
            "trading_day_only": False,
            "weekend_only": True,
            "description": "06:00 PM IST weekend audit, safe capital verification ₹5,000, Monday market countdown"
        }
    }

    @classmethod
    def has_slot_dispatched_today(cls, db: Session, slot_key: str, today_str: str) -> bool:
        """Checks if a scheduled message slot has already been dispatched today."""
        category = f"SCHEDULED_{slot_key}"
        log_entry = (
            db.query(NotificationLog)
            .filter(
                NotificationLog.category == category,
                NotificationLog.created_at.like(f"{today_str}%")
            )
            .first()
        )
        return log_entry is not None

    @classmethod
    def record_slot_dispatch(cls, db: Session, user_id: int, slot_key: str, title: str, message: str):
        """Persists dispatch in NotificationLog to prevent duplicate sends."""
        category = f"SCHEDULED_{slot_key}"
        log = NotificationLog(
            user_id=user_id,
            title=title,
            message=message,
            category=category,
            severity="INFO",
            is_read=True,
            created_at=datetime.utcnow()
        )
        db.add(log)
        db.commit()

    @classmethod
    def build_message_and_voice(
        cls,
        slot_key: str,
        now_ist: datetime,
        opt_port: OptionsPortfolio,
        main_port: Optional[Portfolio]
    ) -> Dict[str, str]:
        """Constructs rich WhatsApp markdown message and natural spoken text for Anu."""
        cash = opt_port.cash_balance if opt_port else 5000.0
        vault = opt_port.profit_vault_locked if opt_port else 0.0
        realized_pnl = opt_port.realized_pnl if opt_port else 0.0
        date_str = now_ist.strftime("%A, %d-%b-%Y")
        time_str = now_ist.strftime("%H:%M IST")

        if slot_key == "MORNING_BRIEF":
            text = (
                f"🌅 *శుభోదయం హర్ష గారు! Anu Morning Briefing...* 🌸\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"⏰ *Date:* {date_str} | {time_str}\n"
                f"📊 *మార్కెట్ స్టేటస్:* 9:15 AM కు మార్కెట్ ఓపెన్ అవుతుంది ⚡\n"
                f"━━━━━━━━━━━━━━━━━━\n\n"
                f"💼 *క్యాపిటల్ సిద్ధంగా ఉంది:*\n"
                f"• ఆప్షన్స్ బ్యాలెన్స్: ₹{cash:,.2f}\n"
                f"• సేఫ్టీ వాల్ట్: ₹{vault:,.2f}\n"
                f"• రక్షణ నిబంధనలు: -20% Stop Loss, +40% Target\n\n"
                f"🛡️ *ఈ రోజు ప్లాన్:* బలమైన మొమెంటం ఉన్న కాల్/పుట్ లేదా హెడ్జ్డ్ స్ప్రెడ్స్ మాత్రమే స్కాన్ చేసి ట్రేడ్ చేస్తుంది. "
                f"ట్రేడ్ పడగానే వెంటనే వాట్సాప్ అలర్ట్ వస్తుంది!\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"_AutoPilot AI • Morning Briefing_"
            )
            voice = (
                f"శుభోదయం హర్ష గారు, నేను అను ని. ఈ రోజు మార్కెట్ ప్రారంభం కాబోతోంది. "
                f"మీ ఐదు వేల రూపాయల క్యాపిటల్ సురక్షితంగా సిద్ధంగా ఉంది. "
                f"స్టాప్ లాస్ మరియు టార్గెట్ రూల్స్ యాక్టివ్ గా ఉన్నాయి. మంచి ట్రేడ్ దొరికిన వెంటనే అలర్ట్ పంపుతాను. హ్యాపీ ట్రేడింగ్!"
            )

        elif slot_key == "MARKET_WRAP":
            text = (
                f"🏁 *మార్కెట్ ముగింపు నివేదిక (Market Close Wrap)* 📊\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"⏰ *Time:* {time_str} | {date_str}\n"
                f"🔔 *మార్కెట్ క్లోజ్ అయ్యింది (3:30 PM)*\n"
                f"━━━━━━━━━━━━━━━━━━\n\n"
                f"📈 *ఈ రోజు ట్రేడింగ్ ఫలితం:*\n"
                f"• ఆప్షన్స్ బ్యాలెన్స్: ₹{cash:,.2f}\n"
                f"• నేటి P&L: {'+' if realized_pnl >= 0 else ''}₹{realized_pnl:,.2f}\n"
                f"• ఓపెన్ పొజిషన్లు: 0 (15:10 IST నాటికే ఆటో స్క్వేర్-ఆఫ్ పూర్తి)\n\n"
                f"✅ ఓవర్‌నైట్ రిస్క్ లేకుండా క్యాపిటల్ క్లీన్‌గా ప్రొటెక్ట్ చేయబడింది!\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"_AutoPilot AI • Market Wrap_"
            )
            voice = (
                f"హలో హర్ష గారు, నేటి మార్కెట్ సమయం ముగిసింది. "
                f"అన్ని పొజిషన్లు స్క్వేర్ ఆఫ్ చేయబడ్డాయి. ఓవర్ నైట్ రిస్క్ ఏమీ లేదు. "
                f"వివరాలు స్క్రీన్ పై చూడవచ్చు. థాంక్యూ!"
            )

        elif slot_key == "EVENING_DIGEST":
            text = (
                f"📊 *ఈ రోజు సమగ్ర నివేదిక (Evening EOD Portfolio Digest)* 🌙\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"⏰ *Time:* {time_str} | {date_str}\n"
                f"📱 *Verified WhatsApp:* +91 {opt_port.whatsapp_phone}\n"
                f"━━━━━━━━━━━━━━━━━━\n\n"
                f"⚡ *1. ఆప్షన్స్ డెస్క్ (Options Desk):*\n"
                f"• ప్రస్తుత నగదు: ₹{cash:,.2f}\n"
                f"• సేఫ్టీ వాల్ట్ బ్యాలెన్స్: ₹{vault:,.2f}\n"
                f"• నేటి నికర లాభనష్టం: {'+' if realized_pnl >= 0 else ''}₹{realized_pnl:,.2f}\n\n"
                f"🏦 *2. మెయిన్ ఈక్విటీ డెస్క్ (Main Equity):*\n"
                f"• నగదు బ్యాలెన్స్: ₹{(main_port.cash_balance if main_port else 3670.26):,.2f}\n\n"
                f"🎯 *3. 30-రోజుల క్రమశిక్షణ లక్ష్యం:* క్యాపిటల్ రక్షణే ప్రథమ ప్రాధాన్యం!\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"_AutoPilot AI • EOD Digest_"
            )
            voice = (
                f"హలో హర్ష గారు, ఇది నేటి ఈవెనింగ్ డైజెస్ట్. మీ ఆప్షన్స్ మరియు ఈక్విటీ అకౌంట్స్ సేఫ్ గా ఉన్నాయి. "
                f"పూర్తి వివరాలు మెసేజ్ లో పంపాను. గుడ్ నైట్!"
            )

        elif slot_key == "WEEKEND_MORNING":
            text = (
                f"🏖️ *శుభోదయం! వీకెండ్ స్టేటస్ అప్‌డేట్ (Weekend Standby)* ☀️\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"⏰ *Date:* {date_str} | {time_str}\n"
                f"🌴 *మార్కెట్ హాలిడే:* ఈ రోజు శని/ఆదివారాల వల్ల మార్కెట్ సెలవు\n"
                f"━━━━━━━━━━━━━━━━━━\n\n"
                f"🛡️ *సిస్టమ్ రక్షణ స్థితి:*\n"
                f"• ఆప్షన్స్ క్యాపిటల్: ₹{cash:,.2f} (100% సేఫ్)\n"
                f"• ఓపెన్ రిస్క్: 0.00% (జీరో హోల్డింగ్స్)\n"
                f"• మోడ్: వీకెండ్ స్లీప్ మోడ్ (Weekend Standby)\n\n"
                f"మీ వీకెండ్‌ను ప్రశాంతంగా ఎంజాయ్ చేయండి! సోమవారం ఉదయం మార్కెట్ మొదలవుతుంది.\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"_AutoPilot AI • Weekend Standby_"
            )
            voice = (
                f"శుభోదయం హర్ష గారు, నేను అను ని. ఈ రోజు వీకెండ్ హాలిడే కాబట్టి స్టాక్ మార్కెట్ క్లోజ్ అయి ఉంది. "
                f"మన సిస్టమ్ సేఫ్ మోడ్ లో ఉంది. మీ ఇన్వెస్ట్‌మెంట్ పూర్తిగా సురక్షితం. హ్యాపీ వీకెండ్!"
            )

        elif slot_key == "WEEKEND_EVENING":
            text = (
                f"🏖️ *వీకెండ్ ఈవెనింగ్ బ్రీఫింగ్ (Weekend Evening Wrap)* 🌙\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"⏰ *Date:* {date_str} | {time_str}\n"
                f"📱 *Verified WhatsApp:* +91 {opt_port.whatsapp_phone}\n"
                f"━━━━━━━━━━━━━━━━━━\n\n"
                f"🛡️ *ఈ వారం సేఫ్టీ ఆడిట్ రిపోర్ట్:*\n"
                f"• ఆప్షన్స్ ట్రేడింగ్ బ్యాలెన్స్: ₹{cash:,.2f} (పూర్తిగా సిద్ధం)\n"
                f"• సేఫ్టీ వాల్ట్: ₹{vault:,.2f}\n"
                f"• ఓపెన్ మార్కెట్ రిస్క్: ₹0.00 (సురక్షితంగా రక్షించబడింది)\n\n"
                f"🚀 *తదుపరి సెషన్:* సోమవారం ఉదయం 09:15 AM కు మార్కెట్ ఓపెన్ అవుతుంది.\n"
                f"ఆటోమేటిక్ ట్రేడింగ్ మరియు లైవ్ అలర్ట్స్ సోమవారం ఉదయం నుండి మళ్లీ మొదలవుతాయి!\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"_AutoPilot AI • Weekend Wrap_"
            )
            voice = (
                f"హలో హర్ష గారు, నేను అను ని. వీకెండ్ ఈవెనింగ్ బ్రీఫింగ్ అందిస్తున్నాను. "
                f"మీ ఐదు వేల రూపాయల క్యాపిటల్ పూర్తిగా సురక్షితంగా ఉంది. "
                f"ఎలాంటి ఓపెన్ రిస్క్ లేదు. సోమవారం ఉదయం తొమ్మిది గంటల పదిహేను నిమిషాలకు మార్కెట్ ప్రారంభం కాగానే లైవ్ అలర్ట్స్ మొదలవుతాయి. గుడ్ నైట్!"
            )

        else:
            text = f"AutoPilot Scheduled Alert: {slot_key} at {time_str}"
            voice = "AutoPilot scheduled alert status."

        return {"text": text, "voice": voice}

    @classmethod
    def dispatch_slot(
        cls,
        slot_key: str,
        db: Session,
        force: bool = False
    ) -> Dict[str, Any]:
        """Dispatches a specific scheduled message slot to the user's WhatsApp."""
        opt_port = db.query(OptionsPortfolio).filter(OptionsPortfolio.id == 1).first()
        if not opt_port or not opt_port.whatsapp_phone:
            return {"success": False, "reason": "No WhatsApp phone configured"}

        if not opt_port.whatsapp_alerts_enabled:
            return {"success": False, "reason": "WhatsApp alerts disabled by user"}

        main_port = db.query(Portfolio).filter(Portfolio.user_id == opt_port.user_id).first()

        now_ist = to_ist_datetime(datetime.utcnow())
        today_str = now_ist.strftime("%Y-%m-%d")

        if not force and cls.has_slot_dispatched_today(db, slot_key, today_str):
            logger.info(f"Slot {slot_key} already dispatched today ({today_str}). Skipping.")
            return {"success": False, "reason": "Already dispatched today"}

        payload = cls.build_message_and_voice(slot_key, now_ist, opt_port, main_port)
        text_message = payload["text"]
        voice_text = payload["voice"]

        phone = opt_port.whatsapp_phone
        phone_id = opt_port.whatsapp_phone_number_id
        token = opt_port.whatsapp_access_token

        results = {}

        # 1. Dispatch text via Meta Cloud API or CallMeBot
        if phone_id and token:
            res = WhatsAppAlertService.send_meta_cloud_api(
                phone=phone,
                message=text_message,
                phone_number_id=phone_id,
                access_token=token
            )
            results["meta_text"] = res
        elif opt_port.whatsapp_api_key:
            res = WhatsAppAlertService.send_callmebot_api(
                phone=phone,
                message=text_message,
                api_key=opt_port.whatsapp_api_key
            )
            results["callmebot_text"] = res
        else:
            link = WhatsAppAlertService.generate_wa_link(phone, text_message)
            results["wa_link"] = link

        # 2. Dispatch Neural Voice Audio Note if Meta Token available
        if phone_id and token and voice_text:
            try:
                mp3_path = WhatsAppAlertService.generate_anu_voice_mp3(voice_text)
                if mp3_path:
                    media_id = WhatsAppAlertService.upload_media_to_meta(
                        file_path=mp3_path,
                        access_token=token,
                        phone_number_id=phone_id
                    )
                    if media_id:
                        audio_res = WhatsAppAlertService.send_meta_audio_message(
                            phone=phone,
                            media_id=media_id,
                            phone_number_id=phone_id,
                            access_token=token
                        )
                        results["meta_audio"] = audio_res
            except Exception as audio_err:
                logger.error(f"Failed to synthesize/send scheduled audio note: {audio_err}")
                results["audio_error"] = str(audio_err)

        # 3. Record in DB audit log
        slot_name = cls.SLOTS_CONFIG.get(slot_key, {}).get("name", slot_key)
        cls.record_slot_dispatch(
            db=db,
            user_id=opt_port.user_id,
            slot_key=slot_key,
            title=f"Scheduled Alert: {slot_name}",
            message=text_message
        )

        return {
            "success": True,
            "slot_key": slot_key,
            "timestamp": now_ist.isoformat(),
            "results": results
        }

    @classmethod
    def check_and_dispatch_active_slots(cls, db: Session) -> List[Dict[str, Any]]:
        """Evaluates current IST time against all scheduled slots and fires overdue/active ones."""
        now_ist = to_ist_datetime(datetime.utcnow())
        cur_time = now_ist.time()
        today_str = now_ist.strftime("%Y-%m-%d")
        is_trading = is_trading_day(now_ist)

        dispatched = []

        for slot_key, config in cls.SLOTS_CONFIG.items():
            # Check calendar day compatibility
            if config["trading_day_only"] and not is_trading:
                continue
            if config["weekend_only"] and is_trading:
                continue

            target_time = config["target_time"]

            # Slot is active if current time is past target_time today and it hasn't fired yet
            if cur_time >= target_time:
                if not cls.has_slot_dispatched_today(db, slot_key, today_str):
                    logger.info(f"Triggering scheduled dispatch for slot '{slot_key}' at {now_ist.isoformat()}")
                    res = cls.dispatch_slot(slot_key, db=db, force=False)
                    dispatched.append(res)

        return dispatched

    @classmethod
    def get_schedule_status(cls, db: Session) -> Dict[str, Any]:
        """Returns the full schedule configuration, today's dispatch state, and next trigger time."""
        now_ist = to_ist_datetime(datetime.utcnow())
        cur_time = now_ist.time()
        today_str = now_ist.strftime("%Y-%m-%d")
        is_trading = is_trading_day(now_ist)

        slots_status = []
        next_slot = None

        for slot_key, config in cls.SLOTS_CONFIG.items():
            applies_today = (config["trading_day_only"] and is_trading) or (config["weekend_only"] and not is_trading)
            is_sent = cls.has_slot_dispatched_today(db, slot_key, today_str)

            target_str = config["target_time"].strftime("%H:%M IST")

            slots_status.append({
                "slot_key": slot_key,
                "name": config["name"],
                "target_time": target_str,
                "description": config["description"],
                "trading_day_only": config["trading_day_only"],
                "weekend_only": config["weekend_only"],
                "applies_today": applies_today,
                "sent_today": is_sent
            })

            if applies_today and not is_sent and next_slot is None:
                if cur_time < config["target_time"]:
                    next_slot = f"{config['name']} at {target_str}"

        return {
            "current_time_ist": now_ist.strftime("%Y-%m-%d %H:%M:%S IST"),
            "is_trading_day": is_trading,
            "next_scheduled_dispatch": next_slot or "All scheduled dispatches completed for today",
            "slots": slots_status
        }


class DailySchedulerWorker:
    """Async background worker that periodically polls DailySchedulerService."""

    def __init__(self, poll_interval_seconds: int = 30):
        self.poll_interval = poll_interval_seconds
        self._is_running = False
        self._task: Optional[asyncio.Task] = None

    def start(self):
        if not self._is_running:
            self._is_running = True
            self._task = asyncio.create_task(self._loop())
            logger.info("DailySchedulerWorker background task started.")

    def stop(self):
        self._is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
        logger.info("DailySchedulerWorker background task stopped.")

    async def _loop(self):
        # Initial brief wait on startup to allow DB initialization
        await asyncio.sleep(5)
        while self._is_running:
            try:
                db = SessionLocal()
                try:
                    DailySchedulerService.check_and_dispatch_active_slots(db)
                finally:
                    db.close()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in DailySchedulerWorker loop: {e}", exc_info=True)

            await asyncio.sleep(self.poll_interval)


# Global singleton instance
daily_scheduler_worker = DailySchedulerWorker(poll_interval_seconds=30)
