'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { BillingCartItem, BillingProduct, BillingSale, BillingCustomer } from '@/types/billing';
import {
  calculateLineTotal,
  calculateGrossSubtotal,
  calculateTotalDiscount,
  calculateTotalTax,
  calculateGrandTotal,
  calculateCashBalance,
  generateSequentialBillNumber,
  matchProductSearch,
  matchesStockFilter,
  StockFilterType,
} from '@/lib/billing-engine';
import { commitBillingCheckout } from '@/lib/billing-checkout';
import { QuantityModal } from '@/components/admin/billing/quantity-modal';
import { CustomItemModal } from '@/components/admin/billing/custom-item-modal';
import { ReturnModal } from '@/components/admin/billing/return-modal';
import { ReceiptModal } from '@/components/admin/billing/receipt-modal';
import { printThermalReceipt } from '@/lib/thermal-printer';
import { PastSalesTab } from '@/components/admin/billing/past-sales-tab';
import { InventoryLedgerTab } from '@/components/admin/billing/inventory-ledger-tab';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

import {
  Search,
  Plus,
  Minus,
  Trash2,
  RotateCcw,
  Sparkles,
  CreditCard,
  Banknote,
  QrCode,
  Layers,
  History,
  ShoppingCart,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Edit2,
  PackageCheck,
  PackageX,
  X,
  Loader2,
} from 'lucide-react';

