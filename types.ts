
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
  userId?: string;
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
  warehouseArea?: string;
  imageUrl?: string;
  userId?: string;
}

export interface Customer {
  id: string;
  name: string;
  businessName: string;
  phone: string;
  defaultCreditDays: number;
  creditLimit: number;
  outstandingBalance: number;
  userId?: string;
}

export type OrderStatus = 'Pending' | 'Delivered' | 'Paid' | 'Overdue' | 'Pending Verification';
export type PaymentType = 'Cash' | 'Credit' | 'Bank Transfer';

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
  paymentReference?: string;
  userId?: string;
}

export interface Payment {
  id: string;
  orderId?: string;
  customerId: string;
  amount: number;
  date: string;
  method: string;
  previousBalance?: number;
  newBalance?: number;
  userId?: string;
}

export type ExpenseCategory = 'Warehouse Rent' | 'Truck Fuel' | 'Salaries' | 'Telecommunication' | 'Other';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  customCategory?: string;
  amount: number;
  date: string;
  notes?: string;
  userId?: string;
}

export interface ContainerItem {
  productId?: string;
  productName: string;
  category: Category;
  size: number;
  quantity: number;
  costPrice: number;
}

export interface Container {
  id: string;
  referenceNumber: string;
  arrivalDate: string;
  supplier: string;
  items: ContainerItem[];
  status: 'In Transit' | 'Arrived' | 'Unloaded';
  notes?: string;
  userId?: string;
}

export interface DashboardStats {
  todaySales: number;
  totalRevenue: number;
  outstandingCredit: number;
  overdueCustomersCount: number;
  lowStockAlerts: number;
  totalInventoryValue: number;
  netProfit: number;
}
