
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/mockData';
import { Clock, Search, FileX, Loader2, ChevronDown, AlertTriangle, ArrowLeft, Edit2, Trash2, CheckCircle, X, TrendingUp, Info } from 'lucide-react';
import { Card, Badge, Input, Button, Modal } from '../components/UI';
import { MonthSelector } from '../components/MonthSelector';
import { Order, OrderItem, OrderStatus } from '../types';

interface OrderHistoryProps {
  initialSearch?: string;
  onSearchConsumed?: () => void;
  onBack?: () => void;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({ initialSearch, onSearchConsumed, onBack }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Handle external search injection
  useEffect(() => {
    if (initialSearch !== undefined && initialSearch !== searchTerm) {
      setSearchTerm(initialSearch);
      if (onSearchConsumed) onSearchConsumed();
    }
  }, [initialSearch]);

  // Phase A: Cloud Search Fetcher
  const fetchOrders = useCallback(async (isInitial = true, search = '', month?: number, year?: number) => {
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
        pageSize: 15,
        month: month,
        year: year
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
    fetchOrders(true, searchTerm, selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  // Debounced Search Logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchOrders(true, searchTerm, selectedMonth, selectedYear);
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const monthlyTotal = orders.reduce((sum, o) => sum + o.total, 0);

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

  const getSmartStatus = (o: Order) => {
    // Priority 1: Check explicit status for Bank Transfers
    if (o.status === 'Pending Verification') return { label: 'Pending Verification', color: 'gold' as const };

    const paid = o.amountPaid || 0;
    const total = o.total;
    const remaining = total - paid;

    if (paid >= total) return { label: 'Settled', color: 'emerald' as const };
    if (paid > 0) return { label: 'Partial', color: 'amber' as const };
    
    // Check overdue
    const isOverdue = new Date(o.dueDate) < new Date();
    if (isOverdue) return { label: 'Overdue', color: 'rose' as const };
    
    return { label: o.paymentType === 'Credit' ? 'Unpaid' : 'Pending', color: 'indigo' as const };
  };

  const handleToggleVAT = async (orderId: string) => {
    setProcessingId(orderId);
    try {
      await db.toggleOrderVAT(orderId);
      fetchOrders(true, searchTerm);
    } catch (err) {
      console.error("VAT toggle failed", err);
      setError("Failed to adjust VAT protocol.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAsPaid = async (order: Order) => {
    const isVerification = order.status === 'Pending Verification';
    const message = isVerification 
      ? "Confirm that the bank transfer for this order has been verified?" 
      : "Mark this order as fully settled? This will update the customer balance.";

    if (!window.confirm(message)) return;
    
    setProcessing(true);
    setProcessingId(order.id);
    try {
      await db.markOrderAsPaid(order.id);
      await fetchOrders(true, searchTerm);
    } catch (err) {
      alert("Failed to update status");
    } finally {
      setProcessing(false);
      setProcessingId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setProcessing(true);
    try {
      await db.deleteOrder(orderId);
      setConfirmDelete(null);
      await fetchOrders(true, searchTerm);
    } catch (err) {
      alert("Failed to delete order");
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    
    setProcessing(true);
    try {
      // Recalculate totals
      const subtotal = editingOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const vat = subtotal * 0.05;
      const total = subtotal + vat;
      
      const updated: Order = {
        ...editingOrder,
        subtotal,
        vat,
        total,
        // If it was paid, we might need to adjust status if total increased
        status: ((editingOrder.amountPaid || 0) >= total ? 'Paid' : 'Pending') as OrderStatus
      };

      await db.updateOrder(editingOrder.id, updated);
      setEditingOrder(null);
      await fetchOrders(true, searchTerm);
    } catch (err: any) {
      alert(err.message || "Failed to update order");
    } finally {
      setProcessing(false);
    }
  };

  const updateItemQuantity = (productId: string, newQty: number) => {
    if (!editingOrder) return;
    const newItems = editingOrder.items.map(item => 
      item.productId === productId ? { ...item, quantity: Math.max(1, newQty) } : item
    );
    setEditingOrder({ ...editingOrder, items: newItems });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="w-12 h-12 flex items-center justify-center bg-white border border-brand-linen rounded-2xl text-brand-dark hover:border-brand-gold hover:text-brand-gold transition-all shadow-sm active:scale-95"
              title="Return to Ledger"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h2 className="text-3xl font-black text-brand-dark tracking-tighter uppercase italic">Order <span className="text-brand-gold">History</span></h2>
            <p className="text-slate-500 mt-1 font-bold uppercase tracking-widest text-[10px]">Cloud-synchronized transaction archives.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="bg-white border border-brand-linen rounded-2xl px-6 py-3 flex items-center space-x-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Monthly Sales</p>
              <p className="text-lg font-black text-brand-dark tracking-tighter">{db.formatMoney(monthlyTotal)}</p>
            </div>
          </div>
          <MonthSelector 
            selectedMonth={selectedMonth} 
            selectedYear={selectedYear} 
            onChange={(m, y) => {
              setSelectedMonth(m);
              setSelectedYear(y);
            }} 
          />
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
                <th className="px-8 py-5">Valuation</th>
                <th className="px-8 py-5">Balance Status</th>
                <th className="px-8 py-5">Due Date</th>
                <th className="px-8 py-5">System State</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)
              ) : (
                orders.map((o) => {
                  const statusInfo = getSmartStatus(o);
                  const paidPct = Math.min(100, ((o.amountPaid || 0) / o.total) * 100);
                  const balance = o.total - (o.amountPaid || 0);

                  return (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-5">
                        <p className="font-bold text-slate-900 tracking-tight leading-none">{o.id}</p>
                        <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{o.date.split('T')[0]}</p>
                      </td>
                      <td className="px-8 py-5 font-medium text-slate-600">{o.customerName}</td>
                      <td className="px-8 py-5">
                        <p className="font-black text-brand-dark leading-none">{db.formatMoney(o.total)}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{o.paymentType} Protocol</p>
                          {o.vatEnabled === false && (
                            <span className="text-[7px] font-black text-slate-500 bg-slate-100 px-1 rounded uppercase tracking-tighter">
                              VAT Exempt
                            </span>
                          )}
                          {o.totalProfit !== undefined && (
                            <span className="text-[7px] font-black text-emerald-600 bg-emerald-50 px-1 rounded uppercase tracking-tighter">
                              Profit: {db.formatMoney(o.totalProfit)}
                            </span>
                          )}
                        </div>
                        {o.paymentReference && (
                          <p className="text-[7px] font-black text-brand-gold mt-1 uppercase tracking-tighter truncate w-24">Ref: {o.paymentReference}</p>
                        )}
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col w-32">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                              {balance > 0 ? `Rem: ${db.formatMoney(balance)}` : 'Cleared'}
                            </span>
                            <span className="text-[8px] font-black text-brand-gold">{Math.round(paidPct)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${paidPct === 100 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-brand-gold'}`} 
                              style={{ width: `${paidPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${new Date(o.dueDate) < new Date() && balance > 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                          {o.dueDate}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <Badge color={statusInfo.color}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {o.status === 'Pending Verification' ? (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsPaid(o);
                              }}
                              disabled={processing}
                              className={`p-2 rounded-lg transition-all flex items-center justify-center min-w-[32px] min-h-[32px] ${processingId === o.id ? 'text-brand-gold bg-brand-gold/10' : 'text-brand-gold hover:bg-brand-gold/10 bg-slate-50'}`}
                              title="Verify Transfer"
                            >
                              {processingId === o.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                            </button>
                          ) : (
                            statusInfo.label !== 'Settled' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsPaid(o);
                                }}
                                disabled={processing}
                                className={`p-2 rounded-lg transition-all flex items-center justify-center min-w-[32px] min-h-[32px] ${processingId === o.id ? 'text-emerald-600 bg-emerald-50' : 'text-emerald-600 hover:bg-emerald-50 bg-slate-50'}`}
                                title="Mark as Paid"
                              >
                                {processingId === o.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                              </button>
                            )
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleVAT(o.id);
                            }}
                            disabled={processingId === o.id}
                            className={`p-2 rounded-lg transition-all ${o.vatEnabled === false ? 'text-slate-400 hover:text-brand-gold hover:bg-brand-linen/30' : 'text-emerald-600 hover:bg-emerald-50'} bg-slate-50`}
                            title={o.vatEnabled === false ? "Enable VAT" : "Disable VAT"}
                          >
                            {processingId === o.id ? <Loader2 size={16} className="animate-spin" /> : <Info size={16} />}
                          </button>
                          <button 
                            onClick={() => setEditingOrder(o)}
                            className="p-2 text-slate-400 hover:text-brand-gold hover:bg-brand-linen/30 rounded-lg transition-all"
                            title="Edit Order"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => setConfirmDelete(o.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Delete Order"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* Edit Order Modal */}
      <Modal isOpen={!!editingOrder} onClose={() => setEditingOrder(null)} title="Modify Transaction Intelligence">
        {editingOrder && (
          <form onSubmit={handleUpdateOrder} className="space-y-6">
            <div className="bg-brand-linen/30 p-6 rounded-3xl border border-brand-linen/50">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer Entity</span>
                <span className="text-sm font-black text-brand-dark">{editingOrder.customerName}</span>
              </div>
              <div className="space-y-4">
                {(editingOrder.items || []).map((item) => (
                  <div key={item.productId} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-brand-linen/50 shadow-sm">
                    <div className="flex-1">
                      <p className="text-xs font-black text-brand-dark tracking-tight">{item.productName}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{db.formatMoney(item.price)} / unit</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button 
                        type="button"
                        onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center bg-brand-linen/50 rounded-lg hover:bg-brand-gold transition-colors"
                      >
                        -
                      </button>
                      <span className="text-sm font-black w-8 text-center">{item.quantity}</span>
                      <button 
                        type="button"
                        onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-brand-linen/50 rounded-lg hover:bg-brand-gold transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-brand-linen">
              <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <span>New Valuation</span>
                <span className="text-brand-dark font-black">{db.formatMoney(editingOrder.items.reduce((s, i) => s + (i.price * i.quantity), 0) * 1.05)}</span>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button variant="outline" className="flex-1" type="button" onClick={() => setEditingOrder(null)}>Abort Edit</Button>
              <Button className="flex-1" type="submit" disabled={processing}>
                {processing ? <Loader2 className="animate-spin" size={18} /> : "Finalize Modification"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Destructive Protocol">
          <div className="text-center p-4">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <p className="text-slate-600 font-bold mb-8 leading-relaxed">
              This will permanently purge this transaction from the cloud ledger. 
              Stock will be returned to inventory and customer balance will be adjusted.
            </p>
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>Retain Record</Button>
              <Button variant="danger" className="flex-1" onClick={() => handleDeleteOrder(confirmDelete)} disabled={processing}>
                {processing ? <Loader2 className="animate-spin" size={18} /> : "Execute Purge"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
