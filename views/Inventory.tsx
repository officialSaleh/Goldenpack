
import React, { useState } from 'react';
import { Package, Search, Plus, Edit2, Trash2, Filter, AlertTriangle, Box, DollarSign } from 'lucide-react';
import { db } from '../services/mockData.ts';
import { CATEGORIES } from '../constants.tsx';
import { Card, Button, Input, Modal, Badge } from '../components/UI.tsx';
import { Category } from '../types.ts';

export const Inventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [products, setProducts] = useState(db.getProducts());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Bottle' as Category,
    size: '',
    costPrice: '',
    sellingPrice: '',
    stockQuantity: ''
  });

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const newProduct = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      category: formData.category,
      size: parseInt(formData.size) || 0,
      costPrice: parseFloat(formData.costPrice),
      sellingPrice: parseFloat(formData.sellingPrice),
      stockQuantity: parseInt(formData.stockQuantity),
      imageUrl: `https://picsum.photos/seed/${formData.name}/200`
    };
    db.addProduct(newProduct);
    setProducts([...db.getProducts()]);
    setIsModalOpen(false);
    setFormData({ name: '', category: 'Bottle', size: '', costPrice: '', sellingPrice: '', stockQuantity: '' });
  };

  const currencySymbol = db.getSettings()?.currencySymbol || '$';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Inventory</h2>
          <p className="text-slate-500 mt-1">Manage stock levels and product pricing.</p>
        </div>
        <Button icon={<Plus size={20} />} onClick={() => setIsModalOpen(true)}>
          Add Product
        </Button>
      </div>

      <Card className="flex flex-col lg:flex-row gap-4 py-4 px-4 bg-white">
        <div className="flex-1 relative">
          <Input 
            icon={<Search size={20} />} 
            placeholder="Search products by name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <select 
            className="px-4 py-3 bg-slate-50 border-none rounded-xl font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </Card>

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-8 py-5">Product</th>
                <th className="px-8 py-5">Category</th>
                <th className="px-8 py-5">Size</th>
                <th className="px-8 py-5 text-right">Cost ({currencySymbol})</th>
                <th className="px-8 py-5 text-right">Price ({currencySymbol})</th>
                <th className="px-8 py-5 text-center">Stock</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden shadow-sm">
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="font-bold text-slate-900 truncate max-w-[200px]">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <Badge color={p.category === 'Bottle' ? 'indigo' : p.category === 'Spray' ? 'amber' : 'rose'}>
                      {p.category}
                    </Badge>
                  </td>
                  <td className="px-8 py-5 text-sm text-slate-500 font-medium">{p.size > 0 ? `${p.size}ml` : '-'}</td>
                  <td className="px-8 py-5 text-right font-medium text-slate-400">{db.formatMoney(p.costPrice)}</td>
                  <td className="px-8 py-5 text-right font-black text-indigo-600">{db.formatMoney(p.sellingPrice)}</td>
                  <td className="px-8 py-5 text-center">
                    <div className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-sm ${
                      p.stockQuantity < 50 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-900'
                    }`}>
                      <span>{p.stockQuantity}</span>
                      {p.stockQuantity < 50 && <AlertTriangle size={14} />}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="ghost" size="sm" icon={<Edit2 size={16} />} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="text-center py-24">
              <Box className="mx-auto text-slate-100 mb-4" size={64} />
              <p className="text-slate-400 font-bold">No products found</p>
            </div>
          )}
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Product">
        <form onSubmit={handleAddProduct} className="space-y-6">
          <Input 
            label="Product Name" 
            placeholder="e.g. Classic Gold Bottle" 
            required 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
              <select 
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value as Category})}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Input 
              label="Size (ml)" 
              type="number" 
              placeholder="100" 
              value={formData.size}
              onChange={(e) => setFormData({...formData, size: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label={`Cost Price (${currencySymbol})`}
              type="number" 
              step="0.01" 
              required 
              value={formData.costPrice}
              onChange={(e) => setFormData({...formData, costPrice: e.target.value})}
            />
            <Input 
              label={`Selling Price (${currencySymbol})`}
              type="number" 
              step="0.01" 
              required 
              value={formData.sellingPrice}
              onChange={(e) => setFormData({...formData, sellingPrice: e.target.value})}
            />
          </div>
          <Input 
            label="Initial Stock" 
            type="number" 
            required 
            value={formData.stockQuantity}
            onChange={(e) => setFormData({...formData, stockQuantity: e.target.value})}
          />
          <div className="flex gap-4 pt-4">
            <Button variant="outline" className="flex-1" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" type="submit">Create Product</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