export default function AdminBillingPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // Active navigation tab: pos, history, ledger
  const [activeTab, setActiveTab] = useState<'pos' | 'history' | 'ledger'>('pos');

  // Query catalog products from Firestore
  const productsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'products') : null),
    [firestore]
  );
  const { data: rawProducts, isLoading: isProductsLoading } = useCollection<any>(productsQuery);

  // Normalize products into BillingProduct
  const products: BillingProduct[] = useMemo(() => {
    if (!rawProducts) return [];
    return rawProducts.map((p) => ({
      id: p.id,
      name: p.name || 'Unnamed Product',
      sku: p.sku || `SKU-${p.id.slice(0, 6).toUpperCase()}`,
      price: Number(p.price || 0),
      sellingPrice: Number(p.price || 0),
      mrp: Number(p.originalPrice || p.price || 0),
      purchasePrice: Number(p.purchasePrice || 0),
      stock: Number(p.stock ?? 0),
      currentStock: Number(p.stock ?? 0),
      minStockLevel: Number(p.minStockLevel ?? 5),
      unit: p.unit || 'Piece',
      tax: Number(p.tax || 0),
      category: p.category || 'Components',
      image: p.image || '',
    }));
  }, [rawProducts]);

  // Customers for autocomplete (fetched safely via API)
  const [existingCustomers, setExistingCustomers] = useState<BillingCustomer[]>([]);
  const [salesCount, setSalesCount] = useState<number>(0);

  const refreshCustomersAndSales = async () => {
    try {
      const [custRes, salesRes] = await Promise.all([
        fetch('/api/billing/customers'),
        fetch('/api/billing/sales'),
      ]);
      const custData = await custRes.json();
      const salesData = await salesRes.json();
      if (custData.customers) setExistingCustomers(custData.customers);
      if (salesData.sales) setSalesCount(salesData.sales.length);
    } catch (e) {
      console.error('Error fetching customers/sales for billing:', e);
    }
  };

  useEffect(() => {
    refreshCustomersAndSales();
  }, []);

  // -------------------------------------------------------------
  // POS Cart State
  // -------------------------------------------------------------
  const [cart, setCart] = useState<BillingCartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<StockFilterType>('All');

  // Customer state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  // Financial & Payment state
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoPrintOnCheckout, setAutoPrintOnCheckout] = useState(true);

  // Modals state
  const [editingCartItem, setEditingCartItem] = useState<BillingCartItem | null>(null);
  const [isQuantityModalOpen, setIsQuantityModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<BillingSale | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Dynamic Categories from products
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filtered Products for Catalog Search Grid
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = matchProductSearch(p, searchQuery);
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchStock = matchesStockFilter(p, stockFilter);
      return matchSearch && matchCat && matchStock;
    });
  }, [products, searchQuery, selectedCategory, stockFilter]);

  // Customer Autocomplete Suggestions
  const customerSuggestions = useMemo(() => {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const cleanName = customerName.toLowerCase().trim();

    if (!existingCustomers || (!cleanPhone && (!cleanName || cleanName === 'walk-in customer'))) {
      return [];
    }

    return existingCustomers.filter((c) => {
      if (c.id === 'cust-walkin') return false;
      const matchP = cleanPhone && c.phone?.includes(cleanPhone);
      const matchN = cleanName && cleanName !== 'walk-in customer' && c.name?.toLowerCase().includes(cleanName);
      return matchP || matchN;
    });
  }, [existingCustomers, customerPhone, customerName]);

  // -------------------------------------------------------------
  // Cart Actions
  // -------------------------------------------------------------
  /**
   * Section 3.2: Duplicate Prevention & Quantity Increment Rule
   * When product is clicked:
   * If already in cart (and not return) -> open Quantity Editor modal.
   * If not in cart -> add line item: qty = 1, sellingPrice, discount = 0, isReturn = false.
   */
  const handleProductClick = (product: BillingProduct) => {
    const existingIndex = cart.findIndex((item) => item.product.id === product.id && !item.isReturn);

    if (existingIndex >= 0) {
      setEditingCartItem(cart[existingIndex]);
      setIsQuantityModalOpen(true);
    } else {
      const newItem: BillingCartItem = {
        id: `${product.id}-${Date.now()}`,
        product,
        quantity: 1,
        customUnitPrice: product.sellingPrice ?? product.price ?? 0,
        discountAmount: 0,
        isReturn: false,
      };
      setCart((prev) => [newItem, ...prev]);
      toast({
        title: 'Item Added',
        description: `${product.name} (1 ${product.unit || 'Piece'}) added to cart.`,
      });
    }
  };

  const handleUpdateItemQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity: newQty } : item))
    );
  };

  const handleUpdateUnitPrice = (itemId: string, newPrice: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, customUnitPrice: Math.max(0, newPrice) } : item
      )
    );
  };

  const handleUpdateDiscount = (itemId: string, newDiscount: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, discountAmount: Math.max(0, newDiscount) } : item
      )
    );
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleClearCart = () => {
    setCart([]);
    setOrderDiscount(0);
    setCashReceived(0);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerId(null);
  };

  // -------------------------------------------------------------
  // Calculations
  // -------------------------------------------------------------
  const grossSubtotal = useMemo(() => calculateGrossSubtotal(cart), [cart]);
  const totalDiscount = useMemo(() => calculateTotalDiscount(cart, orderDiscount), [cart, orderDiscount]);
  const totalTax = useMemo(() => calculateTotalTax(cart), [cart]);
  const grandTotal = useMemo(() => calculateGrandTotal(cart, orderDiscount), [cart, orderDiscount]);
  const isRefundMode = grandTotal < 0;

  const cashBalanceResult = useMemo(
    () => calculateCashBalance(grandTotal, cashReceived),
    [grandTotal, cashReceived]
  );

  // Sync cashReceived with grandTotal when grandTotal changes if exact was selected
  useEffect(() => {
    if (grandTotal > 0 && cashReceived === 0) {
      setCashReceived(grandTotal);
    }
  }, [grandTotal]);

  // -------------------------------------------------------------
  // Checkout Execution
  // -------------------------------------------------------------
  const handleCheckout = async () => {
    if (!firestore) return;
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: 'Cart is empty', description: 'Add products to cart before checkout.' });
      return;
    }

    if (paymentMethod === 'cash' && !isRefundMode && cashReceived < grandTotal) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Cash Tendered',
        description: `Customer still owes ₹${(grandTotal - cashReceived).toFixed(2)}. Please collect the remaining balance.`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedBillNumber = generateSequentialBillNumber(salesCount, 'INV', 1);

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          customer: {
            id: customerId,
            name: customerName.trim() || 'Walk-in Customer',
            phone: customerPhone,
            address: customerAddress,
          },
          billNumber: generatedBillNumber,
          paymentMethod,
          cashReceived: paymentMethod === 'cash' ? cashReceived : grandTotal,
          changeReturned: paymentMethod === 'cash' ? Math.max(0, cashReceived - grandTotal) : 0,
          orderDiscount,
          cashierName: user?.displayName || user?.email?.split('@')[0] || 'Admin',
          cashierEmail: user?.email || '',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Checkout failed');
      }

      const sale = data.sale;
      // Immediately open receipt and reset cart for maximum cashier speed
      setCompletedSale(sale);
      setIsReceiptModalOpen(true);
      handleClearCart();
      setSalesCount((prev) => prev + 1);

      // Instantly print thermal receipt if enabled
      if (autoPrintOnCheckout) {
        try {
          printThermalReceipt(sale);
        } catch (printErr) {
          console.warn('Auto print error:', printErr);
        }
      }

      // Non-blocking background sync of customers and sales database
      setTimeout(() => {
        refreshCustomersAndSales();
      }, 50);

      toast({
        title: isRefundMode ? 'Refund Processed & Restocked' : 'Sale Completed Successfully',
        description: `Bill ${sale.billNumber} committed to database and stock updated.`,
      });
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast({
        variant: 'destructive',
        title: 'Checkout Failed',
        description: err.message || 'An error occurred during checkout commit.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:h-full space-y-2 bg-zinc-50/50 dark:bg-zinc-950/50 lg:overflow-hidden font-sans">
      {/* Top Header / Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black shrink-0">
            <Receipt className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-foreground leading-none">
              Billing Engine &amp; POS
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Live e-commerce stock sync, returns, exchanges, inventory audit ledger &amp; thermal invoicing.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-auto">
          <TabsList className="bg-zinc-200/60 dark:bg-zinc-900 rounded-xl h-8 p-0.5">
            <TabsTrigger value="pos" className="text-xs font-bold rounded-lg gap-1.5 px-3 h-7">
              <ShoppingCart className="h-3.5 w-3.5" />
              Active Billing
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs font-bold rounded-lg gap-1.5 px-3 h-7">
              <History className="h-3.5 w-3.5" />
              Sales History
            </TabsTrigger>
            <TabsTrigger value="ledger" className="text-xs font-bold rounded-lg gap-1.5 px-3 h-7">
              <Layers className="h-3.5 w-3.5" />
              Audit Ledger
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: ACTIVE POS BILLING SCREEN */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 flex-1 lg:min-h-0 lg:overflow-hidden">
          {/* LEFT PANEL: CATALOG SEARCH, FILTERS & PRODUCT GRID (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col h-[420px] sm:h-[460px] lg:h-full space-y-2 min-h-0">
            {/* Search and Action Bar */}
            <Card className="border-border/60 shadow-sm bg-white dark:bg-zinc-900 rounded-2xl shrink-0 p-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search catalog by product name, SKU, or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 text-xs rounded-xl border-zinc-200 dark:border-zinc-800"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCustomModalOpen(true)}
                    className="h-10 text-xs font-bold rounded-xl gap-1.5 border-zinc-200 dark:border-zinc-800"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    + Custom Item
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsReturnModalOpen(true)}
                    className="h-10 text-xs font-bold rounded-xl gap-1.5 border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    + Return Item
                  </Button>
                </div>
              </div>

              {/* Category Pills & Stock Filters */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800 mt-3 overflow-x-auto pb-0.5">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all whitespace-nowrap ${
                        selectedCategory === cat
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <Select value={stockFilter} onValueChange={(val: any) => setStockFilter(val)}>
                  <SelectTrigger className="h-7 text-[11px] font-semibold w-28 rounded-lg shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Stocks</SelectItem>
                    <SelectItem value="Low">Low Stock (≤5)</SelectItem>
                    <SelectItem value="Out">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Catalog Grid View */}
            <Card className="border-border/60 shadow-sm bg-white dark:bg-zinc-900 rounded-2xl flex-1 min-h-0 overflow-hidden flex flex-col">
              <ScrollArea className="flex-1 p-3">
                {isProductsLoading ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-xs gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                    Syncing catalog products and live stock levels...
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-2">
                    <PackageX className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-bold text-foreground">No matching products found</p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Try searching another keyword or use "+ Custom Item" to bill an uncatalogued item.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                    {filteredProducts.map((p) => {
                      const isOutOfStock = p.stock <= 0;
                      const isLowStock = p.stock > 0 && p.stock <= (p.minStockLevel || 5);
                      const inCartItem = cart.find((i) => i.product.id === p.id && !i.isReturn);

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleProductClick(p)}
                          className={`relative flex flex-col text-left p-2.5 rounded-xl border transition-all group ${
                            inCartItem
                              ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.03]'
                              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-400 dark:hover:border-zinc-700 hover:shadow-sm'
                          }`}
                        >
                          {/* Top Badges */}
                          <div className="flex justify-between items-start gap-1 mb-1.5 w-full">
                            <span className="text-[9px] font-mono font-bold text-muted-foreground truncate uppercase">
                              {p.sku}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0 h-4 font-bold border ${
                                isOutOfStock
                                  ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900'
                                  : isLowStock
                                  ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900'
                                  : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900'
                              }`}
                            >
                              {p.stock} in stock
                            </Badge>
                          </div>

                          {/* Image & Title */}
                          <div className="flex items-center gap-2 mb-2">
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={p.name}
                                className="h-10 w-10 rounded-lg object-contain bg-zinc-50 dark:bg-zinc-800 shrink-0 border border-zinc-100 dark:border-zinc-800"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-400 font-bold text-[10px]">
                                IC
                              </div>
                            )}
                            <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                              {p.name}
                            </h4>
                          </div>

                          {/* Bottom Price & In-Cart Counter */}
                          <div className="mt-auto flex justify-between items-center pt-1.5 border-t border-zinc-100 dark:border-zinc-800/80 w-full">
                            <span className="text-sm font-black text-foreground">
                              ₹{p.sellingPrice ?? p.price}
                            </span>
                            {inCartItem ? (
                              <Badge className="bg-primary text-white text-[10px] h-5 px-1.5 font-bold">
                                In Cart: {inCartItem.quantity}
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground group-hover:text-primary font-semibold">
                                + Add
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </Card>
          </div>

          {/* RIGHT PANEL: CART, CUSTOMER & SETTLEMENT ENGINE (7 cols) */}
          <div className="lg:col-span-7 flex flex-col lg:h-full space-y-2 min-h-0">
            {/* Customer Association Header */}
            <Card className="border-border/60 shadow-sm bg-white dark:bg-zinc-900 rounded-xl shrink-0 p-2.5 relative">
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span>Customer Information</span>
                  <span className="text-[10px] text-muted-foreground font-normal italic">
                    (Optional - defaults to Walk-in Customer)
                  </span>
                </div>
                {(customerName || customerPhone) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerName('');
                      setCustomerPhone('');
                      setCustomerId(null);
                    }}
                    className="text-[10px] text-rose-500 hover:underline font-semibold flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Input
                    placeholder="Customer Name (Optional)"
                    value={customerName}
                    onFocus={() => setShowCustomerSuggestions(true)}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setShowCustomerSuggestions(true);
                    }}
                    className="h-8 text-xs rounded-lg"
                  />
                  {customerName && (
                    <button
                      type="button"
                      onClick={() => setCustomerName('')}
                      className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Input
                    placeholder="Phone (10 digits - Optional)"
                    value={customerPhone}
                    onFocus={() => setShowCustomerSuggestions(true)}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                      setShowCustomerSuggestions(true);
                    }}
                    className="h-8 text-xs rounded-lg font-mono"
                  />
                  {customerPhone && (
                    <button
                      type="button"
                      onClick={() => setCustomerPhone('')}
                      className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Autocomplete Dropdown */}
              {showCustomerSuggestions && customerSuggestions.length > 0 && (
                <div className="absolute top-full left-2 right-2 z-50 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                  <div className="p-1.5 text-[10px] font-bold text-muted-foreground uppercase bg-zinc-50 dark:bg-zinc-800/50">
                    Existing Customers
                  </div>
                  {customerSuggestions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCustomerName(c.name);
                        setCustomerPhone(c.phone);
                        setCustomerAddress(c.address || '');
                        setCustomerId(c.id);
                        setShowCustomerSuggestions(false);
                      }}
                      className="w-full text-left p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex justify-between items-center text-xs border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                    >
                      <span className="font-semibold text-foreground">{c.name}</span>
                      <span className="font-mono text-muted-foreground">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Cart Line Items Table - Expanded View */}
            <Card className="border-border/60 shadow-sm bg-white dark:bg-zinc-900 rounded-xl flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Active Cart ({cart.reduce((acc, i) => acc + i.quantity, 0)} items)
                  </span>
                </div>
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearCart}
                    className="h-6 text-[11px] text-rose-500 hover:text-rose-600 px-2 font-semibold"
                  >
                    Clear Cart
                  </Button>
                )}
              </div>

              {/* Header row for cart columns */}
              {cart.length > 0 && (
                <div className="px-3 py-1 bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-between gap-1.5 sm:gap-2 shrink-0">
                  <span className="flex-1">Item Details</span>
                  <span className="w-20 sm:w-24 text-center">Qty</span>
                  <span className="w-14 sm:w-16 text-right">Price</span>
                  <span className="hidden sm:inline-block w-14 text-right">Disc</span>
                  <span className="w-16 sm:w-20 text-right">Total</span>
                  <span className="w-6"></span>
                </div>
              )}

              {/* Scrollable Line Items */}
              <ScrollArea className="flex-1 p-2">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[160px] text-center p-4 text-muted-foreground space-y-1">
                    <ShoppingCart className="h-8 w-8 text-muted-foreground/30 mb-1" />
                    <p className="text-xs font-bold">Cart is empty</p>
                    <p className="text-[11px] text-muted-foreground">
                      Click catalog products on the left or add custom items.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {cart.map((item) => {
                      const lineTotal = calculateLineTotal(item);
                      const isRet = item.isReturn;

                      return (
                        <div
                          key={item.id}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all ${
                            isRet
                              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                              : 'bg-zinc-50/40 dark:bg-zinc-800/20 border-zinc-200/70 dark:border-zinc-800 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/50'
                          }`}
                        >
                          {/* Item Details */}
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              {isRet && (
                                <Badge className="bg-rose-600 text-white text-[8px] px-1 py-0 h-3.5 shrink-0">
                                  RETURN
                                </Badge>
                              )}
                              <span className="font-bold text-foreground text-xs truncate block" title={item.product.name}>
                                {item.product.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                              <span>{item.product.sku || 'N/A'}</span>
                              {!isRet && (
                                <>
                                  <span>•</span>
                                  <span>Stock: {item.product.stock}</span>
                                </>
                              )}
                              {isRet && item.returnReason && (
                                <span className="text-rose-600 font-semibold">• {item.returnReason}</span>
                              )}
                            </div>
                          </div>

                          {/* Quantity Editor Stepper */}
                          <div className="w-20 sm:w-24 flex items-center justify-center shrink-0">
                            <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 overflow-hidden h-6">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQuantity(item.id, item.quantity - 1)}
                                className="px-1 sm:px-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 h-full flex items-center justify-center font-bold text-xs"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0.01"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateItemQuantity(item.id, parseFloat(e.target.value) || 0)
                                }
                                className="w-7 sm:w-8 text-center text-xs font-bold bg-transparent outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQuantity(item.id, item.quantity + 1)}
                                className="px-1 sm:px-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 h-full flex items-center justify-center font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Unit Price */}
                          <div className="w-14 sm:w-16 text-right shrink-0">
                            <input
                              type="number"
                              min="0"
                              value={item.customUnitPrice}
                              onChange={(e) =>
                                handleUpdateUnitPrice(item.id, parseFloat(e.target.value) || 0)
                              }
                              className="w-14 sm:w-16 h-6 px-1 text-xs text-right font-bold rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                            />
                          </div>

                          {/* Line Discount */}
                          <div className="hidden sm:block w-14 text-right shrink-0">
                            {!isRet ? (
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={item.discountAmount || ''}
                                onChange={(e) =>
                                  handleUpdateDiscount(item.id, parseFloat(e.target.value) || 0)
                                }
                                className="w-14 h-6 px-1 text-xs text-right text-emerald-600 font-bold rounded border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-zinc-900"
                              />
                            ) : (
                              <span className="text-[10px] text-muted-foreground">-</span>
                            )}
                          </div>

                          {/* Line Total */}
                          <div className="w-16 sm:w-20 text-right shrink-0 font-black text-xs">
                            <span
                              className={lineTotal < 0 ? 'text-rose-600' : 'text-foreground'}
                            >
                              {lineTotal < 0
                                ? `-₹${Math.abs(lineTotal).toFixed(2)}`
                                : `₹${lineTotal.toFixed(2)}`}
                            </span>
                          </div>

                          {/* Remove item button */}
                          <div className="w-6 text-right shrink-0">
                            <button
                              onClick={() => handleRemoveCartItem(item.id)}
                              className="text-zinc-400 hover:text-rose-500 transition-colors p-1"
                              title="Remove item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Financial Breakdown & Settlement Engine */}
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 shrink-0 space-y-2">
                {/* Summary Lines */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <span>Subtotal: ₹{grossSubtotal.toFixed(2)}</span>
                      {totalTax > 0 && <span>• Tax: ₹{totalTax.toFixed(2)}</span>}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span>Order Disc:</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="₹0"
                        value={orderDiscount || ''}
                        onChange={(e) => setOrderDiscount(parseFloat(e.target.value) || 0)}
                        className="w-14 h-5 px-1 text-[10px] text-right rounded border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-zinc-900 ml-0.5"
                      />
                      <span>(-₹{totalDiscount.toFixed(2)})</span>
                    </span>
                  </div>

                  {/* Grand Total Bar */}
                  <div className="flex justify-between items-center pt-1 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs font-black uppercase tracking-wider text-foreground">
                      {isRefundMode ? 'NET REFUND TO CUSTOMER' : 'GRAND TOTAL PAYABLE'}
                    </span>
                    <span
                      className={`text-xl font-black ${
                        isRefundMode ? 'text-rose-600' : 'text-primary'
                      }`}
                    >
                      ₹{Math.abs(grandTotal).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Payment Methods Bar (Split Removed) */}
                {!isRefundMode && (
                  <div className="pt-1.5 border-t border-zinc-200/80 dark:border-zinc-800 space-y-1.5">
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'cash', label: 'Cash', icon: Banknote },
                        { id: 'upi', label: 'UPI / QR', icon: QrCode },
                        { id: 'card', label: 'Card', icon: CreditCard },
                      ].map((mode) => (
                        <Button
                          key={mode.id}
                          type="button"
                          variant={paymentMethod === mode.id ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPaymentMethod(mode.id as any)}
                          className="h-8 text-xs font-bold rounded-lg gap-1.5"
                        >
                          <mode.icon className="h-3.5 w-3.5" />
                          {mode.label}
                        </Button>
                      ))}
                    </div>

                    {/* Cash Tender & Change Calculations */}
                    {paymentMethod === 'cash' && (
                      <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-xs font-bold text-foreground whitespace-nowrap">
                            Cash Received (₹):
                          </Label>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <Input
                              type="number"
                              min="0"
                              value={cashReceived || ''}
                              onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                              className="h-7 w-20 sm:w-24 text-right font-black text-xs rounded-lg"
                            />
                            {/* Quick Presets */}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setCashReceived(grandTotal)}
                              className="h-7 px-2 text-[10px] font-bold rounded-md"
                            >
                              Exact
                            </Button>
                            {[100, 500, 2000].map((preset) => (
                              <Button
                                key={preset}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setCashReceived(preset)}
                                className="h-7 px-1.5 text-[10px] font-bold rounded-md"
                              >
                                ₹{preset}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Cash Balance Display */}
                        <div
                          className={`text-xs font-bold flex items-center justify-between px-2.5 py-1 rounded-md ${
                            cashBalanceResult.status === 'CHANGE_TO_RETURN'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                              : cashBalanceResult.status === 'CUSTOMER_OWES'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                              : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                          }`}
                        >
                          <span>Cash Status:</span>
                          <span>{cashBalanceResult.label}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Auto-print toggle & Bill number preview */}
                <div className="flex items-center justify-between text-xs px-0.5 pt-0.5">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-foreground select-none">
                    <input
                      type="checkbox"
                      checked={autoPrintOnCheckout}
                      onChange={(e) => setAutoPrintOnCheckout(e.target.checked)}
                      className="rounded border-zinc-300 dark:border-zinc-700 text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                    />
                    <span>Auto-print thermal receipt</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Bill #{generateSequentialBillNumber(salesCount, 'INV', 1)}
                  </span>
                </div>

                {/* Primary Action Button */}
                <Button
                  type="button"
                  onClick={handleCheckout}
                  disabled={isSubmitting || cart.length === 0}
                  className={`w-full h-10 text-sm font-black rounded-xl shadow-lg transition-all ${
                    isRefundMode
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                      : 'bg-primary hover:bg-primary/95 text-white shadow-primary/20'
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Committing Transaction...
                    </span>
                  ) : isRefundMode ? (
                    `ISSUE REFUND & RESTOCK (₹${Math.abs(grandTotal).toFixed(2)})`
                  ) : (
                    `COLLECT PAYMENT & PRINT (₹${grandTotal.toFixed(2)})`
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: SALES INVOICES HISTORY */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'history' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <PastSalesTab
            adminUserName={user?.displayName || user?.email || 'Admin'}
            onSelectSaleForReceipt={(sale) => {
              setCompletedSale(sale);
              setIsReceiptModalOpen(true);
            }}
            onSaleDeleted={() => {
              refreshCustomersAndSales();
            }}
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: INVENTORY AUDIT LEDGER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'ledger' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <InventoryLedgerTab />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODALS */}
      {/* ------------------------------------------------------------- */}
      {/* Quantity Editor Modal (Duplicate prevention rule) */}
      <QuantityModal
        isOpen={isQuantityModalOpen}
        onClose={() => setIsQuantityModalOpen(false)}
        cartItem={editingCartItem}
        onUpdateQuantity={(newQty) => {
          if (editingCartItem) {
            handleUpdateItemQuantity(editingCartItem.id, newQty);
          }
        }}
        onRemoveItem={() => {
          if (editingCartItem) {
            handleRemoveCartItem(editingCartItem.id);
          }
        }}
      />

      {/* Custom Item Modal */}
      <CustomItemModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onAddCustomItem={(item) => {
          setCart((prev) => [item, ...prev]);
          toast({ title: 'Custom Item Added', description: `${item.product.name} added to cart.` });
        }}
      />

      {/* In-Cart Return / Restock Modal */}
      <ReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        products={products}
        onAddReturnItem={(item) => {
          setCart((prev) => [item, ...prev]);
          toast({
            title: 'Return Line Added',
            description: `${item.product.name} credit added. Will restock catalog inventory on checkout.`,
          });
        }}
      />

      {/* Printable / WhatsApp Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        sale={completedSale}
        onNewBill={handleClearCart}
        onSaleDeleted={() => {
          refreshCustomersAndSales();
          setCompletedSale(null);
        }}
        storeName="Crabster Technology"
        storeAddress="Making Electronics Easy, Affordable, and Understandable."
        storePhone="7010396642"
        storeGstin=""
      />
    </div>
  );
}
