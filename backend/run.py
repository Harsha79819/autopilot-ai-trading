"""Entrypoint script to run the AutoPilot FastAPI backend server."""
import uvicorn
import os
import sys

# Ensure project root is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

if __name__ == "__main__":
    from backend.app.config import settings
    port = int(os.environ.get("PORT", settings.PORT))
    is_prod = (
        os.environ.get("APP_ENV", "").lower() == "production"
        or "RENDER" in os.environ
        or not settings.DEBUG
    )
    uvicorn.run(
        "backend.app.main:app",
        host="0.0.0.0",
        port=port,
        reload=False if is_prod else settings.DEBUG
    )
