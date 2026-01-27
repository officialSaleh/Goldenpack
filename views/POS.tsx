
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  Package,
  CheckCircle2,
  Receipt,
  ArrowRight,
  AlertTriangle,
  History,
  Printer,
  Wallet,
  CreditCard
} from 'lucide-react';
import { db } from '../services/mockData';
import { Product, OrderItem, Customer, Order } from '../types';
import { VAT_RATE } from '../constants';
import { Modal, Button, Badge } from '../components/UI';

interface POSProps {
  setActiveTab?: (tab: string) => void;
}

export const POS: React.FC<POSProps> = ({ setActiveTab }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentType, setPaymentType] = useState<'Cash' | 'Credit'>('Cash');
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [isOverrideActive, setIsOverrideActive] = useState(false);

  const products = db.getProducts();
  const customers = db.getCustomers();

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) && p.stockQuantity > 0
  );

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stockQuantity) return;
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.sellingPrice
      }]);
    }
  };

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.productId === id) {
        const product = products.find(p => p.id === id);
        const newQty = Math.max(0, item.quantity + delta);
        if (product && newQty > product.stockQuantity) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const vat = subtotal * VAT_RATE;
    const total = subtotal + vat;
    return { subtotal, vat, total };
  }, [cart]);

  const creditUsagePercent = useMemo(() => {
    if (!selectedCustomer) return 0;
    const projectTotal = paymentType === 'Credit' ? totals.total : 0;
    return ((selectedCustomer.outstandingBalance + projectTotal) / selectedCustomer.creditLimit) * 100;
  }, [selectedCustomer, paymentType, totals.total]);

  const handleCheckoutInitiate = () => {
    if (!selectedCustomer || cart.length === 0) return;

    if (paymentType === 'Credit') {
      const isOverLimit = (selectedCustomer.outstandingBalance + totals.total) > selectedCustomer.creditLimit;
      const overdueOrders = db.getOrders().filter(o => 
        o.customerId === selectedCustomer.id && 
        new Date(o.dueDate) < new Date() && 
        o.status !== 'Paid'
      );

      if ((isOverLimit || overdueOrders.length > 0) && !isOverrideActive) {
        setShowCreditWarning(true);
        return;
      }
    }

    setShowConfirmModal(true);
  };

  const finalizeCheckout = () => {
    if (!selectedCustomer) return;

    const dueDate = new Date();
    if (paymentType === 'Credit') {
      dueDate.setDate(dueDate.getDate() + selectedCustomer.defaultCreditDays);
    }

    const newOrder: Order = {
      id: `ORD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      date: new Date().toISOString().split('T')[0],
      items: [...cart],
      subtotal: totals.subtotal,
      vat: totals.vat,
      total: totals.total,
      paymentType,
      status: paymentType === 'Cash' ? 'Paid' : 'Pending',
      dueDate: dueDate.toISOString().split('T')[0],
      amountPaid: paymentType === 'Cash' ? totals.total : 0,
    };

    db.createOrder(newOrder);
    setLastOrder(newOrder);
    setCart([]);
    setSelectedCustomer(null);
    setIsOverrideActive(false);
    setShowConfirmModal(false);
  };

  const resetPOS = () => {
    setLastOrder(null);
    setPaymentType('Cash');
    setCart([]);
    setSelectedCustomer(null);
    setIsOverrideActive(false);
  };

  const navigateToHistory = () => {
    resetPOS();
    if (setActiveTab) setActiveTab('orders');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-160px)]">
      {/* Product Selection Area */}
      <div className="flex-1 flex flex-col bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden order-2 lg:order-1">
        <div className="p-6 md:p-8 border-b border-slate-50 bg-slate-50/30">
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search catalogue..." 
              className="w-full pl-16 pr-6 py-5 bg-white border border-slate-200 rounded-3xl focus:ring-4 focus:ring-brand-gold/10 focus:border-brand-gold outline-none transition-all font-bold text-slate-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 md:p-8 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 scrollbar-hide">
          {filteredProducts.map(p => (
            <button 
              key={p.id}
              onClick={() => addToCart(p)}
              className="flex flex-col text-left bg-white border border-slate-100 p-2.5 rounded-[32px] hover:border-brand-gold hover:shadow-2xl hover:shadow-brand-gold/5 transition-all active:scale-95 group"
            >
              <div className="relative aspect-square rounded-[24px] overflow-hidden bg-slate-50 mb-4">
                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className={`absolute bottom-3 right-3 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl ${
                  p.stockQuantity < 50 ? 'bg-rose-500 text-white' : 'bg-brand-dark/90 text-white'
                }`}>
                  {p.stockQuantity} UNIT
                </div>
              </div>
              <div className="px-2 pb-2">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest truncate">{p.category}</h4>
                <h4 className="text-sm font-bold text-slate-900 truncate mt-0.5">{p.name}</h4>
                <p className="text-lg font-black text-brand-gold mt-2">{db.formatMoney(p.sellingPrice)}</p>
              </div>
            </button>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-32 text-center opacity-20">
              <Package size={64} className="mx-auto mb-6" />
              <p className="font-black uppercase tracking-widest text-sm">No items matching criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Sidebar */}
      <div className="w-full lg:w-[420px] flex flex-col bg-brand-dark rounded-[40px] overflow-hidden text-white shadow-2xl order-1 lg:order-2 flex-shrink-0">
        <div className="p-8 border-b border-white/5 bg-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black uppercase tracking-tight italic">Checkout <span className="text-brand-gold">Queue</span></h3>
            <div className="w-10 h-10 bg-brand-gold rounded-xl flex items-center justify-center text-brand-dark font-black text-xs">
              {cart.reduce((a,b) => a + b.quantity, 0)}
            </div>
          </div>
        </div>

        <div className="p-8 space-y-5">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] ml-2">Assigned Client</label>
            <select 
              className="w-full py-5 px-6 bg-white/5 border border-white/10 rounded-3xl appearance-none outline-none font-bold text-white focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/5 transition-all cursor-pointer text-sm"
              value={selectedCustomer?.id || ''}
              onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value) || null)}
            >
              <option value="" className="bg-brand-dark">Unassigned...</option>
              {customers.map(c => <option key={c.id} value={c.id} className="bg-brand-dark">{c.name}</option>)}
            </select>
          </div>

          {selectedCustomer && (
            <div className="p-5 rounded-3xl bg-white/5 border border-white/10">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Credit Health</span>
                <span className={`text-[10px] font-black ${creditUsagePercent > 100 ? 'text-rose-400' : 'text-brand-gold'}`}>
                  {creditUsagePercent.toFixed(0)}% Capacity
                </span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${creditUsagePercent > 100 ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'bg-brand-gold shadow-[0_0_15px_rgba(197,160,40,0.4)]'}`} style={{width: `${Math.min(100, creditUsagePercent)}%`}} />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-8 space-y-4 min-h-[200px] lg:min-h-0 py-2 scrollbar-hide">
          {cart.map(item => (
            <div key={item.productId} className="flex items-center justify-between bg-white/5 p-4 rounded-3xl border border-white/5 group hover:border-white/20 transition-all">
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-xs font-black truncate text-white/90">{item.productName}</p>
                <p className="text-[10px] text-gray-500 font-bold mt-0.5">{db.formatMoney(item.price)} per unit</p>
              </div>
              <div className="flex items-center space-x-3 bg-brand-dark/40 p-1 rounded-2xl border border-white/10">
                <button onClick={() => updateQty(item.productId, -1)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 text-brand-gold transition-colors"><Minus size={14} /></button>
                <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                <button onClick={() => updateQty(item.productId, 1)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 text-brand-gold transition-colors"><Plus size={14} /></button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-20 py-16">
              <div className="w-20 h-20 bg-white/5 rounded-[32px] flex items-center justify-center mb-6">
                 <ShoppingCart size={32} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em]">Inventory Awaiting</p>
            </div>
          )}
        </div>

        <div className="p-10 bg-black/40 border-t border-white/5 mt-auto">
          <div className="space-y-3 mb-8">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
              <span>Subtotal</span>
              <span className="text-white">{db.formatMoney(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
              <span>VAT (5.0%)</span>
              <span className="text-white">{db.formatMoney(totals.vat)}</span>
            </div>
            <div className="flex justify-between items-end pt-4 border-t border-white/5">
              <span className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Total Payable</span>
              <span className="text-3xl font-black text-brand-gold tracking-tighter">{db.formatMoney(totals.total)}</span>
            </div>
          </div>

          <div className="flex gap-3 mb-8">
            <button 
              onClick={() => setPaymentType('Cash')}
              className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${paymentType === 'Cash' ? 'bg-brand-gold text-brand-dark border-brand-gold shadow-lg shadow-brand-gold/20' : 'border-white/10 text-gray-500 hover:text-white'}`}
            >
              Cash Transaction
            </button>
            <button 
              onClick={() => setPaymentType('Credit')}
              className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${paymentType === 'Credit' ? 'bg-brand-gold text-brand-dark border-brand-gold shadow-lg shadow-brand-gold/20' : 'border-white/10 text-gray-500 hover:text-white'}`}
            >
              Credit Ledger
            </button>
          </div>

          <button 
            disabled={!selectedCustomer || cart.length === 0}
            onClick={handleCheckoutInitiate}
            className="w-full py-6 bg-white text-brand-dark rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-brand-gold transition-all disabled:opacity-10 active:scale-[0.98] flex items-center justify-center space-x-3 shadow-2xl"
          >
            <span>Process Intelligence</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>

      {/* Overlays / Modals */}
      {showCreditWarning && (
        <div className="fixed inset-0 z-[110] bg-brand-dark/95 backdrop-blur-2xl flex items-center justify-center p-6">
          <div className="bg-white rounded-[48px] max-w-lg w-full p-12 text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-24 h-24 bg-rose-50 flex items-center justify-center mx-auto mb-10 rounded-[32px] text-rose-500 shadow-inner">
              <AlertCircle size={48} />
            </div>
            <h3 className="text-3xl font-black text-brand-dark mb-4 uppercase tracking-tighter italic">Risk Parameters <span className="text-rose-500">Exceeded</span></h3>
            <p className="text-slate-500 mb-10 text-lg font-medium leading-relaxed italic">Customer has insufficient credit capacity or overdue accounts. Administrator authorization required to proceed.</p>
            <div className="space-y-4">
              <button onClick={() => { setIsOverrideActive(true); setShowCreditWarning(false); setShowConfirmModal(true); }} className="w-full py-5 bg-brand-dark text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center space-x-3 shadow-2xl hover:bg-black transition-colors">
                <ShieldCheck size={20} className="text-brand-gold" /> <span>Administrative Override</span>
              </button>
              <button onClick={() => setShowCreditWarning(false)} className="w-full py-5 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Abort Transaction</button>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Operational Verification">
        <div className="space-y-8">
          <div className="bg-brand-linen/40 p-8 rounded-[40px] border border-brand-linen/60">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Validation Ledger</span>
              <Badge color={paymentType === 'Cash' ? 'emerald' : 'gold'}>{paymentType} Basis</Badge>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Authorized To:</span>
              <span className="text-2xl font-black text-brand-dark tracking-tighter italic">{selectedCustomer?.name}</span>
            </div>
            <div className="mt-8 pt-6 border-t border-brand-linen flex justify-between items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Invoice</span>
              <span className="text-3xl font-black text-brand-gold tracking-tighter">{db.formatMoney(totals.total)}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" size="lg" className="flex-1 rounded-3xl" onClick={() => setShowConfirmModal(false)}>Audit Selection</Button>
            <Button size="lg" className="flex-1 rounded-3xl" onClick={finalizeCheckout}>Execute Sale</Button>
          </div>
        </div>
      </Modal>

      {lastOrder && (
        <div className="fixed inset-0 z-[120] bg-brand-dark/98 backdrop-blur-3xl flex items-center justify-center p-6">
          <div className="bg-white rounded-[56px] max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="bg-emerald-500 p-12 text-center text-white relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 font-black text-9xl italic">OK</div>
              <div className="w-20 h-20 bg-white rounded-[28px] flex items-center justify-center mx-auto mb-8 shadow-2xl relative z-10">
                <CheckCircle2 size={40} className="text-emerald-500" />
              </div>
              <h3 className="text-3xl font-black uppercase tracking-tight italic relative z-10">Transmission <span className="text-black/20">Complete</span></h3>
              <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.5em] mt-3 relative z-10">{lastOrder.id}</p>
            </div>
            <div className="p-12 space-y-5">
              <Button size="lg" className="w-full py-6 rounded-3xl text-sm" onClick={resetPOS}>Next Transaction</Button>
              <div className="flex gap-3">
                 <Button variant="outline" size="md" className="flex-1 rounded-2xl text-[9px]" onClick={() => window.print()} icon={<Printer size={18} />}>Print Invoice</Button>
                 <Button variant="secondary" size="md" className="flex-1 rounded-2xl text-[9px]" onClick={navigateToHistory} icon={<History size={18} />}>Review History</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
