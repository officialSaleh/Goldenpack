
import React from 'react';

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-bold transition-all duration-300 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest";
  
  const variants = {
    primary: "bg-brand-gold text-brand-dark shadow-xl shadow-brand-gold/20 hover:bg-brand-goldHover active:scale-95",
    secondary: "bg-brand-dark text-white hover:bg-brand-darkHover shadow-lg active:scale-95 border border-white/5",
    outline: "bg-white border-2 border-brand-linen text-brand-dark hover:border-brand-gold hover:text-brand-gold",
    ghost: "text-gray-500 hover:bg-brand-linen hover:text-brand-dark",
    danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-200"
  };

  const sizes = {
    sm: "px-4 py-2 text-[10px] space-x-2",
    md: "px-6 py-3.5 text-xs space-x-3",
    lg: "px-8 py-4 md:px-10 md:py-5 text-sm space-x-4"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {icon && <span>{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
};

// Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => (
  <div className="space-y-2 w-full">
    {label && <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{label}</label>}
    <div className="relative">
      {icon && <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}
      <input 
        className={`w-full ${icon ? 'pl-14' : 'px-6'} py-4 bg-brand-linen/50 border-2 border-transparent rounded-[20px] focus:border-brand-gold focus:bg-white focus:ring-0 outline-none transition-all text-brand-dark font-medium placeholder:text-gray-400 ${className}`}
        {...props}
      />
    </div>
    {error && <p className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">{error}</p>}
  </div>
);

// Card Component
export const Card: React.FC<{ children: React.ReactNode; className?: string; noPadding?: boolean }> = ({ children, className = '', noPadding = false }) => (
  <div className={`bg-white rounded-3xl md:rounded-[32px] shadow-sm border border-brand-linen/40 overflow-hidden ${noPadding ? '' : 'p-6 md:p-10'} ${className}`}>
    {children}
  </div>
);

// Badge Component
export const Badge: React.FC<{ children: React.ReactNode; color?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'slate' | 'gold' }> = ({ children, color = 'gold' }) => {
  const colors = {
    gold: "bg-brand-gold/10 text-brand-gold border border-brand-gold/20",
    indigo: "bg-indigo-50 text-indigo-700 border border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    rose: "bg-rose-50 text-rose-700 border border-rose-100",
    amber: "bg-amber-50 text-amber-700 border border-amber-100",
    slate: "bg-gray-100 text-gray-600 border border-gray-200"
  };
  return (
    <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${colors[color]}`}>
      {children}
    </span>
  );
};

// Modal Component
export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-brand-dark/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 md:px-10 md:py-8 border-b border-brand-linen flex items-center justify-between bg-brand-bg/50 shrink-0">
          <h3 className="text-lg md:text-xl font-black text-brand-dark uppercase tracking-tight italic leading-none">
            {title}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-brand-linen rounded-xl transition-colors text-gray-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="p-6 md:p-10 overflow-y-auto scrollbar-hide">
          {children}
        </div>
      </div>
    </div>
  );
};
