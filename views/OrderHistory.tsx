import React, { useState } from 'react';
import { db } from '../services/mockData';
import { Clock, Search, FileX } from 'lucide-react';
import { Card, Badge, Input } from '../components/UI';

export const OrderHistory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const orders = db.getOrders();

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Order History</h2>
          <p className="text-slate-500 mt-1">Review all sales transactions and payment statuses.</p>
        </div>
      </div>

      <Card noPadding>
        <div className="p-6 border-b border-slate-50 bg-slate-50/30">
          <Input 
            icon={<Search size={18} />} 
            placeholder="Search orders by ID or customer name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-8 py-5">Order ID</th>
                <th className="px-8 py-5">Customer</th>
                <th className="px-8 py-5">Total</th>
                <th className="px-8 py-5">Type</th>
                <th className="px-8 py-5">Due Date</th>
                <th className="px-8 py-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.slice().reverse().map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-5 font-bold text-slate-900 tracking-tight">{o.id}</td>
                  <td className="px-8 py-5 font-medium text-slate-600">{o.customerName}</td>
                  <td className="px-8 py-5 font-black text-brand-gold">{db.formatMoney(o.total)}</td>
                  <td className="px-8 py-5">
                    <Badge color={o.paymentType === 'Cash' ? 'emerald' : 'indigo'}>{o.paymentType}</Badge>
                  </td>
                  <td className="px-8 py-5 text-sm text-slate-500 font-medium">{o.dueDate}</td>
                  <td className="px-8 py-5">
                    <Badge color={
                      o.status === 'Paid' ? 'emerald' : 
                      o.status === 'Overdue' ? 'rose' : 'amber'
                    }>
                      {o.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredOrders.length === 0 && (
            <div className="py-32 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                {searchTerm ? <FileX className="text-slate-200" size={40} /> : <Clock className="text-slate-200" size={40} />}
              </div>
              <p className="text-slate-900 font-black uppercase tracking-widest text-sm">
                {searchTerm ? 'No matches found' : 'No orders recorded'}
              </p>
              <p className="text-slate-400 text-xs mt-2">
                {searchTerm ? 'Try adjusting your search criteria' : 'New sales will appear here automatically'}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};