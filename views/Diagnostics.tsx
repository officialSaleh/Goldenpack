
import React, { useState } from 'react';
import { Activity, ShieldAlert, Database, Zap, Loader2, CheckCircle2, AlertCircle, Award } from 'lucide-react';
import { db } from '../services/mockData';
import { Card, Button, Badge } from '../components/UI';

export const Diagnostics: React.FC = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const log = (msg: string) => {
    setResults(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const runIndexStressTest = async () => {
    setIsTesting(true);
    setIsVerified(false);
    setError(null);
    log("Initiating Compound Query Stress Test...");
    try {
      await db.triggerComplexIndexQuery();
      log("SUCCESS: Complex query executed. Index is ACTIVE.");
      setIsVerified(true);
    } catch (err: any) {
      console.error(err);
      if (err.message.includes("requires an index")) {
        log("INDEX REQUIRED: Check browser console for the Magic Link.");
        setError("Missing Index Detected. Triggered successful fail-state.");
      } else {
        log(`Error: ${err.message}`);
        setError(err.message);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const runBulkInjection = async () => {
    setIsTesting(true);
    log("Injecting high-volume sample data...");
    try {
      await db.bulkInjectSampleData();
      log("Data injection complete. Registry updated.");
    } catch (err: any) {
      log(`Failed: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-brand-gold rounded-2xl flex items-center justify-center text-brand-dark shadow-xl shadow-brand-gold/20">
            <Activity size={24} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-brand-dark italic uppercase tracking-tighter">System <span className="text-brand-gold">Diagnostics</span></h2>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1">Operational verification & stress suite.</p>
          </div>
        </div>

        {isVerified && (
          <div className="bg-emerald-50 border border-emerald-100 px-6 py-3 rounded-2xl flex items-center space-x-3 animate-in zoom-in duration-500 shadow-sm">
            <Award className="text-emerald-500" size={20} />
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em]">Production Certified</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={`border-2 transition-all duration-500 ${isVerified ? 'border-emerald-100 bg-emerald-50/20' : 'border-brand-linen bg-white'}`}>
          <div className="flex items-center space-x-3 mb-6">
            <ShieldAlert className={isVerified ? "text-emerald-500" : "text-rose-500"} size={24} />
            <h3 className="font-black text-brand-dark uppercase tracking-tight text-sm">Index Pressure Test</h3>
          </div>
          <p className="text-xs text-gray-500 mb-8 leading-relaxed">
            Verify that the Cloud Database is optimized for complex production queries.
          </p>
          <Button 
            className="w-full py-4 rounded-xl" 
            variant={isVerified ? "outline" : "secondary"}
            disabled={isTesting}
            onClick={runIndexStressTest}
            icon={isTesting ? <Loader2 className="animate-spin" /> : isVerified ? <CheckCircle2 size={18} /> : <Zap size={18} />}
          >
            {isVerified ? "Verify Again" : "Trigger Pressure Query"}
          </Button>
        </Card>

        <Card className="border-2 border-brand-linen bg-white">
          <div className="flex items-center space-x-3 mb-6">
            <Database className="text-brand-gold" size={24} />
            <h3 className="font-black text-brand-dark uppercase tracking-tight text-sm">Data Volume Injection</h3>
          </div>
          <p className="text-xs text-gray-500 mb-8 leading-relaxed">
            Inject mock entities to verify performance under heavy load.
          </p>
          <Button 
            className="w-full py-4 rounded-xl" 
            variant="outline"
            disabled={isTesting}
            onClick={runBulkInjection}
            icon={isTesting ? <Loader2 className="animate-spin" /> : <Database size={18} />}
          >
            Inject Mock Entities
          </Button>
        </Card>
      </div>

      {error && !isVerified && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-[24px] flex items-start space-x-4 animate-in slide-in-from-top-4">
          <AlertCircle className="text-rose-500 shrink-0" size={24} />
          <div>
            <h4 className="text-sm font-black text-rose-700 uppercase tracking-widest mb-1">Attention Required</h4>
            <p className="text-xs text-rose-600 leading-relaxed font-medium">
              {error}. If you just enabled the index, please wait 60 seconds and try again.
            </p>
          </div>
        </div>
      )}

      {isVerified && (
        <div className="p-6 bg-emerald-500 text-white rounded-[32px] flex items-center justify-between shadow-2xl shadow-emerald-500/20 animate-in slide-in-from-bottom-4">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 p-3 rounded-2xl">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Infrastructure Check</p>
              <h4 className="text-lg font-black uppercase italic tracking-tighter">Database Status: Ready</h4>
            </div>
          </div>
          <Badge color="emerald">All Systems Nominal</Badge>
        </div>
      )}

      <Card className="bg-brand-dark text-white p-0 overflow-hidden">
        <div className="p-6 bg-white/5 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold">Operational Log Output</h3>
          <Badge color="gold">Real-time Stream</Badge>
        </div>
        <div className="p-8 h-[250px] overflow-y-auto font-mono text-[10px] space-y-2 scrollbar-hide bg-black/40">
          {results.length === 0 && <p className="opacity-20 italic">No diagnostics performed yet...</p>}
          {results.map((r, i) => (
            <div key={i} className={`flex space-x-3 ${r.includes('SUCCESS') ? 'text-emerald-400' : ''}`}>
              <span className="text-brand-gold font-bold">{'>'}</span>
              <span className={r.includes('SUCCESS') ? 'text-emerald-400 font-bold' : 'text-gray-300'}>{r}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
