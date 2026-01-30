
import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Phone, Briefcase, ChevronRight, History, CreditCard, Wallet, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { db } from '../services/mockData';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import { Customer } from '../types';

export const Customers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Real-time synchronization
  const [, setTick] = useState(0);
  useEffect(() => db.subscribe(() => setTick(t => t + 1)), []);

  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    phone: '',
    creditLimit: '',
    defaultCreditDays: '30'
  });

  const filteredCustomers = db.getCustomers().filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.businessName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const newCustomer = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      businessName: formData.businessName,
      phone: formData.phone,
      creditLimit: parseFloat(formData.creditLimit),
      defaultCreditDays: parseInt(formData.defaultCreditDays),
      outstandingBalance: 0
    };
    db.addCustomer(newCustomer);
    setIsModalOpen(false);
    setFormData({ name: '', businessName: '', phone: '', creditLimit: '', defaultCreditDays: '30' });
  };

  const handleOpenPayment = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPaymentAmount(customer.outstandingBalance.toString());
    setPaymentMethod('Cash');
    setPaymentError(null);
    setIsPaymentModalOpen(true);
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
      }, 2000);
    } catch (err: any) {
      setPaymentError(err.message || "Payment failed.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const currencySymbol = db.getSettings()?.currencySymbol || '$';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight italic uppercase">Client <span className="text-brand-gold">Intelligence</span></h2>
          <p className="text-slate-500 mt-1 font-medium">Global customer base and credit ledger.</p>
        </div>
        <Button icon={<Plus size={20} />} onClick={() => setIsModalOpen(true)}>
          New Customer
        </Button>
      </div>

      <div className="relative">
        <Input 
          icon={<Search size={20} />} 
          placeholder="Search by name, business or phone..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredCustomers.map(c => {
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
                  <Button variant="outline" className="flex-1" icon={<History size={16} />}>History</Button>
                )}
                <Button variant="secondary" className="px-5 rounded-2xl" icon={<ChevronRight size={20} />} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Registration Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Enterprise Entity">
        <form onSubmit={handleAddCustomer} className="space-y-6">
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
            <Button className="flex-1" type="submit">Establish Relation</Button>
          </div>
        </form>
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
    </div>
  );
};
