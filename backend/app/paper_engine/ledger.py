"""Double-entry portfolio accounting and position ledger."""
from datetime import datetime
from typing import Tuple, List, Dict
from sqlalchemy.orm import Session
from backend.app.models.portfolio import Portfolio
from backend.app.models.position import Position
from backend.app.models.trade import Trade
from backend.app.models.order import Order
from backend.app.schemas.portfolio import PerformanceMetrics, FeeBreakdown
from backend.app.paper_engine.execution_simulator import SimulationExecutionResult


class PortfolioLedger:
    """Manages atomic double-entry bookkeeping for virtual portfolios."""

    @staticmethod
    def apply_trade_execution(
        db: Session,
        portfolio: Portfolio,
        order: Order,
        sim_res: SimulationExecutionResult
    ) -> Trade:
        """
        Record Trade, update Portfolio cash balance, adjust Position quantity and avg price,
        calculate realized P&L on sells, and update peak value atomically.
        """
        now = datetime.utcnow()
        side_upper = sim_res.side.upper()
        fees = sim_res.fees

        realized_pnl_trade = 0.0

        if side_upper == "BUY":
            # Cash balance decreases by total cash required (gross + total fees)
            portfolio.cash_balance = round(portfolio.cash_balance - (sim_res.gross_amount + fees.total_charges), 2)
            portfolio.total_fees_paid = round(portfolio.total_fees_paid + fees.total_charges, 2)

            # Update or create Position
            position = db.query(Position).filter(
                Position.portfolio_id == portfolio.id,
                Position.symbol == sim_res.symbol
            ).first()

            if position:
                old_total_cost = position.quantity * position.average_buy_price
                new_total_cost = old_total_cost + sim_res.gross_amount
                new_qty = position.quantity + sim_res.quantity
                position.average_buy_price = round(new_total_cost / new_qty, 2)
                position.quantity = new_qty
                position.current_price = sim_res.execution_price
                position.unrealized_pnl = round((position.current_price - position.average_buy_price) * position.quantity, 2)
                position.updated_at = now
            else:
                position = Position(
                    portfolio_id=portfolio.id,
                    symbol=sim_res.symbol,
                    quantity=sim_res.quantity,
                    average_buy_price=sim_res.execution_price,
                    current_price=sim_res.execution_price,
                    unrealized_pnl=0.0,
                    created_at=now,
                    updated_at=now
                )
                db.add(position)

        elif side_upper == "SELL":
            # Cash balance increases by net proceeds (gross - total fees)
            portfolio.cash_balance = round(portfolio.cash_balance + (sim_res.gross_amount - fees.total_charges), 2)
            portfolio.total_fees_paid = round(portfolio.total_fees_paid + fees.total_charges, 2)

            position = db.query(Position).filter(
                Position.portfolio_id == portfolio.id,
                Position.symbol == sim_res.symbol
            ).first()

            if not position or position.quantity < sim_res.quantity:
                raise ValueError(f"Ledger integrity error: selling {sim_res.quantity} shares of {sim_res.symbol} but only {position.quantity if position else 0} owned.")

            # Calculate realized P&L: (sale price - cost basis) * qty - total fees
            cost_basis = round(position.average_buy_price * sim_res.quantity, 2)
            realized_pnl_trade = round((sim_res.gross_amount - cost_basis) - fees.total_charges, 2)
            portfolio.realized_pnl = round(portfolio.realized_pnl + realized_pnl_trade, 2)

            position.quantity -= sim_res.quantity
            position.current_price = sim_res.execution_price
            if position.quantity == 0:
                db.delete(position)
            else:
                position.unrealized_pnl = round((position.current_price - position.average_buy_price) * position.quantity, 2)
                position.updated_at = now

        # Create Trade record
        trade = Trade(
            order_id=order.id,
            portfolio_id=portfolio.id,
            user_id=order.user_id,
            symbol=sim_res.symbol,
            side=side_upper,
            quantity=sim_res.quantity,
            execution_price=sim_res.execution_price,
            gross_amount=sim_res.gross_amount,
            brokerage=fees.brokerage,
            stt=fees.stt,
            exchange_charges=fees.exchange_charges,
            gst=fees.gst,
            sebi_charges=fees.sebi_charges,
            stamp_duty=fees.stamp_duty,
            dp_charges=fees.dp_charges,
            total_charges=fees.total_charges,
            slippage_amount=fees.slippage_amount,
            spread_amount=fees.spread_amount,
            net_amount=round(sim_res.gross_amount + (fees.total_charges if side_upper == 'BUY' else -fees.total_charges), 2),
            realized_pnl=realized_pnl_trade,
            executed_at=now
        )
        db.add(trade)

        # Update order status
        order.status = "FILLED"
        order.filled_quantity = sim_res.quantity
        order.executed_price = sim_res.execution_price
        order.updated_at = now

        # Update peak portfolio value
        current_metrics = PortfolioLedger.calculate_metrics(db, portfolio)
        if current_metrics.total_portfolio_value > portfolio.peak_portfolio_value:
            portfolio.peak_portfolio_value = current_metrics.total_portfolio_value

        portfolio.updated_at = now
        db.commit()
        db.refresh(trade)
        return trade

    @staticmethod
    def calculate_metrics(db: Session, portfolio: Portfolio, latest_prices: Dict[str, float] = None) -> PerformanceMetrics:
        """Calculate complete live portfolio performance metrics."""
        positions = db.query(Position).filter(Position.portfolio_id == portfolio.id).all()
        trades = db.query(Trade).filter(Trade.portfolio_id == portfolio.id).all()

        holdings_value = 0.0
        total_unrealized_pnl = 0.0

        for pos in positions:
            cur_price = latest_prices.get(pos.symbol, pos.current_price) if latest_prices else pos.current_price
            val = round(pos.quantity * cur_price, 2)
            pos_unrealized = round((cur_price - pos.average_buy_price) * pos.quantity, 2)
            holdings_value += val
            total_unrealized_pnl += pos_unrealized

        total_portfolio_value = round(portfolio.cash_balance + holdings_value, 2)
        initial_cash = portfolio.initial_cash

        # Drawdown calculation
        peak = max(portfolio.peak_portfolio_value, total_portfolio_value)
        drawdown_pct = 0.0
        if peak > 0:
            drawdown_pct = round(((peak - total_portfolio_value) / peak) * 100.0, 2)

        # Net P&L: realized + unrealized (fees already deducted from realized and cash)
        net_pnl = round((total_portfolio_value - initial_cash), 2)
        net_return_pct = round((net_pnl / initial_cash) * 100.0, 2) if initial_cash > 0 else 0.0

        # Trade stats
        sell_trades = [t for t in trades if t.side == "SELL"]
        total_trades_count = len(sell_trades)
        winning_trades = [t for t in sell_trades if t.realized_pnl > 0]
        losing_trades = [t for t in sell_trades if t.realized_pnl < 0]
        win_rate_pct = round((len(winning_trades) / total_trades_count) * 100.0, 2) if total_trades_count > 0 else 0.0

        gross_profit = round(net_pnl + portfolio.total_fees_paid, 2)
        cost_drag_pct = round((portfolio.total_fees_paid / gross_profit * 100.0), 2) if gross_profit > 0 else 0.0

        return PerformanceMetrics(
            initial_cash=initial_cash,
            current_cash=round(portfolio.cash_balance, 2),
            holdings_value=round(holdings_value, 2),
            total_portfolio_value=total_portfolio_value,
            gross_profit=gross_profit,
            realized_pnl=round(portfolio.realized_pnl, 2),
            unrealized_pnl=round(total_unrealized_pnl, 2),
            total_fees_paid=round(portfolio.total_fees_paid, 2),
            net_pnl=net_pnl,
            net_return_pct=net_return_pct,
            peak_value=peak,
            max_drawdown_pct=drawdown_pct,
            total_trades_count=total_trades_count,
            winning_trades_count=len(winning_trades),
            losing_trades_count=len(losing_trades),
            win_rate_pct=win_rate_pct,
            cost_drag_pct=cost_drag_pct
        )


portfolio_ledger = PortfolioLedger()
