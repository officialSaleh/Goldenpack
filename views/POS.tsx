
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
  const [isCheckingOut, setIsCheckingOut] = useState(false);
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
    <div className="h-full relative overflow-hidden flex flex-col">
      {/* Step 1: Product Discovery View (Always Visible) */}
      <div className={`flex-1 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-500 ${isCheckingOut ? 'scale-[0.98] blur-[2px] opacity-50 pointer-events-none' : 'animate-in fade-in'}`}>
        {/* Top Search & Scan Bar - STICKY & GLASSMORPHISM */}
        <div className="sticky top-0 z-30 p-4 lg:p-6 xl:p-8 bg-white/80 backdrop-blur-xl space-y-4 border-b border-slate-100 shadow-sm shadow-slate-200/20">
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-gold transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search products..." 
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-gold/10 focus:border-brand-gold outline-none transition-all font-bold text-slate-900 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="w-12 h-12 lg:w-14 lg:h-14 bg-brand-dark text-brand-gold rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-brand-dark/10">
              <Scan size={20} />
            </button>
          </div>

          {/* Category Tabs - REFINED SPACING */}
          <div className="flex overflow-x-auto scrollbar-hide space-x-2 pb-1">
            <button 
              onClick={() => setSelectedCategory('All')}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border-2 ${selectedCategory === 'All' ? 'bg-brand-gold border-brand-gold text-brand-dark shadow-lg shadow-brand-gold/20' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
            >
              All Items
            </button>
            {CATEGORIES.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border-2 ${selectedCategory === cat ? 'bg-brand-gold border-brand-gold text-brand-dark shadow-lg shadow-brand-gold/20' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
              >
                {cat}s
              </button>
            ))}
          </div>
        </div>
        
        {/* Speed-Row List / Grid - OPTIMIZED LANDSCAPE LAYOUT */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 xl:p-8 scrollbar-hide grid grid-cols-1 xl:grid-cols-2 3xl:grid-cols-3 gap-4 xl:gap-6">
          {filteredProducts.map(p => {
            const cartItem = cart.find(i => i.productId === p.id);
            const isInCart = !!cartItem;
            const isLowStock = p.stockQuantity < 50;

            return (
              <div 
                key={p.id}
                className={`flex items-center bg-white border border-slate-100 p-4 lg:p-5 rounded-[28px] transition-all relative overflow-hidden group ${p.stockQuantity <= 0 ? 'opacity-40 grayscale pointer-events-none' : 'hover:border-brand-gold hover:shadow-xl hover:bg-slate-50/50'}`}
              >
                {/* Left: Product Icon */}
                <div className={`w-12 h-12 lg:w-16 lg:h-16 rounded-2xl lg:rounded-3xl flex items-center justify-center shrink-0 mr-4 lg:mr-6 transition-all group-hover:scale-105 ${p.category === 'Bottle' ? 'bg-indigo-50 text-indigo-600' : p.category === 'Spray' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                  <Package size={24} className="lg:w-8 lg:h-8" />
                </div>
                
                {/* Center: Product Details */}
                <div className="flex-1 min-w-0 mr-4">
                  <h4 className="text-sm lg:text-lg font-black text-slate-900 truncate tracking-tight leading-none uppercase mb-1.5">{p.name}</h4>
                  <div className="flex items-center space-x-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{p.size}ml • {p.category}</p>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${isLowStock ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                      {p.stockQuantity} Left
                    </span>
                  </div>
                  {p.warehouseArea && (
                    <div className="flex items-center mt-2 text-[9px] font-black text-brand-gold uppercase tracking-widest opacity-80">
                      <MapPin size={10} className="mr-1" />
                      <span>{p.warehouseArea}</span>
                    </div>
                  )}
                </div>

                {/* Right: Pricing & Controls */}
                <div className="flex flex-col items-end shrink-0 space-y-3">
                  <p className="text-base lg:text-xl font-black text-brand-dark tracking-tighter">{db.formatMoney(p.sellingPrice)}</p>
                  
                  {isInCart ? (
                    <div className="flex items-center bg-brand-linen/40 rounded-xl p-1 border border-brand-linen/50 animate-in zoom-in-95 duration-200">
                      <button onClick={() => updateQty(p.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-brand-dark shadow-sm active:scale-90 transition-transform hover:text-brand-gold"><Minus size={14}/></button>
                      <input 
                        type="number"
                        className="w-10 text-center font-black text-brand-dark text-xs bg-transparent border-none outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={cartItem.quantity}
                        onChange={(e) => updateQty(p.id, 0, parseInt(e.target.value) || 0)}
                      />
                      <button onClick={() => updateQty(p.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-brand-dark shadow-sm active:scale-90 transition-transform hover:text-brand-gold"><Plus size={14}/></button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => addToCart(p)}
                      className="w-10 h-10 lg:w-12 lg:h-12 bg-brand-gold text-brand-dark rounded-xl lg:rounded-2xl flex items-center justify-center hover:bg-brand-dark hover:text-brand-gold transition-all active:scale-95 shadow-md shadow-brand-gold/10"
                    >
                      <Plus size={20} />
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

        {/* Floating Cart Button */}
        {cart.length > 0 && !isCheckingOut && (
          <div className="fixed bottom-8 right-8 z-40 animate-in slide-in-from-bottom-10 duration-500">
            <button 
              onClick={() => setIsCheckingOut(true)}
              className="bg-brand-dark text-brand-gold px-8 py-6 rounded-[40px] shadow-2xl shadow-brand-dark/40 flex items-center space-x-4 hover:scale-105 active:scale-95 transition-all group"
            >
              <div className="relative">
                <ShoppingCart size={24} />
                <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-brand-dark">
                  {cart.reduce((a,b) => a + (Number(b.quantity) || 0), 0)}
                </span>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 leading-none mb-1">Review Order</p>
                <p className="text-lg font-black italic tracking-tighter uppercase leading-none">Checkout {db.formatMoney(totals.total)}</p>
              </div>
              <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        )}
      </div>

      {/* Step 2: Slide-Out Checkout Drawer */}
      <div className={`fixed inset-0 z-[100] transition-all duration-500 ${isCheckingOut ? 'visible' : 'invisible pointer-events-none'}`}>
        {/* Backdrop */}
        <div 
          className={`absolute inset-0 bg-brand-dark/40 backdrop-blur-sm transition-opacity duration-500 ${isCheckingOut ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsCheckingOut(false)}
        />
        
        {/* Drawer Panel */}
        <div className={`absolute right-0 top-0 bottom-0 w-full lg:w-[85%] xl:w-[75%] 2xl:w-[65%] bg-slate-50 shadow-2xl transform transition-transform duration-500 flex flex-col lg:flex-row ${isCheckingOut ? 'translate-x-0' : 'translate-x-full'}`}>
          {/* Left: Cart Items Review */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            <div className="p-6 lg:p-8 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setIsCheckingOut(false)}
                  className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
                <div>
                  <h3 className="text-xl lg:text-2xl font-black text-brand-dark italic uppercase tracking-tighter">Inventory <span className="text-brand-gold">Review</span></h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Step 1 of 2: Confirm Assets</p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Items</p>
                <p className="text-lg lg:text-xl font-black text-brand-dark">{cart.reduce((a,b) => a + (Number(b.quantity) || 0), 0)} Units</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-3 lg:space-y-4 scrollbar-hide">
              {cart.map(item => (
                <div key={item.productId} className="flex items-center bg-slate-50 p-4 lg:p-6 rounded-[32px] border border-slate-100 group relative">
                  <div className="w-10 h-10 lg:w-14 lg:h-14 bg-white rounded-2xl flex items-center justify-center text-brand-gold shadow-sm mr-4 lg:mr-6 shrink-0">
                    <Package size={20} className="lg:w-6 lg:h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm lg:text-base font-black text-brand-dark truncate leading-tight mb-1">{item.productName}</p>
                    <p className="text-xs lg:text-sm font-bold text-brand-gold">{db.formatMoney(item.price)} per unit</p>
                  </div>
                  <div className="flex items-center space-x-3 lg:space-x-4 bg-white p-1.5 lg:p-2 rounded-2xl shadow-sm border border-slate-100">
                    <button onClick={() => updateQty(item.productId, -1)} className="w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center rounded-xl bg-slate-50 text-brand-dark hover:bg-slate-100 active:scale-90 transition-all"><Minus size={14} /></button>
                    <span className="w-6 lg:w-8 text-center font-black text-brand-dark text-xs lg:text-sm">{item.quantity}</span>
                    <button onClick={() => updateQty(item.productId, 1)} className="w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center rounded-xl bg-slate-50 text-brand-dark hover:bg-slate-100 active:scale-90 transition-all"><Plus size={14} /></button>
                  </div>
                  <div className="ml-4 lg:ml-8 text-right min-w-[80px] lg:min-w-[100px]">
                    <p className="text-base lg:text-lg font-black text-brand-dark tracking-tighter">{db.formatMoney(item.price * item.quantity)}</p>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.productId)}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Settlement & Payment */}
          <div className="lg:w-[400px] xl:w-[450px] flex flex-col bg-brand-dark lg:rounded-none flex-shrink-0">
            <div className="p-6 lg:p-8 border-b border-white/5 bg-white/5">
              <h3 className="text-xl lg:text-2xl font-black text-white italic uppercase tracking-tighter">Final <span className="text-brand-gold">Settlement</span></h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Step 2 of 2: Secure Transmission</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 lg:space-y-8 scrollbar-hide">
              {/* Customer Selection */}
              <div className="space-y-3">
                <label className="text-[9px] font-black text-brand-gold uppercase tracking-[0.3em] ml-1">Assign Customer Entity</label>
                <div className="relative group">
                  <select 
                    className="w-full py-4 lg:py-5 px-6 bg-white/5 border border-white/10 rounded-3xl outline-none font-bold text-white focus:border-brand-gold transition-all text-sm appearance-none cursor-pointer"
                    value={selectedCustomer?.id || ''}
                    onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value) || null)}
                  >
                    <option value="" className="bg-brand-dark">Unassigned Agent...</option>
                    {customers.map(c => <option key={c.id} value={c.id} className="bg-brand-dark">{c.name} • {c.businessName}</option>)}
                  </select>
                  <ChevronUp size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-focus-within:rotate-180 transition-transform" />
                </div>
              </div>

              {selectedCustomer && (
                <div className={`p-5 lg:p-6 rounded-[32px] border animate-in slide-in-from-top-2 duration-500 ${selectedCustomer.outstandingBalance >= selectedCustomer.creditLimit ? 'bg-rose-500/10 border-rose-500/20' : 'bg-brand-gold/10 border-brand-gold/20'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-base lg:text-lg font-black text-white leading-none">{selectedCustomer.name}</p>
                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">{selectedCustomer.businessName}</p>
                    </div>
                    <button onClick={handleOpenLedger} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-brand-gold hover:bg-white/10 transition-colors">
                      <History size={18} />
                    </button>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Outstanding</p>
                      <p className={`text-lg lg:text-xl font-black ${selectedCustomer.outstandingBalance >= selectedCustomer.creditLimit ? 'text-rose-500' : 'text-white'}`}>{db.formatMoney(selectedCustomer.outstandingBalance)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Credit Limit</p>
                      <p className="text-xs lg:text-sm font-bold text-gray-300">{db.formatMoney(selectedCustomer.creditLimit)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* VAT Protocol */}
              <div className="flex items-center justify-between p-5 lg:p-6 bg-white/5 rounded-[32px] border border-white/5">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${vatEnabled ? 'bg-brand-gold text-brand-dark' : 'bg-white/10 text-gray-500'}`}>
                    <Info size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">VAT Protocol (5%)</p>
                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-1">{vatEnabled ? 'Active in Gulf Region' : 'Zero-Rated / Exempt'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setVatEnabled(!vatEnabled)}
                  className={`w-12 lg:w-14 h-6 lg:h-7 rounded-full transition-all relative ${vatEnabled ? 'bg-brand-gold' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-4 lg:w-5 h-4 lg:h-5 rounded-full bg-white transition-all ${vatEnabled ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

              {/* Payment Protocol */}
              <div className="space-y-4">
                <label className="text-[9px] font-black text-brand-gold uppercase tracking-[0.3em] ml-1">Settlement Protocol</label>
                <div className="grid grid-cols-3 gap-2 lg:gap-3">
                  {(['Cash', 'Bank Transfer', 'Credit'] as const).map(type => (
                    <button 
                      key={type}
                      onClick={() => setPaymentType(type)} 
                      className={`py-4 lg:py-5 rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest border-2 transition-all ${paymentType === type ? 'bg-brand-gold text-brand-dark border-brand-gold shadow-xl shadow-brand-gold/20' : 'border-white/5 text-gray-600 hover:text-white'}`}
                    >
                      {type === 'Cash' ? 'Cash' : type === 'Bank Transfer' ? 'Transfer' : 'Credit'}
                    </button>
                  ))}
                </div>
              </div>

              {paymentType === 'Bank Transfer' && (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[9px] font-black text-brand-gold uppercase tracking-[0.3em] ml-1">Transfer Reference / ID</label>
                  <input 
                    type="text"
                    placeholder="Enter Transaction ID..."
                    className="w-full py-4 lg:py-5 px-6 bg-white/5 border border-white/10 rounded-2xl outline-none font-bold text-white focus:border-brand-gold transition-all text-sm"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="p-6 lg:p-8 bg-black/50 border-t border-white/5 space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-black text-gray-500 uppercase tracking-widest">
                  <span>Subtotal</span>
                  <span className="text-white">{db.formatMoney(totals.subtotal)}</span>
                </div>
                {vatEnabled && (
                  <div className="flex justify-between text-xs font-black text-emerald-500 uppercase tracking-widest">
                    <span>VAT (5.0%)</span>
                    <span>{db.formatMoney(totals.vat)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-black text-brand-gold uppercase tracking-[0.3em] italic">Final Settlement</span>
                  <span className="text-3xl lg:text-5xl font-black text-brand-gold tracking-tighter">{db.formatMoney(totals.total)}</span>
                </div>
              </div>

              <button 
                disabled={!selectedCustomer || cart.length === 0 || loading || (paymentType === 'Bank Transfer' && !paymentReference)}
                onClick={handleCheckoutInitiate}
                className="w-full py-5 lg:py-6 bg-white text-brand-dark rounded-[32px] font-black uppercase tracking-[0.3em] text-sm hover:bg-brand-gold transition-all disabled:opacity-5 active:scale-95 flex items-center justify-center space-x-3 group shadow-2xl"
              >
                <span>Authorize Transmission</span>
                <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

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
