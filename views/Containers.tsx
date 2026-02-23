
import React, { useState, useEffect } from 'react';
import { Truck, Search, Plus, Calendar, FileText, CheckCircle2, ChevronDown, Loader2, PackageOpen, Ship, Trash2, Box } from 'lucide-react';
import { db } from '../services/mockData';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import { Container, ContainerItem, Category } from '../types';

const CATEGORIES: Category[] = ['Bottle', 'Spray', 'Cap'];

export const Containers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Real-time synchronization
  const [, setTick] = useState(0);
  useEffect(() => db.subscribe(() => setTick(t => t + 1)), []);

  const containers = db.getContainers();
  const products = db.getProducts();

  const [formData, setFormData] = useState({
    referenceNumber: '',
    arrivalDate: new Date().toISOString().split('T')[0],
    supplier: '',
    notes: '',
    items: [] as ContainerItem[]
  });

  const [newItem, setNewItem] = useState<ContainerItem>({
    productName: '',
    category: 'Bottle',
    size: 500,
    quantity: 0,
    costPrice: 0
  });

  const addItem = () => {
    if (!newItem.productName || newItem.quantity <= 0) return;
    setFormData({
      ...formData,
      items: [...formData.items, { ...newItem }]
    });
    setNewItem({
      productName: '',
      category: 'Bottle',
      size: 500,
      quantity: 0,
      costPrice: 0
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const selectExistingProduct = (productId: string) => {
    if (!productId) {
      setNewItem({
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
      setNewItem({
        productId: p.id,
        productName: p.name,
        category: p.category,
        size: p.size,
        quantity: 0,
        costPrice: p.costPrice
      });
    }
  };

  const filtered = containers.filter(c => 
    c.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      alert("Please add at least one item to the container.");
      return;
    }

    const newContainer: Container = {
      id: Math.random().toString(36).substr(2, 9),
      referenceNumber: formData.referenceNumber,
      arrivalDate: formData.arrivalDate,
      supplier: formData.supplier,
      items: formData.items,
      status: 'In Transit',
      notes: formData.notes
    };
    await db.addContainer(newContainer);
    setIsModalOpen(false);
    setFormData({ 
      referenceNumber: '', 
      arrivalDate: new Date().toISOString().split('T')[0], 
      supplier: '', 
      notes: '',
      items: []
    });
  };

  const handleStatusUpdate = async (id: string, newStatus: Container['status']) => {
    setUpdatingId(id);
    try {
      await db.updateContainerStatus(id, newStatus);
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'In Transit': return <Ship size={20} className="text-brand-gold" />;
      case 'Arrived': return <Truck size={20} className="text-emerald-500" />;
      case 'Unloaded': return <PackageOpen size={20} className="text-slate-400" />;
      default: return <Truck size={20} />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-dark tracking-tighter uppercase italic">Logistics <span className="text-brand-gold">Intelligence</span></h2>
          <p className="text-slate-500 mt-1 font-bold uppercase tracking-widest text-[10px]">Strategic bulk shipment monitoring buffer.</p>
        </div>
        <Button icon={<Plus size={20} />} onClick={() => setIsModalOpen(true)}>Initialize Arrival</Button>
      </div>

      <div className="relative">
        <Input 
          icon={<Search size={20} />} 
          placeholder="Scan by Reference Number or Supplier Name..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.slice().sort((a, b) => b.arrivalDate.localeCompare(a.arrivalDate)).map(c => (
          <Card key={c.id} className="relative group overflow-hidden hover:border-brand-gold transition-all duration-300">
            <div className="flex justify-between items-start mb-8">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${c.status === 'Arrived' ? 'bg-emerald-50' : c.status === 'Unloaded' ? 'bg-slate-50' : 'bg-brand-linen'}`}>
                {updatingId === c.id ? <Loader2 size={24} className="animate-spin text-brand-gold" /> : getStatusIcon(c.status)}
              </div>
              <Badge color={c.status === 'Arrived' ? 'emerald' : c.status === 'Unloaded' ? 'slate' : 'gold'}>
                {c.status}
              </Badge>
            </div>
            
            <h3 className="text-2xl font-black text-brand-dark tracking-tighter mb-1 uppercase italic">{c.referenceNumber}</h3>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{c.supplier}</p>
            
            <div className="mt-8 pt-8 border-t border-brand-linen/50 space-y-4">
              <div className="flex items-center text-[10px] text-slate-500 font-black uppercase tracking-widest space-x-4">
                <Calendar size={14} className="text-brand-gold" />
                <span>Target Arrival: {c.arrivalDate}</span>
              </div>
              <div className="flex items-center text-[10px] text-slate-500 font-black uppercase tracking-widest space-x-4">
                <FileText size={14} className="text-brand-gold" />
                <span>{(c.items || []).reduce((sum, item) => sum + item.quantity, 0).toLocaleString()} Strategic Units</span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Manifest Details</p>
              {(c.items || []).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-brand-linen/20 p-3 rounded-xl border border-brand-linen/30">
                  <div className="flex items-center space-x-3">
                    <Box size={12} className="text-brand-gold" />
                    <span className="text-[9px] font-bold text-slate-600">{item.productName}</span>
                  </div>
                  <span className="text-[9px] font-black text-brand-dark">{item.quantity.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {c.notes && (
              <p className="mt-6 text-[9px] text-slate-400 italic bg-brand-linen/30 p-4 rounded-2xl border border-brand-linen/50 leading-relaxed uppercase tracking-tighter">
                "{c.notes}"
              </p>
            )}
            
            {/* Status Manager Controls */}
            <div className="mt-8 pt-6 border-t border-brand-linen/50 flex gap-2">
              {(['In Transit', 'Arrived', 'Unloaded'] as const).map(status => (
                <button
                  key={status}
                  disabled={updatingId !== null || c.status === status}
                  onClick={() => handleStatusUpdate(c.id, status)}
                  className={`flex-1 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border-2 ${c.status === status ? 'bg-brand-dark border-brand-dark text-white' : 'bg-white border-brand-linen text-slate-400 hover:border-brand-gold hover:text-brand-gold disabled:opacity-30'}`}
                >
                  {status.split(' ')[0]}
                </button>
              ))}
            </div>

            <div className={`absolute top-0 right-0 w-1.5 h-full transition-all duration-700 ${c.status === 'Arrived' ? 'bg-emerald-500' : c.status === 'Unloaded' ? 'bg-slate-300' : 'bg-brand-gold opacity-30 group-hover:opacity-100'}`} />
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-40 text-center opacity-30 border-4 border-dashed border-brand-linen rounded-[64px] flex flex-col items-center justify-center">
            <Truck size={80} className="mb-6 text-slate-200" />
            <p className="font-black uppercase tracking-[0.4em] text-sm italic">Strategic Reserve Awaits Entry</p>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Logistics Registry Entry">
        <form onSubmit={handleSubmit} className="space-y-8">
          <Input 
            label="Shipment Reference ID" 
            placeholder="e.g. MSC-99231-G" 
            required 
            value={formData.referenceNumber}
            onChange={(e) => setFormData({...formData, referenceNumber: e.target.value})}
          />
          <Input 
            label="Global Entity (Supplier)" 
            placeholder="Official Registered Manufacturer" 
            required 
            value={formData.supplier}
            onChange={(e) => setFormData({...formData, supplier: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-6">
            <Input 
              label="ETA / Arrival Date" 
              type="date" 
              required 
              value={formData.arrivalDate}
              onChange={(e) => setFormData({...formData, arrivalDate: e.target.value})}
            />
          </div>

          <div className="space-y-4 bg-brand-linen/20 p-6 rounded-[32px] border border-brand-linen/50">
            <p className="text-[10px] font-black text-brand-dark uppercase tracking-widest mb-4">Shipment Manifest (Items)</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Existing Product (Optional)</label>
                <select 
                  className="w-full bg-white border border-brand-linen rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-brand-gold transition-all"
                  onChange={(e) => selectExistingProduct(e.target.value)}
                  value={newItem.productId || ''}
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
                value={newItem.productName}
                onChange={(e) => setNewItem({...newItem, productName: e.target.value})}
              />
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</label>
                <select 
                  className="w-full bg-white border border-brand-linen rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-brand-gold transition-all"
                  value={newItem.category}
                  onChange={(e) => setNewItem({...newItem, category: e.target.value as Category})}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Input 
                label="Size (ml)" 
                type="number" 
                value={newItem.size}
                onChange={(e) => setNewItem({...newItem, size: parseInt(e.target.value) || 0})}
              />
              <Input 
                label="Quantity" 
                type="number" 
                value={newItem.quantity}
                onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})}
              />
              <Input 
                label="Cost Price (per unit)" 
                type="number" 
                step="0.01"
                value={newItem.costPrice}
                onChange={(e) => setNewItem({...newItem, costPrice: parseFloat(e.target.value) || 0})}
              />
            </div>
            <Button variant="outline" className="w-full mt-4" type="button" onClick={addItem}>Add to Manifest</Button>

            <div className="mt-6 space-y-2">
              {formData.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-brand-linen/50 shadow-sm">
                  <div>
                    <p className="text-xs font-black text-brand-dark">{item.productName}</p>
                    <p className="text-[9px] text-slate-400 uppercase font-bold">{item.quantity} units @ {db.formatMoney(item.costPrice)}</p>
                  </div>
                  <button type="button" onClick={() => removeItem(idx)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <Input 
            label="Operational Intelligence Notes" 
            placeholder="Special handling or logistics specificities..." 
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
          />
          <div className="flex gap-4 pt-8">
            <Button variant="outline" className="flex-1 py-5" type="button" onClick={() => setIsModalOpen(false)}>Abort Record</Button>
            <Button className="flex-1 py-5" type="submit">Deploy Strategy</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
