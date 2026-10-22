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
    uvicorn.run(
        "backend.app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
