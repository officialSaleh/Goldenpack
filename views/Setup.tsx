
import React, { useState } from 'react';
import { Globe, CheckCircle2, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { db } from '../services/mockData';
import { Button } from '../components/UI';

interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
}

const CURRENCIES: CurrencyOption[] = [
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham' },
  { code: 'SAR', symbol: 'ر.س', label: 'Saudi Riyal' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'KWD', symbol: 'د.ك', label: 'Kuwaiti Dinar' },
];

export const Setup: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [selected, setSelected] = useState<CurrencyOption | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFinish = async () => {
    if (!selected) return;
    setIsConfiguring(true);
    setError(null);
    
    try {
      await db.updateSettings({
        currency: selected.code,
        currencySymbol: selected.symbol,
        setupComplete: true
      });
      onComplete();
    } catch (err: any) {
      console.error("Setup failed:", err);
      setError("Database Restricted: Please ensure Firestore rules allow writes for authenticated users.");
    } finally {
      setIsConfiguring(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-brand-dark flex items-center justify-center p-4 md:p-6 z-[200] overflow-y-auto">
      <div className="max-w-4xl w-full py-10">
        <div className="text-center mb-10 md:mb-16">
          <div className="w-16 h-16 md:w-24 md:h-24 bg-brand-gold rounded-[24px] md:rounded-[40px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand-gold/20 transform -rotate-12">
            <Globe className="text-brand-dark" size={32} />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tighter uppercase italic leading-tight">Golden<span className="text-brand-gold">Wings</span> <span className="text-gray-600 font-medium">Enterprise</span></h1>
          <p className="text-gray-400 text-sm md:text-lg max-w-lg mx-auto leading-relaxed font-medium px-4">
            Select your base operational currency to synchronize your global inventory.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-10 md:mb-16">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => setSelected(c)}
              disabled={isConfiguring}
              className={`p-5 md:p-10 rounded-3xl md:rounded-[40px] border-2 text-left transition-all relative group ${
                selected?.code === c.code 
                  ? 'border-brand-gold bg-brand-gold/5 shadow-2xl shadow-brand-gold/10 md:scale-[1.05]' 
                  : 'border-white/5 bg-white/5 hover:border-white/20'
              } ${isConfiguring ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 transition-all ${
                selected?.code === c.code ? 'bg-brand-gold text-brand-dark' : 'bg-white/5 text-gray-500 group-hover:text-brand-gold'
              }`}>
                <span className="text-xl md:text-3xl font-black">{c.symbol}</span>
              </div>
              <h3 className="text-lg md:text-2xl font-black text-white mb-0.5 tracking-tight">{c.code}</h3>
              <p className="text-gray-600 font-bold text-[8px] md:text-xs uppercase tracking-widest truncate">{c.label}</p>
              
              {selected?.code === c.code && (
                <div className="absolute top-4 right-4 md:top-8 md:right-8 text-brand-gold animate-in fade-in zoom-in">
                  <CheckCircle2 size={20} className="md:w-7 md:h-7" />
                </div>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start space-x-3 text-rose-500 text-xs font-bold animate-in slide-in-from-top-2">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-center px-4">
          <Button 
            size="lg" 
            className="w-full max-w-md py-5 md:py-6 rounded-2xl md:rounded-[32px] text-sm md:text-lg shadow-2xl disabled:bg-gray-800 disabled:text-gray-500"
            disabled={!selected || isConfiguring}
            onClick={handleFinish}
            icon={isConfiguring ? <Loader2 className="animate-spin" size={24} /> : <ArrowRight size={24} />}
          >
            {isConfiguring ? 'INITIALIZING LEDGER...' : 'ESTABLISH OPERATIONAL BASE'}
          </Button>
        </div>
      </div>
    </div>
  );
};
