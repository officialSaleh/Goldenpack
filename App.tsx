
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout.tsx';
import { Dashboard } from './views/Dashboard.tsx';
import { Inventory } from './views/Inventory.tsx';
import { Customers } from './views/Customers.tsx';
import { POS } from './views/POS.tsx';
import { Reports } from './views/Reports.tsx';
import { OrderHistory } from './views/OrderHistory.tsx';
import { Expenses } from './views/Expenses.tsx';
import { MarketIntelligence } from './views/MarketIntelligence.tsx';
import { Setup } from './views/Setup.tsx';
import { Login } from './views/Login.tsx';
import { db } from './services/mockData.ts';
import { auth } from './services/firebase.ts';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [setupRequired, setSetupRequired] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listen for Auth State
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      // 2. Check Settings if logged in
      if (firebaseUser) {
        const settings = db.getSettings();
        if (!settings || !settings.setupComplete) {
          setSetupRequired(true);
        } else {
          setSetupRequired(false);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Show brand loader during initial handshake
  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-brand-gold rounded-2xl animate-pulse flex items-center justify-center mb-6">
          <Loader2 className="text-brand-dark animate-spin" size={32} />
        </div>
        <p className="text-brand-gold font-black uppercase tracking-[0.4em] text-[10px]">GW Enterprise Syncing...</p>
      </div>
    );
  }

  // Handle Login
  if (!user) {
    return <Login />;
  }

  // Handle Initial Setup
  if (setupRequired) {
    return <Setup onComplete={() => setSetupRequired(false)} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'inventory': return <Inventory />;
      case 'customers': return <Customers />;
      case 'pos':       return <POS setActiveTab={setActiveTab} />;
      case 'orders':    return <OrderHistory />;
      case 'ai':        return <MarketIntelligence />;
      case 'expenses':  return <Expenses />;
      case 'reports':   return <Reports />;
      default:          return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default App;
