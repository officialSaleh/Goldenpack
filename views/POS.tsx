
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ShoppingCart, Plus, Minus, AlertCircle, Package, CheckCircle2, ArrowRight, Printer, X, ChevronUp
} from 'lucide-react';
import { db } from '../services/mockData';
import { Product, OrderItem, Customer, Order } from '../types';
import { VAT_RATE } from '../constants';
import { Modal, Button, Badge } from '../components/UI';

export const POS: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentType, setPaymentType] = useState<'Cash' | 'Credit'>('Cash');
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [isOverrideActive, setIsOverrideActive] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [, setTick] = useState(0);
  useEffect(() => db.subscribe(() => setTick(t => t + 1)), []);

  const products = db.getProducts();
  const customers = db.getCustomers();

  const filteredProducts = useMemo(() => 
    products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [products, searchTerm]
  );

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stockQuantity) return;
      setCart(cart.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      if (product.stockQuantity <= 0) return;
      setCart([...cart, { productId: product.id, productName: product.name, quantity: 1, price: product.sellingPrice }]);
    }
  };

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.productId === id) {
        const p = products.find(prod => prod.id === id);
        const newQty = Math.max(0, item.quantity + delta);
        if (p && newQty > p.stockQuantity) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(i => i.quantity > 0));
  };

  const handleManualQtyChange = (id: string, value: string) => {
    const numericValue = parseInt(value);
    // Allow empty string or zero momentarily while typing
    if (value === '' || isNaN(numericValue)) {
       setCart(cart.map(item => item.productId === id ? { ...item, quantity: 0 } : item));
       return;
    }

    const p = products.find(prod => prod.id === id);
    if (!p) return;

    const validatedQty = Math.min(Math.max(0, numericValue), p.stockQuantity);
    setCart(cart.map(item => 
      item.productId === id ? { ...item, quantity: validatedQty } : item
    ));
  };

  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const vat = subtotal * VAT_RATE;
    return { subtotal, vat, total: subtotal + vat };
  }, [cart]);

  const handleCheckoutInitiate = () => {
    if (!selectedCustomer || cart.length === 0) return;
    if (paymentType === 'Credit') {
      const isOver = (selectedCustomer.outstandingBalance + totals.total) > selectedCustomer.creditLimit;
      if (isOver && !isOverrideActive) { setShowCreditWarning(true); return; }
    }
    setShowConfirmModal(true);
  };

  const finalizeCheckout = async () => {
    if (!selectedCustomer) return;
    setLoading(true);
    try {
      const order: Order = {
        id: `ORD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        date: new Date().toISOString().split('T')[0],
        items: cart.filter(i => i.quantity > 0),
        ...totals,
        paymentType,
        status: paymentType === 'Cash' ? 'Paid' : 'Pending',
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        amountPaid: paymentType === 'Cash' ? totals.total : 0,
      };
      await db.createOrder(order);
      setLastOrder(order);
      setCart([]);
      setSelectedCustomer(null);
      setIsCartOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-160px)] lg:h-full relative overflow-hidden">
      {/* Product Area */}
      <div className="flex-1 flex flex-col bg-white rounded-3xl lg:rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex items-center space-x-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search catalogue..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-gold/10 focus:border-brand-gold outline-none transition-all font-bold text-slate-900 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Badge color="gold" className="hidden sm:inline-flex">{filteredProducts.length} Items</Badge>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 scrollbar-hide">
          {filteredProducts.map(p => (
            <button 
              key={p.id}
              onClick={() => addToCart(p)}
              disabled={p.stockQuantity <= 0}
              className={`flex flex-col text-left bg-white border border-slate-100 p-3 lg:p-4 rounded-2xl lg:rounded-3xl transition-all active:scale-95 group relative overflow-hidden ${p.stockQuantity <= 0 ? 'opacity-40 grayscale' : 'hover:border-brand-gold hover:shadow-lg'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className={`p-1.5 rounded-lg ${p.category === 'Bottle' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                  <Package size={14} />
                </div>
                <span className={`text-[8px] font-black uppercase tracking-widest ${p.stockQuantity < 50 ? 'text-rose-500' : 'text-slate-400'}`}>
                   {p.stockQuantity} Left
                </span>
              </div>
              <h4 className="text-[11px] font-bold text-slate-900 line-clamp-2 leading-tight h-8 mb-2">{p.name}</h4>
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50/50">
                <p className="text-xs font-black text-brand-gold">{db.formatMoney(p.sellingPrice)}</p>
                <div className="w-6 h-6 rounded-lg bg-brand-gold/10 flex items-center justify-center text-brand-gold group-hover:bg-brand-gold group-hover:text-white transition-all">
                  <Plus size={14} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart Sidebar / Drawer */}
      <div className={`
        fixed inset-0 z-50 transition-transform duration-500 transform lg:relative lg:translate-y-0 lg:z-0 lg:w-[400px] lg:flex
        ${isCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
      `}>
        <div className="absolute inset-0 bg-brand-dark/60 backdrop-blur-sm lg:hidden" onClick={() => setIsCartOpen(false)} />
        <div className="absolute bottom-0 left-0 right-0 h-[92vh] lg:h-full bg-brand-dark rounded-t-[40px] lg:rounded-[40px] flex flex-col shadow-2xl overflow-hidden border-t lg:border-t-0 border-white/5">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
            <h3 className="text-lg font-black text-white italic uppercase tracking-tight">Checkout <span className="text-brand-gold">Flow</span></h3>
            <button onClick={() => setIsCartOpen(false)} className="lg:hidden p-2 text-white/40 hover:text-white bg-white/5 rounded-full"><X size={24} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Assign Client</label>
              <select 
                className="w-full py-4 px-5 bg-white/5 border border-white/10 rounded-2xl outline-none font-bold text-white focus:border-brand-gold transition-all text-sm appearance-none cursor-pointer"
                value={selectedCustomer?.id || ''}
                onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value) || null)}
              >
                <option value="" className="bg-brand-dark">Search Customers...</option>
                {customers.map(c => <option key={c.id} value={c.id} className="bg-brand-dark">{c.name} ({c.businessName})</option>)}
              </select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                 <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Selected Items</h4>
                 <button onClick={() => setCart([])} className="text-[10px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-300">Clear</button>
              </div>
              
              {cart.map(item => (
                <div key={item.productId} className="flex items-center justify-between bg-white/5 p-4 rounded-3xl border border-white/5 group">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-bold text-white truncate leading-tight mb-1">{item.productName}</p>
                    <p className="text-xs font-black text-brand-gold">{db.formatMoney(item.price)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => updateQty(item.productId, -1)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-brand-gold hover:bg-white/10 transition-colors"><Minus size={14} /></button>
                    <div className="relative group/input">
                      <input 
                        type="number"
                        inputMode="numeric"
                        className="w-14 h-10 bg-white/10 text-sm font-black text-white text-center rounded-xl border border-white/10 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 outline-none transition-all"
                        value={item.quantity === 0 ? '' : item.quantity}
                        onChange={(e) => handleManualQtyChange(item.productId, e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <button onClick={() => updateQty(item.productId, 1)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-brand-gold hover:bg-white/10 transition-colors"><Plus size={14} /></button>
                  </div>
                </div>
              ))}
              
              {cart.length === 0 && (
                <div className="py-20 text-center opacity-20 flex flex-col items-center">
                  <ShoppingCart size={40} className="mb-4 text-white" />
                  <p className="text-xs font-black text-white uppercase tracking-[0.3em]">Operational Queue Empty</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-black/40 border-t border-white/10 space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between text-[11px] font-black text-gray-500 uppercase tracking-[0.2em]">
                <span>Net Subtotal</span>
                <span className="text-white">{db.formatMoney(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-black text-brand-gold uppercase tracking-[0.3em] italic">Payable Total</span>
                <span className="text-3xl font-black text-brand-gold tracking-tighter">{db.formatMoney(totals.total)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setPaymentType('Cash')} 
                className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${paymentType === 'Cash' ? 'bg-brand-gold text-brand-dark border-brand-gold shadow-lg shadow-brand-gold/20' : 'border-white/5 text-gray-500 hover:border-white/20'}`}
              >
                Cash Basis
              </button>
              <button 
                onClick={() => setPaymentType('Credit')} 
                className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${paymentType === 'Credit' ? 'bg-brand-gold text-brand-dark border-brand-gold shadow-lg shadow-brand-gold/20' : 'border-white/5 text-gray-500 hover:border-white/20'}`}
              >
                Credit Ledger
              </button>
            </div>

            <button 
              disabled={!selectedCustomer || cart.length === 0 || loading}
              onClick={handleCheckoutInitiate}
              className="w-full py-5 bg-white text-brand-dark rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-brand-gold transition-all disabled:opacity-10 active:scale-[0.98] flex items-center justify-center space-x-3 group"
            >
              <span>Authorize Sale</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bar - Visual feedback of cart contents */}
      {cart.length > 0 && !isCartOpen && (
        <div className="lg:hidden fixed bottom-8 left-6 right-6 z-40 animate-in slide-in-from-bottom-10">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-brand-gold text-brand-dark p-4 rounded-3xl shadow-2xl flex items-center justify-between font-black uppercase tracking-widest italic active:scale-95 transition-transform"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-brand-dark text-brand-gold w-10 h-10 rounded-2xl flex items-center justify-center text-sm shadow-inner">
                {cart.reduce((a,b) => a + (Number(b.quantity) || 0), 0)}
              </div>
              <div className="text-left">
                <p className="text-[10px] leading-none mb-1 opacity-70">Review Transaction</p>
                <p className="text-xs">Checkout</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-lg tracking-tighter">{db.formatMoney(totals.total)}</span>
              <div className="bg-brand-dark/10 p-1.5 rounded-full"><ChevronUp size={20} /></div>
            </div>
          </button>
        </div>
      )}

      {/* Modals & Alerts */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Sale Validation">
        <div className="space-y-6">
          <div className="bg-brand-bg p-8 rounded-[32px] border border-brand-linen text-center md:text-left">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Entity Verification</p>
            <h4 className="text-2xl font-black text-brand-dark italic uppercase tracking-tight">{selectedCustomer?.name}</h4>
            <p className="text-xs font-bold text-gray-500 mt-1">{selectedCustomer?.businessName}</p>
            
            <div className="mt-8 pt-8 border-t border-brand-linen flex flex-col md:flex-row justify-between items-center md:items-end gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Valuation</span>
              <span className="text-3xl font-black text-brand-gold tracking-tighter">{db.formatMoney(totals.total)}</span>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <Button variant="outline" size="lg" className="w-full md:flex-1" onClick={() => setShowConfirmModal(false)}>Back</Button>
            <Button size="lg" className="w-full md:flex-1" onClick={finalizeCheckout} disabled={loading}>Execute Order</Button>
          </div>
        </div>
      </Modal>

      {lastOrder && (
        <div className="fixed inset-0 z-[120] bg-brand-dark/95 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-white max-w-sm w-full rounded-[48px] p-10 text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <CheckCircle2 size={56} />
            </div>
            <h3 className="text-3xl font-black text-brand-dark mb-2 italic">Success</h3>
            <p className="text-slate-500 text-sm mb-10 leading-relaxed px-4">Verification passed. Transmission ID:<br/><span className="font-bold text-brand-gold">{lastOrder.id}</span></p>
            <div className="space-y-3">
              <Button icon={<Printer size={20} />} className="w-full py-5" onClick={() => window.print()}>Print Receipt</Button>
              <Button variant="outline" className="w-full py-5" onClick={() => setLastOrder(null)}>Next Sale</Button>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="fixed top-24 lg:top-10 left-1/2 -translate-x-1/2 z-[200] bg-rose-600 text-white px-8 py-4 rounded-full shadow-2xl font-black uppercase tracking-widest text-[10px] flex items-center space-x-4 animate-in slide-in-from-top-10">
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-2 hover:opacity-50 bg-white/20 p-1.5 rounded-full"><X size={16}/></button>
        </div>
      )}
    </div>
  );
};
