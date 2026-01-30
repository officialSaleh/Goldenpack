
import { 
  Product, 
  Customer, 
  Order, 
  Expense, 
  User, 
  AppSettings,
  DashboardStats,
  Container,
  Payment 
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
  runTransaction,
  DocumentSnapshot,
  limit,
  startAfter,
  getDocs,
  where,
  QueryConstraint
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
      onSnapshot(query(collection(db_firestore, "customers"), limit(50)), (snapshot) => {
        this.customers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
        this.notify();
        this.saveLocal();
      })
    );

    this.unsubscribers.push(
      onSnapshot(query(collection(db_firestore, "orders"), orderBy("date", "desc"), limit(50)), (snapshot) => {
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

    this.unsubscribers.push(
      onSnapshot(collection(db_firestore, "containers"), (snapshot) => {
        this.containers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Container));
        this.notify();
        this.saveLocal();
      })
    );
  }

  async getCustomersCloud(options: { 
    search?: string, 
    lastDoc?: any, 
    pageSize?: number 
  }) {
    const { search, lastDoc, pageSize = 12 } = options;
    const constraints: QueryConstraint[] = [orderBy("name", "asc"), limit(pageSize)];
    
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(collection(db_firestore, "customers"), ...constraints);
    const snapshot = await getDocs(q);
    
    let customers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
    
    if (search) {
      const lowerSearch = search.toLowerCase();
      customers = customers.filter(c => 
        c.name.toLowerCase().includes(lowerSearch) || 
        c.businessName.toLowerCase().includes(lowerSearch) ||
        c.phone.includes(lowerSearch)
      );
    }

    return {
      customers,
      lastVisible: snapshot.docs[snapshot.docs.length - 1]
    };
  }

  async getOrdersCloud(options: { 
    search?: string, 
    lastDoc?: any, 
    pageSize?: number 
  }) {
    const { search, lastDoc, pageSize = 15 } = options;
    const constraints: QueryConstraint[] = [orderBy("date", "desc"), limit(pageSize)];
    
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(collection(db_firestore, "orders"), ...constraints);
    const snapshot = await getDocs(q);
    
    let orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
    
    if (search) {
      const lowerSearch = search.toLowerCase();
      orders = orders.filter(o => 
        o.id.toLowerCase().includes(lowerSearch) || 
        o.customerName.toLowerCase().includes(lowerSearch)
      );
    }

    return {
      orders,
      lastVisible: snapshot.docs[snapshot.docs.length - 1]
    };
  }

  /**
   * STRESS TEST: Forces a complex compound query to trigger Index requirement.
   */
  async triggerComplexIndexQuery() {
    const q = query(
      collection(db_firestore, "orders"),
      where("status", "==", "Paid"),
      orderBy("total", "desc"),
      limit(5)
    );
    // This will throw the "Magic Link" error in console if index is missing.
    return await getDocs(q);
  }

  async bulkInjectSampleData() {
    const sampleProducts: Product[] = [
      { id: 'STRESS-1', name: 'Bulk Product A', category: 'Bottle', size: 100, costPrice: 5, sellingPrice: 15, stockQuantity: 1000 },
      { id: 'STRESS-2', name: 'Bulk Product B', category: 'Spray', size: 50, costPrice: 2, sellingPrice: 8, stockQuantity: 500 },
    ];
    
    for (const p of sampleProducts) {
      await setDoc(doc(db_firestore, "products", p.id), p);
    }
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
    const formatted = Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return amount < 0 ? `-${symbol} ${formatted}` : `${symbol} ${formatted}`;
  }

  getSettings() { return this.settings; }
  getProducts() { return this.products; }
  getCustomers() { return this.customers; }
  getOrders() { return this.orders; }
  getExpenses() { return this.expenses; }
  getContainers() { return this.containers; }

  async addProduct(p: Product) { 
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
      const uniqueProductIds = Array.from(new Set(order.items.map(item => item.productId)));
      const productSnapshots = new Map<string, DocumentSnapshot>();

      for (const productId of uniqueProductIds) {
        const productRef = doc(db_firestore, "products", productId);
        const snap = await transaction.get(productRef);
        if (!snap.exists()) {
          throw new Error(`Product reference ${productId} not found in database.`);
        }
        productSnapshots.set(productId, snap);
      }

      let customerSnap = null;
      let customerRef = null;
      if (order.paymentType === 'Credit') {
        customerRef = doc(db_firestore, "customers", order.customerId);
        customerSnap = await transaction.get(customerRef);
        if (!customerSnap.exists()) {
          throw new Error(`Customer reference ${order.customerId} not found.`);
        }
      }

      const stockUpdates = [];
      for (const item of order.items) {
        const snap = productSnapshots.get(item.productId);
        if (!snap) continue;

        const serverData = snap.data();
        const currentStock = serverData?.stockQuantity || 0;

        if (currentStock < item.quantity) {
          throw new Error(`Insufficient stock for ${item.productName}. Available: ${currentStock}`);
        }

        stockUpdates.push({
          ref: snap.ref,
          newStock: currentStock - item.quantity
        });
      }

      for (const update of stockUpdates) {
        transaction.update(update.ref, { stockQuantity: update.newStock });
      }

      if (customerRef && customerSnap) {
        const currentBalance = customerSnap.data()?.outstandingBalance || 0;
        transaction.update(customerRef, { outstandingBalance: currentBalance + order.total });
      }

      const orderRef = doc(db_firestore, "orders", order.id);
      transaction.set(orderRef, order);
    });

    this.notify();
  }

  async collectPayment(customerId: string, amount: number, method: string) {
    await runTransaction(db_firestore, async (transaction) => {
      const customerRef = doc(db_firestore, "customers", customerId);
      const customerSnap = await transaction.get(customerRef);

      if (!customerSnap.exists()) {
        throw new Error("Customer not found.");
      }

      const currentBalance = customerSnap.data()?.outstandingBalance || 0;
      const newBalance = currentBalance - amount;

      transaction.update(customerRef, { outstandingBalance: newBalance });

      const paymentId = `PAY-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const paymentRef = doc(db_firestore, "payments", paymentId);
      const paymentData = {
        id: paymentId,
        customerId,
        amount,
        date: new Date().toISOString().split('T')[0],
        method,
        previousBalance: currentBalance,
        newBalance
      };
      transaction.set(paymentRef, paymentData);
    });
    this.notify();
  }

  async updateSettings(s: AppSettings) {
    await setDoc(doc(db_firestore, "app", "settings"), s);
  }

  async addCustomer(c: Customer) { 
    await setDoc(doc(db_firestore, "customers", c.id), c); 
    this.notify();
  }

  async addContainer(c: Container) { 
    await setDoc(doc(db_firestore, "containers", c.id), c); 
    this.notify();
  }

  async updateContainerStatus(id: string, status: Container['status']) {
    await updateDoc(doc(db_firestore, "containers", id), { status });
    this.notify();
  }

  async addExpense(e: Expense) { 
    await setDoc(doc(db_firestore, "expenses", e.id), e); 
    this.notify();
  }

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
      netProfit: totalRevenue * 0.2 
    };
  }
}

export const db = new DB();
export const CURRENT_USER: User = { uid: '1', name: 'Admin', email: 'admin@goldpack.com', role: 'admin' };
