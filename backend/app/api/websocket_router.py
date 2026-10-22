"""WebSocket Streaming Router for real-time market ticks and portfolio updates."""
import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.app.services.auto_trader import autopilot_runner

router = APIRouter(tags=["WebSocket"])
logger = logging.getLogger("autopilot.ws")


@router.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    queue = asyncio.Queue()
    autopilot_runner.register_listener(queue)
    logger.info("WebSocket client connected to live stream.")

    try:
        # Initial greeting and connection confirmation
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to AutoPilot live stream (Real-Time Live NSE Feed)",
            "disclaimer": "REAL-TIME LIVE NSE FEED - STRICT PAPER TRADING ONLY"
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
                    if data_str == "ping" or "ping" in data_str:
                        await websocket.send_json({"type": "PONG"})
                except Exception:
                    break

            if queue_task in done:
                msg = queue_task.result()
                await websocket.send_json(msg)

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected.")
    except Exception as e:
        logger.warning(f"WebSocket session terminated: {e}")
    finally:
        autopilot_runner.unregister_listener(queue)
