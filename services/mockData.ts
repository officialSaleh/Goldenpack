
import { 
  Product, 
  Customer, 
  Order, 
  Expense, 
  User, 
  AppSettings,
  DashboardStats,
  Container,
  ContainerItem,
  Payment,
  Category
} from '../types';
import { db_firestore } from './firebase';
import { VAT_RATE } from '../constants';
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
        this.expenses = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as Expense))
          .sort((a, b) => b.date.localeCompare(a.date));
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
    pageSize?: number,
    month?: number, // 0-11
    year?: number
  }) {
    if (!this.currentUserId) throw new Error("Unauthenticated request");
    const { search, lastDoc, pageSize = 15, month, year } = options;
    const constraints: QueryConstraint[] = [
      where("userId", "==", this.currentUserId),
      orderBy("date", "desc"), 
      limit(pageSize)
    ];
    
    // If month and year are provided, we can add date range constraints
    if (month !== undefined && year !== undefined) {
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0] + 'T23:59:59.999Z';
      constraints.push(where("date", ">=", startDate));
      constraints.push(where("date", "<=", endDate));
    }
    
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

  async getCustomerLedgerCloud(customerId: string) {
    if (!this.currentUserId) throw new Error("Unauthenticated");

    // Fetch orders for this customer
    const qOrders = query(
      collection(db_firestore, "orders"),
      where("userId", "==", this.currentUserId),
      where("customerId", "==", customerId),
      orderBy("date", "desc")
    );
    const snapOrders = await getDocs(qOrders);
    const orders = snapOrders.docs.map(d => ({ id: d.id, ...d.data(), type: 'Invoice' } as any));

    // Fetch payments for this customer
    const qPayments = query(
      collection(db_firestore, "payments"),
      where("userId", "==", this.currentUserId),
      where("customerId", "==", customerId),
      orderBy("date", "desc")
    );
    const snapPayments = await getDocs(qPayments);
    const payments = snapPayments.docs.map(d => ({ id: d.id, ...d.data(), type: 'Payment' } as any));

    // Combine and sort by date
    return [...orders, ...payments].sort((a, b) => b.date.localeCompare(a.date));
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
  getExpenses() { return [...this.expenses].sort((a, b) => b.date.localeCompare(a.date)); }
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

  async toggleOrderVAT(orderId: string) {
    if (!this.currentUserId) throw new Error("Unauthorized");
    await runTransaction(db_firestore, async (transaction) => {
      const orderRef = doc(db_firestore, "orders", orderId);
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) throw new Error("Order not found");
      
      const order = orderSnap.data() as Order;
      const currentVatEnabled = order.vatEnabled !== undefined ? order.vatEnabled : true; // Assume true for old orders
      const newVatEnabled = !currentVatEnabled;
      
      const subtotal = order.subtotal;
      const newVat = newVatEnabled ? subtotal * VAT_RATE : 0;
      const newTotal = subtotal + newVat;
      const totalDiff = newTotal - order.total;
      
      // Update order
      transaction.update(orderRef, {
        vat: newVat,
        total: newTotal,
        vatEnabled: newVatEnabled,
        // If it was fully paid, we keep it fully paid (adjusting amountPaid)
        // If it was partially paid, we keep amountPaid same, total changes
        amountPaid: order.status === 'Paid' ? newTotal : order.amountPaid
      });
      
      // Update customer balance if it's a credit order and not fully paid
      if (order.paymentType === 'Credit' && order.status !== 'Paid') {
        const customerRef = doc(db_firestore, "customers", order.customerId);
        const customerSnap = await transaction.get(customerRef);
        if (customerSnap.exists()) {
          const currentBalance = customerSnap.data()?.outstandingBalance || 0;
          transaction.update(customerRef, { outstandingBalance: currentBalance + totalDiff });
        }
      }
    });
    this.notify();
  }

  async markOrderAsPaid(orderId: string) {
    if (!this.currentUserId) throw new Error("Unauthorized");
    await runTransaction(db_firestore, async (transaction) => {
      const orderRef = doc(db_firestore, "orders", orderId);
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) throw new Error("Order not found");
      const order = orderSnap.data() as Order;
      if (order.status === 'Paid') return;

      const remaining = order.total - (order.amountPaid || 0);
      
      if (order.paymentType === 'Credit') {
        const customerRef = doc(db_firestore, "customers", order.customerId);
        const customerSnap = await transaction.get(customerRef);
        if (customerSnap.exists()) {
          const currentBalance = customerSnap.data()?.outstandingBalance || 0;
          transaction.update(customerRef, { outstandingBalance: Math.max(0, currentBalance - remaining) });
        }
      }

      transaction.update(orderRef, { 
        status: 'Paid', 
        amountPaid: order.total 
      });

      const paymentId = `PAY-AUTO-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const paymentRef = doc(db_firestore, "payments", paymentId);
      transaction.set(paymentRef, {
        id: paymentId,
        customerId: order.customerId,
        amount: remaining,
        date: new Date().toISOString().split('T')[0],
        method: 'Manual Settlement',
        orderId: order.id,
        userId: this.currentUserId!
      });
    });
    this.notify();
  }

  async updateOrder(orderId: string, updatedOrder: Order) {
    if (!this.currentUserId) throw new Error("Unauthorized");
    await runTransaction(db_firestore, async (transaction) => {
      const orderRef = doc(db_firestore, "orders", orderId);
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) throw new Error("Order not found");
      const oldOrder = orderSnap.data() as Order;

      // 1. Reverse old stock
      for (const item of (oldOrder.items || [])) {
        const productRef = doc(db_firestore, "products", item.productId);
        const productSnap = await transaction.get(productRef);
        if (productSnap.exists()) {
          const currentStock = productSnap.data()?.stockQuantity || 0;
          transaction.update(productRef, { stockQuantity: currentStock + item.quantity });
        }
      }

      // 2. Reverse old customer balance
      if (oldOrder.paymentType === 'Credit') {
        const customerRef = doc(db_firestore, "customers", oldOrder.customerId);
        const customerSnap = await transaction.get(customerRef);
        if (customerSnap.exists()) {
          const currentBalance = customerSnap.data()?.outstandingBalance || 0;
          transaction.update(customerRef, { outstandingBalance: currentBalance - oldOrder.total });
        }
      }

      // 3. Apply new stock (with check)
      for (const item of (updatedOrder.items || [])) {
        const productRef = doc(db_firestore, "products", item.productId);
        const productSnap = await transaction.get(productRef);
        if (!productSnap.exists()) throw new Error(`Product ${item.productName} not found`);
        const currentStock = productSnap.data()?.stockQuantity || 0;
        // Note: the stock was already increased by Step 1 in this transaction
        transaction.update(productRef, { stockQuantity: currentStock - item.quantity });
      }

      // 4. Apply new customer balance
      if (updatedOrder.paymentType === 'Credit') {
        const customerRef = doc(db_firestore, "customers", updatedOrder.customerId);
        const customerSnap = await transaction.get(customerRef);
        if (customerSnap.exists()) {
          const currentBalance = customerSnap.data()?.outstandingBalance || 0;
          transaction.update(customerRef, { outstandingBalance: currentBalance + updatedOrder.total });
        }
      }

      // 5. Update order
      transaction.update(orderRef, { ...updatedOrder });
    });
    this.notify();
  }

  async deleteOrder(orderId: string) {
    if (!this.currentUserId) throw new Error("Unauthorized");
    await runTransaction(db_firestore, async (transaction) => {
      const orderRef = doc(db_firestore, "orders", orderId);
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) throw new Error("Order not found");
      const order = orderSnap.data() as Order;

      // 1. Reverse stock
      for (const item of (order.items || [])) {
        const productRef = doc(db_firestore, "products", item.productId);
        const productSnap = await transaction.get(productRef);
        if (productSnap.exists()) {
          const currentStock = productSnap.data()?.stockQuantity || 0;
          transaction.update(productRef, { stockQuantity: currentStock + item.quantity });
        }
      }

      // 2. Reverse customer balance
      if (order.paymentType === 'Credit') {
        const customerRef = doc(db_firestore, "customers", order.customerId);
        const customerSnap = await transaction.get(customerRef);
        if (customerSnap.exists()) {
          const currentBalance = customerSnap.data()?.outstandingBalance || 0;
          const remaining = order.total - (order.amountPaid || 0);
          transaction.update(customerRef, { outstandingBalance: Math.max(0, currentBalance - remaining) });
        }
      }

      // 3. Delete order
      transaction.delete(orderRef);
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
      const newBalance = Math.max(0, currentBalance - amount);

      // 1. Update Customer Balance
      transaction.update(customerRef, { outstandingBalance: newBalance });

      // 2. FIFO Order Allocation Logic - Option 2 (In-Memory Workaround)
      // Fetch ALL orders for this customer. We avoid filtered/sorted queries to bypass index requirements.
      const ordersQuery = query(
        collection(db_firestore, "orders"),
        where("userId", "==", this.currentUserId),
        where("customerId", "==", customerId)
      );
      
      const ordersSnapshot = await getDocs(ordersQuery);
      
      // Filter out paid orders and sort by date ascending (oldest first) in memory
      const unpaidOrders = ordersSnapshot.docs
        .map(doc => ({ ref: doc.ref, data: doc.data() as Order }))
        .filter(order => order.data.status !== 'Paid')
        .sort((a, b) => a.data.date.localeCompare(b.data.date));

      let remainingPayment = amount;

      for (const order of unpaidOrders) {
        if (remainingPayment <= 0) break;

        const orderData = order.data;
        const orderTotal = orderData.total;
        const orderPaid = orderData.amountPaid || 0;
        const orderRemaining = orderTotal - orderPaid;

        if (orderRemaining > 0) {
          const allocation = Math.min(remainingPayment, orderRemaining);
          const newOrderPaid = orderPaid + allocation;
          const isFullyPaid = newOrderPaid >= orderTotal;

          transaction.update(order.ref, {
            amountPaid: newOrderPaid,
            status: isFullyPaid ? 'Paid' : 'Pending'
          });

          remainingPayment -= allocation;
        }
      }

      // 3. Create Payment Record
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

  async updateCustomer(id: string, updates: Partial<Customer>) {
    await updateDoc(doc(db_firestore, "customers", id), updates);
    this.notify();
  }

  async addContainer(c: Container) { 
    if (!this.currentUserId) throw new Error("Unauthorized");
    await setDoc(doc(db_firestore, "containers", c.id), { ...c, userId: this.currentUserId }); 
    this.notify();
  }

  async updateContainerStatus(id: string, status: Container['status']) {
    if (!this.currentUserId) throw new Error("Unauthorized");
    
    await runTransaction(db_firestore, async (transaction) => {
      const containerRef = doc(db_firestore, "containers", id);
      const containerSnap = await transaction.get(containerRef);
      if (!containerSnap.exists()) throw new Error("Container not found");
      
      const container = containerSnap.data() as Container;
      const oldStatus = container.status;
      
      // If moving to Unloaded, inject stock
      if (status === 'Unloaded' && oldStatus !== 'Unloaded') {
        const items = container.items || [];
        
        // 1. COLLECT ALL READS FIRST
        const productData: { [key: string]: any } = {};
        const newProducts: any[] = [];
        const existingProductUpdates: any[] = [];

        for (const item of items) {
          let productId = item.productId;
          
          if (!productId) {
            const existing = this.products.find(p => 
              p.name.toLowerCase() === item.productName.toLowerCase() && 
              p.category === item.category && 
              p.size === item.size
            );
            if (existing) productId = existing.id;
          }

          if (productId) {
            const productRef = doc(db_firestore, "products", productId);
            const productSnap = await transaction.get(productRef);
            if (productSnap.exists()) {
              productData[productId] = productSnap.data();
              existingProductUpdates.push({ ref: productRef, item, productId });
            } else if (!item.productId) {
              // If it was supposed to be existing but not found in DB, treat as new
              newProducts.push(item);
            }
          } else {
            newProducts.push(item);
          }
        }

        // 2. PERFORM ALL WRITES AFTER ALL READS
        for (const item of newProducts) {
          const newId = `PROD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
          const productRef = doc(db_firestore, "products", newId);
          transaction.set(productRef, {
            id: newId,
            name: item.productName,
            category: item.category,
            size: item.size,
            costPrice: item.costPrice,
            sellingPrice: item.costPrice * 1.5,
            stockQuantity: item.quantity,
            userId: this.currentUserId
          });
        }

        for (const update of existingProductUpdates) {
          const currentData = productData[update.productId];
          const currentStock = currentData?.stockQuantity || 0;
          transaction.update(update.ref, { 
            stockQuantity: currentStock + update.item.quantity,
            costPrice: update.item.costPrice
          });
          // Update local productData in case same product appears twice in manifest
          productData[update.productId].stockQuantity = currentStock + update.item.quantity;
        }
      }
      
      transaction.update(containerRef, { status });
    });
    
    this.notify();
  }

  async addExpense(e: Expense) { 
    if (!this.currentUserId) throw new Error("Unauthorized");
    await setDoc(doc(db_firestore, "expenses", e.id), { ...e, userId: this.currentUserId }); 
    this.notify();
  }

  async updateExpense(id: string, updates: Partial<Expense>) {
    await updateDoc(doc(db_firestore, "expenses", id), updates);
    this.notify();
  }

  async deleteExpense(id: string) {
    await deleteDoc(doc(db_firestore, "expenses", id));
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

  getDashboardStats(startDate?: string, endDate?: string): DashboardStats {
    const today = new Date().toISOString().split('T')[0];
    
    let filteredOrders = this.orders;
    let filteredExpenses = this.expenses;
    
    if (startDate && endDate) {
      filteredOrders = this.orders.filter(o => o.date >= startDate && o.date <= endDate);
      filteredExpenses = this.expenses.filter(e => e.date >= startDate && e.date <= endDate);
    }

    const todaySales = this.orders.filter(o => o.date === today).reduce((s, o) => s + o.total, 0);
    const totalRevenue = filteredOrders.reduce((s, o) => s + o.total, 0);
    
    // Calculate total profit from sales (with fallback for old orders)
    const totalProfitFromSales = filteredOrders.reduce((s, o) => {
      if (o.totalProfit !== undefined) return s + o.totalProfit;
      // Estimate for old orders that don't have totalProfit saved
      const estimatedProfit = o.items.reduce((itemSum, item) => {
        const p = this.products.find(prod => prod.id === item.productId);
        const cost = p ? p.costPrice : item.price * 0.7; // Fallback to 30% margin
        return itemSum + ((item.price - cost) * item.quantity);
      }, 0);
      return s + estimatedProfit;
    }, 0);

    const outstandingCredit = this.customers.reduce((s, c) => s + c.outstandingBalance, 0);
    const lowStock = this.products.filter(p => p.stockQuantity < 50).length;
    const invValue = this.products.reduce((s, p) => s + (p.costPrice * p.stockQuantity), 0);
    
    const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    
    return {
      todaySales,
      totalRevenue,
      outstandingCredit,
      overdueCustomersCount: this.orders.filter(o => o.status !== 'Paid' && new Date(o.dueDate) < new Date()).length,
      lowStockAlerts: lowStock,
      totalInventoryValue: invValue,
      netProfit: totalProfitFromSales - totalExpenses
    };
  }

  // Diagnostics method remains standard to allow testing for index requirements in staging
  async triggerComplexIndexQuery() {
    if (!this.currentUserId) throw new Error("Unauthenticated");
    const q = query(
      collection(db_firestore, "orders"),
      where("userId", "==", this.currentUserId),
      where("status", "!=", "Paid"),
      orderBy("status"),
      orderBy("date", "desc"),
      limit(1)
    );
    await getDocs(q);
  }

  async bulkInjectSampleData() {
    if (!this.currentUserId) throw new Error("Unauthenticated");
    const samples: Product[] = [
      { id: 'p-bulk-1', name: 'Bulk Glass A', category: 'Bottle', size: 100, costPrice: 5, sellingPrice: 12, stockQuantity: 1000, userId: this.currentUserId },
      { id: 'p-bulk-2', name: 'Bulk Spray B', category: 'Spray', size: 50, costPrice: 2, sellingPrice: 8, stockQuantity: 500, userId: this.currentUserId },
    ];
    for (const s of samples) {
      await setDoc(doc(db_firestore, "products", s.id), s);
    }
  }
}

export const db = new DB();
export const CURRENT_USER: User = { uid: '1', name: 'Admin', email: 'admin@goldpack.com', role: 'admin' };
