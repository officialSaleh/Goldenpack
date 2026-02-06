
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

const STORAGE_KEY = 'perfumepack_pro_v3';

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
  private currentUserId: string | null = null;

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

  startSync(userId: string) {
    this.stopSync();
    this.currentUserId = userId;

    // User-specific Settings Sync
    this.unsubscribers.push(
      onSnapshot(doc(db_firestore, "users", userId, "config", "settings"), (doc) => {
        if (doc.exists()) {
          this.settings = doc.data() as AppSettings;
          if (this.onSettingsChange) this.onSettingsChange(this.settings);
          this.notify();
          this.saveLocal();
        } else {
          // New User case
          this.settings = null;
          if (this.onSettingsChange) this.onSettingsChange(null);
          this.notify();
        }
      })
    );

    // Filtered Collections Sync
    const filterByOwner = where("userId", "==", userId);

    this.unsubscribers.push(
      onSnapshot(query(collection(db_firestore, "products"), filterByOwner), (snapshot) => {
        this.products = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
        this.notify();
        this.saveLocal();
      })
    );

    this.unsubscribers.push(
      onSnapshot(query(collection(db_firestore, "customers"), filterByOwner, limit(100)), (snapshot) => {
        this.customers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
        this.notify();
        this.saveLocal();
      })
    );

    this.unsubscribers.push(
      onSnapshot(query(collection(db_firestore, "orders"), filterByOwner, orderBy("date", "desc"), limit(100)), (snapshot) => {
        this.orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
        this.notify();
        this.saveLocal();
      })
    );

    this.unsubscribers.push(
      onSnapshot(query(collection(db_firestore, "expenses"), filterByOwner), (snapshot) => {
        this.expenses = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
        this.notify();
        this.saveLocal();
      })
    );

    this.unsubscribers.push(
      onSnapshot(query(collection(db_firestore, "containers"), filterByOwner), (snapshot) => {
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
    if (!this.currentUserId) throw new Error("Unauthenticated request");
    const { search, lastDoc, pageSize = 12 } = options;
    const constraints: QueryConstraint[] = [
      where("userId", "==", this.currentUserId),
      orderBy("name", "asc"), 
      limit(pageSize)
    ];
    
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
    if (!this.currentUserId) throw new Error("Unauthenticated request");
    const { search, lastDoc, pageSize = 15 } = options;
    const constraints: QueryConstraint[] = [
      where("userId", "==", this.currentUserId),
      orderBy("date", "desc"), 
      limit(pageSize)
    ];
    
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

  stopSync() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.currentUserId = null;
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
    if (!this.currentUserId) throw new Error("Unauthorized");
    await setDoc(doc(db_firestore, "products", p.id), { ...p, userId: this.currentUserId });
  }

  async updateProduct(id: string, updates: Partial<Product>) {
    await updateDoc(doc(db_firestore, "products", id), updates);
  }

  async deleteProduct(id: string) {
    await deleteDoc(doc(db_firestore, "products", id));
  }

  async createOrder(order: Order) {
    if (!this.currentUserId) throw new Error("Unauthorized");
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
      transaction.set(orderRef, { ...order, userId: this.currentUserId });
    });

    this.notify();
  }

  async collectPayment(customerId: string, amount: number, method: string) {
    if (!this.currentUserId) throw new Error("Unauthorized");
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
      const paymentData: Payment = {
        id: paymentId,
        customerId,
        amount,
        date: new Date().toISOString().split('T')[0],
        method,
        previousBalance: currentBalance,
        newBalance,
        userId: this.currentUserId!
      };
      transaction.set(paymentRef, paymentData);
    });
    this.notify();
  }

  async updateSettings(s: AppSettings) {
    if (!this.currentUserId) throw new Error("Unauthorized");
    await setDoc(doc(db_firestore, "users", this.currentUserId, "config", "settings"), { ...s, userId: this.currentUserId });
  }

  async addCustomer(c: Customer) { 
    if (!this.currentUserId) throw new Error("Unauthorized");
    await setDoc(doc(db_firestore, "customers", c.id), { ...c, userId: this.currentUserId }); 
    this.notify();
  }

  async addContainer(c: Container) { 
    if (!this.currentUserId) throw new Error("Unauthorized");
    await setDoc(doc(db_firestore, "containers", c.id), { ...c, userId: this.currentUserId }); 
    this.notify();
  }

  async updateContainerStatus(id: string, status: Container['status']) {
    await updateDoc(doc(db_firestore, "containers", id), { status });
    this.notify();
  }

  async addExpense(e: Expense) { 
    if (!this.currentUserId) throw new Error("Unauthorized");
    await setDoc(doc(db_firestore, "expenses", e.id), { ...e, userId: this.currentUserId }); 
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

  // Fix: Adding triggerComplexIndexQuery for system diagnostics
  async triggerComplexIndexQuery() {
    if (!this.currentUserId) throw new Error("Unauthenticated request");
    // This query uses multiple field ordering, typically requiring a composite index in production
    const q = query(
      collection(db_firestore, "orders"),
      where("userId", "==", this.currentUserId),
      where("total", ">", 0),
      orderBy("total", "desc"),
      orderBy("date", "desc"),
      limit(1)
    );
    await getDocs(q);
  }

  // Fix: Adding bulkInjectSampleData for testing data volume
  async bulkInjectSampleData() {
    if (!this.currentUserId) throw new Error("Unauthenticated request");
    const sampleProducts: Product[] = [
      { id: `p-sample-1-${Date.now()}`, name: 'Royal Gold Bottle', category: 'Bottle', size: 100, costPrice: 2.5, sellingPrice: 6.5, stockQuantity: 250, warehouseArea: 'Aisle 1', userId: this.currentUserId },
      { id: `p-sample-2-${Date.now()}`, name: 'Elite Mist Spray', category: 'Spray', size: 30, costPrice: 1.2, sellingPrice: 3.8, stockQuantity: 400, warehouseArea: 'Aisle 4', userId: this.currentUserId },
      { id: `p-sample-3-${Date.now()}`, name: 'Velvet Cap Black', category: 'Cap', size: 0, costPrice: 0.4, sellingPrice: 1.2, stockQuantity: 1500, warehouseArea: 'Aisle 2', userId: this.currentUserId }
    ];

    const sampleCustomers: Customer[] = [
      { id: `c-sample-1-${Date.now()}`, name: 'Hassan Bin Zayed', businessName: 'Gulf Fragrances', phone: '+971 4 555 1234', defaultCreditDays: 30, creditLimit: 10000, outstandingBalance: 0, userId: this.currentUserId },
      { id: `c-sample-2-${Date.now()}`, name: 'Linda K.', businessName: 'Parisian Boutique', phone: '+33 1 2345 6789', defaultCreditDays: 45, creditLimit: 5000, outstandingBalance: 0, userId: this.currentUserId }
    ];

    const promises = [
      ...sampleProducts.map(p => setDoc(doc(db_firestore, "products", p.id), p)),
      ...sampleCustomers.map(c => setDoc(doc(db_firestore, "customers", c.id), c))
    ];

    await Promise.all(promises);
    this.notify();
  }
}

export const db = new DB();
export const CURRENT_USER: User = { uid: '1', name: 'Admin', email: 'admin@goldpack.com', role: 'admin' };
