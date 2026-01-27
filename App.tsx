
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
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null); // null means checking
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        db.startSync();
        // Reactive listener for settings
        db.setSettingsListener((settings) => {
          // If we are actively transitioning, don't flip the state back until confirmed
          if (settings && settings.setupComplete) {
            setSetupRequired(false);
          } else {
            setSetupRequired(true);
          }
        });
      } else {
        db.stopSync();
        setSetupRequired(null);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  const handleSetupComplete = () => {
    setSetupRequired(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-brand-gold rounded-2xl animate-pulse flex items-center justify-center mb-6 shadow-2xl">
          <Loader2 className="text-brand-dark animate-spin" size={32} />
        </div>
        <h2 className="text-white font-black uppercase tracking-[0.4em] text-[10px]">Authorizing...</h2>
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

  // Final check to avoid rendering the app before sync resolves
  if (setupRequired === null) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center">
        <Loader2 className="text-brand-gold animate-spin mb-4" size={40} />
        <p className="text-white text-[10px] font-black uppercase tracking-widest">Syncing Records...</p>
      </div>
    );
  }

  if (setupRequired) {
    return <Setup onComplete={handleSetupComplete} />;
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
