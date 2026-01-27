import React, { useState } from 'react';
import { LogOut, Menu, X, User as UserIcon, ShieldCheck } from 'lucide-react';
import { NAV_ITEMS } from '../constants.tsx';
import { CURRENT_USER } from '../services/mockData.ts';
import { auth } from '../services/firebase.ts';
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

  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-brand-dark border-r border-white/5 shadow-2xl">
        <div className="p-8">
          <div className="flex items-center space-x-2 text-brand-gold">
            <h1 className="text-2xl font-black tracking-tighter uppercase italic">Golden<span className="text-white">Wings</span></h1>
          </div>
          <p className="text-[10px] text-brand-gold font-black uppercase tracking-[0.3em] mt-1 opacity-70">Sales Management</p>
        </div>

        <nav className="flex-1 px-6 space-y-2 mt-4">
          {filteredNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
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
            <div className="w-10 h-10 rounded-2xl bg-brand-gold flex items-center justify-center text-brand-dark font-black text-sm">
              {auth.currentUser?.displayName?.charAt(0) || auth.currentUser?.email?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{auth.currentUser?.displayName || 'User'}</p>
              <div className="flex items-center space-x-1">
                <ShieldCheck size={10} className="text-brand-gold" />
                <p className="text-[9px] text-brand-gold font-black uppercase tracking-widest">Active</p>
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-5 py-3 text-gray-500 hover:text-rose-400 transition-colors text-sm font-bold"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-brand-dark border-b border-white/5 px-6 py-4 flex items-center justify-between z-50">
        <h1 className="text-xl font-black text-brand-gold uppercase italic tracking-tighter">Golden<span className="text-white">Wings</span></h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-brand-gold">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-brand-dark/90 z-40 backdrop-blur-xl" onClick={() => setIsMobileMenuOpen(false)}>
          <aside className="w-72 h-full bg-brand-dark shadow-2xl p-8 flex flex-col" onClick={e => e.stopPropagation()}>
            <nav className="flex-1 space-y-3 mt-12">
              {filteredNav.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl ${
                    activeTab === item.id ? 'bg-brand-gold text-brand-dark font-bold' : 'text-gray-400'
                  }`}
                >
                  {item.icon}
                  <span className="tracking-wide">{item.label}</span>
                </button>
              ))}
            </nav>
            <button 
              onClick={handleLogout}
              className="mt-auto flex items-center space-x-4 px-6 py-4 text-rose-400 font-bold"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pt-20 lg:pt-0">
        <div className="max-w-7xl mx-auto p-6 md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
};