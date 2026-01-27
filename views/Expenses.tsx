import React, { useState } from 'react';
import { db } from '../services/mockData';
import { Wallet, Plus, DollarSign, Calendar } from 'lucide-react';
import { Card, Button, Modal, Input } from '../components/UI';
import { EXPENSE_CATEGORIES } from '../constants';
import { ExpenseCategory } from '../types';

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState(db.getExpenses());
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    category: EXPENSE_CATEGORIES[0] as ExpenseCategory,
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const newExpense = {
      id: Math.random().toString(36).substr(2, 9),
      category: formData.category,
      amount: parseFloat(formData.amount),
      date: formData.date,
      notes: formData.notes
    };
    db.addExpense(newExpense);
    setExpenses([...db.getExpenses()]);
    setIsModalOpen(false);
    setFormData({
      category: EXPENSE_CATEGORIES[0] as ExpenseCategory,
      amount: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const currencySymbol = db.getSettings()?.currencySymbol || '$';

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Expenses</h2>
          <p className="text-slate-500 mt-1">Track business operational costs.</p>
        </div>
        <Button icon={<Plus size={20} />} onClick={() => setIsModalOpen(true)}>
          Record Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {expenses.map(e => (
          <Card key={e.id} className="flex items-center space-x-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Wallet size={32} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-900">{e.category}</h4>
              <p className="text-slate-500 text-sm font-medium">{e.date}</p>
              {e.notes && <p className="text-xs text-slate-400 italic mt-1">{e.notes}</p>}
            </div>
            <div className="text-right">
              <p className="font-black text-2xl text-slate-900">{db.formatMoney(e.amount)}</p>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record New Expense">
        <form onSubmit={handleAddExpense} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
            <select 
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value as ExpenseCategory})}
            >
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Input 
            label={`Amount (${currencySymbol})`}
            type="number" 
            placeholder="0.00" 
            required 
            value={formData.amount}
            onChange={(e) => setFormData({...formData, amount: e.target.value})}
          />
          <Input 
            label="Date" 
            type="date" 
            required 
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
          />
          <Input 
            label="Notes (Optional)" 
            placeholder="What was this for?" 
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
          />
          <div className="flex gap-4 pt-4">
            <Button variant="outline" className="flex-1" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" type="submit">Save Expense</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};