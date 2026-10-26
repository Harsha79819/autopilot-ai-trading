import React, { useState, useEffect } from 'react';
import {
  Calculator,
  PieChart,
  Target,
  Shield,
  TrendingUp,
  Plus,
  Coins,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { api } from '../../services/api';
import { formatINR } from '../../utils/currency';

export const FinancialPlannerView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sip' | 'emi' | 'budget' | 'goals'>('sip');

  // SIP Calculator State
  const [monthlySIP, setMonthlySIP] = useState(5000);
  const [sipReturnRate, setSipReturnRate] = useState(12);
  const [sipTenure, setSipTenure] = useState(10);
  const [inflationRate, setInflationRate] = useState(6);
  const [sipResult, setSipResult] = useState<any>(null);

  // EMI Calculator State
  const [loanAmount, setLoanAmount] = useState(1000000);
  const [interestRate, setInterestRate] = useState(8.5);
  const [loanTenureMonths, setLoanTenureMonths] = useState(120);
  const [emiResult, setEmiResult] = useState<any>(null);

  // Budget & Expenses State
  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [newExpenseCat, setNewExpenseCat] = useState('Food');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseDesc, setNewExpenseDesc] = useState('');

  // Goals State
  const [goals, setGoals] = useState<any[]>([]);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');

  // Calculate SIP on change
  useEffect(() => {
    api.calculateSIP({
      monthly_investment: monthlySIP,
      expected_annual_return_pct: sipReturnRate,
      tenure_years: sipTenure,
      annual_inflation_pct: inflationRate
    }).then(setSipResult).catch(console.error);
  }, [monthlySIP, sipReturnRate, sipTenure, inflationRate]);

  // Calculate EMI on change
  useEffect(() => {
    api.calculateEMI({
      principal: loanAmount,
      annual_interest_rate_pct: interestRate,
      tenure_months: loanTenureMonths
    }).then(setEmiResult).catch(console.error);
  }, [loanAmount, interestRate, loanTenureMonths]);

  // Fetch expenses & goals
  const loadPlannerData = () => {
    api.getExpenses().then((res) => {
      setExpenses(res.items || []);
      setTotalSpent(res.total_spent || 0);
    }).catch(console.error);

    api.getGoals().then((res) => {
      setGoals(res || []);
    }).catch(console.error);
  };

  useEffect(() => {
    loadPlannerData();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseAmount || parseFloat(newExpenseAmount) <= 0) return;
    try {
      await api.addExpense({
        category: newExpenseCat,
        amount: parseFloat(newExpenseAmount),
        description: newExpenseDesc
      });
      setNewExpenseAmount('');
      setNewExpenseDesc('');
      loadPlannerData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalName || !newGoalTarget || parseFloat(newGoalTarget) <= 0) return;
    try {
      await api.createGoal({
        goal_name: newGoalName,
        target_amount: parseFloat(newGoalTarget),
        current_amount: 0,
        monthly_contribution: parseFloat(newGoalTarget) / 12
      });
      setNewGoalName('');
      setNewGoalTarget('');
      loadPlannerData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-white/10 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Personal Finance & Wealth Goal Planner
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic SIP compounding, loan EMI schedules, monthly budgeting & savings targets
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        {[
          { id: 'sip', label: 'SIP & Wealth Compounding', icon: TrendingUp },
          { id: 'emi', label: 'Loan EMI Calculator', icon: Coins },
          { id: 'budget', label: 'Monthly Budget & Expenses', icon: PieChart },
          { id: 'goals', label: 'Savings & Emergency Fund', icon: Target },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === id
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab: SIP Calculator */}
      {activeTab === 'sip' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white">Investment Parameters</h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Monthly Investment: {formatINR(monthlySIP)}</label>
              <input
                type="range"
                min="500"
                max="100000"
                step="500"
                value={monthlySIP}
                onChange={(e) => setMonthlySIP(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Expected Return (p.a.): {sipReturnRate}%</label>
              <input
                type="range"
                min="6"
                max="25"
                step="0.5"
                value={sipReturnRate}
                onChange={(e) => setSipReturnRate(Number(e.target.value))}
                className="w-full accent-purple-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Tenure (Years): {sipTenure} Years</label>
              <input
                type="range"
                min="1"
                max="35"
                step="1"
                value={sipTenure}
                onChange={(e) => setSipTenure(Number(e.target.value))}
                className="w-full accent-indigo-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Expected Annual Inflation: {inflationRate}%</label>
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={inflationRate}
                onChange={(e) => setInflationRate(Number(e.target.value))}
                className="w-full accent-rose-400"
              />
            </div>
          </div>

          <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white">Projected Wealth Accumulation</h3>
            {sipResult && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                  <span className="text-[11px] text-slate-400">Total Invested</span>
                  <p className="text-base font-bold text-slate-200 mt-1">{formatINR(sipResult.invested_amount)}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                  <span className="text-[11px] text-slate-400">Estimated Gain</span>
                  <p className="text-base font-bold text-emerald-400 mt-1">+{formatINR(sipResult.estimated_returns)}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                  <span className="text-[11px] text-slate-400">Nominal Wealth</span>
                  <p className="text-base font-bold text-cyan-400 mt-1">{formatINR(sipResult.total_value)}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                  <span className="text-[11px] text-slate-400">Real Purchasing Power</span>
                  <p className="text-base font-bold text-purple-400 mt-1">{formatINR(sipResult.inflation_adjusted_value)}</p>
                </div>
              </div>
            )}

            {/* Growth Curve Table */}
            <div className="max-h-56 overflow-y-auto rounded-xl border border-white/5 bg-slate-950/40">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="bg-slate-900/80 text-[10px] text-slate-400 uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="p-2.5">Year</th>
                    <th className="p-2.5">Invested Amount</th>
                    <th className="p-2.5">Returns</th>
                    <th className="p-2.5">Total Corpus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sipResult?.yearly_breakdown?.map((row: any) => (
                    <tr key={row.year} className="hover:bg-white/[0.02]">
                      <td className="p-2.5 font-bold text-white">Year {row.year}</td>
                      <td className="p-2.5">{formatINR(row.invested)}</td>
                      <td className="p-2.5 text-emerald-400">+{formatINR(row.returns)}</td>
                      <td className="p-2.5 font-semibold text-cyan-400">{formatINR(row.wealth)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Loan EMI Calculator */}
      {activeTab === 'emi' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white">Loan Details</h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Loan Amount: {formatINR(loanAmount)}</label>
              <input
                type="range"
                min="50000"
                max="10000000"
                step="50000"
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Interest Rate: {interestRate}%</label>
              <input
                type="range"
                min="5"
                max="20"
                step="0.25"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full accent-purple-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Tenure: {loanTenureMonths / 12} Years ({loanTenureMonths} Months)</label>
              <input
                type="range"
                min="12"
                max="360"
                step="12"
                value={loanTenureMonths}
                onChange={(e) => setLoanTenureMonths(Number(e.target.value))}
                className="w-full accent-indigo-400"
              />
            </div>
          </div>

          <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white">Repayment Breakdown</h3>
            {emiResult && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 text-center">
                  <span className="text-xs text-slate-400">Monthly EMI</span>
                  <p className="text-xl font-bold text-cyan-400 mt-1">{formatINR(emiResult.emi)}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 text-center">
                  <span className="text-xs text-slate-400">Total Interest Payable</span>
                  <p className="text-xl font-bold text-rose-400 mt-1">{formatINR(emiResult.total_interest)}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 text-center">
                  <span className="text-xs text-slate-400">Total Repayment Amount</span>
                  <p className="text-xl font-bold text-white mt-1">{formatINR(emiResult.total_payment)}</p>
                </div>
              </div>
            )}
            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 text-xs text-slate-300 leading-relaxed">
              💡 <strong>Smart Pre-Payment Insight:</strong> Adding just 1 extra EMI payment per year can shorten your tenure by over 3 to 4 years and save lakhs in compounding interest charges.
            </div>
          </div>
        </div>
      )}

      {/* Tab: Budget & Expenses */}
      {activeTab === 'budget' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleAddExpense} className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white">Log Monthly Expense</h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Category</label>
              <select
                value={newExpenseCat}
                onChange={(e) => setNewExpenseCat(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
              >
                <option value="Housing">Housing (Rent/Mortgage)</option>
                <option value="Food">Food & Groceries</option>
                <option value="Transport">Transport & Fuel</option>
                <option value="Utilities">Utilities & Bills</option>
                <option value="Investments">Investments & SIP</option>
                <option value="Entertainment">Entertainment & Leisure</option>
                <option value="Healthcare">Healthcare & Insurance</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Amount (INR)</label>
              <input
                type="number"
                value={newExpenseAmount}
                onChange={(e) => setNewExpenseAmount(e.target.value)}
                placeholder="e.g. 2500"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Description</label>
              <input
                type="text"
                value={newExpenseDesc}
                onChange={(e) => setNewExpenseDesc(e.target.value)}
                placeholder="e.g. Supermarket grocery refill"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg cursor-pointer"
            >
              Add Expense Item
            </button>
          </form>

          <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Expense Records (Total: {formatINR(totalSpent)})</h3>
              <span className="text-xs text-purple-400 font-semibold">50/30/20 Disciplined Allocation</span>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {expenses.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">No expenses logged yet. Add your first item above!</div>
              ) : (
                expenses.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-white block">{item.category}</span>
                      <span className="text-[11px] text-slate-400">{item.description || 'Logged Expense'}</span>
                    </div>
                    <span className="font-bold text-rose-400">-{formatINR(item.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Goals & Emergency Fund */}
      {activeTab === 'goals' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleAddGoal} className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white">Create Savings Goal</h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Goal Name</label>
              <input
                type="text"
                value={newGoalName}
                onChange={(e) => setNewGoalName(e.target.value)}
                placeholder="e.g. 6-Month Emergency Fund"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Target Amount (INR)</label>
              <input
                type="number"
                value={newGoalTarget}
                onChange={(e) => setNewGoalTarget(e.target.value)}
                placeholder="e.g. 240000"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-bold text-white shadow-lg cursor-pointer"
            >
              Add Savings Goal
            </button>
          </form>

          <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white">Active Savings Targets</h3>
            <div className="space-y-3">
              {goals.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">No active goals yet. Add an Emergency Fund or Vacation goal!</div>
              ) : (
                goals.map((g) => (
                  <div key={g.id} className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{g.goal_name}</span>
                      <span className="text-cyan-400 font-bold">{formatINR(g.target_amount)}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-400 to-purple-500" style={{ width: `${Math.min(g.progress_pct || 15, 100)}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Monthly Contribution: {formatINR(g.monthly_contribution)}</span>
                      <span>Target Progress: {g.progress_pct}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
