
import React from 'react';
import { 
  PieChart, Pie, Tooltip, ResponsiveContainer, Cell, Legend 
} from 'recharts';
import { Download, FileText, TrendingUp, DollarSign, PieChart as PieIcon, ArrowUpRight, Award, Printer } from 'lucide-react';
import { db } from '../services/mockData';
import { Card, Badge, Button } from '../components/UI';

export const Reports: React.FC = () => {
  const stats = db.getDashboardStats();
  const topProducts = db.getTopSellingProducts();
  const orders = db.getOrders();
  const expenses = db.getExpenses();

  const categoryData = [
    { name: 'Bottle', value: orders.filter(o => o.items.some(i => db.getProducts().find(p => p.id === i.productId)?.category === 'Bottle')).length },
    { name: 'Spray', value: orders.filter(o => o.items.some(i => db.getProducts().find(p => p.id === i.productId)?.category === 'Spray')).length },
    { name: 'Cap', value: orders.filter(o => o.items.some(i => db.getProducts().find(p => p.id === i.productId)?.category === 'Cap')).length },
  ];

  return (
    <div className="space-y-8 print:bg-white print:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Financial Intelligence</h2>
          <p className="text-slate-500 mt-1">Enterprise performance and logistics auditing.</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" icon={<Printer size={20} />} onClick={() => window.print()}>Generate PDF</Button>
          <Button icon={<Download size={20} />}>Export Data</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ReportSummaryCard title="Gross Turnover" value={db.formatMoney(stats.totalRevenue)} icon={<TrendingUp />} />
        <ReportSummaryCard title="Inventory Value" value={db.formatMoney(stats.totalInventoryValue)} icon={<FileText />} color="blue" />
        <ReportSummaryCard title="Total Overhead" value={db.formatMoney(expenses.reduce((s, e) => s + e.amount, 0))} icon={<DollarSign />} color="rose" />
        <ReportSummaryCard title="Net Intel Profit" value={db.formatMoney(stats.netProfit)} icon={<PieIcon />} color="emerald" isHighlight />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-8">Asset Allocation</h3>
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
                      <Cell key={`cell-${index}`} fill={['#C5A028', '#1C1C1C', '#94A3B8'][index % 3]} />
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
              <h3 className="text-xl font-bold text-slate-900">Top Strategic Products</h3>
              <Badge color="gold">Revenue Leaders</Badge>
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
                      <p className="text-xs text-slate-500 font-medium">{p.quantity} units processed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900">{db.formatMoney(p.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10">
              <Award size={120} />
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Target Accuracy</h4>
            <div className="text-3xl font-black mb-4">92.4%</div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-brand-gold h-full w-[92%]"></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 font-medium leading-relaxed italic uppercase tracking-widest">
              Automated financial forecasting tracking 12% above quarterly baseline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReportSummaryCard: React.FC<{ title: string, value: string, icon: React.ReactNode, color?: string, isHighlight?: boolean }> = ({ title, value, icon, color = 'indigo', isHighlight }) => (
  <div className={`p-8 rounded-3xl border transition-all ${isHighlight ? 'bg-brand-dark text-white border-white/5 shadow-xl' : 'bg-white border-slate-100 shadow-sm'}`}>
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${isHighlight ? 'bg-brand-gold text-brand-dark' : `bg-slate-50 text-slate-900`}`}>
      {icon}
    </div>
    <p className={`text-[9px] font-black uppercase tracking-widest ${isHighlight ? 'text-gray-500' : 'text-slate-400'}`}>{title}</p>
    <h4 className="text-2xl font-black mt-1">{value}</h4>
  </div>
);
