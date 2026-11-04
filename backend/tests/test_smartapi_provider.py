"""Tests for Task 10: Honest Data Source Labeling & SmartAPI delay tracking."""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from backend.app.market_data.live_nse_provider import LiveNseMarketDataProvider
from backend.app.market_data.demo_provider import DemoMarketDataProvider
from backend.app.market_data.smartapi_provider import AngelOneSmartApiProvider
from backend.app.main import app

client = TestClient(app)


def test_live_nse_provider_delay_properties():
    provider = LiveNseMarketDataProvider()
    assert provider.data_delay_seconds == 900
    assert provider.is_realtime is False


def test_demo_provider_delay_properties():
    provider = DemoMarketDataProvider()
    assert provider.data_delay_seconds == 0
    assert provider.is_realtime is False


def test_smartapi_provider_fallback_when_unconfigured():
    # Without credentials configured
    provider = AngelOneSmartApiProvider()
    assert provider.is_configured() is False
    # Must transparently report the fallback provider's delay
    assert provider.data_delay_seconds == 900
    assert provider.is_realtime is False


def test_smartapi_provider_realtime_when_configured():
    provider = AngelOneSmartApiProvider()
    # Mock configured and active session
    with patch.object(provider, "is_configured", return_value=True):
        assert provider.data_delay_seconds == 0
        assert provider.is_realtime is True


def test_health_endpoint_exposes_honest_data_delay():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert "data_provider" in data
    assert "is_realtime" in data
    assert "data_delay_seconds" in data
    assert isinstance(data["data_delay_seconds"], int)
    assert isinstance(data["is_realtime"], bool)


def test_market_status_endpoint_exposes_realtime_and_delay():
    res = client.get("/api/market/status")
    assert res.status_code == 200
    data = res.json()
    assert "is_realtime" in data
    assert "data_delay_seconds" in data
    assert isinstance(data["data_delay_seconds"], int)
    assert isinstance(data["is_realtime"], bool)
