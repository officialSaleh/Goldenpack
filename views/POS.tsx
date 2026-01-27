import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ShoppingCart, 
  UserPlus, 
  CreditCard, 
  Wallet, 
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
  Info,
  AlertTriangle,
  History,
  Printer
} from 'lucide-react';
import { db } from '../services/mockData';
import { Product, OrderItem, Customer, Order, OrderStatus } from '../types';
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
    <div className="h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-8">
      {/* Product Selection Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/30">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={24} />
            <input 
              type="text" 
              placeholder="Search products by name or category..." 
              className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-3xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-lg font-medium placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 scrollbar-hide">
          {filteredProducts.map(p => (
            <button 
              key={p.id}
              onClick={() => addToCart(p)}
              className="flex flex-col text-left group bg-white border border-slate-100 p-3 rounded-3xl hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all active:scale-95"
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-50 mb-4">
                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
                  p.stockQuantity < 50 ? 'bg-rose-50 text-white' : 'bg-white/90 text-slate-900'
                }`}>
                  {p.stockQuantity} in Stock
                </div>
              </div>
              <div className="px-2 pb-2">
                <h4 className="font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">{p.name}</h4>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-bold text-slate-400">{p.category}</span>
                  <span className="text-lg font-black text-slate-900">{db.formatMoney(p.sellingPrice)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart & Checkout Area */}
      <div className="w-full lg:w-[450px] flex flex-col bg-slate-900 rounded-[48px] overflow-hidden text-white shadow-2xl relative">
        <div className="p-8 border-b border-white/5 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-black flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-white">
                <ShoppingCart size={20} />
              </div>
              <span>Checkout</span>
            </h3>
            <Badge color="slate">{cart.length} Items</Badge>
          </div>
        </div>

        {/* Customer Selector */}
        <div className="p-8 space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Customer Account</label>
            <div className="relative group">
              <select 
                className="w-full py-5 px-6 bg-slate-800/50 border border-slate-700/50 rounded-3xl appearance-none outline-none font-bold text-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  setSelectedCustomer(customers.find(c => c.id === e.target.value) || null);
                  setIsOverrideActive(false);
                }}
              >
                <option value="" className="bg-slate-900">Choose Customer...</option>
                {customers.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
              </select>
              <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 rotate-90 pointer-events-none" size={20} />
            </div>
          </div>

          {selectedCustomer && (
            <div className={`p-6 rounded-[32px] border transition-all duration-300 ${
              creditUsagePercent > 100 ? 'bg-rose-500/10 border-rose-500/30' : 
              creditUsagePercent > 80 ? 'bg-amber-500/10 border-amber-500/30' : 
              'bg-white/5 border-white/10'
            }`}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    creditUsagePercent > 100 ? 'bg-rose-500' : 
                    creditUsagePercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  <span className="text-[10px] font-black uppercase text-slate-400">Credit Score</span>
                </div>
                <Badge color={creditUsagePercent > 100 ? 'rose' : creditUsagePercent > 80 ? 'amber' : 'emerald'}>
                  {creditUsagePercent > 100 ? 'LIMIT EXCEEDED' : creditUsagePercent > 80 ? 'NEARING LIMIT' : 'HEALTHY'}
                </Badge>
              </div>
              
              <div className="flex justify-between items-end mb-3">
                <span className={`text-3xl font-black ${creditUsagePercent > 100 ? 'text-rose-400' : 'text-white'}`}>
                  {creditUsagePercent.toFixed(0)}<span className="text-sm opacity-50 ml-1">%</span>
                </span>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Available</p>
                  <p className="font-black text-slate-300">
                    {db.formatMoney(Math.max(0, selectedCustomer.creditLimit - selectedCustomer.outstandingBalance))}
                  </p>
                </div>
              </div>

              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-700 ease-out rounded-full ${
                    creditUsagePercent > 100 ? 'bg-rose-500' : creditUsagePercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, creditUsagePercent)}%` }}
                />
              </div>
              {creditUsagePercent > 100 && (
                <div className="mt-4 flex items-center space-x-2 text-rose-400">
                  <AlertTriangle size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Transaction Blocked</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto px-8 space-y-5 scrollbar-hide py-4">
          {cart.map(item => (
            <div key={item.productId} className="flex items-center space-x-4 bg-white/5 p-4 rounded-3xl border border-white/5 group hover:bg-white/10 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate text-white">{item.productName}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{db.formatMoney(item.price)} / pc</p>
              </div>
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-lg">
                <button onClick={() => updateQty(item.productId, -1)} className="p-2.5 hover:bg-indigo-600 transition-colors"><Minus size={12} /></button>
                <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                <button onClick={() => updateQty(item.productId, 1)} className="p-2.5 hover:bg-indigo-600 transition-colors"><Plus size={12} /></button>
              </div>
              <div className="w-24 text-right">
                <p className="text-sm font-black text-indigo-400">{db.formatMoney(item.price * item.quantity)}</p>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-20 py-16">
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <Package size={48} />
              </div>
              <p className="text-lg font-black uppercase tracking-widest text-center">Empty Cart</p>
              <p className="text-xs font-medium text-slate-500 mt-2">Add products to start a sale</p>
            </div>
          )}
        </div>

        {/* Summary & Payment Actions */}
        <div className="p-10 bg-black/40 backdrop-blur-2xl border-t border-white/10 rounded-t-[56px] shadow-[0_-20px_40px_rgba(0,0,0,0.3)] mt-auto">
          <div className="space-y-4 mb-8">
            <div className="flex justify-between text-slate-500 font-bold uppercase text-[10px] tracking-widest">
              <span>Subtotal</span>
              <span className="text-slate-300">{db.formatMoney(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500 font-bold uppercase text-[10px] tracking-widest">
              <span>VAT (5.0%)</span>
              <span className="text-slate-300">{db.formatMoney(totals.vat)}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-lg font-black text-white uppercase tracking-wider">Order Total</span>
              <span className="text-3xl font-black text-indigo-400">{db.formatMoney(totals.total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <button 
              onClick={() => setPaymentType('Cash')}
              className={`flex items-center justify-center space-x-3 p-5 rounded-[28px] border-2 transition-all group ${
                paymentType === 'Cash' ? 'border-indigo-500 bg-indigo-500 text-white shadow-xl shadow-indigo-500/20' : 'border-slate-800 text-slate-500 hover:border-slate-600'
              }`}
            >
              <Wallet size={20} className={paymentType === 'Cash' ? 'text-white' : 'group-hover:text-white'} />
              <span className="text-sm font-black uppercase tracking-widest">Cash</span>
            </button>
            <button 
              onClick={() => setPaymentType('Credit')}
              className={`flex items-center justify-center space-x-3 p-5 rounded-[28px] border-2 transition-all group ${
                paymentType === 'Credit' ? 'border-indigo-500 bg-indigo-500 text-white shadow-xl shadow-indigo-500/20' : 'border-slate-800 text-slate-500 hover:border-slate-600'
              }`}
            >
              <CreditCard size={20} className={paymentType === 'Credit' ? 'text-white' : 'group-hover:text-white'} />
              <span className="text-sm font-black uppercase tracking-widest">Credit</span>
            </button>
          </div>

          <button 
            disabled={!selectedCustomer || cart.length === 0}
            onClick={handleCheckoutInitiate}
            className="w-full py-6 bg-white hover:bg-slate-50 disabled:bg-white/10 disabled:text-white/20 disabled:cursor-not-allowed text-slate-900 rounded-[32px] font-black shadow-2xl transition-all flex items-center justify-center space-x-3 group"
          >
            <span className="text-lg uppercase tracking-wider">Finalize Transaction</span>
            <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Credit Warning Modal */}
      {showCreditWarning && (
        <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-white rounded-[56px] max-w-md w-full p-12 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-28 h-28 rounded-[40px] bg-rose-50 flex items-center justify-center mx-auto mb-10 shadow-inner">
              <AlertCircle size={56} className="text-rose-500" />
            </div>
            <h3 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">Limit Exceeded</h3>
            <p className="text-slate-500 mb-10 leading-relaxed font-medium">
              Customer <strong>{selectedCustomer?.name}</strong> has reached their maximum credit allowance. 
              Required Credit: <span className="text-rose-500 font-black">{db.formatMoney(totals.total)}</span>.
            </p>
            
            <div className="space-y-4">
              <button 
                onClick={() => {
                  setIsOverrideActive(true);
                  setShowCreditWarning(false);
                  setShowConfirmModal(true);
                }}
                className="w-full py-5 bg-slate-900 text-white rounded-[28px] font-black flex items-center justify-center space-x-3 shadow-2xl hover:bg-slate-800 transition-all"
              >
                <ShieldCheck size={24} />
                <span>ADMIN OVERRIDE</span>
              </button>
              <button 
                onClick={() => setShowCreditWarning(false)}
                className="w-full py-5 text-slate-400 font-black uppercase tracking-widest hover:text-slate-900 transition-colors"
              >
                Abort Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Confirm Transaction">
        <div className="space-y-8">
          <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 relative overflow-hidden">
             {isOverrideActive && (
               <div className="absolute top-0 right-0 p-4">
                 <Badge color="rose">OVERRIDE ACTIVE</Badge>
               </div>
             )}
            <div className="flex justify-between items-center mb-8">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Order Summary</span>
              <Badge color={paymentType === 'Cash' ? 'emerald' : 'indigo'}>{paymentType} Transaction</Badge>
            </div>
            
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Customer</p>
                  <p className="text-lg font-black text-slate-900">{selectedCustomer?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Items</p>
                  <p className="text-lg font-black text-slate-900">{cart.length}</p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-200/50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Item Breakdown</p>
                {cart.slice(0, 3).map(item => (
                  <div key={item.productId} className="flex justify-between text-sm font-medium text-slate-600">
                    <span>{item.quantity}x {item.productName}</span>
                    <span className="font-bold">{db.formatMoney(item.price * item.quantity)}</span>
                  </div>
                ))}
                {cart.length > 3 && (
                  <p className="text-xs text-indigo-500 font-bold">And {cart.length - 3} more items...</p>
                )}
              </div>

              <div className="h-px bg-slate-200 my-8" />
              
              <div className="flex justify-between items-center">
                <span className="text-xl font-black text-slate-900 uppercase">Grand Total</span>
                <span className="text-3xl font-black text-indigo-600">{db.formatMoney(totals.total)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button variant="outline" className="flex-1 py-5 rounded-3xl" onClick={() => setShowConfirmModal(false)}>Review Cart</Button>
            <Button className="flex-1 py-5 rounded-3xl" onClick={finalizeCheckout}>Place Order</Button>
          </div>
        </div>
      </Modal>

      {/* Success View */}
      {lastOrder && (
        <div className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-6">
          <div className="bg-white rounded-[64px] max-w-lg w-full overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500">
            <div className="bg-emerald-500 p-16 text-center text-white relative">
              <div className="absolute top-6 right-6 text-emerald-300 flex items-center space-x-2">
                <ShieldCheck size={20} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verified Sale</span>
              </div>
              <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-900/40 transform -rotate-6">
                <CheckCircle2 size={56} className="text-emerald-500" />
              </div>
              <h3 className="text-4xl font-black mb-3 tracking-tight">Order Placed!</h3>
              <p className="text-emerald-100 font-medium opacity-90 text-lg uppercase tracking-widest">{lastOrder.id}</p>
            </div>
            
            <div className="p-12 space-y-10">
              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <Receipt className="text-indigo-500" size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Amount Paid</p>
                    <p className="text-2xl font-black text-slate-900">{db.formatMoney(lastOrder.total)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Method</p>
                  <Badge color={lastOrder.paymentType === 'Cash' ? 'emerald' : 'indigo'}>{lastOrder.paymentType}</Badge>
                </div>
              </div>

              <div className="space-y-4">
                <Button 
                  className="w-full py-6 rounded-[32px] text-lg" 
                  onClick={resetPOS} 
                  icon={<Plus size={24} />}
                >
                  NEW TRANSACTION
                </Button>
                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 py-5 rounded-[28px] text-slate-600 font-black uppercase tracking-widest text-xs" 
                    onClick={() => window.print()} 
                    icon={<Printer size={18} />}
                  >
                    PRINT RECEIPT
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="flex-1 py-5 rounded-[28px] font-black uppercase tracking-widest text-xs" 
                    onClick={navigateToHistory}
                    icon={<History size={18} />}
                  >
                    VIEW HISTORY
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};