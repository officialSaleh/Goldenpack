import React from 'react';
import { 
  TrendingUp, 
  AlertCircle, 
  CreditCard, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight,
  MoreVertical,
  ChevronRight,
  ShoppingCart
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '../services/mockData';

const data = [
  { name: 'Mon', revenue: 4000, profit: 2400 },
  { name: 'Tue', revenue: 3000, profit: 1398 },
  { name: 'Wed', revenue: 2000, profit: 9800 },
  { name: 'Thu', revenue: 2780, profit: 3908 },
  { name: 'Fri', revenue: 1890, profit: 4800 },
  { name: 'Sat', revenue: 2390, profit: 3800 },
  { name: 'Sun', revenue: 3490, profit: 4300 },
];

export const Dashboard: React.FC = () => {
  const stats = db.getDashboardStats();

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-brand-dark tracking-tighter italic">Operational<span className="text-brand-gold">Overview</span></h2>
          <p className="text-gray-400 mt-2 font-medium">Enterprise performance for {new Date().toLocaleDateString(undefined, {month: 'long', day: 'numeric'})}.</p>
        </div>
        <div className="hidden md:flex items-center space-x-2 bg-brand-linen/40 p-2 rounded-2xl border border-brand-linen">
           <div className="px-4 py-2 bg-white rounded-xl shadow-sm text-xs font-black text-brand-dark uppercase tracking-widest cursor-pointer">Live Metrics</div>
           <div className="px-4 py-2 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-brand-gold transition-colors cursor-pointer">Historical Data</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard 
          title="Daily Revenue" 
          value={db.formatMoney(stats.todaySales)} 
          icon={<TrendingUp className="text-brand-dark" size={24} />}
          trend="+12% Since Open"
          color="gold"
        />
        <StatCard 
          title="Gross Turnover" 
          value={db.formatMoney(stats.totalRevenue)} 
          icon={<ArrowUpRight className="text-white" size={24} />}
          trend="Lifetime Period"
          color="dark"
        />
        <StatCard 
          title="Active Credit" 
          value={db.formatMoney(stats.outstandingCredit)} 
          icon={<CreditCard className="text-brand-gold" size={24} />}
          trend={`${stats.overdueCustomersCount} flagged accts`}
          color="linen"
          isAlert={stats.overdueCustomersCount > 0}
        />
        <StatCard 
          title="Low Stock" 
          value={stats.lowStockAlerts.toString()} 
          icon={<Package className="text-rose-600" size={24} />}
          trend="Immediate Restock"
          color="rose"
          isAlert={stats.lowStockAlerts > 0}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white p-10 rounded-[40px] shadow-sm border border-brand-linen/50">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight italic">Revenue <span className="text-brand-gold">Trajectory</span></h3>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mt-1">7-Day Transactional Intelligence</p>
            </div>
            <select className="bg-brand-linen/50 border-none rounded-2xl px-5 py-3 text-xs font-black text-brand-dark outline-none cursor-pointer uppercase tracking-widest hover:bg-brand-linen transition-colors">
              <option>Current Week</option>
              <option>Previous Month</option>
            </select>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C5A028" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#C5A028" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F0EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 10, fontWeight: 700}} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 10, fontWeight: 700}} />
                <Tooltip 
                  contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '15px'}}
                  itemStyle={{fontWeight: 900, color: '#C5A028'}}
                />
                <Area type="monotone" dataKey="revenue" stroke="#C5A028" strokeWidth={4} fillOpacity={1} fill="url(#colorGold)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[40px] shadow-sm border border-brand-linen/50">
          <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight italic mb-8">Recent <span className="text-brand-gold">Flow</span></h3>
          <div className="space-y-8">
            {db.getOrders().slice(-5).reverse().map((order) => (
              <div key={order.id} className="flex items-center space-x-5 group">
                <div className="w-12 h-12 rounded-2xl bg-brand-linen/50 flex items-center justify-center font-black text-brand-dark group-hover:bg-brand-gold transition-colors">
                  {order.customerName.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-brand-dark tracking-tight">{order.customerName}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{order.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-brand-gold">{db.formatMoney(order.total)}</p>
                  <p className={`text-[8px] font-black px-2 py-0.5 rounded-lg inline-block uppercase tracking-widest mt-1 ${
                    order.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-linen text-brand-dark opacity-50'
                  }`}>
                    {order.status}
                  </p>
                </div>
              </div>
            ))}
            {db.getOrders().length === 0 && (
              <div className="text-center py-16 opacity-20">
                <ShoppingCart className="mx-auto mb-4" size={56} />
                <p className="text-xs font-black uppercase tracking-widest">No Sales Registered</p>
              </div>
            )}
          </div>
          <button className="w-full mt-10 py-4 bg-brand-linen/50 text-brand-dark rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-brand-gold transition-all flex items-center justify-center space-x-2">
            <span>Audit All Records</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; trend: string; color: string; isAlert?: boolean }> = ({ title, value, icon, trend, color, isAlert }) => {
  const themes = {
    gold: "bg-brand-gold text-brand-dark border-brand-gold/20",
    dark: "bg-brand-dark text-white border-white/5",
    linen: "bg-brand-linen text-brand-dark border-brand-linen",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
  };
  
  return (
    <div className={`p-8 rounded-[36px] border shadow-sm transition-transform hover:scale-[1.02] ${themes[color as keyof typeof themes]}`}>
      <div className="flex items-center justify-between mb-8">
        <div className={`p-4 rounded-2xl ${color === 'gold' ? 'bg-white/20' : color === 'dark' ? 'bg-brand-gold' : 'bg-white'}`}>
          {icon}
        </div>
        <MoreVertical className="opacity-20" size={20} />
      </div>
      <div>
        <p className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-60`}>{title}</p>
        <h4 className="text-3xl font-black mt-2 tracking-tighter">{value}</h4>
      </div>
      <div className="flex items-center mt-6 text-[9px] font-black uppercase tracking-widest opacity-50">
        <span>{trend}</span>
      </div>
    </div>
  );
};