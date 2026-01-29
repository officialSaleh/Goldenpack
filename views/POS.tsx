
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, ShoppingCart, Plus, Minus, AlertCircle, Package, CheckCircle2, ArrowRight, Printer, X, ChevronUp
} from 'lucide-react';
import { db } from '../services/mockData';
import { Product, OrderItem, Customer, Order } from '../types';
import { VAT_RATE } from '../constants';
import { Modal, Button, Badge, Card } from '../components/UI';

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
        items: [...cart],
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
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-120px)] lg:h-full relative overflow-hidden">
      {/* Product Area */}
      <div className="flex-1 flex flex-col bg-white rounded-[24px] lg:rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex items-center space-x-4">
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
                  STOCK: {p.stockQuantity}
                </span>
              </div>
              <h4 className="text-[10px] font-bold text-slate-900 line-clamp-2 leading-tight h-8 mb-2">{p.name}</h4>
              <div className="flex items-center justify-between mt-auto">
                <p className="text-xs font-black text-brand-gold">{db.formatMoney(p.sellingPrice)}</p>
                <div className="w-6 h-6 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold group-hover:bg-brand-gold group-hover:text-white transition-all">
                  <Plus size={12} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Sidebar / Mobile Drawer Overlay */}
      <div className={`
        fixed inset-0 z-50 transition-transform duration-500 transform lg:relative lg:translate-y-0 lg:z-0 lg:w-[380px] lg:flex
        ${isCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
      `}>
        <div className="absolute inset-0 bg-black/40 lg:hidden" onClick={() => setIsCartOpen(false)} />
        <div className="absolute bottom-0 left-0 right-0 h-[90vh] lg:h-full bg-brand-dark rounded-t-[32px] lg:rounded-[40px] flex flex-col shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-lg font-black text-white italic uppercase tracking-tight">Checkout <span className="text-brand-gold">Flow</span></h3>
            <button onClick={() => setIsCartOpen(false)} className="lg:hidden p-2 text-white/40 hover:text-white"><X size={24} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            <div className="space-y-2">
              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-1">Client Authorization</label>
              <select 
                className="w-full py-4 px-4 bg-white/5 border border-white/10 rounded-2xl outline-none font-bold text-white focus:border-brand-gold transition-all text-sm"
                value={selectedCustomer?.id || ''}
                onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value) || null)}
              >
                <option value="" className="bg-brand-dark">Unassigned...</option>
                {customers.map(c => <option key={c.id} value={c.id} className="bg-brand-dark">{c.name}</option>)}
              </select>
            </div>

            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.productId} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-xs font-bold text-white truncate">{item.productName}</p>
                    <p className="text-[10px] text-brand-gold mt-1">{db.formatMoney(item.price)}</p>
                  </div>
                  <div className="flex items-center space-x-3 bg-brand-dark/50 p-1.5 rounded-xl border border-white/5">
                    <button onClick={() => updateQty(item.productId, -1)} className="text-brand-gold hover:scale-110"><Minus size={14} /></button>
                    <span className="text-xs font-black text-white w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.productId, 1)} className="text-brand-gold hover:scale-110"><Plus size={14} /></button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && <p className="text-center py-10 text-white/20 text-xs font-black uppercase tracking-widest">Cart is empty</p>}
            </div>
          </div>

          <div className="p-6 bg-black/40 border-t border-white/5">
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest">
                <span>Subtotal</span>
                <span className="text-white">{db.formatMoney(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-lg font-black text-brand-gold">
                <span className="uppercase tracking-tight italic">Net Total</span>
                <span>{db.formatMoney(totals.total)}</span>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <button onClick={() => setPaymentType('Cash')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${paymentType === 'Cash' ? 'bg-brand-gold text-brand-dark border-brand-gold' : 'border-white/10 text-gray-500'}`}>Cash</button>
              <button onClick={() => setPaymentType('Credit')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${paymentType === 'Credit' ? 'bg-brand-gold text-brand-dark border-brand-gold' : 'border-white/10 text-gray-500'}`}>Credit</button>
            </div>

            <Button 
              className="w-full py-5 rounded-2xl" 
              disabled={!selectedCustomer || cart.length === 0 || loading}
              onClick={handleCheckoutInitiate}
            >
              Execute Transaction
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bar */}
      {cart.length > 0 && !isCartOpen && (
        <div className="lg:hidden fixed bottom-6 left-6 right-6 z-40 animate-in slide-in-from-bottom-10">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-brand-gold text-brand-dark p-4 rounded-3xl shadow-2xl flex items-center justify-between font-black uppercase tracking-widest italic active:scale-95 transition-transform"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-brand-dark text-brand-gold w-8 h-8 rounded-xl flex items-center justify-center text-xs">
                {cart.reduce((a,b) => a + b.quantity, 0)}
              </div>
              <span className="text-xs">View Cart</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm">{db.formatMoney(totals.total)}</span>
              <ChevronUp size={18} />
            </div>
          </button>
        </div>
      )}

      {/* Confirmation Modals */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Final Validation">
        <div className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Authorized Entity</p>
            <p className="text-xl font-black text-brand-dark italic uppercase">{selectedCustomer?.name}</p>
            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-end">
              <span className="text-xs font-bold text-slate-400">VALUATION:</span>
              <span className="text-2xl font-black text-brand-gold">{db.formatMoney(totals.total)}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowConfirmModal(false)}>Audit</Button>
            <Button className="flex-1" onClick={finalizeCheckout} disabled={loading}>Confirm Sale</Button>
          </div>
        </div>
      </Modal>

      {lastOrder && (
        <div className="fixed inset-0 z-[100] bg-brand-dark/95 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-white max-w-sm w-full rounded-[40px] p-10 text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="text-2xl font-black text-brand-dark mb-2">Verified</h3>
            <p className="text-slate-500 text-sm mb-8">Transmission complete. Order ID: <span className="font-bold text-brand-gold">{lastOrder.id}</span></p>
            <div className="grid grid-cols-1 gap-3">
              <Button icon={<Printer size={18} />} onClick={() => window.print()}>Print Receipt</Button>
              <Button variant="outline" onClick={() => setLastOrder(null)}>Next Transaction</Button>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] bg-rose-600 text-white px-6 py-4 rounded-full shadow-2xl font-black uppercase tracking-widest text-[10px] flex items-center space-x-3">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-2 hover:opacity-50"><X size={16}/></button>
        </div>
      )}
    </div>
  );
};
