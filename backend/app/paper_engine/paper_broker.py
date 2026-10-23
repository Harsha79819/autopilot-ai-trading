"""Paper Broker service handling simulated order validation and execution."""
import uuid
import json
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from backend.app.models.user import User
from backend.app.models.portfolio import Portfolio
from backend.app.models.position import Position
from backend.app.models.order import Order
from backend.app.models.trade import Trade
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.order import OrderCreate, OrderResponse
from backend.app.schemas.market import Quote
from backend.app.paper_engine.execution_simulator import execution_simulator, SimulationExecutionResult
from backend.app.paper_engine.ledger import portfolio_ledger
from backend.app.config import settings


class PaperBroker:
    """Coordinator for paper order creation, risk verification, simulation, and ledger recording."""

    @staticmethod
    def execute_paper_order(
        db: Session,
        user: User,
        order_in: OrderCreate,
        quote: Quote,
        risk_manager: any = None
    ) -> OrderResponse:
        portfolio = user.portfolio
        if not portfolio:
            raise ValueError(f"Portfolio for user {user.id} not found.")

        # Idempotency check
        key = order_in.idempotency_key or str(uuid.uuid4())
        existing = db.query(Order).filter(Order.idempotency_key == key).first()
        if existing:
            return OrderResponse.model_validate(existing)

        now = datetime.utcnow()
        benchmark_price = order_in.price if order_in.price else quote.current_price

        # Check existing owned quantity
        position = db.query(Position).filter(
            Position.portfolio_id == portfolio.id,
            Position.symbol == order_in.symbol
        ).first()
        owned_quantity = position.quantity if position else 0

        # Check Emergency Stop / Kill switch (applies to new BUY executions; SELL/stop-loss permitted)
        if (portfolio.is_kill_switched or settings.EMERGENCY_STOP_ACTIVE) and order_in.side.upper() != "SELL":
            order = Order(
                portfolio_id=portfolio.id,
                user_id=user.id,
                idempotency_key=key,
                symbol=order_in.symbol,
                side=order_in.side.upper(),
                order_type=order_in.order_type.upper(),
                requested_quantity=order_in.quantity,
                filled_quantity=0,
                price=benchmark_price,
                status="REJECTED",
                rejection_reason="Emergency Kill Switch is ACTIVE. Trading is currently halted.",
                created_at=now,
                updated_at=now
            )
            db.add(order)
            db.add(AuditLog(
                user_id=user.id,
                event_type="KILL_SWITCH",
                symbol=order_in.symbol,
                decision="BLOCKED",
                reason="Order rejected by Kill Switch",
                timestamp=now
            ))
            db.commit()
            db.refresh(order)
            return OrderResponse.model_validate(order)

        # Risk Manager Pre-Trade Check
        if risk_manager:
            risk_ok, risk_reason = risk_manager.validate_pre_trade_risk(
                db=db,
                portfolio=portfolio,
                symbol=order_in.symbol,
                side=order_in.side,
                quantity=order_in.quantity,
                price=benchmark_price
            )
            if not risk_ok:
                order = Order(
                    portfolio_id=portfolio.id,
                    user_id=user.id,
                    idempotency_key=key,
                    symbol=order_in.symbol,
                    side=order_in.side.upper(),
                    order_type=order_in.order_type.upper(),
                    requested_quantity=order_in.quantity,
                    filled_quantity=0,
                    price=benchmark_price,
                    status="REJECTED",
                    rejection_reason=f"Risk check blocked order: {risk_reason}",
                    created_at=now,
                    updated_at=now
                )
                db.add(order)
                db.add(AuditLog(
                    user_id=user.id,
                    event_type="RISK_CHECK",
                    symbol=order_in.symbol,
                    decision="BLOCKED",
                    reason=risk_reason,
                    timestamp=now
                ))
                db.commit()
                db.refresh(order)
                return OrderResponse.model_validate(order)

        # Simulate Order
        sim_res: SimulationExecutionResult = execution_simulator.simulate_order(
            symbol=order_in.symbol,
            side=order_in.side,
            quantity=order_in.quantity,
            quote=quote,
            available_cash=portfolio.cash_balance,
            owned_quantity=owned_quantity,
            order_type=order_in.order_type,
            limit_price=order_in.price,
            is_intraday=True
        )

        if not sim_res.is_fillable:
            order = Order(
                portfolio_id=portfolio.id,
                user_id=user.id,
                idempotency_key=key,
                symbol=order_in.symbol,
                side=order_in.side.upper(),
                order_type=order_in.order_type.upper(),
                requested_quantity=order_in.quantity,
                filled_quantity=0,
                price=benchmark_price,
                status="REJECTED",
                rejection_reason=sim_res.rejection_reason,
                created_at=now,
                updated_at=now
            )
            db.add(order)
            db.add(AuditLog(
                user_id=user.id,
                event_type="ORDER_SIMULATION",
                symbol=order_in.symbol,
                decision="REJECTED",
                reason=sim_res.rejection_reason or "Simulation rejected fill",
                timestamp=now
            ))
            db.commit()
            db.refresh(order)
            return OrderResponse.model_validate(order)

        # Create Order record for filling
        order = Order(
            portfolio_id=portfolio.id,
            user_id=user.id,
            idempotency_key=key,
            symbol=order_in.symbol,
            side=order_in.side.upper(),
            order_type=order_in.order_type.upper(),
            requested_quantity=order_in.quantity,
            filled_quantity=0,
            price=benchmark_price,
            status="SUBMITTED",
            created_at=now,
            updated_at=now
        )
        db.add(order)
        db.flush()

        # Apply trade via double-entry ledger
        trade = portfolio_ledger.apply_trade_execution(
            db=db,
            portfolio=portfolio,
            order=order,
            sim_res=sim_res
        )

        # Audit log success
        audit_details = {
            "execution_price": sim_res.execution_price,
            "quantity": sim_res.quantity,
            "gross_amount": sim_res.gross_amount,
            "total_fees": sim_res.fees.total_charges,
            "slippage": sim_res.fees.slippage_amount,
            "spread": sim_res.fees.spread_amount
        }
        db.add(AuditLog(
            user_id=user.id,
            event_type="ORDER_SIMULATION",
            symbol=order_in.symbol,
            decision="EXECUTED",
            reason=f"Filled {order_in.side} {order_in.quantity} shares @ ₹{sim_res.execution_price:.2f}",
            details_json=json.dumps(audit_details),
            timestamp=now
        ))
        db.commit()
        db.refresh(order)
        return OrderResponse.model_validate(order)


paper_broker = PaperBroker()
