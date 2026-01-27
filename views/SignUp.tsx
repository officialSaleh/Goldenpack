
import React, { useState } from 'react';
import { UserPlus, ShieldCheck, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { auth } from '../services/firebase';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Button, Card } from '../components/UI';

interface SignUpProps {
  onSwitchToLogin: () => void;
}

export const SignUp: React.FC<SignUpProps> = ({ onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError("Passwords do not match.");
    }
    
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError("Google registration failed. Please try again.");
      }
      console.error(err);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-6 relative overflow-hidden">
      {/* Brand Watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none select-none">
        <h1 className="text-[20rem] font-black italic uppercase tracking-tighter">GW</h1>
      </div>

      <div className="w-full max-w-xl relative z-10">
        <div className="text-center mb-10">
           <div className="w-20 h-20 bg-brand-gold rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand-gold/20 transform rotate-12 transition-transform hover:rotate-0 duration-500">
             <UserPlus className="text-brand-dark" size={40} />
           </div>
           <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Sign<span className="text-brand-gold">Up</span></h1>
           <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">Create Your Account</p>
        </div>

        <Card className="p-10 border-none shadow-2xl bg-white/5 backdrop-blur-xl border border-white/5">
          <form onSubmit={handleSignUp} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] ml-1">Full Name</label>
                <input 
                  type="text" 
                  placeholder="Enter your name"
                  className="w-full px-7 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white outline-none focus:border-brand-gold transition-all font-bold placeholder:text-gray-600"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] ml-1">Email</label>
                <input 
                  type="email" 
                  placeholder="your@email.com"
                  className="w-full px-7 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white outline-none focus:border-brand-gold transition-all font-bold placeholder:text-gray-600"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] ml-1">Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full px-7 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white outline-none focus:border-brand-gold transition-all font-bold placeholder:text-gray-600"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] ml-1">Confirm Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full px-7 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white outline-none focus:border-brand-gold transition-all font-bold placeholder:text-gray-600"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center space-x-3 text-rose-500 text-xs font-bold">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <Button 
                type="submit" 
                className="w-full py-5 rounded-[28px] text-lg shadow-2xl"
                disabled={loading || googleLoading}
                icon={loading ? <Loader2 size={24} className="animate-spin" /> : <ShieldCheck size={24} />}
              >
                SIGN UP
              </Button>

              <div className="relative flex items-center justify-center py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <span className="relative px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-brand-dark/0 backdrop-blur-sm">Or</span>
              </div>

              <button 
                type="button"
                onClick={handleGoogleSignUp}
                disabled={loading || googleLoading}
                className="w-full flex items-center justify-center space-x-4 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[28px] text-white transition-all group disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 size={20} className="animate-spin text-brand-gold" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5.04c1.94 0 3.51.68 4.71 1.7l3.52-3.52C17.93 1.19 15.17 0 12 0 7.31 0 3.25 2.69 1.25 6.63l4.13 3.2C6.35 7.15 8.98 5.04 12 5.04z" />
                    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.3h6.43c-.28 1.48-1.11 2.74-2.37 3.58l3.7 2.87c2.16-1.99 3.43-4.93 3.43-8.48z" />
                    <path fill="#FBBC05" d="M5.38 14.83c-.23-.68-.36-1.41-.36-2.17 0-.76.13-1.48.36-2.17L1.25 7.29C.45 8.87 0 10.63 0 12.5s.45 3.63 1.25 5.21l4.13-3.2c-1.12-1.47-1.75-3.32-1.75-5.21z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.91l-3.7-2.87c-1.03.69-2.34 1.1-3.7 1.1-3.02 0-5.65-2.11-6.56-4.96l-4.13 3.2C3.25 21.31 7.31 24 12 24z" />
                  </svg>
                )}
                <span className="text-sm font-bold tracking-wide">Join with Google</span>
              </button>
            </div>

            <button 
              type="button"
              onClick={onSwitchToLogin}
              className="w-full py-2 flex items-center justify-center space-x-2 text-gray-500 hover:text-brand-gold transition-colors text-[10px] font-black uppercase tracking-widest"
            >
              <ArrowLeft size={14} />
              <span>Already have an account? Login</span>
            </button>
          </form>
        </Card>

        <div className="text-center mt-12">
          <p className="text-gray-600 text-[9px] font-black uppercase tracking-[0.4em]">
            Simple & Secure Access
          </p>
        </div>
      </div>
    </div>
  );
};
