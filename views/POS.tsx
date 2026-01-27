
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
      <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden order-2 lg:order-1">
        <div className="p-4 md:p-6 border-b border-slate-50 bg-slate-50/30">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search inventory..." 
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 scrollbar-hide">
          {filteredProducts.map(p => (
            <button 
              key={p.id}
              onClick={() => addToCart(p)}
              className="flex flex-col text-left bg-white border border-slate-100 p-2 rounded-2xl hover:border-brand-gold hover:shadow-lg transition-all active:scale-95"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-50 mb-2">
                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                <div className={`absolute bottom-2 right-2 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                  p.stockQuantity < 50 ? 'bg-rose-500 text-white' : 'bg-brand-dark/80 text-white'
                }`}>
                  {p.stockQuantity}
                </div>
              </div>
              <h4 className="text-xs font-bold text-slate-900 truncate px-1">{p.name}</h4>
              <p className="text-sm font-black text-brand-gold px-1 mt-1">{db.formatMoney(p.sellingPrice)}</p>
            </button>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-20 text-center opacity-30">
              <Package size={48} className="mx-auto mb-4" />
              <p className="font-bold">No products matching search</p>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Sidebar */}
      <div className="w-full lg:w-[400px] flex flex-col bg-brand-dark rounded-3xl overflow-hidden text-white shadow-xl order-1 lg:order-2 flex-shrink-0">
        <div className="p-6 border-b border-white/5 bg-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black uppercase tracking-tight italic">Transaction</h3>
            <Badge color="gold">{cart.length} items</Badge>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <select 
            className="w-full py-4 px-4 bg-white/5 border border-white/10 rounded-2xl appearance-none outline-none font-bold text-white focus:border-brand-gold transition-all cursor-pointer text-sm"
            value={selectedCustomer?.id || ''}
            onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value) || null)}
          >
            <option value="" className="bg-brand-dark">Assign Customer...</option>
            {customers.map(c => <option key={c.id} value={c.id} className="bg-brand-dark">{c.name}</option>)}
          </select>

          {selectedCustomer && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-[10px]">
              <div className="flex justify-between items-center mb-2">
                <span className="font-black text-slate-500 uppercase tracking-widest">Credit Health</span>
                <span className={creditUsagePercent > 100 ? 'text-rose-400' : 'text-emerald-400'}>
                  {creditUsagePercent.toFixed(0)}% Used
                </span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${creditUsagePercent > 100 ? 'bg-rose-500' : 'bg-brand-gold'}`} style={{width: `${Math.min(100, creditUsagePercent)}%`}} />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 space-y-3 min-h-[200px] lg:min-h-0 py-2">
          {cart.map(item => (
            <div key={item.productId} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-xs font-bold truncate">{item.productName}</p>
                <p className="text-[10px] text-slate-500">{db.formatMoney(item.price)}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => updateQty(item.productId, -1)} className="p-1 hover:text-brand-gold"><Minus size={14} /></button>
                <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                <button onClick={() => updateQty(item.productId, 1)} className="p-1 hover:text-brand-gold"><Plus size={14} /></button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
              <ShoppingCart size={40} className="mb-4" />
              <p className="text-xs font-black uppercase tracking-widest">Cart Empty</p>
            </div>
          )}
        </div>

        <div className="p-8 bg-black/40 border-t border-white/10 mt-auto">
          <div className="space-y-2 mb-6 text-xs">
            <div className="flex justify-between opacity-50">
              <span>Subtotal</span>
              <span>{db.formatMoney(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between font-black text-brand-gold text-lg pt-2">
              <span className="uppercase tracking-widest">Total</span>
              <span>{db.formatMoney(totals.total)}</span>
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            <button 
              onClick={() => setPaymentType('Cash')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${paymentType === 'Cash' ? 'bg-brand-gold text-brand-dark border-brand-gold' : 'border-white/10 text-slate-500'}`}
            >
              Cash
            </button>
            <button 
              onClick={() => setPaymentType('Credit')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${paymentType === 'Credit' ? 'bg-brand-gold text-brand-dark border-brand-gold' : 'border-white/10 text-slate-500'}`}
            >
              Credit
            </button>
          </div>

          <button 
            disabled={!selectedCustomer || cart.length === 0}
            onClick={handleCheckoutInitiate}
            className="w-full py-5 bg-white text-brand-dark rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-brand-gold transition-colors disabled:opacity-20 flex items-center justify-center space-x-2"
          >
            <span>Complete Sale</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Modals remain same, ensuring responsive padding in UI.tsx */}
      {showCreditWarning && (
        <div className="fixed inset-0 z-[110] bg-brand-dark/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-6">
          <div className="bg-white rounded-[32px] max-w-md w-full p-8 md:p-12 text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-20 h-20 bg-rose-50 flex items-center justify-center mx-auto mb-8 rounded-3xl">
              <AlertCircle size={40} className="text-rose-500" />
            </div>
            <h3 className="text-2xl font-black text-brand-dark mb-4 uppercase tracking-tighter italic">Credit Limit Alert</h3>
            <p className="text-slate-500 mb-8 text-sm font-medium">Customer has insufficient credit capacity. Do you wish to proceed with an administrator override?</p>
            <div className="space-y-3">
              <button onClick={() => { setIsOverrideActive(true); setShowCreditWarning(false); setShowConfirmModal(true); }} className="w-full py-4 bg-brand-dark text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2">
                <ShieldCheck size={18} /> <span>Admin Override</span>
              </button>
              <button onClick={() => setShowCreditWarning(false)} className="w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest">Cancel Transaction</button>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Confirm Sale">
        <div className="space-y-6">
          <div className="bg-brand-linen/40 p-6 rounded-3xl border border-brand-linen">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sale Details</span>
              <Badge color={paymentType === 'Cash' ? 'emerald' : 'gold'}>{paymentType}</Badge>
            </div>
            <div className="flex justify-between text-lg font-black text-brand-dark">
              <span>{selectedCustomer?.name}</span>
              <span className="text-brand-gold">{db.formatMoney(totals.total)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowConfirmModal(false)}>Review</Button>
            <Button className="flex-1" onClick={finalizeCheckout}>Confirm Sale</Button>
          </div>
        </div>
      </Modal>

      {lastOrder && (
        <div className="fixed inset-0 z-[120] bg-brand-dark/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-emerald-500 p-10 text-center text-white">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight italic">Success!</h3>
              <p className="text-emerald-100 text-xs font-black uppercase tracking-[0.3em] mt-1">{lastOrder.id}</p>
            </div>
            <div className="p-10 space-y-4">
              <Button className="w-full py-5 rounded-2xl" onClick={resetPOS}>New Transaction</Button>
              <div className="flex gap-2">
                 <Button variant="outline" className="flex-1 text-[10px]" onClick={() => window.print()} icon={<Printer size={16} />}>Receipt</Button>
                 <Button variant="secondary" className="flex-1 text-[10px]" onClick={navigateToHistory} icon={<History size={16} />}>History</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
