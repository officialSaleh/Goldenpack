
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend 
} from 'recharts';
import { Download, FileText, TrendingUp, DollarSign, PieChart as PieIcon, ArrowUpRight, Award } from 'lucide-react';
import { db } from '../services/mockData.ts';
import { Card, Badge } from '../components/UI.tsx';

export const Reports: React.FC = () => {
  const orders = db.getOrders();
  const expenses = db.getExpenses();
  const products = db.getProducts();

  const totalRevenue = orders.reduce((acc, o) => acc + o.total, 0);
  const totalVAT = orders.reduce((acc, o) => acc + o.vat, 0);
  const totalCost = orders.reduce((acc, o) => {
    return acc + o.items.reduce((itemAcc, item) => {
      const prod = products.find(p => p.id === item.productId);
      return itemAcc + (item.quantity * (prod?.costPrice || 0));
    }, 0);
  }, 0);
  
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const grossProfit = totalRevenue - totalVAT - totalCost;
  const netProfit = grossProfit - totalExpenses;

  const topProducts = db.getTopSellingProducts();

  const categoryData = [
    { name: 'Bottle', value: orders.filter(o => o.items.some(i => products.find(p => p.id === i.productId)?.category === 'Bottle')).length },
    { name: 'Spray', value: orders.filter(o => o.items.some(i => products.find(p => p.id === i.productId)?.category === 'Spray')).length },
    { name: 'Cap', value: orders.filter(o => o.items.some(i => products.find(p => p.id === i.productId)?.category === 'Cap')).length },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Reports</h2>
          <p className="text-slate-500 mt-1">Enterprise financial performance overview.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all">
            <FileText size={20} />
            <span>Excel</span>
          </button>
          <button className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
            <Download size={20} />
            <span>PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ReportSummaryCard title="Gross Sales" value={db.formatMoney(totalRevenue)} icon={<TrendingUp />} />
        <ReportSummaryCard title="VAT" value={db.formatMoney(totalVAT)} icon={<FileText />} color="blue" />
        <ReportSummaryCard title="Expenses" value={db.formatMoney(totalExpenses)} icon={<DollarSign />} color="rose" />
        <ReportSummaryCard title="Net Profit" value={db.formatMoney(netProfit)} icon={<PieIcon />} color="emerald" isHighlight />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-8">Sales by Category</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#ec4899'][index % 3]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-900">Top Performing Products</h3>
              <Badge color="indigo">By Revenue</Badge>
            </div>
            <div className="space-y-6">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-bold text-slate-400">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500 font-medium">{p.quantity} units sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900">{db.formatMoney(p.revenue)}</p>
                    <div className="w-24 bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                      <div className="bg-indigo-500 h-full" style={{ width: `${(p.revenue / (topProducts[0]?.revenue || 1)) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
              {topProducts.length === 0 && (
                <div className="py-20 text-center text-slate-400 font-bold italic">No sales data found for top products.</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-8">Recent Expenses</h3>
            <div className="space-y-6">
              {expenses.slice(-5).reverse().map((exp) => (
                <div key={exp.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{exp.category}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{exp.date}</p>
                  </div>
                  <p className="font-bold text-rose-600">-{db.formatMoney(exp.amount)}</p>
                </div>
              ))}
              {expenses.length === 0 && <p className="text-center text-slate-400 py-10">No expenses.</p>}
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10">
              <Award size={120} />
            </div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Target Achievement</h4>
            <div className="text-3xl font-black mb-4">84%</div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full w-[84%]"></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 font-medium leading-relaxed">
              Revenue target for Q2 is grounded in your base currency. Currently tracking ahead of last quarter's performance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReportSummaryCard: React.FC<{ title: string, value: string, icon: React.ReactNode, color?: string, isHighlight?: boolean }> = ({ title, value, icon, color = 'indigo', isHighlight }) => (
  <div className={`p-8 rounded-3xl border transition-all hover:scale-[1.02] ${isHighlight ? 'bg-indigo-600 text-white border-indigo-500 shadow-xl shadow-indigo-200' : 'bg-white border-slate-100 shadow-sm'}`}>
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${isHighlight ? 'bg-white/20 text-white' : `bg-${color}-50 text-${color}-600`}`}>
      {icon}
    </div>
    <p className={`text-[10px] font-black uppercase tracking-widest ${isHighlight ? 'text-indigo-200' : 'text-slate-400'}`}>{title}</p>
    <h4 className="text-3xl font-black mt-1">{value}</h4>
    <div className="flex items-center space-x-1 mt-4 text-[10px] font-black uppercase tracking-wider">
      <ArrowUpRight size={14} className={isHighlight ? 'text-indigo-200' : 'text-emerald-500'} />
      <span className={isHighlight ? 'text-indigo-200' : 'text-emerald-500'}>Active Period</span>
    </div>
  </div>
);
