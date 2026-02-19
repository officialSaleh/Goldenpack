
import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Edit2, Trash2, Box, AlertTriangle, Printer, MapPin } from 'lucide-react';
import { db } from '../services/mockData';
import { CATEGORIES } from '../constants';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import { Category, Product } from '../types';

export const Inventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  
  // Real-time synchronization tick
  const [, setTick] = useState(0);
  useEffect(() => db.subscribe(() => setTick(t => t + 1)), []);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Bottle' as Category,
    size: '',
    costPrice: '',
    sellingPrice: '',
    stockQuantity: '',
    warehouseArea: ''
  });

  const filteredProducts = db.getProducts().filter(p => {
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
