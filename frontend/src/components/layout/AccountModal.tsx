import React, { useState } from 'react';
import { X, User as UserIcon, Lock, Mail, ShieldCheck, LogIn, UserPlus, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTrading } from '../../context/TradingContext';
import { formatINR } from '../../utils/currency';

interface AccountModalProps {
  onClose: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ onClose }) => {
  const { user, login, register, logout, isLoading } = useAuth();
  const { refreshPortfolio, portfolio } = useTrading();

  const [mode, setMode] = useState<'VIEW' | 'LOGIN' | 'REGISTER'>('VIEW');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Keyboard shortcut: Escape to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      if (mode === 'LOGIN') {
        await login(email, password);
        setSuccess('Successfully logged in!');
      } else if (mode === 'REGISTER') {
        await register(email, password, fullName);
        setSuccess('Account created and logged in with virtual cash!');
      }
      await refreshPortfolio();
      setTimeout(() => {
        setMode('VIEW');
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  const handleDemoQuickLogin = async () => {
    setError(null);
    try {
      await login('demo@autopilot.ai', 'demo1234');
      await refreshPortfolio();
      setSuccess('Logged into Demo Account');
      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0D131F] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-xs"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Paper Trading Account</h3>
              <p className="text-[11px] text-slate-400">Multi-user isolated paper portfolios</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode */}
        {mode === 'VIEW' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Account Email:</span>
                <span className="font-semibold text-white">{user?.email || 'demo@autopilot.ai'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Name / Role:</span>
                <span className="font-semibold text-slate-200">{user?.full_name || 'Paper Trader'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Account Starting Balance:</span>
                <span className="font-bold text-accent-cyan">
                  {formatINR(portfolio?.initial_cash || 500.00)} Virtual Cash
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Live Broker Mode:</span>
                <span className="font-semibold text-emerald-400">Disabled (Paper Only)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('LOGIN')}
                className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-semibold border border-white/10 flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                Switch Account
              </button>
              <button
                type="button"
                onClick={() => setMode('REGISTER')}
                className="py-2 px-3 rounded-xl bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue font-semibold border border-accent-blue/30 flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                New Account
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-[11px] leading-relaxed">
              <strong>Demo Account Credentials:</strong>
              <br />
              Email: <code className="text-white font-mono">demo@autopilot.ai</code>
              <br />
              Password: <code className="text-white font-mono">demo1234</code>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center gap-2 border border-white/15 transition-all cursor-pointer active:scale-98"
            >
              <X className="w-4 h-4" />
              Close Window
            </button>
          </div>
        )}

        {/* Login or Register Form */}
        {(mode === 'LOGIN' || mode === 'REGISTER') && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-bold text-white">
                {mode === 'LOGIN' ? 'Login to Portfolio' : 'Create New Account'}
              </span>
              <button
                type="button"
                onClick={() => setMode('VIEW')}
                className="text-[11px] text-accent-cyan hover:underline"
              >
                Cancel
              </button>
            </div>

            {mode === 'REGISTER' && (
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-accent-cyan"
                />
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-1">Email</label>
              <input
                type="email"
                required
                placeholder="trader@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-accent-cyan"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-accent-cyan"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                {error}
              </div>
            )}

            {success && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl font-bold bg-accent-blue hover:bg-blue-600 text-white shadow-glass-glow-blue transition-all"
            >
              {isLoading ? 'Processing...' : mode === 'LOGIN' ? 'Log In' : 'Create Account & Start Paper Trading'}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleDemoQuickLogin}
                className="text-xs text-accent-cyan hover:underline"
              >
                ⚡ Quick 1-Click Login as Demo User (demo@autopilot.ai)
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
