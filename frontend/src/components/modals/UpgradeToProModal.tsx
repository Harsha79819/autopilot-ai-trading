import React, { useState } from 'react';
import { X, Crown, Sparkles, Check, QrCode, Smartphone, Zap, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';

interface UpgradeToProModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export const UpgradeToProModal: React.FC<UpgradeToProModalProps> = ({ isOpen, onClose, featureName }) => {
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showQr, setShowQr] = useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setIsSuccess(false);
      setShowQr(false);
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      localStorage.setItem('autopilot_pro_user', 'true');
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
      }, 2500);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 shadow-2xl shadow-amber-500/10 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing Ambient Top Light */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-amber-500/20 via-violet-500/10 to-transparent blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative p-5 sm:p-6 pb-3 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
              <Crown className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
                  AutoPilot Pro ✨
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  VIP TIER
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {featureName ? `Unlock "${featureName}" and all premium AI powers` : 'అడ్వాన్స్‌డ్ AI ఫీచర్స్ & లైవ్ మార్కెట్ సిగ్నల్స్'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-bold text-emerald-300">🎉 పేమెంట్ విజయవంతమైంది!</h4>
            <p className="text-xs sm:text-sm text-slate-300">
              మీ **AutoPilot Pro VIP సబ్‌స్క్రిప్షన్** యాక్టివేట్ అయ్యింది! ఇప్పుడు అన్‌లిమిటెడ్ AI ప్రిడిక్షన్స్ మరియు లైవ్ సిగ్నల్స్ ఎంజాయ్ చేయండి.
            </p>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Billing Toggle */}
            <div className="flex items-center justify-center p-1 rounded-2xl bg-slate-950/60 border border-white/10">
              <button
                type="button"
                onClick={() => setSelectedBilling('monthly')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedBilling === 'monthly'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                నెలవారీ (₹499 / Month)
              </button>
              <button
                type="button"
                onClick={() => setSelectedBilling('yearly')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all relative ${
                  selectedBilling === 'yearly'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                వార్షిక ప్లాన్ (₹3,999 / Year)
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] bg-red-500 text-white font-extrabold">
                  SAVE 33%
                </span>
              </button>
            </div>

            {/* Feature Checklist */}
            <div className="space-y-2.5 rounded-2xl bg-white/[0.03] p-4 border border-white/5 text-xs">
              <div className="flex items-start gap-2.5 text-slate-200">
                <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <strong className="text-amber-300">AI బుల్లిష్ / బేరిష్ ప్రాబబిలిటీ (%):</strong> ప్రతి స్టాక్ పెరిగే అవకాశం ఎంత % (ఉదా: 68% Upside), డ్రాప్ రిస్క్ ఎంత % అనే లైవ్ ప్రిడిక్షన్.
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-slate-200">
                <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <strong className="text-amber-300">అన్‌లిమిటెడ్ Ultra-Fast Groq AI:</strong> ఎటువంటి లిమిట్స్ లేకుండా తెలుగులో ఎన్ని ప్రశ్నలైనా అడగవచ్చు.
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-slate-200">
                <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <strong className="text-amber-300">📱 WhatsApp & Telegram లైవ్ అలర్ట్స్:</strong> ఎప్పుడు కొనాలి, ఎప్పుడు లాభం బుక్ చేసుకోవాలో మొబైల్ మెసేజ్‌లు.
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-slate-200">
                <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <strong className="text-amber-300">💼 ₹50k - ₹1L మల్టీ-సెక్టార్ ట్రేడింగ్:</strong> బ్యాంకింగ్, ఆటో, ఫార్మా, ఎనర్జీ 10+ స్టాక్స్‌లో ఆటో-డైవర్సిఫికేషన్.
                </div>
              </div>
            </div>

            {/* UPI Payment Section */}
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                  <Smartphone className="w-4 h-4" />
                  <span>Instant UPI Payment (GPay, PhonePe, Paytm, CRED)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className="text-[11px] text-amber-400 hover:text-amber-200 flex items-center gap-1 underline cursor-pointer"
                >
                  <QrCode className="w-3 h-3" />
                  <span>{showQr ? 'Hide QR' : 'Show UPI QR'}</span>
                </button>
              </div>

              {showQr && (
                <div className="p-3 bg-white rounded-xl text-center space-y-2 max-w-[200px] mx-auto animate-in fade-in duration-200">
                  <div className="w-36 h-36 mx-auto bg-slate-900 rounded-lg flex items-center justify-center p-2 text-slate-900 border-2 border-dashed border-amber-500/60">
                    {/* Simulated Clean QR Representation */}
                    <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-[10px] text-slate-700 font-mono font-bold leading-tight">
                      <QrCode className="w-16 h-16 text-slate-900" />
                      <span>UPI: autopilot@hdfc</span>
                      <span className="text-emerald-700 font-extrabold">{selectedBilling === 'monthly' ? '₹499.00' : '₹3,999.00'}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-700 font-semibold">Scan with GPay / PhonePe</p>
                </div>
              )}

              <div className="text-center">
                <span className="text-[11px] text-slate-400">
                  Total Payable Amount: <strong className="text-white text-sm">{selectedBilling === 'monthly' ? '₹499.00' : '₹3,999.00'}</strong> (Inclusive of GST)
                </span>
              </div>

              {/* Instant Pay / Upgrade Button */}
              <button
                type="button"
                onClick={handleSimulatePayment}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Zap className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Connecting UPI Gateway...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-slate-950" />
                    <span>Pay with UPI & Unlock Pro Instant ({selectedBilling === 'monthly' ? '₹499' : '₹3,999'})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>100% Secure • Cancel Anytime • Instant Activation</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
