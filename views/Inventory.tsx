
import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Edit2, Trash2, Box, AlertTriangle, Printer, MapPin, ShoppingBag, Loader2 } from 'lucide-react';
import { db } from '../services/mockData';
import { CATEGORIES } from '../constants';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import { Category, Product, LocalPurchase } from '../types';

export const Inventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isRecordingPurchase, setIsRecordingPurchase] = useState(false);
  
  // Real-time synchronization tick
  const [, setTick] = useState(0);
  useEffect(() => db.subscribe(() => setTick(t => t + 1)), []);

  const products = db.getProducts();

  const [formData, setFormData] = useState({
    name: '',
    category: 'Bottle' as Category,
    size: '',
    costPrice: '',
    sellingPrice: '',
    stockQuantity: '',
    warehouseArea: ''
  });

  const [purchaseData, setPurchaseData] = useState({
    supplier: '',
    date: new Date().toISOString().split('T')[0],
    items: [] as any[]
  });

  const [newPurchaseItem, setNewPurchaseItem] = useState({
    productId: '',
    productName: '',
    category: 'Bottle' as Category,
    size: 500,
    quantity: 0,
    costPrice: 0
  });

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalInvValue = filteredProducts.reduce((sum, p) => sum + (p.costPrice * p.stockQuantity), 0);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({ name: '', category: 'Bottle', size: '', costPrice: '', sellingPrice: '', stockQuantity: '', warehouseArea: '' });
    setIsModalOpen(true);
  };

  const handleOpenPurchase = () => {
    setPurchaseData({
      supplier: '',
      date: new Date().toISOString().split('T')[0],
      items: []
    });
    setNewPurchaseItem({
      productId: '',
      productName: '',
      category: 'Bottle',
      size: 500,
      quantity: 0,
      costPrice: 0
    });
    setIsPurchaseModalOpen(true);
  };

  const addPurchaseItem = () => {
    if (!newPurchaseItem.productName || newPurchaseItem.quantity <= 0) return;
    setPurchaseData({
      ...purchaseData,
      items: [...purchaseData.items, { ...newPurchaseItem }]
    });
    setNewPurchaseItem({
      productId: '',
      productName: '',
      category: 'Bottle',
      size: 500,
      quantity: 0,
      costPrice: 0
    });
  };

  const removePurchaseItem = (index: number) => {
    setPurchaseData({
      ...purchaseData,
      items: purchaseData.items.filter((_, i) => i !== index)
    });
  };

  const selectExistingProductForPurchase = (productId: string) => {
    if (!productId) {
      setNewPurchaseItem({
        productId: '',
        productName: '',
        category: 'Bottle',
        size: 500,
        quantity: 0,
        costPrice: 0
      });
      return;
    }
    const p = products.find(prod => prod.id === productId);
    if (p) {
      setNewPurchaseItem({
        productId: p.id,
        productName: p.name,
        category: p.category,
        size: p.size,
        quantity: 0,
        costPrice: p.costPrice
      });
    }
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (purchaseData.items.length === 0) {
      alert("Please add at least one item to the purchase.");
      return;
    }

    setIsRecordingPurchase(true);
    const totalAmount = purchaseData.items.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);

    const purchase: LocalPurchase = {
      id: Math.random().toString(36).substr(2, 9),
      date: purchaseData.date,
      supplier: purchaseData.supplier,
      items: purchaseData.items,
      totalAmount
    };

    try {
      await db.recordLocalPurchase(purchase);
      setIsPurchaseModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsRecordingPurchase(false);
    }
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      category: p.category,
      size: p.size.toString(),
      costPrice: p.costPrice.toString(),
      sellingPrice: p.sellingPrice.toString(),
      stockQuantity: p.stockQuantity.toString(),
      warehouseArea: p.warehouseArea || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const productData = {
      name: formData.name,
      category: formData.category,
      size: parseInt(formData.size) || 0,
      costPrice: parseFloat(formData.costPrice),
      sellingPrice: parseFloat(formData.sellingPrice),
      stockQuantity: parseInt(formData.stockQuantity),
      warehouseArea: formData.warehouseArea
    };

    try {
      if (editingProduct) {
        await db.updateProduct(editingProduct.id, productData);
      } else {
        await db.addProduct({
          id: Math.random().toString(36).substr(2, 9),
          ...productData
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await db.deleteProduct(id);
      setConfirmDelete(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const currencySymbol = db.getSettings()?.currencySymbol || '$';

  return (
    <div className="space-y-6 md:space-y-8 print:bg-white print:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight italic uppercase">Inventory <span className="text-brand-gold">Assets</span></h2>
          <p className="text-slate-500 mt-1 text-sm md:text-base font-medium">Total Strategic Valuation: <span className="text-brand-gold font-black">{db.formatMoney(totalInvValue)}</span></p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="print:hidden hidden sm:inline-flex" icon={<ShoppingBag size={18} />} onClick={handleOpenPurchase}>Local Purchase</Button>
          <Button variant="outline" size="sm" className="print:hidden hidden sm:inline-flex" icon={<Printer size={18} />} onClick={() => window.print()}>Print Catalogue</Button>
          <Button size="sm" icon={<Plus size={18} />} onClick={handleOpenAdd}>Deploy Product</Button>
        </div>
      </div>

      <Card className="flex flex-col lg:flex-row gap-4 py-3 px-3 md:py-4 md:px-4 bg-white print:hidden shadow-sm">
        <div className="flex-1 relative">
          <Input 
            icon={<Search size={18} />} 
            placeholder="Search intelligence records..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="flex-1 lg:flex-none px-4 py-3.5 bg-brand-linen/50 border-none rounded-2xl font-bold text-[10px] md:text-xs uppercase tracking-widest text-slate-600 focus:ring-2 focus:ring-brand-gold/10 outline-none"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </Card>

      <Card noPadding>
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left min-w-[500px] md:min-w-0">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-50 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-5 py-4 md:px-8 md:py-5">Product Details</th>
                <th className="px-5 py-4 md:px-8 md:py-5 hidden lg:table-cell">Area</th>
                <th className="px-5 py-4 md:px-8 md:py-5 hidden sm:table-cell">Category</th>
                <th className="px-5 py-4 md:px-8 md:py-5 text-right hidden md:table-cell">Cost</th>
                <th className="px-5 py-4 md:px-8 md:py-5 text-right">Selling</th>
                <th className="px-5 py-4 md:px-8 md:py-5 text-center">Stock</th>
                <th className="px-5 py-4 md:px-8 md:py-5 text-right print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-5 py-4 md:px-8 md:py-5">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <Package size={14} />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate text-sm md:text-base">{p.name}</span>
                        <div className="flex items-center space-x-2">
                           <span className="text-[8px] md:text-[10px] text-slate-400 uppercase tracking-widest font-black">{p.size}ml</span>
                           {p.warehouseArea && (
                             <span className="lg:hidden text-[7px] font-black text-brand-gold uppercase tracking-tighter flex items-center">
                               <MapPin size={8} className="mr-0.5" /> {p.warehouseArea}
                             </span>
                           )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 md:px-8 md:py-5 hidden lg:table-cell">
                    {p.warehouseArea ? (
                      <div className="flex items-center text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        <MapPin size={12} className="text-brand-gold mr-2" />
                        {p.warehouseArea}
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-300 italic">Not Assigned</span>
                    )}
                  </td>
                  <td className="px-5 py-4 md:px-8 md:py-5 hidden sm:table-cell">
                    <Badge color={p.category === 'Bottle' ? 'indigo' : p.category === 'Spray' ? 'amber' : 'rose'}>
                      {p.category}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 md:px-8 md:py-5 text-right font-medium text-slate-400 hidden md:table-cell">{db.formatMoney(p.costPrice)}</td>
                  <td className="px-5 py-4 md:px-8 md:py-5 text-right font-black text-brand-gold text-sm md:text-base">{db.formatMoney(p.sellingPrice)}</td>
                  <td className="px-5 py-4 md:px-8 md:py-5 text-center">
                    <div className={`inline-flex items-center space-x-1 px-2.5 py-1 md:px-3 md:py-1.5 rounded-xl font-bold text-[10px] md:text-sm ${
                      p.stockQuantity < 50 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-900'
                    }`}>
                      <span>{p.stockQuantity}</span>
                      {p.stockQuantity < 50 && <AlertTriangle size={12} />}
                    </div>
                  </td>
                  <td className="px-5 py-4 md:px-8 md:py-5 text-right print:hidden">
                    <div className="flex items-center justify-end space-x-1 md:space-x-2">
                      <button onClick={() => handleOpenEdit(p)} className="p-2 text-slate-400 hover:text-brand-gold transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => setConfirmDelete(p.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="text-center py-16 md:py-24">
              <Box className="mx-auto text-slate-100 mb-4" size={64} />
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Catalogue is currently empty</p>
            </div>
          )}
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? "Edit Logistics Intelligence" : "Record New Strategic Asset"}>
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <Input 
            label="Product Identity" 
            placeholder="e.g. Amber Glass Elite" 
            required 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
              <select 
                className="w-full px-5 py-3.5 bg-brand-linen/50 border-none rounded-[18px] focus:ring-2 focus:ring-brand-gold/20 outline-none transition-all font-bold text-sm"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value as Category})}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Input 
              label="Volume (ml)" 
              type="number" 
              placeholder="100" 
              value={formData.size}
              onChange={(e) => setFormData({...formData, size: e.target.value})}
            />
          </div>

          <Input 
            label="Warehouse Area / Location" 
            placeholder="e.g. Aisle 4, Upper Rack 2" 
            icon={<MapPin size={18} />}
            value={formData.warehouseArea}
            onChange={(e) => setFormData({...formData, warehouseArea: e.target.value})}
          />

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <Input 
              label={`Unit Cost Base`}
              type="number" 
              step="0.01" 
              required 
              value={formData.costPrice}
              onChange={(e) => setFormData({...formData, costPrice: e.target.value})}
            />
            <Input 
              label={`Market Value`}
              type="number" 
              step="0.01" 
              required 
              value={formData.sellingPrice}
              onChange={(e) => setFormData({...formData, sellingPrice: e.target.value})}
            />
          </div>
          <Input 
            label="Current Inventory Stock" 
            type="number" 
            required 
            value={formData.stockQuantity}
            onChange={(e) => setFormData({...formData, stockQuantity: e.target.value})}
          />
          <div className="flex gap-3 md:gap-4 pt-4">
            <Button variant="outline" className="flex-1" type="button" onClick={() => setIsModalOpen(false)}>Abort Record</Button>
            <Button className="flex-1" type="submit">{editingProduct ? "Update Intelligence" : "Establish Product"}</Button>
          </div>
        </form>
      </Modal>

      {/* Local Purchase Modal */}
      <Modal isOpen={isPurchaseModalOpen} onClose={() => !isRecordingPurchase && setIsPurchaseModalOpen(false)} title="Local Market Acquisition">
        <form onSubmit={handlePurchaseSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Local Supplier" 
              placeholder="e.g. Al Quoz Packaging" 
              required 
              value={purchaseData.supplier}
              onChange={(e) => setPurchaseData({...purchaseData, supplier: e.target.value})}
            />
            <Input 
              label="Purchase Date" 
              type="date" 
              required 
              value={purchaseData.date}
              onChange={(e) => setPurchaseData({...purchaseData, date: e.target.value})}
            />
          </div>

          <div className="bg-brand-linen/30 p-6 rounded-[32px] border border-brand-linen/50 space-y-4">
            <p className="text-[10px] font-black text-brand-dark uppercase tracking-widest mb-2">Acquisition Manifest</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Existing Asset</label>
                <select 
                  className="w-full bg-white border border-brand-linen rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-brand-gold transition-all"
                  onChange={(e) => selectExistingProductForPurchase(e.target.value)}
                  value={newPurchaseItem.productId}
                >
                  <option value="">-- New Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.size}ml)</option>
                  ))}
                </select>
              </div>
              <Input 
                label="Product Name" 
                placeholder="e.g. 500ml Clear Bottle" 
                value={newPurchaseItem.productName}
                onChange={(e) => setNewPurchaseItem({...newPurchaseItem, productName: e.target.value})}
              />
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</label>
                <select 
                  className="w-full bg-white border border-brand-linen rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-brand-gold transition-all"
                  value={newPurchaseItem.category}
                  onChange={(e) => setNewPurchaseItem({...newPurchaseItem, category: e.target.value as Category})}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Input 
                label="Size (ml)" 
                type="number" 
                value={newPurchaseItem.size}
                onChange={(e) => setNewPurchaseItem({...newPurchaseItem, size: parseInt(e.target.value) || 0})}
              />
              <Input 
                label="Quantity" 
                type="number" 
                value={newPurchaseItem.quantity}
                onChange={(e) => setNewPurchaseItem({...newPurchaseItem, quantity: parseInt(e.target.value) || 0})}
              />
              <Input 
                label="Cost Price (per unit)" 
                type="number" 
                step="0.01"
                value={newPurchaseItem.costPrice}
                onChange={(e) => setNewPurchaseItem({...newPurchaseItem, costPrice: parseFloat(e.target.value) || 0})}
              />
            </div>
            <Button variant="outline" className="w-full mt-4" type="button" onClick={addPurchaseItem}>Add to Manifest</Button>

            <div className="mt-6 space-y-2">
              {purchaseData.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-brand-linen/50 shadow-sm">
                  <div>
                    <p className="text-xs font-black text-brand-dark">{item.productName}</p>
                    <p className="text-[9px] text-slate-400 uppercase font-bold">{item.quantity} units @ {db.formatMoney(item.costPrice)}</p>
                  </div>
                  <button type="button" onClick={() => removePurchaseItem(idx)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center p-6 bg-brand-dark rounded-[32px] text-white">
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold">Total Acquisition Cost</span>
             <span className="text-2xl font-black italic">{db.formatMoney(purchaseData.items.reduce((s, i) => s + (i.quantity * i.costPrice), 0))}</span>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" className="flex-1 py-5" type="button" onClick={() => setIsPurchaseModalOpen(false)} disabled={isRecordingPurchase}>Abort</Button>
            <Button className="flex-1 py-5" type="submit" disabled={isRecordingPurchase || purchaseData.items.length === 0} icon={isRecordingPurchase ? <Loader2 className="animate-spin" /> : <ShoppingBag size={20} />}>
              Record Purchase
            </Button>
          </div>
        </form>
      </Modal>

      {confirmDelete && (
        <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Destructive Protocol">
          <div className="text-center p-2 md:p-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <p className="text-slate-600 font-bold mb-8 text-sm md:text-base leading-relaxed">This action will permanently purge this strategic asset from the global registry. This operation cannot be reversed.</p>
            <div className="flex gap-3 md:gap-4">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>Retain Asset</Button>
              <Button variant="danger" className="flex-1" onClick={() => handleDelete(confirmDelete)}>Execute Purge</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
