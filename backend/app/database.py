"""Database configuration and session management."""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

# Ensure data directory exists if using local SQLite
if settings.DATABASE_URL.startswith("sqlite"):
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def auto_migrate_columns():
    """Ensure missing columns are automatically added to SQLite tables."""
    from sqlalchemy import text
    migrations = [
        ("trades", "is_archived", "BOOLEAN DEFAULT 0"),
        ("trades", "trade_notes", "VARCHAR(255) DEFAULT ''"),
        ("option_positions", "peak_premium", "FLOAT DEFAULT 0.0"),
        ("option_trades", "gross_pnl", "FLOAT DEFAULT 0.0"),
        ("option_trades", "net_pnl", "FLOAT DEFAULT 0.0"),
        ("option_trades", "brokerage", "FLOAT DEFAULT 40.0"),
        ("option_trades", "stt", "FLOAT DEFAULT 0.0"),
        ("option_trades", "exchange_charges", "FLOAT DEFAULT 0.0"),
        ("option_trades", "gst", "FLOAT DEFAULT 0.0"),
        ("option_trades", "stamp_duty", "FLOAT DEFAULT 0.0"),
        ("option_trades", "sebi_charges", "FLOAT DEFAULT 0.0"),
    ]
    with engine.connect() as conn:
        for table, col, col_type in migrations:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type};"))
                conn.commit()
            except Exception:
                pass


def init_db():
    """Create all database tables and apply automatic safe column migrations."""
    # Import all models so they are registered with Base metadata
    import backend.app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    auto_migrate_columns()

