
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  AlertCircle, 
  CreditCard, 
  Package, 
  ArrowUpRight, 
  MoreVertical,
  ChevronRight,
  ShoppingCart,
  Wallet,
  Zap,
  BarChart4
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '../services/mockData';

interface DashboardProps {
  onViewAudit?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onViewAudit }) => {
  const [viewMode, setViewMode] = useState<'live' | 'reports'>('live');
  
  // Real-time synchronization
  const [, setTick] = useState(0);
  useEffect(() => db.subscribe(() => setTick(t => t + 1)), []);

  const stats = db.getDashboardStats();
  const chartData = db.getTrajectoryData();

  return (
    <div className="space-y-6 md:space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-brand-dark tracking-tighter uppercase italic">Operational<span className="text-brand-gold">Overview</span></h2>
          <p className="text-gray-400 text-xs md:text-sm font-medium">Intel for {new Date().toLocaleDateString(undefined, {month: 'long', day: 'numeric'})}.</p>
        </div>
        
        {/* VIEW TOGGLE */}
        <div className="flex items-center space-x-1 bg-brand-linen/40 p-1.5 rounded-2xl border border-brand-linen self-start md:self-center">
           <button 
            onClick={() => setViewMode('live')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'live' ? 'bg-white shadow-sm text-brand-gold' : 'text-gray-400 hover:text-brand-dark'}`}
           >
             <Zap size={14} />
             <span>Live View</span>
           </button>
           <button 
            onClick={() => setViewMode('reports')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'reports' ? 'bg-white shadow-sm text-brand-gold' : 'text-gray-400 hover:text-brand-dark'}`}
           >
             <BarChart4 size={14} />
             <span>Report View</span>
           </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        <StatCard 
          title={viewMode === 'live' ? "Today's Revenue" : "Gross Turnover"} 
          value={db.formatMoney(viewMode === 'live' ? stats.todaySales : stats.totalRevenue)} 
          icon={<TrendingUp className="text-brand-dark" size={20} />}
          trend={viewMode === 'live' ? "Active Session" : "Lifetime Accumulation"}
          color="gold"
        />
        <StatCard 
          title="Net Profit" 
          value={db.formatMoney(stats.netProfit)} 
          icon={<Wallet className="text-white" size={20} />}
          trend="Post-Expenditure"
          color="dark"
        />
        <StatCard 
          title="Inventory Value" 
          value={db.formatMoney(stats.totalInventoryValue)} 
          icon={<Package className="text-brand-gold" size={20} />}
          trend="Asset Capital"
          color="linen"
        />
        <StatCard 
          title="Active Credit" 
          value={db.formatMoney(stats.outstandingCredit)} 
          icon={<CreditCard className="text-rose-600" size={20} />}
          trend={`${stats.overdueCustomersCount} flagged items`}
          color="rose"
          isAlert={stats.overdueCustomersCount > 0}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
        <div className="lg:col-span-2 bg-white p-6 md:p-10 rounded-[32px] md:rounded-[40px] shadow-sm border border-brand-linen/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h3 className="text-lg md:text-xl font-black text-brand-dark uppercase tracking-tight italic">Revenue <span className="text-brand-gold">Trajectory</span></h3>
              <p className="text-[9px] md:text-xs text-gray-400 font-medium uppercase tracking-widest mt-1">Real-Time 7-Day Performance</p>
            </div>
          </div>
          <div className="h-[250px] md:h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C5A028" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#C5A028" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F0EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 9, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 9, fontWeight: 700}} />
                <Tooltip 
                  contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px'}}
                  itemStyle={{fontWeight: 900, color: '#C5A028', fontSize: '10px'}}
                />
                <Area type="monotone" dataKey="revenue" stroke="#C5A028" strokeWidth={3} fillOpacity={1} fill="url(#colorGold)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[40px] shadow-sm border border-brand-linen/50 overflow-hidden">
          <h3 className="text-lg md:text-xl font-black text-brand-dark uppercase tracking-tight italic mb-6">Recent <span className="text-brand-gold">Flow</span></h3>
          <div className="space-y-6">
            {db.getOrders().slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center space-x-4 group">
                <div className="w-10 h-10 rounded-xl bg-brand-linen/50 flex items-center justify-center font-black text-brand-dark text-xs flex-shrink-0">
                  {order.customerName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-brand-dark tracking-tight truncate">{order.customerName}</p>
                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{order.date}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-black text-brand-gold">{db.formatMoney(order.total)}</p>
                  <p className={`text-[7px] font-black px-1.5 py-0.5 rounded-md inline-block uppercase tracking-widest mt-1 ${
                    order.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-linen text-brand-dark opacity-50'
                  }`}>
                    {order.status}
                  </p>
                </div>
              </div>
            ))}
            {db.getOrders().length === 0 && (
              <div className="text-center py-10 opacity-20">
                <ShoppingCart className="mx-auto mb-4" size={40} />
                <p className="text-[10px] font-black uppercase tracking-widest">No Sales Recorded</p>
              </div>
            )}
          </div>
          <button 
            onClick={onViewAudit}
            className="w-full mt-8 py-4 bg-brand-linen/30 text-brand-dark rounded-xl font-black text-[8px] uppercase tracking-[0.2em] hover:bg-brand-gold transition-all flex items-center justify-center space-x-2"
          >
            <span>Audit Records</span>
            <ChevronRight size={12} />
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
    <div className={`p-6 md:p-8 rounded-3xl border shadow-sm transition-transform active:scale-95 ${themes[color as keyof typeof themes]}`}>
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl ${color === 'gold' ? 'bg-white/20' : color === 'dark' ? 'bg-brand-gold' : 'bg-white shadow-sm'}`}>
          {icon}
        </div>
        <MoreVertical className="opacity-10" size={16} />
      </div>
      <div>
        <p className={`text-[9px] font-black uppercase tracking-[0.2em] opacity-60`}>{title}</p>
        <h4 className="text-xl md:text-3xl font-black mt-1 md:mt-2 tracking-tighter truncate">{value}</h4>
      </div>
      <div className="flex items-center mt-4 md:mt-6 text-[8px] font-black uppercase tracking-widest opacity-40">
        <span>{trend}</span>
      </div>
    </div>
  );
};
