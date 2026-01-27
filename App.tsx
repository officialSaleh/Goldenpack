
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { Inventory } from './views/Inventory';
import { Customers } from './views/Customers';
import { POS } from './views/POS';
import { Reports } from './views/Reports';
import { OrderHistory } from './views/OrderHistory';
import { Expenses } from './views/Expenses';
import { Setup } from './views/Setup';
import { Login } from './views/Login';
import { SignUp } from './views/SignUp';
import { db } from './services/mockData';
import { auth } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [setupRequired, setSetupRequired] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    // Listen for Auth State
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Only start Firestore listeners AFTER authentication is confirmed
        db.startSync();
        
        // Brief delay to allow initial settings to arrive via snapshot
        const settings = db.getSettings();
        if (!settings || !settings.setupComplete) {
          setSetupRequired(true);
        } else {
          setSetupRequired(false);
        }
      } else {
        // Stop listeners on logout
        db.stopSync();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-brand-gold rounded-2xl animate-pulse flex items-center justify-center mb-6">
          <Loader2 className="text-brand-dark animate-spin" size={32} />
        </div>
        <p className="text-brand-gold font-black uppercase tracking-[0.4em] text-[10px]">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return isRegistering ? (
      <SignUp onSwitchToLogin={() => setIsRegistering(false)} />
    ) : (
      <Login onSwitchToSignUp={() => setIsRegistering(true)} />
    );
  }

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