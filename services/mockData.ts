
import { 
  Product, 
  Customer, 
  Order, 
  Expense, 
  User, 
  AppSettings,
  DashboardStats,
  Container 
} from '../types';
import { db_firestore } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Unsubscribe,
  runTransaction
} from 'firebase/firestore';

const STORAGE_KEY = 'perfumepack_pro_v2';

class DB {
  products: Product[] = [];
  customers: Customer[] = [];
  orders: Order[] = [];
  expenses: Expense[] = [];
  containers: Container[] = [];
  settings: AppSettings | null = null;
  private unsubscribers: Unsubscribe[] = [];
  private onSettingsChange: ((settings: AppSettings | null) => void) | null = null;
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadLocal();
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  loadLocal() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        this.products = parsed.products || [];
        this.customers = parsed.customers || [];
        this.orders = parsed.orders || [];
        this.expenses = parsed.expenses || [];
        this.containers = parsed.containers || [];
        this.settings = parsed.settings || null;
      } catch (e) {
        console.error("Failed to parse local storage", e);
      }
    }
  }

  setSettingsListener(callback: (settings: AppSettings | null) => void) {
    this.onSettingsChange = callback;
    callback(this.settings);
  }

  startSync() {
    this.stopSync();

    this.unsubscribers.push(
      onSnapshot(doc(db_firestore, "app", "settings"), (doc) => {
        if (doc.exists()) {
          this.settings = doc.data() as AppSettings;
          if (this.onSettingsChange) this.onSettingsChange(this.settings);
          this.notify();
          this.saveLocal();
        }
      })
    );

    this.unsubscribers.push(
      onSnapshot(collection(db_firestore, "products"), (snapshot) => {
        this.products = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
        this.notify();
        this.saveLocal();
      })
    );

    this.unsubscribers.push(
      onSnapshot(collection(db_firestore, "customers"), (snapshot) => {
        this.customers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
        this.notify();
        this.saveLocal();
      })
    );

    this.unsubscribers.push(
      onSnapshot(query(collection(db_firestore, "orders"), orderBy("date", "desc")), (snapshot) => {
        this.orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
        this.notify();
        this.saveLocal();
      })
    );

    this.unsubscribers.push(
      onSnapshot(collection(db_firestore, "expenses"), (snapshot) => {
        this.expenses = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
        this.notify();
        this.saveLocal();
      })
    );
  }

  stopSync() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }

  saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      products: this.products,
      customers: this.customers,
      orders: this.orders,
      expenses: this.expenses,
      containers: this.containers,
      settings: this.settings
    }));
  }

  formatMoney(amount: number) {
    const symbol = this.settings?.currencySymbol || '$';
    const formatted = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    // Use a non-breaking space and specific order to prevent RTL flipping issues
    return `${symbol} ${formatted}`;
  }

  getSettings() { return this.settings; }
  getProducts() { return this.products; }
  getCustomers() { return this.customers; }
  getOrders() { return this.orders; }
  getExpenses() { return this.expenses; }
  getContainers() { return this.containers; }

  async addProduct(p: Product) { 
    // Fix: Using setDoc with p.id to ensure the Firestore document name matches the object id
    await setDoc(doc(db_firestore, "products", p.id), p);
  }

  async updateProduct(id: string, updates: Partial<Product>) {
    await updateDoc(doc(db_firestore, "products", id), updates);
  }

  async deleteProduct(id: string) {
    await deleteDoc(doc(db_firestore, "products", id));
  }

  async createOrder(order: Order) {
    await runTransaction(db_firestore, async (transaction) => {
      for (const item of order.items) {
        const productRef = doc(db_firestore, "products", item.productId);
        const prodDoc = await transaction.get(productRef);
        
        if (!prodDoc.exists()) {
          throw new Error(`Product "${item.productName}" not found in database. Please refresh.`);
        }
        
        const serverStock = prodDoc.data().stockQuantity;
        if (serverStock < item.quantity) {
          throw new Error(`Insufficient stock for ${item.productName}. Available: ${serverStock}`);
        }
        
        transaction.update(productRef, { stockQuantity: serverStock - item.quantity });
      }

      transaction.set(doc(db_firestore, "orders", order.id), order);

      if (order.paymentType === 'Credit') {
        const customerRef = doc(db_firestore, "customers", order.customerId);
        const custDoc = await transaction.get(customerRef);
        if (custDoc.exists()) {
          const balance = custDoc.data().outstandingBalance || 0;
          transaction.update(customerRef, { outstandingBalance: balance + order.total });
        }
      }
    });

    // Optimistic UI update
    this.products = this.products.map(p => {
      const sold = order.items.find(i => i.productId === p.id);
      return sold ? { ...p, stockQuantity: p.stockQuantity - sold.quantity } : p;
    });
    this.orders = [order, ...this.orders];
    this.notify();
  }

  async updateSettings(s: AppSettings) {
    await setDoc(doc(db_firestore, "app", "settings"), s);
  }

  async addCustomer(c: Customer) { await setDoc(doc(db_firestore, "customers", c.id), c); }
  async addContainer(c: Container) { await setDoc(doc(db_firestore, "containers", c.id), c); }
  async addExpense(e: Expense) { await setDoc(doc(db_firestore, "expenses", e.id), e); }

  getTrajectoryData() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const rev = this.orders.filter(o => o.date === ds).reduce((s, o) => s + o.total, 0);
      result.push({ name: days[d.getDay()], revenue: rev });
    }
    return result;
  }

  getTopSellingProducts() {
    const map: any = {};
    this.orders.forEach(o => o.items.forEach(i => {
      if (!map[i.productId]) map[i.productId] = { name: i.productName, quantity: 0, revenue: 0 };
      map[i.productId].quantity += i.quantity;
      map[i.productId].revenue += (i.quantity * i.price);
    }));
    return Object.values(map).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5) as any[];
  }

  getDashboardStats(): DashboardStats {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = this.orders.filter(o => o.date === today).reduce((s, o) => s + o.total, 0);
    const totalRevenue = this.orders.reduce((s, o) => s + o.total, 0);
    const outstandingCredit = this.customers.reduce((s, c) => s + c.outstandingBalance, 0);
    const lowStock = this.products.filter(p => p.stockQuantity < 50).length;
    const invValue = this.products.reduce((s, p) => s + (p.costPrice * p.stockQuantity), 0);
    
    return {
      todaySales,
      totalRevenue,
      outstandingCredit,
      overdueCustomersCount: this.orders.filter(o => o.status !== 'Paid' && new Date(o.dueDate) < new Date()).length,
      lowStockAlerts: lowStock,
      totalInventoryValue: invValue,
      netProfit: totalRevenue * 0.2 // Simplified for mock
    };
  }
}

export const db = new DB();
export const CURRENT_USER: User = { uid: '1', name: 'Admin', email: 'admin@goldpack.com', role: 'admin' };
