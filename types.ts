
export type Role = 'admin' | 'staff';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: Role;
}

export interface AppSettings {
  currency: string;
  currencySymbol: string;
  setupComplete: boolean;
}

export type Category = 'Bottle' | 'Spray' | 'Cap';

export interface Product {
  id: string;
  name: string;
  category: Category;
  size: number; // in ml
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  imageUrl?: string;
}

export interface Customer {
  id: string;
  name: string;
  businessName: string;
  phone: string;
  defaultCreditDays: number;
  creditLimit: number;
  outstandingBalance: number;
}

export type OrderStatus = 'Pending' | 'Delivered' | 'Paid' | 'Overdue';
export type PaymentType = 'Cash' | 'Credit';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  items: OrderItem[];
  subtotal: number;
  vat: number; // 5%
  total: number;
  paymentType: PaymentType;
  status: OrderStatus;
  dueDate: string;
  amountPaid: number;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  date: string;
  method: string;
}

export type ExpenseCategory = 'Warehouse Rent' | 'Truck Fuel' | 'Salaries' | 'Telecommunication' | 'Other';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  customCategory?: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface DashboardStats {
  todaySales: number;
  totalRevenue: number;
  outstandingCredit: number;
  overdueCustomersCount: number;
  lowStockAlerts: number;
}
