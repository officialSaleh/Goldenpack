
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/mockData';
import { Clock, Search, FileX, Loader2, ChevronDown, AlertTriangle } from 'lucide-react';
import { Card, Badge, Input, Button } from '../components/UI';
import { Order } from '../types';

export const OrderHistory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Phase A: Cloud Search Fetcher
  const fetchOrders = useCallback(async (isInitial = true, search = '') => {
    if (isInitial) {
      setLoading(true);
      setError(null);
    } else {
      setSearching(true);
    }

    try {
      const result = await db.getOrdersCloud({
        search: search,
        lastDoc: isInitial ? null : lastVisible,
        pageSize: 15
      });

      if (isInitial) {
        setOrders(result.orders);
      } else {
        setOrders(prev => [...prev, ...result.orders]);
      }

      setLastVisible(result.lastVisible);
      setHasMore(result.orders.length === 15);
    } catch (err: any) {
      console.error("Cloud Fetch Error:", err);
      setError("Failed to synchronize with cloud ledger. Please check your connection.");
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [lastVisible]);

  // Initial Load
  useEffect(() => {
    fetchOrders(true, searchTerm);
  }, []);

  // Debounced Search Logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchOrders(true, searchTerm);
    }, 600); // 600ms debounce to save costs and reduce flickering

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-8 py-5"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
      <td className="px-8 py-5"><div className="h-4 bg-slate-100 rounded w-32"></div></td>
      <td className="px-8 py-5"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
      <td className="px-8 py-5"><div className="h-4 bg-slate-100 rounded w-16"></div></td>
      <td className="px-8 py-5"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
      <td className="px-8 py-5"><div className="h-6 bg-slate-100 rounded-lg w-20"></div></td>
    </tr>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-dark tracking-tighter uppercase italic">Order <span className="text-brand-gold">History</span></h2>
          <p className="text-slate-500 mt-1 font-bold uppercase tracking-widest text-[10px]">Cloud-synchronized transaction archives.</p>
        </div>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center space-x-4">
          <div className="flex-1">
            <Input 
              icon={searching ? <Loader2 size={18} className="animate-spin text-brand-gold" /> : <Search size={18} />} 
              placeholder="Cloud Search by ID or customer..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-center space-x-3 text-rose-600">
            <AlertTriangle size={20} />
            <span className="text-xs font-bold uppercase tracking-widest">{error}</span>
            <button onClick={() => fetchOrders(true, searchTerm)} className="underline font-black">Retry</button>
          </div>
        )}

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-8 py-5">Order ID</th>
                <th className="px-8 py-5">Customer</th>
                <th className="px-8 py-5">Total</th>
                <th className="px-8 py-5">Type</th>
                <th className="px-8 py-5">Due Date</th>
                <th className="px-8 py-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-5 font-bold text-slate-900 tracking-tight">{o.id}</td>
                    <td className="px-8 py-5 font-medium text-slate-600">{o.customerName}</td>
                    <td className="px-8 py-5 font-black text-brand-gold">{db.formatMoney(o.total)}</td>
                    <td className="px-8 py-5">
                      <Badge color={o.paymentType === 'Cash' ? 'emerald' : 'indigo'}>{o.paymentType}</Badge>
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-500 font-medium">{o.dueDate}</td>
                    <td className="px-8 py-5">
                      <Badge color={
                        o.status === 'Paid' ? 'emerald' : 
                        o.status === 'Overdue' ? 'rose' : 'amber'
                      }>
                        {o.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {!loading && orders.length === 0 && (
            <div className="py-32 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                {searchTerm ? <FileX className="text-slate-200" size={40} /> : <Clock className="text-slate-200" size={40} />}
              </div>
              <p className="text-slate-900 font-black uppercase tracking-widest text-sm">
                {searchTerm ? 'No matches found in cloud' : 'No orders recorded'}
              </p>
              <p className="text-slate-400 text-xs mt-2 uppercase tracking-tighter">
                {searchTerm ? 'The specific ID or agent was not found in the archives' : 'Strategic sales data will populate here'}
              </p>
            </div>
          )}
        </div>

        {hasMore && !loading && (
          <div className="p-8 border-t border-slate-50 bg-slate-50/10 flex justify-center">
            <Button 
              variant="outline" 
              size="sm" 
              icon={searching ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} />} 
              onClick={() => fetchOrders(false, searchTerm)}
              disabled={searching}
            >
              {searching ? 'Synchronizing...' : 'Load Archived Records'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
