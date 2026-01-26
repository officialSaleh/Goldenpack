
import React, { useState } from 'react';
import { Globe, CheckCircle2, ArrowRight, Coins } from 'lucide-react';
import { db } from '../services/mockData.ts';
import { Button } from '../components/UI.tsx';

interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
}

const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham' },
  { code: 'SAR', symbol: 'ر.س', label: 'Saudi Riyal' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'KWD', symbol: 'د.ك', label: 'Kuwaiti Dinar' },
];

export const Setup: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [selected, setSelected] = useState<CurrencyOption | null>(null);

  const handleFinish = () => {
    if (!selected) return;
    db.updateSettings({
      currency: selected.code,
      currencySymbol: selected.symbol,
      setupComplete: true
    });
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-brand-dark flex items-center justify-center p-6 z-[200]">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-16">
          <div className="w-24 h-24 bg-brand-gold rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-brand-gold/20 transform -rotate-12">
            <Globe className="text-brand-dark" size={48} />
          </div>
          <h1 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase italic">Golden<span className="text-brand-gold">Wings</span> <span className="text-gray-600 font-medium">Enterprise</span></h1>
          <p className="text-gray-400 text-lg max-w-lg mx-auto leading-relaxed font-medium">
            Welcome to the elite packaging management suite. Select your base operational currency to proceed.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => setSelected(c)}
              className={`p-10 rounded-[40px] border-2 text-left transition-all relative group ${
                selected?.code === c.code 
                  ? 'border-brand-gold bg-brand-gold/5 shadow-2xl shadow-brand-gold/10 scale-[1.05]' 
                  : 'border-white/5 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all ${
                selected?.code === c.code ? 'bg-brand-gold text-brand-dark' : 'bg-white/5 text-gray-500 group-hover:text-brand-gold'
              }`}>
                <span className="text-3xl font-black">{c.symbol}</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-1 tracking-tight">{c.code}</h3>
              <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">{c.label}</p>
              
              {selected?.code === c.code && (
                <div className="absolute top-8 right-8 text-brand-gold animate-in fade-in zoom-in">
                  <CheckCircle2 size={28} />
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="flex justify-center">
          <Button 
            size="lg" 
            className="w-full max-w-md py-6 rounded-[32px] text-lg shadow-2xl"
            disabled={!selected}
            onClick={handleFinish}
            icon={<ArrowRight size={28} />}
          >
            ESTABLISH OPERATIONAL BASE
          </Button>
        </div>
        
        <div className="text-center mt-12 flex items-center justify-center space-x-2">
           <div className="h-px w-8 bg-white/10"></div>
           <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.4em]">
             Golden Wings Packaging Group 2025
           </p>
           <div className="h-px w-8 bg-white/10"></div>
        </div>
      </div>
    </div>
  );
};
