import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface MonthSelectorProps {
  selectedMonth: number; // 0-11
  selectedYear: number;
  onChange: (month: number, year: number) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({ selectedMonth, selectedYear, onChange }) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrev = () => {
    if (selectedMonth === 0) {
      onChange(11, selectedYear - 1);
    } else {
      onChange(selectedMonth - 1, selectedYear);
    }
  };

  const handleNext = () => {
    if (selectedMonth === 11) {
      onChange(0, selectedYear + 1);
    } else {
      onChange(selectedMonth + 1, selectedYear);
    }
  };

  return (
    <div className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl p-2 shadow-sm">
      <button 
        onClick={handlePrev}
        className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-brand-gold transition-all active:scale-90"
      >
        <ChevronLeft size={20} />
      </button>
      
      <div className="flex items-center space-x-3 px-4">
        <Calendar size={18} className="text-brand-gold" />
        <span className="text-sm font-black text-brand-dark uppercase tracking-widest">
          {months[selectedMonth]} {selectedYear}
        </span>
      </div>

      <button 
        onClick={handleNext}
        className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-brand-gold transition-all active:scale-90"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
};
