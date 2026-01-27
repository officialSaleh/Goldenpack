
import React, { useState } from 'react';
import { Search, Sparkles, Globe, Link as LinkIcon, AlertCircle, Loader2 } from 'lucide-react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { Card, Button, Badge } from '../components/UI';

interface Source {
  title: string;
  uri: string;
}

export const MarketIntelligence: React.FC = () => {
  const [query, setQuery] = useState('Current trends in luxury perfume glass bottle designs 2025');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);

  const handleResearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse(null);
    setSources([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const result: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      setResponse(result.text || 'No data found.');
      
      const groundingMetadata = result.candidates?.[0]?.groundingMetadata;
      const chunks = groundingMetadata?.groundingChunks;
      
      if (chunks && Array.isArray(chunks)) {
        const extractedSources: Source[] = chunks
          .filter((chunk: any) => chunk.web && chunk.web.title && chunk.web.uri)
          .map((chunk: any) => ({ 
            title: chunk.web.title as string, 
            uri: chunk.web.uri as string 
          }));
        setSources(extractedSources);
      }
    } catch (err) {
      console.error(err);
      setResponse("Failed to fetch market data. Please ensure your API key is configured in the environment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-4xl font-black text-brand-dark tracking-tighter italic">Market<span className="text-brand-gold">Intelligence</span></h2>
        <p className="text-gray-400 mt-2 font-medium">Real-time AI research for elite perfume packaging trends.</p>
      </div>

      <Card className="bg-brand-dark text-white border-none shadow-2xl relative overflow-visible">
        <div className="absolute top-0 right-0 -mt-6 mr-10 p-5 bg-brand-gold rounded-3xl shadow-xl transform rotate-6 animate-bounce hover:animate-none">
          <Sparkles className="text-brand-dark" size={36} />
        </div>
        <h3 className="text-2xl font-black mb-4 uppercase tracking-tight italic">Golden <span className="text-brand-gold">Intelligence Scan</span></h3>
        <p className="text-gray-400 mb-10 max-w-2xl leading-relaxed font-medium">
          Research raw material fluctuations, glass manufacturing innovations, and global design aesthetic shifts across European and Middle Eastern markets.
        </p>
        <div className="flex flex-col lg:flex-row gap-6">
          <input 
            type="text" 
            placeholder="Type your strategic research query..." 
            className="flex-1 bg-white/5 border-2 border-white/10 rounded-2xl px-8 py-5 outline-none placeholder:text-gray-600 text-white font-bold focus:border-brand-gold/50 focus:bg-white/10 transition-all text-lg"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button 
            variant="primary" 
            size="lg" 
            onClick={handleResearch} 
            disabled={loading}
            className="h-full rounded-2xl"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Execute AI Analysis'}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <Card className="min-h-[500px] border-brand-gold/10">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-brand-linen flex items-center justify-center text-brand-gold">
                <Globe size={22} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Synthesis Engine Output</span>
            </div>
            
            {!response && !loading && (
              <div className="flex flex-col items-center justify-center py-32 opacity-20">
                <Search size={80} className="mb-6 text-brand-gold" />
                <p className="font-black uppercase tracking-widest text-brand-dark">Input Search Parameters</p>
              </div>
            )}

            {loading && (
              <div className="space-y-6">
                <div className="h-6 bg-brand-linen animate-pulse rounded-xl w-3/4"></div>
                <div className="h-4 bg-brand-linen animate-pulse rounded-xl w-full"></div>
                <div className="h-4 bg-brand-linen animate-pulse rounded-xl w-5/6"></div>
                <div className="h-4 bg-brand-linen animate-pulse rounded-xl w-4/6"></div>
                <div className="h-20 bg-brand-linen animate-pulse rounded-3xl w-full"></div>
              </div>
            )}

            {response && (
              <div className="prose prose-slate max-w-none">
                <p className="text-brand-dark leading-[1.8] text-lg font-medium whitespace-pre-wrap selection:bg-brand-gold selection:text-brand-dark">{response}</p>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="bg-brand-linen/30 border-brand-linen">
            <h3 className="text-xs font-black text-brand-dark uppercase tracking-widest mb-8 flex items-center space-x-2">
              <span className="w-2 h-2 bg-brand-gold rounded-full"></span>
              <span>Verified Global Sources</span>
            </h3>
            <div className="space-y-5">
              {sources.map((source, i) => (
                <a 
                  key={i} 
                  href={source.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-5 bg-white border border-brand-linen rounded-2xl hover:border-brand-gold hover:shadow-xl hover:shadow-brand-gold/5 transition-all group"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-brand-linen rounded-xl group-hover:bg-brand-gold group-hover:text-brand-dark transition-colors text-gray-400">
                      <LinkIcon size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-brand-dark line-clamp-2 leading-relaxed tracking-tight">{source.title}</p>
                      <p className="text-[9px] text-brand-gold mt-1 font-bold truncate opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">Navigate to Intelligence Source</p>
                    </div>
                  </div>
                </a>
              ))}
              {sources.length === 0 && !loading && (
                <div className="p-10 text-center border-2 border-dashed border-gray-200 rounded-3xl">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Awaiting ground research</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-brand-dark border-none">
            <div className="flex items-center space-x-2 text-brand-gold mb-4">
              <AlertCircle size={20} />
              <span className="text-xs font-black uppercase tracking-widest">Grounding Protocol</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed font-medium">
              Data is validated against current 2025 logistics indices and aesthetic trend forecast reports.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};