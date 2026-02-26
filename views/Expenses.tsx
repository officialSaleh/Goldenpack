import React, { useState, useEffect } from 'react';
import { db } from '../services/mockData';
import { Wallet, Plus, DollarSign, Calendar, Edit2, Trash2, TrendingDown } from 'lucide-react';
import { Card, Button, Modal, Input } from '../components/UI';
import { MonthSelector } from '../components/MonthSelector';
import { EXPENSE_CATEGORIES } from '../constants';
import { ExpenseCategory } from '../types';

export const Expenses: React.FC = () => {
  const [allExpenses, setAllExpenses] = useState(db.getExpenses());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setAllExpenses(db.getExpenses());
    });
    return () => unsubscribe();
  }, []);

  const expenses = allExpenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  const monthlyTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  const [formData, setFormData] = useState({
    category: EXPENSE_CATEGORIES[0] as ExpenseCategory,
    customCategory: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setFormData({
      category: EXPENSE_CATEGORIES[0] as ExpenseCategory,
      customCategory: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (e: any) => {
    setEditingExpense(e.id);
    setFormData({
      category: e.category,
      customCategory: e.customCategory || '',
      amount: e.amount.toString(),
      date: e.date,
      notes: e.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const expenseData = {
      category: formData.category,
      customCategory: formData.category === 'Other' ? formData.customCategory : undefined,
      amount: parseFloat(formData.amount),
      date: formData.date,
      notes: formData.notes
    };

    if (editingExpense) {
      await db.updateExpense(editingExpense, expenseData);
    } else {
      const newExpense = {
        id: Math.random().toString(36).substr(2, 9),
        ...expenseData
      };
      await db.addExpense(newExpense);
    }

    setIsModalOpen(false);
    setEditingExpense(null);
  };

  const handleDelete = async (id: string) => {
    await db.deleteExpense(id);
    setConfirmDelete(null);
  };

  const currencySymbol = db.getSettings()?.currencySymbol || '$';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Expenses</h2>
          <p className="text-slate-500 mt-1">Track business operational costs.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="bg-white border border-slate-100 rounded-2xl px-6 py-3 flex items-center space-x-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Monthly Burn</p>
              <p className="text-lg font-black text-slate-900 tracking-tighter">{db.formatMoney(monthlyTotal)}</p>
            </div>
          </div>
          <MonthSelector 
            selectedMonth={selectedMonth} 
            selectedYear={selectedYear} 
            onChange={(m, y) => {
              setSelectedMonth(m);
              setSelectedYear(y);
            }} 
          />
          <Button icon={<Plus size={20} />} onClick={handleOpenAdd}>
            Record Expense
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...expenses].sort((a, b) => b.date.localeCompare(a.date)).map(e => (
          <Card key={e.id} className="relative group">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Wallet size={32} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900">
                  {e.category === 'Other' && e.customCategory ? e.customCategory : e.category}
                </h4>
                <p className="text-slate-500 text-sm font-medium">{e.date}</p>
                {e.notes && <p className="text-xs text-slate-400 italic mt-1">{e.notes}</p>}
              </div>
              <div className="text-right">
                <p className="font-black text-2xl text-slate-900">{db.formatMoney(e.amount)}</p>
              </div>
            </div>
            
            <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => handleOpenEdit(e)}
                className="p-2 bg-white shadow-sm border border-slate-100 rounded-lg text-slate-400 hover:text-brand-gold transition-colors"
              >
                <Edit2 size={14} />
              </button>
              <button 
                onClick={() => setConfirmDelete(e.id)}
                className="p-2 bg-white shadow-sm border border-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingExpense ? "Edit Expense Record" : "Record New Expense"}>
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
          {formData.category === 'Other' && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <Input 
                label="Expense Title" 
                placeholder="e.g. Office Supplies, Repairs..." 
                required
                value={formData.customCategory}
                onChange={(e) => setFormData({...formData, customCategory: e.target.value})}
              />
            </div>
          )}
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
            <Button className="flex-1" type="submit">{editingExpense ? "Update Expense" : "Save Expense"}</Button>
          </div>
        </form>
      </Modal>

      {confirmDelete && (
        <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirm Deletion">
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <p className="text-slate-600 font-bold mb-8">Are you sure you want to permanently delete this expense record? This action cannot be undone.</p>
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="danger" className="flex-1" onClick={() => handleDelete(confirmDelete!)}>Delete Expense</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};