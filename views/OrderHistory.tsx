import React from 'react';
import { db } from '../services/mockData';
import { Clock, Search } from 'lucide-react';
import { Card, Badge, Input } from '../components/UI';

export const OrderHistory: React.FC = () => {
  const orders = db.getOrders();
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Order History</h2>
          <p className="text-slate-500 mt-1">Review all sales transactions.</p>
        </div>
      </div>

      <Card noPadding>
        <div className="p-4 border-b border-slate-50">
          <Input icon={<Search size={18} />} placeholder="Search orders by ID or customer..." />
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
              {orders.slice().reverse().map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-5 font-bold text-slate-900">{o.id}</td>
                  <td className="px-8 py-5 font-medium text-slate-600">{o.customerName}</td>
                  <td className="px-8 py-5 font-black text-indigo-600">{db.formatMoney(o.total)}</td>
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
          {orders.length === 0 && (
            <div className="py-24 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="text-slate-200" size={32} />
              </div>
              <p className="text-slate-400 font-bold">No orders recorded yet</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};