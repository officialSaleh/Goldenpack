
import React, { useState } from 'react';
import { Truck, Search, Plus, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { db } from '../services/mockData';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import { Container } from '../types';

export const Containers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const containers = db.getContainers();

  const [formData, setFormData] = useState({
    referenceNumber: '',
    arrivalDate: new Date().toISOString().split('T')[0],
    supplier: '',
    itemCount: '',
    notes: ''
  });

  const filtered = containers.filter(c => 
    c.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newContainer: Container = {
      id: Math.random().toString(36).substr(2, 9),
      referenceNumber: formData.referenceNumber,
      arrivalDate: formData.arrivalDate,
      supplier: formData.supplier,
      itemCount: parseInt(formData.itemCount) || 0,
      status: 'In Transit',
      notes: formData.notes
    };
    await db.addContainer(newContainer);
    setIsModalOpen(false);
    setFormData({ referenceNumber: '', arrivalDate: new Date().toISOString().split('T')[0], supplier: '', itemCount: '', notes: '' });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Logistics & Containers</h2>
          <p className="text-slate-500 mt-1">Track incoming bulk shipments and supplier inventory.</p>
        </div>
        <Button icon={<Plus size={20} />} onClick={() => setIsModalOpen(true)}>Record Arrival</Button>
      </div>

      <div className="relative">
        <Input 
          icon={<Search size={20} />} 
          placeholder="Search by Ref # or Supplier..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.slice().reverse().map(c => (
          <Card key={c.id} className="relative group overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-brand-gold transition-colors">
                <Truck size={24} />
              </div>
              <Badge color={c.status === 'Arrived' ? 'emerald' : c.status === 'Unloaded' ? 'slate' : 'gold'}>
                {c.status}
              </Badge>
            </div>
            
            <h3 className="text-xl font-black text-brand-dark mb-1">{c.referenceNumber}</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{c.supplier}</p>
            
            <div className="mt-8 pt-6 border-t border-slate-50 space-y-3">
              <div className="flex items-center text-xs text-slate-500 font-bold uppercase tracking-widest space-x-3">
                <Calendar size={14} className="text-slate-300" />
                <span>Arrival: {c.arrivalDate}</span>
              </div>
              <div className="flex items-center text-xs text-slate-500 font-bold uppercase tracking-widest space-x-3">
                <FileText size={14} className="text-slate-300" />
                <span>{c.itemCount.toLocaleString()} Total Units</span>
              </div>
            </div>

            {c.notes && (
              <p className="mt-4 text-[10px] text-slate-400 italic bg-slate-50 p-3 rounded-xl">"{c.notes}"</p>
            )}
            
            <div className="absolute top-0 right-0 w-1 h-full bg-brand-gold opacity-10 group-hover:opacity-50 transition-opacity" />
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-32 text-center opacity-20 border-2 border-dashed border-slate-200 rounded-[40px]">
            <Truck size={64} className="mx-auto mb-4" />
            <p className="font-black uppercase tracking-[0.5em] text-sm">Waiting for incoming stock</p>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registry of Arrival">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input 
            label="Container Reference #" 
            placeholder="e.g. MSC-99231-G" 
            required 
            value={formData.referenceNumber}
            onChange={(e) => setFormData({...formData, referenceNumber: e.target.value})}
          />
          <Input 
            label="Shipment Supplier" 
            placeholder="Global Perfume Packaging Co." 
            required 
            value={formData.supplier}
            onChange={(e) => setFormData({...formData, supplier: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Arrival Date" 
              type="date" 
              required 
              value={formData.arrivalDate}
              onChange={(e) => setFormData({...formData, arrivalDate: e.target.value})}
            />
            <Input 
              label="Estimated Units" 
              type="number" 
              placeholder="5000" 
              required 
              value={formData.itemCount}
              onChange={(e) => setFormData({...formData, itemCount: e.target.value})}
            />
          </div>
          <Input 
            label="Logistics Notes" 
            placeholder="Any specific handling instructions?" 
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
          />
          <div className="flex gap-4 pt-4">
            <Button variant="outline" className="flex-1" type="button" onClick={() => setIsModalOpen(false)}>Abort</Button>
            <Button className="flex-1" type="submit">Finalize Record</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
