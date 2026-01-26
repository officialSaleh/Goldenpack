
import React, { useState } from 'react';
import { Users, Search, Plus, Phone, Briefcase, ChevronRight, History, CreditCard } from 'lucide-react';
import { db } from '../services/mockData.ts';
import { Card, Button, Input, Modal, Badge } from '../components/UI.tsx';

export const Customers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState(db.getCustomers());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    phone: '',
    creditLimit: '',
    defaultCreditDays: '30'
  });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.businessName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const newCustomer = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      businessName: formData.businessName,
      phone: formData.phone,
      creditLimit: parseFloat(formData.creditLimit),
      defaultCreditDays: parseInt(formData.defaultCreditDays),
      outstandingBalance: 0
    };
    db.addCustomer(newCustomer);
    setCustomers([...db.getCustomers()]);
    setIsModalOpen(false);
    setFormData({ name: '', businessName: '', phone: '', creditLimit: '', defaultCreditDays: '30' });
  };

  const currencySymbol = db.getSettings()?.currencySymbol || '$';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Customers</h2>
          <p className="text-slate-500 mt-1">Manage client accounts and credit lines.</p>
        </div>
        <Button icon={<Plus size={20} />} onClick={() => setIsModalOpen(true)}>
          New Customer
        </Button>
      </div>

      <div className="relative">
        <Input 
          icon={<Search size={20} />} 
          placeholder="Search by name, business or phone..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredCustomers.map(c => {
          const isAtLimit = c.outstandingBalance >= c.creditLimit;
          const status = isAtLimit ? 'Over Limit' : c.outstandingBalance > 0 ? 'Active Credit' : 'Normal';

          return (
            <Card key={c.id} className="group hover:border-indigo-200 transition-colors">
              <div className="flex items-start justify-between mb-8">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-2xl shadow-inner">
                  {c.name.charAt(0)}
                </div>
                <Badge color={status === 'Over Limit' ? 'rose' : status === 'Active Credit' ? 'amber' : 'emerald'}>
                  {status}
                </Badge>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900">{c.name}</h3>
              <div className="space-y-1.5 mt-2">
                <div className="flex items-center text-slate-500 text-sm space-x-2 font-medium">
                  <Briefcase size={14} className="text-slate-300" />
                  <span>{c.businessName}</span>
                </div>
                <div className="flex items-center text-slate-500 text-sm space-x-2 font-medium">
                  <Phone size={14} className="text-slate-300" />
                  <span>{c.phone}</span>
                </div>
              </div>

              <div className="mt-10 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  <span>Usage</span>
                  <span>Limit: {db.formatMoney(c.creditLimit)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className={`text-2xl font-black ${isAtLimit ? 'text-rose-600' : 'text-slate-900'}`}>
                    {db.formatMoney(c.outstandingBalance)}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full mt-4 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${isAtLimit ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'bg-indigo-500'}`} 
                    style={{ width: `${Math.min(100, (c.outstandingBalance / c.creditLimit) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" icon={<History size={16} />}>History</Button>
                <Button variant="secondary" className="px-4" icon={<ChevronRight size={20} />} />
              </div>
            </Card>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Customer">
        <form onSubmit={handleAddCustomer} className="space-y-6">
          <Input 
            label="Full Name" 
            placeholder="John Doe" 
            required 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
          <Input 
            label="Business Name" 
            placeholder="Aroma Boutique LLC" 
            required 
            value={formData.businessName}
            onChange={(e) => setFormData({...formData, businessName: e.target.value})}
          />
          <Input 
            label="Phone Number" 
            placeholder="050 123 4567" 
            required 
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label={`Credit Limit (${currencySymbol})`}
              type="number" 
              placeholder="5000" 
              required 
              value={formData.creditLimit}
              onChange={(e) => setFormData({...formData, creditLimit: e.target.value})}
            />
            <Input 
              label="Credit Days" 
              type="number" 
              placeholder="30" 
              required 
              value={formData.defaultCreditDays}
              onChange={(e) => setFormData({...formData, defaultCreditDays: e.target.value})}
            />
          </div>
          <div className="flex gap-4 pt-4">
            <Button variant="outline" className="flex-1" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" type="submit">Add Customer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
