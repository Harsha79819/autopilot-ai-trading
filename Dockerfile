# ==============================================================================
# AutoPilot AI Trading Platform - Production Multi-Stage Containerfile
# ==============================================================================

# Stage 1: Build React TypeScript Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Python FastAPI Backend Runtime
FROM python:3.9-slim AS runner
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    HOST=0.0.0.0

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend application source
COPY backend/ ./backend/
COPY .env.example ./.env

# Copy built frontend assets
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose HTTP and WebSocket port
EXPOSE 8000

CMD ["python", "backend/run.py"]
