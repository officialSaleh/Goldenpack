
import { 
  Product, 
  Customer, 
  Order, 
  Expense, 
  User, 
  AppSettings,
  DashboardStats 
} from '../types';
import { db_firestore, auth } from './firebase.ts';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  query,
  orderBy
} from 'firebase/firestore';

const STORAGE_KEY = 'perfumepack_pro_v2';

class DB {
  products: Product[] = [];
  customers: Customer[] = [];
  orders: Order[] = [];
  expenses: Expense[] = [];
  settings: AppSettings | null = null;
  currentUser: User | null = null;

  constructor() {
    this.loadLocal();
    this.initFirestoreSync();
  }

  // Load from LocalStorage for instant UI feedback (Optimistic)
  loadLocal() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      this.products = parsed.products || [];
      this.customers = parsed.customers || [];
      this.orders = parsed.orders || [];
      this.expenses = parsed.expenses || [];
      this.settings = parsed.settings || null;
    }
  }

  // Initialize Real-time Cloud Sync
  initFirestoreSync() {
    // Listen for Settings
    onSnapshot(doc(db_firestore, "app", "settings"), (doc) => {
      if (doc.exists()) {
        this.settings = doc.data() as AppSettings;
        this.saveLocal();
      }
    });

    // Listen for Products
    onSnapshot(collection(db_firestore, "products"), (snapshot) => {
      this.products = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      this.saveLocal();
    });

    // Listen for Customers
    onSnapshot(collection(db_firestore, "customers"), (snapshot) => {
      this.customers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
      this.saveLocal();
    });

    // Listen for Orders
    onSnapshot(query(collection(db_firestore, "orders"), orderBy("date", "desc")), (snapshot) => {
      this.orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      this.saveLocal();
    });
  }

  saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      products: this.products,
      customers: this.customers,
      orders: this.orders,
      expenses: this.expenses,
      settings: this.settings
    }));
  }

  getSettings() { return this.settings; }
  
  async updateSettings(newSettings: AppSettings) {
    this.settings = newSettings;
    await setDoc(doc(db_firestore, "app", "settings"), newSettings);
    this.saveLocal();
  }

  getProducts() { return this.products; }
  getCustomers() { return this.customers; }
  getOrders() { return this.orders; }
  getExpenses() { return this.expenses; }

  formatMoney(amount: number) {
    const symbol = this.settings?.currencySymbol || '$';
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  async addProduct(p: Product) { 
    const docRef = await addDoc(collection(db_firestore, "products"), p);
    console.log("Product added with ID: ", docRef.id);
  }

  async addCustomer(c: Customer) { 
    const docRef = await addDoc(collection(db_firestore, "customers"), c);
    console.log("Customer added with ID: ", docRef.id);
  }
  
  async createOrder(order: Order) {
    // 1. Create the Order document
    await setDoc(doc(db_firestore, "orders", order.id), order);

    // 2. Update stock levels in Firestore
    for (const item of order.items) {
      const prod = this.products.find(p => p.id === item.productId);
      if (prod) {
        const prodRef = doc(db_firestore, "products", item.productId);
        await updateDoc(prodRef, {
          stockQuantity: prod.stockQuantity - item.quantity
        });
      }
    }

    // 3. Update Customer Balance if Credit
    if (order.paymentType === 'Credit') {
      const cust = this.customers.find(c => c.id === order.customerId);
      if (cust) {
        const custRef = doc(db_firestore, "customers", order.customerId);
        await updateDoc(custRef, {
          outstandingBalance: cust.outstandingBalance + (order.total - order.amountPaid)
        });
      }
    }
  }

  async addExpense(e: Expense) {
    await addDoc(collection(db_firestore, "expenses"), e);
  }

  getTopSellingProducts() {
    const salesMap: Record<string, { name: string, quantity: number, revenue: number }> = {};
    this.orders.forEach(order => {
      order.items.forEach(item => {
        if (!salesMap[item.productId]) {
          salesMap[item.productId] = { name: item.productName, quantity: 0, revenue: 0 };
        }
        salesMap[item.productId].quantity += item.quantity;
        salesMap[item.productId].revenue += (item.quantity * item.price);
      });
    });
    return Object.values(salesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }

  getDashboardStats(): DashboardStats {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = this.orders
      .filter(o => o.date.startsWith(today))
      .reduce((acc, o) => acc + o.total, 0);

    const totalRevenue = this.orders.reduce((acc, o) => acc + o.total, 0);
    const outstandingCredit = this.customers.reduce((acc, c) => acc + c.outstandingBalance, 0);
    
    const overdueCount = this.orders.filter(o => {
      const isOverdue = new Date(o.dueDate) < new Date() && o.status !== 'Paid';
      return isOverdue;
    }).length;

    const lowStock = this.products.filter(p => p.stockQuantity < 50).length;

    return {
      todaySales,
      totalRevenue,
      outstandingCredit,
      overdueCustomersCount: overdueCount,
      lowStockAlerts: lowStock,
    };
  }
}

export const db = new DB();
export const CURRENT_USER: User = {
  uid: 'cloud-admin',
  name: 'Golden Wings Admin',
  email: 'admin@goldenwings.com',
  role: 'admin',
};
