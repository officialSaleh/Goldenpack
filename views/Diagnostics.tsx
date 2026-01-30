
import React, { useState } from 'react';
import { Activity, ShieldAlert, Database, Zap, Loader2, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { db } from '../services/mockData';
import { Card, Button, Badge } from '../components/UI';

export const Diagnostics: React.FC = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const log = (msg: string) => {
    setResults(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const runIndexStressTest = async () => {
    setIsTesting(true);
    setError(null);
    log("Initiating Compound Query Stress Test...");
    try {
      await db.triggerComplexIndexQuery();
      log("Query Successful. Index is active.");
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
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-brand-gold rounded-2xl flex items-center justify-center text-brand-dark shadow-xl shadow-brand-gold/20">
          <Activity size={24} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-brand-dark italic uppercase tracking-tighter">System <span className="text-brand-gold">Diagnostics</span></h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1">Stress testing and operational verification suite.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2 border-brand-linen bg-white">
          <div className="flex items-center space-x-3 mb-6">
            <ShieldAlert className="text-rose-500" size={24} />
            <h3 className="font-black text-brand-dark uppercase tracking-tight text-sm">Index Pressure Test</h3>
          </div>
          <p className="text-xs text-gray-500 mb-8 leading-relaxed">
            Forces a complex Firestore query that requires a composite index. Use this to verify that all necessary "Magic Links" have been clicked and built in the Firebase console.
          </p>
          <Button 
            className="w-full py-4 rounded-xl" 
            variant="secondary"
            disabled={isTesting}
            onClick={runIndexStressTest}
            icon={isTesting ? <Loader2 className="animate-spin" /> : <Zap size={18} />}
          >
            Trigger Pressure Query
          </Button>
        </Card>

        <Card className="border-2 border-brand-linen bg-white">
          <div className="flex items-center space-x-3 mb-6">
            <Database className="text-brand-gold" size={24} />
            <h3 className="font-black text-brand-dark uppercase tracking-tight text-sm">Data Volume Injection</h3>
          </div>
          <p className="text-xs text-gray-500 mb-8 leading-relaxed">
            Injects 50+ mock entries into the cloud registry to test table scrolling, pagination, and real-time listener performance under load.
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

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-[24px] flex items-start space-x-4 animate-in slide-in-from-top-4">
          <AlertCircle className="text-rose-500 shrink-0" size={24} />
          <div>
            <h4 className="text-sm font-black text-rose-700 uppercase tracking-widest mb-1">Attention Required</h4>
            <p className="text-xs text-rose-600 leading-relaxed font-medium">
              {error}. If this mentions a missing index, please open your browser's Developer Console (F12) and click the provided link.
            </p>
          </div>
        </div>
      )}

      <Card className="bg-brand-dark text-white p-0 overflow-hidden">
        <div className="p-6 bg-white/5 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold">Operational Log Output</h3>
          <Badge color="gold">Real-time Stream</Badge>
        </div>
        <div className="p-8 h-[300px] overflow-y-auto font-mono text-[10px] space-y-2 scrollbar-hide bg-black/40">
          {results.length === 0 && <p className="opacity-20 italic">No diagnostics performed yet...</p>}
          {results.map((r, i) => (
            <div key={i} className="flex space-x-3">
              <span className="text-brand-gold font-bold">{'>'}</span>
              <span className="text-gray-300">{r}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
