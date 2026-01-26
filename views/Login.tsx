
import React, { useState } from 'react';
import { LogIn, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { auth } from '../services/firebase.ts';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Button, Input, Card } from '../components/UI.tsx';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError("Authentication failed. Please check your credentials.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-6 relative overflow-hidden">
      {/* Brand Watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none select-none">
        <h1 className="text-[20rem] font-black italic uppercase tracking-tighter">GW</h1>
      </div>

      <div className="w-full max-w-xl relative z-10">
        <div className="text-center mb-12">
           <div className="w-20 h-20 bg-brand-gold rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand-gold/20 transform -rotate-12 transition-transform hover:rotate-0 duration-500">
             <ShieldCheck className="text-brand-dark" size={40} />
           </div>
           <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Golden<span className="text-brand-gold">Wings</span></h1>
           <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">Enterprise Resource Management</p>
        </div>

        <Card className="p-12 border-none shadow-2xl bg-white/5 backdrop-blur-xl border border-white/5">
          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] ml-1">Secure Identity</label>
                <input 
                  type="email" 
                  placeholder="name@goldenwings.com"
                  className="w-full px-8 py-5 bg-white/5 border-2 border-white/10 rounded-3xl text-white outline-none focus:border-brand-gold transition-all font-bold placeholder:text-gray-600"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] ml-1">Access Token</label>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full px-8 py-5 bg-white/5 border-2 border-white/10 rounded-3xl text-white outline-none focus:border-brand-gold transition-all font-bold placeholder:text-gray-600"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center space-x-3 text-rose-500 text-xs font-bold">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full py-6 rounded-[32px] text-lg shadow-2xl"
              disabled={loading}
              icon={loading ? <Loader2 size={24} className="animate-spin" /> : <LogIn size={24} />}
            >
              INITIALIZE SESSION
            </Button>
          </form>
        </Card>

        <div className="text-center mt-12">
          <p className="text-gray-600 text-[9px] font-black uppercase tracking-[0.4em]">
            Authorized Personnel Only • IP Logged
          </p>
        </div>
      </div>
    </div>
  );
};
