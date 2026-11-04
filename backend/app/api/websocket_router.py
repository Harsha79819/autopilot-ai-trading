"""WebSocket Streaming Router for real-time market ticks and portfolio updates."""
import asyncio
import json
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, status
from sqlalchemy.orm import Session
from backend.app.services.auto_trader import autopilot_runner
from backend.app.auth.security import decode_access_token
from backend.app.database import get_db
from backend.app.models.user import User

router = APIRouter(tags=["WebSocket"])
logger = logging.getLogger("autopilot.ws")


@router.websocket("/ws/stream")
async def websocket_stream(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    # Retrieve token from query parameter
    if not token:
        token = websocket.query_params.get("token")

    if not token:
        logger.warning("WebSocket handshake rejected: No authentication token provided.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication token required")
        return

    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        logger.warning("WebSocket handshake rejected: Invalid or expired token.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        return

    try:
        user_id = int(payload.get("sub"))
    except (ValueError, TypeError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Malformed token subject")
        return

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        logger.warning(f"WebSocket handshake rejected: User {user_id} not found or inactive.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User inactive")
        return

    await websocket.accept()
    queue = asyncio.Queue()
    autopilot_runner.register_listener(queue, user_id=user_id)
    logger.info(f"WebSocket client connected for user {user_id}.")

    try:
        # Initial greeting and connection confirmation
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to AutoPilot live stream (Real-Time Live NSE Feed)",
            "disclaimer": "REAL-TIME LIVE NSE FEED - STRICT PAPER TRADING ONLY",
            "user_id": user_id
        })

        # Immediately send cached quotes and AI status so UI is populated instantly
        try:
            from datetime import datetime
            from backend.app.market_data import market_provider
            from backend.app.scanner.universe import UNIVERSE_SYMBOLS
            quotes_dict = market_provider.get_quotes(UNIVERSE_SYMBOLS)
            await websocket.send_json({
                "type": "TICK_UPDATE",
                "quotes": [q.model_dump(mode="json") for q in quotes_dict.values()],
                "timestamp": datetime.utcnow().isoformat()
            })
            await websocket.send_json({
                "type": "AI_STATUS",
                **autopilot_runner.get_ai_status()
            })
        except Exception as e:
            logger.warning(f"Failed to send initial snapshot: {e}")

        while True:
            # Wait for either incoming message from client (heartbeat/ping) or outgoing message from queue
            receive_task = asyncio.create_task(websocket.receive_text())
            queue_task = asyncio.create_task(queue.get())

            done, pending = await asyncio.wait(
                [receive_task, queue_task],
                return_when=asyncio.FIRST_COMPLETED
            )

            for task in pending:
                task.cancel()

            if receive_task in done:
                try:
                    data_str = receive_task.result()
                    # Handle ping
                    if data_str == "ping":
                        await websocket.send_json({"type": "PONG"})
                except Exception:
                    break

            if queue_task in done:
                msg = queue_task.result()
                await websocket.send_json(msg)

    except WebSocketDisconnect:
        logger.info(f"WebSocket client for user {user_id} disconnected.")
    except Exception as e:
        logger.warning(f"WebSocket session for user {user_id} terminated: {e}")
    finally:
        autopilot_runner.unregister_listener(queue)
