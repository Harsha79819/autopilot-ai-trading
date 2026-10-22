"""Base modular strategy interface with rich documentation and guardrails."""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.app.schemas.strategy import StrategyInfo, StrategySignal, CostGateResult
from backend.app.schemas.market import Quote, Candle
from backend.app.strategies.cost_gate import cost_aware_gate


class BaseStrategy(ABC):
    """Abstract Strategy interface. Every strategy must be transparent and document its rules."""

    def __init__(self, name: str, display_name: str, description: str):
        self.name = name
        self.display_name = display_name
        self.description = description
        self.is_active = True

    @abstractmethod
    def get_entry_conditions(self) -> List[str]:
        pass

    @abstractmethod
    def get_exit_conditions(self) -> List[str]:
        pass

    @abstractmethod
    def get_assumptions(self) -> List[str]:
        pass

    @abstractmethod
    def get_risk_limits(self) -> List[str]:
        pass

    @abstractmethod
    def get_required_market_data(self) -> List[str]:
        pass

    @abstractmethod
    def get_known_limitations(self) -> List[str]:
        pass

    @abstractmethod
    def get_default_parameters(self) -> Dict[str, Any]:
        pass

    def get_strategy_info(self) -> StrategyInfo:
        return StrategyInfo(
            name=self.name,
            display_name=self.display_name,
            description=self.description,
            entry_conditions=self.get_entry_conditions(),
            exit_conditions=self.get_exit_conditions(),
            assumptions=self.get_assumptions(),
            risk_limits=self.get_risk_limits(),
            required_market_data=self.get_required_market_data(),
            known_limitations=self.get_known_limitations(),
            default_parameters=self.get_default_parameters(),
            is_active=self.is_active
        )

    @abstractmethod
    def evaluate(
        self,
        quote: Quote,
        candles: List[Candle],
        owned_quantity: int = 0,
        available_cash: float = 100.0
    ) -> StrategySignal:
        """Evaluate strategy rules against current market data and return actionable signal."""
        pass
