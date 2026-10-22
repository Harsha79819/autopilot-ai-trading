"""Pytest configuration and test fixtures."""
import pytest
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.database import Base, get_db
from backend.app.config import settings
from backend.app.models.user import User
from backend.app.models.portfolio import Portfolio
from backend.app.auth.security import get_password_hash, create_access_token

# Use isolated test SQLite database
TEST_DB_URL = "sqlite:///./backend/data/test_autopilot.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    # Clean up test DB file if created
    test_db_file = "./backend/data/test_autopilot.db"
    if os.path.exists(test_db_file):
        try:
            os.remove(test_db_file)
        except Exception:
            pass


@pytest.fixture
def db():
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def test_user(db):
    user = User(
        email="trader@test.com",
        hashed_password=get_password_hash("password123"),
        full_name="Test Trader",
        is_active=True
    )
    db.add(user)
    db.flush()

    portfolio = Portfolio(
        user_id=user.id,
        initial_cash=settings.INITIAL_VIRTUAL_CAPITAL_INR,
        cash_balance=settings.INITIAL_VIRTUAL_CAPITAL_INR,
        realized_pnl=0.0,
        total_fees_paid=0.0,
        peak_portfolio_value=settings.INITIAL_VIRTUAL_CAPITAL_INR,
        is_kill_switched=False
    )
    db.add(portfolio)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    token = create_access_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}
