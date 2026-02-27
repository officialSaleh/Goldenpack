
import React, { useState } from 'react';
import { LogOut, Menu, X, ShieldCheck, ChevronRight } from 'lucide-react';
import { NAV_ITEMS } from '../constants';
import { CURRENT_USER } from '../services/mockData';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(CURRENT_USER.role));

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const NavContent = () => (
    <>
      <div className="p-8">
        <div className="flex items-center space-x-2 text-brand-gold">
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">Golden<span className="text-white">Wings</span></h1>
        </div>
        <p className="text-[10px] text-brand-gold font-black uppercase tracking-[0.3em] mt-1 opacity-70">Enterprise Pro</p>
      </div>

      <nav className="flex-1 px-6 space-y-2 mt-4 overflow-y-auto scrollbar-hide">
        {filteredNav.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${
              activeTab === item.id
                ? 'bg-brand-gold text-brand-dark shadow-xl shadow-brand-gold/10 font-bold scale-[1.02]'
                : 'text-gray-400 hover:bg-white/5 hover:text-brand-gold'
            }`}
          >
            <div className={activeTab === item.id ? 'text-brand-dark' : 'text-gray-500 group-hover:text-brand-gold transition-colors'}>
              {item.icon}
            </div>
            <span className="text-sm tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6">
        <div className="flex items-center space-x-3 px-5 py-4 bg-white/5 rounded-3xl mb-4 border border-white/5">
          <div className="w-10 h-10 rounded-2xl bg-brand-gold flex items-center justify-center text-brand-dark font-black text-sm flex-shrink-0">
            {auth.currentUser?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold text-white truncate">{auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Member'}</p>
            <div className="flex items-center space-x-1">
              <ShieldCheck size={10} className="text-brand-gold" />
              <p className="text-[9px] text-brand-gold font-black uppercase tracking-widest">Admin Access</p>
            </div>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-5 py-3 text-gray-500 hover:text-rose-400 transition-colors text-sm font-bold"
        >
          <LogOut size={18} />
          <span>Secure Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden relative">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-brand-dark border-r border-white/5 shadow-2xl z-30">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-20 bg-brand-dark/95 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 z-40">
        <div className="flex items-center space-x-2 text-brand-gold">
          <h1 className="text-xl font-black tracking-tighter uppercase italic">Golden<span className="text-white">Wings</span></h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="w-12 h-12 bg-brand-gold rounded-2xl flex items-center justify-center text-brand-dark shadow-lg shadow-brand-gold/20"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      <div className={`lg:hidden fixed inset-0 z-[100] transition-all duration-500 ${isMobileMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
        <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
        <aside className={`absolute left-0 top-0 bottom-0 w-72 bg-brand-dark shadow-2xl transform transition-transform duration-500 flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="absolute top-8 right-[-50px]">
            <button onClick={() => setIsMobileMenuOpen(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-brand-dark shadow-xl">
              <X size={20} />
            </button>
          </div>
          <NavContent />
        </aside>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full bg-brand-bg">
        <div className={`transition-all duration-500 mx-auto ${
          activeTab === 'pos' 
            ? 'pt-20 lg:pt-0 max-w-full h-full p-4 lg:p-6 xl:p-8' 
            : 'pt-24 lg:pt-0 p-4 md:p-6 lg:p-8 max-w-[1600px]'
        }`}>
          {/* Breadcrumb / Page Title helper on mobile */}
          <div className="lg:hidden flex items-center space-x-2 text-gray-400 text-[10px] font-black uppercase tracking-widest mb-6">
            <span>Golden Wings</span>
            <ChevronRight size={10} />
            <span className="text-brand-gold">{activeTab}</span>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
};
