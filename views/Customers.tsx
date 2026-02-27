
import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, Plus, Phone, Briefcase, ChevronRight, History, CreditCard, Wallet, CheckCircle2, Loader2, AlertCircle, ChevronDown, Edit3, X, FileText, ArrowUpRight, TrendingUp } from 'lucide-react';
import { db } from '../services/mockData';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import { Customer } from '../types';

interface CustomersProps {
  onViewHistory?: (customerName: string) => void;
}

export const Customers: React.FC<CustomersProps> = ({ onViewHistory }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailedLedger, setDetailedLedger] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    phone: '',
    trn: '',
    creditLimit: '',
    defaultCreditDays: '30'
  });

  // Cloud Fetch Logic
  const fetchCustomers = useCallback(async (isInitial = true, search = '') => {
    if (isInitial) {
      setLoading(true);
      setError(null);
    } else {
      setSearching(true);
    }

    try {
      const result = await db.getCustomersCloud({
        search: search,
        lastDoc: isInitial ? null : lastVisible,
        pageSize: 12
      });

      if (isInitial) {
        setCustomers(result.customers);
      } else {
        setCustomers(prev => [...prev, ...result.customers]);
      }

      setLastVisible(result.lastVisible);
      setHasMore(result.customers.length === 12);
    } catch (err: any) {
      console.error("Cloud Customer Error:", err);
      setError("Cloud synchronization failed. Please check your network.");
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [lastVisible]);

  // Initial Load
  useEffect(() => {
    fetchCustomers(true, searchTerm);
  }, []);

  // Debounced Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers(true, searchTerm);
    }, 600);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const newCustomer = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      businessName: formData.businessName,
      phone: formData.phone,
      trn: formData.trn,
      creditLimit: parseFloat(formData.creditLimit),
      defaultCreditDays: parseInt(formData.defaultCreditDays),
      outstandingBalance: 0
    };
    try {
      await db.addCustomer(newCustomer);
      setIsModalOpen(false);
      setFormData({ name: '', businessName: '', phone: '', trn: '', creditLimit: '', defaultCreditDays: '30' });
      fetchCustomers(true, '');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenPayment = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPaymentAmount(customer.outstandingBalance.toString());
    setPaymentMethod('Cash');
    setPaymentError(null);
    setIsPaymentModalOpen(true);
  };

  const handleOpenDetails = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailModalOpen(true);
    setLoadingLedger(true);
    try {
      const ledger = await db.getCustomerLedgerCloud(customer.id);
      setDetailedLedger(ledger);
    } catch (err) {
      console.error("Ledger fetch failed", err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    try {
      await db.updateCustomer(selectedCustomer.id, {
        name: formData.name,
        businessName: formData.businessName,
        phone: formData.phone,
        trn: formData.trn,
        creditLimit: parseFloat(formData.creditLimit)
      });
      setIsDetailModalOpen(false);
      fetchCustomers(true, searchTerm);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExecutePayment = async () => {
    if (!selectedCustomer) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setPaymentError("Invalid payment amount.");
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      await db.collectPayment(selectedCustomer.id, amount, paymentMethod);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsPaymentModalOpen(false);
        setSelectedCustomer(null);
        fetchCustomers(true, searchTerm);
      }, 2000);
    } catch (err: any) {
      setPaymentError(err.message || "Payment failed.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const SkeletonCard = () => (
    <Card className="animate-pulse">
      <div className="flex items-start justify-between mb-8">
        <div className="w-16 h-16 rounded-2xl bg-slate-100"></div>
        <div className="h-6 w-24 bg-slate-100 rounded-lg"></div>
      </div>
      <div className="h-6 bg-slate-100 rounded w-3/4 mb-4"></div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-100 rounded w-1/2"></div>
        <div className="h-3 bg-slate-100 rounded w-1/3"></div>
      </div>
      <div className="mt-10 h-32 bg-slate-50 rounded-3xl"></div>
    </Card>
  );

  const currencySymbol = db.getSettings()?.currencySymbol || '$';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight italic uppercase">Client <span className="text-brand-gold">Intelligence</span></h2>
          <p className="text-slate-500 mt-1 font-medium">Global customer base and credit ledger.</p>
        </div>
        <Button icon={<Plus size={20} />} onClick={() => {
          // Fix: Remove undefined setEditing and ensure selectedCustomer is null for new entry
          setSelectedCustomer(null);
          setFormData({ name: '', businessName: '', phone: '', trn: '', creditLimit: '', defaultCreditDays: '30' });
          setIsModalOpen(true);
        }}>
          New Customer
        </Button>
      </div>

      <div className="relative">
        <Input 
          icon={searching ? <Loader2 size={20} className="animate-spin text-brand-gold" /> : <Search size={20} />} 
          placeholder="Cloud search by name, business or phone..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center space-x-3 text-rose-600">
          <AlertCircle size={20} />
          <span className="text-xs font-bold uppercase tracking-widest">{error}</span>
          <button onClick={() => fetchCustomers(true, searchTerm)} className="underline font-black">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          customers.map(c => {
            const isAtLimit = c.outstandingBalance >= c.creditLimit;
            const status = isAtLimit ? 'Limit Exceeded' : c.outstandingBalance > 0 ? 'Active Credit' : 'Clear Ledger';

            return (
              <Card key={c.id} className="group hover:border-brand-gold transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-start justify-between mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-brand-linen flex items-center justify-center text-brand-dark font-black text-2xl shadow-inner group-hover:bg-brand-gold transition-colors">
                    {c.name.charAt(0)}
                  </div>
                  <Badge color={isAtLimit ? 'rose' : c.outstandingBalance > 0 ? 'amber' : 'emerald'}>
                    {status}
                  </Badge>
                </div>
                
                <h3 className="text-xl font-black text-brand-dark tracking-tight">{c.name}</h3>
                <div className="space-y-1.5 mt-2">
                  <div className="flex items-center text-slate-500 text-sm space-x-2 font-bold uppercase tracking-widest text-[10px]">
                    <Briefcase size={12} className="text-brand-gold" />
                    <span>{c.businessName}</span>
                  </div>
                  <div className="flex items-center text-slate-500 text-sm space-x-2 font-bold uppercase tracking-widest text-[10px]">
                    <Phone size={12} className="text-brand-gold" />
                    <span>{c.phone}</span>
                  </div>
                  {c.trn && (
                    <div className="flex items-center text-slate-500 text-sm space-x-2 font-bold uppercase tracking-widest text-[10px]">
                      <FileText size={12} className="text-brand-gold" />
                      <span>TRN: {c.trn}</span>
                    </div>
                  )}
                </div>

                <div className="mt-10 p-5 bg-brand-linen/30 rounded-3xl border border-brand-linen/50">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    <span>Usage Analytics</span>
                    <span>Cap: {db.formatMoney(c.creditLimit)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className={`text-2xl font-black tracking-tighter ${c.outstandingBalance > 0 ? (isAtLimit ? 'text-rose-600' : 'text-brand-gold') : 'text-emerald-600'}`}>
                      {db.formatMoney(c.outstandingBalance)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full mt-4 overflow-hidden shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ease-out ${isAtLimit ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]' : 'bg-brand-gold'}`} 
                      style={{ width: `${Math.min(100, (c.outstandingBalance / c.creditLimit) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  {c.outstandingBalance > 0 ? (
                    <Button 
                      className="flex-1" 
                      icon={<Wallet size={16} />} 
                      onClick={() => handleOpenPayment(c)}
                    >
                      Settle
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="flex-1" 
                      icon={<History size={16} />}
                      onClick={() => onViewHistory && onViewHistory(c.name)}
                    >
                      History
                    </Button>
                  )}
                  <Button 
                    variant="secondary" 
                    className="px-5 rounded-2xl" 
                    icon={<ChevronRight size={20} />} 
                    onClick={() => handleOpenDetails(c)}
                  />
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Customer Detail Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Intelligence Profile">
        <div className="space-y-10">
          {selectedCustomer && (
            <>
              {/* Profile Header */}
              <div className="flex flex-col md:flex-row items-center gap-6 p-8 bg-brand-dark rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
                <div className="w-24 h-24 rounded-[32px] bg-brand-gold text-brand-dark flex items-center justify-center text-4xl font-black italic shadow-inner shrink-0 transform group-hover:scale-110 transition-transform duration-500">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-3xl font-black tracking-tighter italic uppercase leading-none mb-2">{selectedCustomer.name}</h3>
                  <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-3">
                    <Badge color="gold">{selectedCustomer.businessName}</Badge>
                    <Badge color="slate">{selectedCustomer.phone}</Badge>
                    {selectedCustomer.trn && <Badge color="indigo">TRN: {selectedCustomer.trn}</Badge>}
                  </div>
                </div>
                <div className="text-center md:text-right">
                   <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] mb-1">Balance Risk</p>
                   <p className={`text-2xl font-black ${selectedCustomer.outstandingBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                     {db.formatMoney(selectedCustomer.outstandingBalance)}
                   </p>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div className="bg-brand-linen/40 p-6 rounded-[32px] border border-brand-linen flex flex-col items-center">
                    <TrendingUp size={20} className="text-brand-gold mb-2" />
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Invoiced</p>
                    <p className="text-sm font-black text-brand-dark">{db.formatMoney(detailedLedger.filter(l => l.type === 'Invoice').reduce((s, o) => s + o.total, 0))}</p>
                 </div>
                 <div className="bg-emerald-50/50 p-6 rounded-[32px] border border-emerald-100 flex flex-col items-center">
                    <TrendingUp size={20} className="text-emerald-600 mb-2" />
                    <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Lifetime Profit</p>
                    <p className="text-sm font-black text-emerald-700">
                      {db.formatMoney(detailedLedger.filter(l => l.type === 'Invoice').reduce((s, o) => s + (o.totalProfit || 0), 0))}
                    </p>
                 </div>
                 <div className="bg-brand-linen/40 p-6 rounded-[32px] border border-brand-linen flex flex-col items-center">
                    <CheckCircle2 size={20} className="text-emerald-500 mb-2" />
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Settled</p>
                    <p className="text-sm font-black text-brand-dark">{db.formatMoney(detailedLedger.filter(l => l.type === 'Payment').reduce((s, p) => s + p.amount, 0))}</p>
                 </div>
                 <div className="bg-brand-linen/40 p-6 rounded-[32px] border border-brand-linen flex flex-col items-center">
                    <FileText size={20} className="text-indigo-500 mb-2" />
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Documents</p>
                    <p className="text-sm font-black text-brand-dark">{detailedLedger.length}</p>
                 </div>
              </div>

              {/* Credit Health Bar */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <h4 className="text-[10px] font-black text-brand-gold uppercase tracking-widest">Credit Exposure Protocol</h4>
                  <p className="text-[10px] font-black text-gray-400">Limit: {db.formatMoney(selectedCustomer.creditLimit)}</p>
                </div>
                <div className="h-4 w-full bg-brand-linen rounded-full overflow-hidden shadow-inner border border-brand-linen">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${selectedCustomer.outstandingBalance >= selectedCustomer.creditLimit ? 'bg-rose-500' : 'bg-brand-gold'}`}
                    style={{ width: `${Math.min(100, (selectedCustomer.outstandingBalance / selectedCustomer.creditLimit) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Transaction Ledger */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-brand-linen pb-3">
                  <h4 className="text-[10px] font-black text-brand-dark uppercase tracking-widest">Global Transaction Ledger</h4>
                  {loadingLedger && <Loader2 size={14} className="animate-spin text-brand-gold" />}
                </div>
                
                <div className="max-h-[300px] overflow-y-auto pr-2 scrollbar-hide space-y-3">
                  {detailedLedger.map((item, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border ${item.type === 'Payment' ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-brand-linen'}`}>
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.type === 'Payment' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                          {item.type === 'Payment' ? <Wallet size={16} /> : <FileText size={16} />}
                        </div>
                        <div>
                          <p className="text-xs font-black text-brand-dark leading-none">{item.type === 'Payment' ? 'Credit Settlement' : `Order ${item.id}`}</p>
                          <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{item.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${item.type === 'Payment' ? 'text-emerald-600' : 'text-brand-dark'}`}>
                          {item.type === 'Payment' ? `-${db.formatMoney(item.amount)}` : db.formatMoney(item.total)}
                        </p>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{item.type === 'Payment' ? item.method : item.paymentType}</p>
                      </div>
                    </div>
                  ))}
                  {detailedLedger.length === 0 && !loadingLedger && (
                    <div className="text-center py-10 opacity-30 italic text-[10px] uppercase tracking-widest">No activity synchronized.</div>
                  )}
                </div>
              </div>

              {/* Manage Entity Toggle */}
              <div className="pt-6">
                 <Button 
                   variant="outline" 
                   className="w-full" 
                   icon={<Edit3 size={18} />}
                   onClick={() => {
                     setFormData({
                       name: selectedCustomer.name,
                       businessName: selectedCustomer.businessName,
                       phone: selectedCustomer.phone,
                       trn: selectedCustomer.trn || '',
                       creditLimit: selectedCustomer.creditLimit.toString(),
                       defaultCreditDays: selectedCustomer.defaultCreditDays.toString()
                     });
                     setIsDetailModalOpen(false);
                     setIsModalOpen(true);
                   }}
                 >
                   Modify Strategic Metadata
                 </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => !isProcessingPayment && setIsPaymentModalOpen(false)} title="Balance Reconciliation">
        <div className="space-y-8 relative">
          {showSuccess ? (
            <div className="py-12 text-center animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle2 size={56} />
              </div>
              <h3 className="text-3xl font-black text-brand-dark mb-2 italic">Processed</h3>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Funds synchronized successfully.</p>
            </div>
          ) : (
            <>
              <div className="p-8 bg-brand-linen/40 rounded-[32px] border border-brand-linen flex flex-col items-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Current Indebtedness</p>
                <h4 className="text-4xl font-black text-brand-dark tracking-tighter italic">
                  {db.formatMoney(selectedCustomer?.outstandingBalance || 0)}
                </h4>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest ml-1">Settlement Amount</label>
                  <div className="relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-brand-gold">{currencySymbol}</div>
                    <input 
                      type="number"
                      step="0.01"
                      className="w-full pl-14 pr-8 py-6 bg-brand-linen/50 border-none rounded-[24px] text-2xl font-black text-brand-dark focus:ring-4 focus:ring-brand-gold/10 outline-none transition-all"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest ml-1">Transfer Method</label>
                  <div className="flex gap-2 p-1 bg-brand-linen/50 rounded-2xl border border-brand-linen">
                    {['Cash', 'Bank Transfer', 'Check'].map(method => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentMethod === method ? 'bg-white shadow-sm text-brand-gold' : 'text-gray-400 hover:text-brand-dark'}`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {paymentError && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center space-x-3 text-rose-500 text-xs font-bold">
                    <AlertCircle size={18} />
                    <span>{paymentError}</span>
                  </div>
                )}

                <div className="pt-4 flex flex-col md:flex-row gap-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 py-5" 
                    onClick={() => setIsPaymentModalOpen(false)}
                    disabled={isProcessingPayment}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 py-5" 
                    onClick={handleExecutePayment}
                    disabled={isProcessingPayment || !paymentAmount}
                    icon={isProcessingPayment ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} />}
                  >
                    Finalize Settlement
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Registration / Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={formData.name && selectedCustomer ? "Modify Strategic Metadata" : "Register Enterprise Entity"}
      >
        <form onSubmit={formData.name && selectedCustomer ? handleUpdateCustomer : handleAddCustomer} className="space-y-6">
          <Input 
            label="Principal Contact" 
            placeholder="Authorized Representative Name" 
            required 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
          <Input 
            label="Business Entity" 
            placeholder="Official Registered Name" 
            required 
            value={formData.businessName}
            onChange={(e) => setFormData({...formData, businessName: e.target.value})}
          />
          <Input 
            label="Secure Line" 
            placeholder="+971 50 123 4567" 
            required 
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
          <Input 
            label="TRN Number" 
            placeholder="15-digit Tax Registration Number" 
            value={formData.trn}
            onChange={(e) => setFormData({...formData, trn: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-6">
            <Input 
              label={`Credit Ceiling (${currencySymbol})`}
              type="number" 
              placeholder="5000" 
              required 
              value={formData.creditLimit}
              onChange={(e) => setFormData({...formData, creditLimit: e.target.value})}
            />
            <Input 
              label="Grace Period (Days)" 
              type="number" 
              placeholder="30" 
              required 
              value={formData.defaultCreditDays}
              onChange={(e) => setFormData({...formData, defaultCreditDays: e.target.value})}
            />
          </div>
          <div className="flex gap-4 pt-6">
            <Button variant="outline" className="flex-1" type="button" onClick={() => setIsModalOpen(false)}>Abort</Button>
            <Button className="flex-1" type="submit">
              {formData.name && selectedCustomer ? "Update Archive" : "Establish Relation"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
