
import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  Clock,
  Wallet,
  BarChart3,
  Truck,
  Activity
} from 'lucide-react';

export const VAT_RATE = 0.05;

export const CATEGORIES = ['Bottle', 'Spray', 'Cap'] as const;

export const EXPENSE_CATEGORIES = [
  'Warehouse Rent', 
  'Truck Fuel', 
  'Salaries', 
  'Telecommunication', 
  'Other'
] as const;

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['admin', 'staff'] },
  { id: 'inventory', label: 'Inventory', icon: <Package size={20} />, roles: ['admin', 'staff'] },
  { id: 'containers', label: 'Logistics', icon: <Truck size={20} />, roles: ['admin', 'staff'] },
  { id: 'customers', label: 'Customers', icon: <Users size={20} />, roles: ['admin', 'staff'] },
  { id: 'pos', label: 'New Sale', icon: <ShoppingCart size={20} />, roles: ['admin', 'staff'] },
  { id: 'orders', label: 'Order History', icon: <Clock size={20} />, roles: ['admin', 'staff'] },
  { id: 'expenses', label: 'Expenses', icon: <Wallet size={20} />, roles: ['admin'] },
  { id: 'reports', label: 'Reports', icon: <BarChart3 size={20} />, roles: ['admin'] },
  { id: 'diagnostics', label: 'System Health', icon: <Activity size={20} />, roles: ['admin'] },
];
