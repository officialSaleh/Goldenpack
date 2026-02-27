
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ShoppingCart, Plus, Minus, AlertCircle, Package, CheckCircle2, 
  ArrowRight, Printer, X, ChevronUp, Scan, Filter, Layers, Trash2, MapPin,
  AlertTriangle, Info, History, Loader2, Wallet, FileText
} from 'lucide-react';
import { db } from '../services/mockData';
import { Product, OrderItem, Customer, Order, Category, PaymentType } from '../types';
import { VAT_RATE, CATEGORIES } from '../constants';
import { Modal, Button, Badge } from '../components/UI';

export const POS: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>('Cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [vatEnabled, setVatEnabled] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [customerLedger, setCustomerLedger] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Real-time UI refresh trigger
  const [, setTick] = useState(0);
  useEffect(() => db.subscribe(() => setTick(t => t + 1)), []);

  const products = db.getProducts();
  const customers = db.getCustomers();

  // FIX: Real-time Reconciliation Logic
  // Automatically purges items from the cart that no longer exist in the database registry
  useEffect(() => {
    if (cart.length === 0 || products.length === 0) return;
    
    const validProductIds = new Set(products.map(p => p.id));
    const cleanedCart = cart.filter(item => validProductIds.has(item.productId));
    
    if (cleanedCart.length !== cart.length) {
      setCart(cleanedCart);
      setErrorMsg("Operational Sync: Some items were removed from the cart as they no longer exist in the registry.");
    }
  }, [products]);

  const filteredProducts = useMemo(() => 
    products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }),
    [products, searchTerm, selectedCategory]
  );

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stockQuantity) return;
      setCart(cart.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      if (product.stockQuantity <= 0) return;
      setCart([...cart, { 
        productId: product.id, 
        productName: product.name, 
        quantity: 1, 
        price: product.sellingPrice,
        costPrice: product.costPrice
      }]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.productId !== id));
  };

  const updateQty = (id: string, delta: number, absoluteValue?: number) => {
    setCart(cart.map(item => {
      if (item.productId === id) {
        const p = products.find(prod => prod.id === id);
        let newQty = absoluteValue !== undefined ? absoluteValue : item.quantity + delta;
        
        // Validation: Clamp between 0 and stock level. 
        if (isNaN(newQty) || newQty < 0) newQty = 0;
        if (p && newQty > p.stockQuantity) newQty = p.stockQuantity;
        
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const vat = vatEnabled ? subtotal * VAT_RATE : 0;
    return { subtotal, vat, total: subtotal + vat };
  }, [cart, vatEnabled]);

  const handleCheckoutInitiate = () => {
    if (!selectedCustomer || cart.length === 0) return;
    
    // Check if the total billable quantity is zero
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQty === 0) {
      setErrorMsg("Quantity Alert: Total order quantity is zero. Adjust counts to proceed.");
      return;
    }

    // Secondary validation: Ensure all products still exist before opening modal
    const invalidItems = cart.filter(item => !products.find(p => p.id === item.productId));
    if (invalidItems.length > 0) {
      const ids = invalidItems.map(i => i.productName).join(', ');
      setErrorMsg(`Registry Error: ${ids} no longer exist. Please refresh the floor.`);
      return;
    }

    setShowConfirmModal(true);
  };

  const handleOpenLedger = async () => {
    if (!selectedCustomer) return;
    setShowLedgerModal(true);
    setLoadingLedger(true);
    try {
      const ledger = await db.getCustomerLedgerCloud(selectedCustomer.id);
      setCustomerLedger(ledger);
    } catch (err) {
      console.error("Ledger fetch failed", err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const finalizeCheckout = async () => {
    if (!selectedCustomer) return;
    setLoading(true);
    try {
      // Filter items to only include those with quantity > 0 for the permanent record
      const billableItems = cart.filter(i => i.quantity > 0);
      
      const totalProfit = billableItems.reduce((sum, item) => {
        return sum + ((item.price - item.costPrice) * item.quantity);
      }, 0);
      
      const order: Order = {
        id: `ORD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        date: new Date().toISOString(),
        items: billableItems,
        ...totals,
        vatEnabled,
        totalProfit,
        paymentType,
        status: paymentType === 'Bank Transfer' ? 'Pending Verification' : (paymentType === 'Credit' ? 'Pending' : 'Paid'),
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        amountPaid: (paymentType === 'Credit' || paymentType === 'Bank Transfer') ? 0 : totals.total,
        ...(paymentType === 'Bank Transfer' && paymentReference ? { paymentReference } : {}),
      };

      await db.createOrder(order);
      setLastOrder(order);
      setCart([]);
      setSelectedCustomer(null);
      setIsCartOpen(false);
    } catch (err: any) {
      // Graceful error handling for the "reference not found" case
      if (err.message.includes("not found in database")) {
        setErrorMsg("Safety Protocol: An item was deleted from the registry during this session. The cart has been synchronized.");
        // The reconciliation useEffect will naturally clean the cart on next tick
      } else {
        setErrorMsg(err.message);
      }
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-160px)] lg:h-full relative overflow-hidden">
      {/* Product Discovery Area */}
      <div className="flex-1 flex flex-col bg-white rounded-3xl lg:rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        
        {/* Top Search & Scan Bar */}
        <div className="p-4 bg-slate-50/30 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search products..." 
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-gold/10 outline-none transition-all font-bold text-slate-900 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="w-12 h-12 bg-brand-dark text-brand-gold rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-brand-dark/10">
              <Scan size={20} />
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex overflow-x-auto scrollbar-hide space-x-2 pb-1">
            <button 
              onClick={() => setSelectedCategory('All')}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${selectedCategory === 'All' ? 'bg-brand-gold border-brand-gold text-brand-dark' : 'bg-white border-slate-100 text-slate-400'}`}
            >
              All Items
            </button>
            {CATEGORIES.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${selectedCategory === cat ? 'bg-brand-gold border-brand-gold text-brand-dark' : 'bg-white border-slate-100 text-slate-400'}`}
              >
                {cat}s
              </button>
            ))}
          </div>
        </div>
        
        {/* Speed-Row List / Grid */}
        <div className="flex-1 overflow-y-auto p-4 xl:p-6 scrollbar-hide space-y-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 lg:gap-4 xl:gap-6 lg:space-y-0">
          {filteredProducts.map(p => {
            const cartItem = cart.find(i => i.productId === p.id);
            const isInCart = !!cartItem;
            const isLowStock = p.stockQuantity < 50;

            return (
              <div 
                key={p.id}
                className={`flex lg:flex-col bg-white border border-slate-100 p-3 lg:p-5 rounded-2xl lg:rounded-[32px] transition-all relative overflow-hidden group ${p.stockQuantity <= 0 ? 'opacity-40 grayscale pointer-events-none' : 'hover:border-brand-gold hover:shadow-xl'}`}
              >
                {/* Product Detail Section */}
                <div className="flex lg:flex-col flex-1 min-w-0 items-center lg:items-start space-x-4 lg:space-x-0">
                  <div className={`w-12 h-12 lg:w-16 lg:h-16 rounded-2xl lg:rounded-3xl flex items-center justify-center shrink-0 mb-0 lg:mb-4 transition-colors ${p.category === 'Bottle' ? 'bg-indigo-50 text-indigo-600' : p.category === 'Spray' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                    <Package size={24} className="lg:w-8 lg:h-8" />
                  </div>
                  
                  <div className="flex-1 min-w-0 lg:w-full">
                    <div className="flex justify-between items-start mb-0.5">
                      <h4 className="text-sm font-black text-brand-dark truncate pr-2 tracking-tight">{p.name}</h4>
                      <p className="text-sm font-black text-brand-gold shrink-0 lg:hidden">{db.formatMoney(p.sellingPrice)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p.size}ml • {p.category}</p>
                      <span className={`lg:hidden text-[9px] font-black px-2 py-0.5 rounded-lg ${isLowStock ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                        {p.stockQuantity} Left
                      </span>
                    </div>

                    {p.warehouseArea && (
                      <div className="flex items-center mt-1.5 text-[8px] font-black text-brand-gold uppercase tracking-widest">
                        <MapPin size={10} className="mr-1" />
                        <span>{p.warehouseArea}</span>
                      </div>
                    )}
                    
                    <div className="hidden lg:block w-full h-1 bg-slate-100 rounded-full mt-3 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${isLowStock ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, (p.stockQuantity / 500) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing & Quick Qty Controls */}
                <div className="mt-0 lg:mt-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
                  <p className="hidden lg:block text-lg font-black text-brand-dark tracking-tighter">{db.formatMoney(p.sellingPrice)}</p>
                  
                  {isInCart ? (
                    <div className="flex items-center bg-brand-linen/50 rounded-xl p-1 border border-brand-linen lg:flex-1 lg:max-w-[140px]">
                      <button onClick={() => updateQty(p.id, -1)} className="w-8 h-8 lg:w-7 lg:h-7 flex items-center justify-center bg-white rounded-lg text-brand-dark shadow-sm active:scale-90 transition-transform"><Minus size={14}/></button>
                      <input 
                        type="number"
                        className="flex-1 w-full text-center font-black text-brand-dark text-xs bg-transparent border-none outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={cartItem.quantity}
                        onChange={(e) => updateQty(p.id, 0, parseInt(e.target.value) || 0)}
                      />
                      <button onClick={() => updateQty(p.id, 1)} className="w-8 h-8 lg:w-7 lg:h-7 flex items-center justify-center bg-white rounded-lg text-brand-dark shadow-sm active:scale-90 transition-transform"><Plus size={14}/></button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => addToCart(p)}
                      className="w-10 h-10 lg:w-full lg:h-12 bg-brand-gold text-brand-dark rounded-xl lg:rounded-2xl flex items-center justify-center hover:bg-brand-dark hover:text-brand-gold transition-all active:scale-95 shadow-md shadow-brand-gold/10 group"
                    >
                      <Plus size={20} className="lg:hidden" />
                      <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">Add To Cart</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-20 text-center opacity-30">
              <Layers size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="text-xs font-black uppercase tracking-widest">No Intelligence Matches</p>
            </div>
          )}
        </div>
      </div>

      {/* Optimized Cart Sidebar */}
      <div className={`
        fixed inset-0 z-50 transition-transform duration-500 transform lg:relative lg:translate-y-0 lg:z-0 lg:w-[32%] xl:w-[28%] 2xl:w-[24%] min-w-[380px] max-w-[500px] lg:flex
        ${isCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
      `}>
        <div className="absolute inset-0 bg-brand-dark/60 backdrop-blur-sm lg:hidden" onClick={() => setIsCartOpen(false)} />
        <div className="absolute bottom-0 left-0 right-0 h-[94vh] lg:h-full bg-brand-dark rounded-t-[48px] lg:rounded-[48px] flex flex-col shadow-2xl overflow-hidden">
          
          <div className="p-6 xl:p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
            <div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Current <span className="text-brand-gold">Order</span></h3>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Live Transaction Buffer</p>
            </div>
            <button onClick={() => setIsCartOpen(false)} className="lg:hidden w-12 h-12 flex items-center justify-center text-white/40 bg-white/5 rounded-full"><X size={24} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 xl:p-8 space-y-6 scrollbar-hide">
            <div className="space-y-3">
              <label className="text-[9px] font-black text-brand-gold uppercase tracking-[0.3em] ml-1">Assign Customer Entity</label>
              <div className="relative group">
                <select 
                  className="w-full py-5 px-6 bg-white/5 border border-white/10 rounded-3xl outline-none font-bold text-white focus:border-brand-gold transition-all text-sm appearance-none cursor-pointer"
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value) || null)}
                >
                  <option value="" className="bg-brand-dark">Unassigned Agent...</option>
                  {customers.map(c => <option key={c.id} value={c.id} className="bg-brand-dark">{c.name} • {c.businessName}</option>)}
                </select>
                <ChevronUp size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-focus-within:rotate-180 transition-transform" />
              </div>
            </div>

            {selectedCustomer && selectedCustomer.outstandingBalance > 0 && (
              <div className={`p-5 rounded-[32px] border animate-in slide-in-from-top-2 duration-500 ${selectedCustomer.outstandingBalance >= selectedCustomer.creditLimit ? 'bg-rose-500/10 border-rose-500/20' : 'bg-brand-gold/10 border-brand-gold/20'}`}>
                <div className="flex items-start space-x-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${selectedCustomer.outstandingBalance >= selectedCustomer.creditLimit ? 'bg-rose-500/20 text-rose-500' : 'bg-brand-gold/20 text-brand-gold'}`}>
                    <AlertTriangle size={20} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${selectedCustomer.outstandingBalance >= selectedCustomer.creditLimit ? 'text-rose-500' : 'text-brand-gold'}`}>
                      {selectedCustomer.outstandingBalance >= selectedCustomer.creditLimit ? 'Critical: Limit Exceeded' : 'Credit Reminder'}
                    </p>
                    <p className="text-xs font-bold text-gray-300 leading-snug">
                      Outstanding Balance: <span className="text-white">{db.formatMoney(selectedCustomer.outstandingBalance)}</span>
                    </p>
                    <button 
                      onClick={handleOpenLedger}
                      className="mt-3 text-[10px] font-black text-brand-gold uppercase tracking-widest hover:underline flex items-center"
                    >
                      <History size={12} className="mr-1" />
                      View Quick Ledger
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4">
              <div className="flex justify-between items-center px-1">
                 <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Inventory List ({cart.length})</h4>
                 {cart.length > 0 && <button onClick={() => setCart([])} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:opacity-70">Wipe Buffer</button>}
              </div>
              
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.productId} className="flex items-center bg-white/5 p-5 rounded-[32px] border border-white/5 animate-in slide-in-from-right-5 relative group">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm font-bold text-white truncate leading-tight mb-1">{item.productName}</p>
                      <p className="text-xs font-black text-brand-gold">{db.formatMoney(item.price)}</p>
                    </div>
                    <div className="flex items-center space-x-2 bg-black/40 p-1.5 rounded-2xl">
                      <button onClick={() => updateQty(item.productId, -1)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-brand-gold hover:bg-white/10 active:scale-90 transition-all"><Minus size={14} /></button>
                      <input 
                        type="number"
                        className="w-10 text-center font-black text-white text-xs bg-transparent border-none outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={item.quantity}
                        onChange={(e) => updateQty(item.productId, 0, parseInt(e.target.value) || 0)}
                      />
                      <button onClick={() => updateQty(item.productId, 1)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-brand-gold hover:bg-white/10 active:scale-90 transition-all"><Plus size={14} /></button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.productId)}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
              
              {cart.length === 0 && (
                <div className="py-24 text-center opacity-10 flex flex-col items-center">
                  <ShoppingCart size={48} className="mb-4 text-white" />
                  <p className="text-[10px] font-black text-white uppercase tracking-[0.5em]">No Pending Assets</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 xl:p-8 bg-black/50 border-t border-white/5 space-y-6 xl:space-y-8">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${vatEnabled ? 'bg-brand-gold text-brand-dark' : 'bg-white/10 text-gray-500'}`}>
                  <Info size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">VAT Protocol (5%)</p>
                  <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-1">{vatEnabled ? 'Active in Gulf Region' : 'Zero-Rated / Exempt'}</p>
                </div>
              </div>
              <button 
                onClick={() => setVatEnabled(!vatEnabled)}
                className={`w-12 h-6 rounded-full transition-all relative ${vatEnabled ? 'bg-brand-gold' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${vatEnabled ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-[11px] font-black text-gray-500 uppercase tracking-[0.2em]">
                <span>Logistics Subtotal</span>
                <span className="text-white">{db.formatMoney(totals.subtotal)}</span>
              </div>
              {vatEnabled && (
                <div className="flex justify-between text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em]">
                  <span>VAT (5.0%)</span>
                  <span>{db.formatMoney(totals.vat)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-brand-gold uppercase tracking-[0.4em] italic">Final Settlement</span>
                <span className="text-4xl font-black text-brand-gold tracking-tighter">{db.formatMoney(totals.total)}</span>
              </div>
            </div>

            <div className="flex gap-4">
              {(['Cash', 'Bank Transfer', 'Credit'] as const).map(type => (
                <button 
                  key={type}
                  onClick={() => setPaymentType(type)} 
                  className={`flex-1 py-4 rounded-2xl text-[9px] font-black uppercase tracking-[0.1em] border-2 transition-all ${paymentType === type ? 'bg-brand-gold text-brand-dark border-brand-gold shadow-2xl shadow-brand-gold/20' : 'border-white/5 text-gray-600 hover:text-white'}`}
                >
                  {type === 'Cash' ? 'Cash' : type === 'Bank Transfer' ? 'Transfer' : 'Credit'}
                </button>
              ))}
            </div>

            {paymentType === 'Bank Transfer' && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                <label className="text-[9px] font-black text-brand-gold uppercase tracking-[0.3em] ml-1">Transfer Reference / ID</label>
                <input 
                  type="text"
                  placeholder="Enter Transaction ID..."
                  className="w-full py-4 px-6 bg-white/5 border border-white/10 rounded-2xl outline-none font-bold text-white focus:border-brand-gold transition-all text-sm"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>
            )}

            <button 
              disabled={!selectedCustomer || cart.length === 0 || loading || (paymentType === 'Bank Transfer' && !paymentReference)}
              onClick={handleCheckoutInitiate}
              className="w-full py-6 bg-white text-brand-dark rounded-[32px] font-black uppercase tracking-[0.3em] text-sm hover:bg-brand-gold transition-all disabled:opacity-5 active:scale-95 flex items-center justify-center space-x-3 group shadow-2xl"
            >
              <span>Transmit Order</span>
              <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {cart.length > 0 && !isCartOpen && (
        <div className="lg:hidden fixed bottom-6 left-6 right-6 z-40 animate-in slide-in-from-bottom-20 duration-500">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-brand-gold text-brand-dark p-5 rounded-[32px] shadow-[0_20px_50px_rgba(197,160,40,0.3)] flex items-center justify-between active:scale-[0.98] transition-all relative group"
          >
            <div className="flex items-center space-x-5">
              <div className="bg-brand-dark text-brand-gold w-14 h-14 rounded-3xl flex items-center justify-center text-xl font-black shadow-inner">
                {cart.reduce((a,b) => a + (Number(b.quantity) || 0), 0)}
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1.5">Review Queue</p>
                <p className="text-sm font-black italic uppercase tracking-tighter">Open Checkout</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-2xl font-black tracking-tighter">{db.formatMoney(totals.total)}</span>
              <div className="bg-brand-dark/10 p-2 rounded-full group-hover:bg-brand-dark/20 transition-colors"><ChevronUp size={24} /></div>
            </div>
          </button>
        </div>
      )}

      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Operational Verification">
        <div className="space-y-8">
          <div className="bg-brand-bg p-8 rounded-[40px] border border-brand-linen flex flex-col items-center">
            <Badge color="gold" className="mb-4">Entity Authorization</Badge>
            <h4 className="text-3xl font-black text-brand-dark italic uppercase tracking-tight text-center">{selectedCustomer?.name}</h4>
            <p className="text-xs font-bold text-gray-500 mt-2 tracking-widest uppercase">{selectedCustomer?.businessName}</p>
            
            <div className="w-full mt-10 pt-10 border-t border-brand-linen flex items-end justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Final Valuation</span>
              <span className="text-4xl font-black text-brand-gold tracking-tighter">{db.formatMoney(totals.total)}</span>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <Button variant="outline" size="lg" className="flex-1 py-5 rounded-[24px]" onClick={() => setShowConfirmModal(false)}>Revise Sale</Button>
            <Button size="lg" className="flex-1 py-5 rounded-[24px]" onClick={finalizeCheckout} disabled={loading}>Authorize Transmission</Button>
          </div>
        </div>
      </Modal>

      {lastOrder && (
        <div className="fixed inset-0 z-[200] bg-brand-dark/95 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="bg-white max-w-sm w-full rounded-[64px] p-12 text-center shadow-[0_50px_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[32px] flex items-center justify-center mx-auto mb-10 shadow-inner">
              <CheckCircle2 size={56} strokeWidth={3} />
            </div>
            <h3 className="text-4xl font-black text-brand-dark mb-3 italic tracking-tighter uppercase">Authorized</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mb-12">Transmission ID: {lastOrder.id}</p>
            <div className="space-y-4">
              <Button icon={<Printer size={20} />} className="w-full py-6 rounded-[24px]" onClick={() => window.print()}>Print Logistics Slip</Button>
              <Button variant="outline" className="w-full py-6 rounded-[24px]" onClick={() => setLastOrder(null)}>Return to Floor</Button>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="fixed top-24 lg:top-10 left-1/2 -translate-x-1/2 z-[200] bg-rose-600 text-white px-8 py-4 rounded-full shadow-2xl font-black uppercase tracking-widest text-[10px] flex items-center space-x-4 animate-in slide-in-from-top-10">
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-2 hover:opacity-50 bg-white/20 p-1.5 rounded-full transition-colors"><X size={16}/></button>
        </div>
      )}

      {/* Quick Ledger Modal */}
      <Modal isOpen={showLedgerModal} onClose={() => setShowLedgerModal(false)} title="Quick Ledger Summary">
        <div className="space-y-6">
          {selectedCustomer && (
            <div className="p-6 bg-brand-dark rounded-[32px] text-white flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest mb-1">Current Debt</p>
                <p className="text-3xl font-black italic tracking-tighter">{db.formatMoney(selectedCustomer.outstandingBalance)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Credit Limit</p>
                <p className="text-lg font-black text-white">{db.formatMoney(selectedCustomer.creditLimit)}</p>
              </div>
            </div>
          )}

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
            {loadingLedger ? (
              <div className="py-20 text-center">
                <Loader2 size={32} className="animate-spin text-brand-gold mx-auto mb-4" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Synchronizing Ledger...</p>
              </div>
            ) : (
              customerLedger.map((item, idx) => (
                <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border ${item.type === 'Payment' ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-slate-100'}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.type === 'Payment' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                      {item.type === 'Payment' ? <Wallet size={16} /> : <History size={16} />}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 leading-none">{item.type === 'Payment' ? 'Payment' : `Order ${item.id}`}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{item.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${item.type === 'Payment' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {item.type === 'Payment' ? `-${db.formatMoney(item.amount)}` : db.formatMoney(item.total)}
                    </p>
                  </div>
                </div>
              ))
            )}
            {!loadingLedger && customerLedger.length === 0 && (
              <div className="py-20 text-center opacity-30 italic text-[10px] uppercase tracking-widest">No transaction history found.</div>
            )}
          </div>

          <Button className="w-full py-4" onClick={() => setShowLedgerModal(false)}>Close Summary</Button>
        </div>
      </Modal>
    </div>
  );
};
