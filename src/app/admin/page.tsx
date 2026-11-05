'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { User } from '@/app/admin/users/page';
import type { BillingSale } from '@/types/billing';
import { ReceiptModal } from '@/components/admin/billing/receipt-modal';
import { A4InvoiceDialog } from '@/components/invoice/a4-invoice-dialog';
import type { OnlineInvoiceData } from '@/lib/invoice-pdf';
import {
  DollarSign,
  ShoppingBag,
  Users,
  Store,
  Globe,
  Search,
  RefreshCw,
  Eye,
  Printer,
  ArrowRight,
  Package,
  Calendar,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Clock,
  FileText,
  ExternalLink,
  Receipt,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ==========================================
// UNIFIED ORDER MODEL (ONLINE + POS BILLING)
// ==========================================
export interface UnifiedOrder {
  id: string;
  type: 'online' | 'billing';
  refNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress?: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
  date: Date;
  dateFormatted: string;
  status: string;
  paymentMethod: string;
  paymentId?: string;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  shippingCharge?: number;
  itemsCount: number;
  items: Array<{
    id?: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
    image?: string;
    sku?: string;
    unit?: string;
  }>;
  cashierName?: string;
  cashierEmail?: string;
  cashReceived?: number;
  changeReturned?: number;
  notes?: string;
  userId?: string;
  rawSale?: BillingSale;
}

const AdminDashboardPage = () => {
  const router = useRouter();
  const firestore = useFirestore();

  // Users count
  const usersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  // States for unified data
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter / Search states
  const [channelFilter, setChannelFilter] = useState<'all' | 'online' | 'billing'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Receipt Modal for POS sales
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<BillingSale | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // A4 Tax Invoice Modal for Online Orders
  const [selectedOnlineInvoice, setSelectedOnlineInvoice] = useState<OnlineInvoiceData | null>(null);
  const [isOnlineInvoiceOpen, setIsOnlineInvoiceOpen] = useState(false);

  // Safe date parser
  const parseDate = (val: any): Date => {
    if (!val) return new Date();
    if (typeof val === 'string') return new Date(val);
    if (typeof val.toDate === 'function') return val.toDate();
    if (val._seconds) return new Date(val._seconds * 1000);
    if (val.seconds) return new Date(val.seconds * 1000);
    return new Date(val);
  };

  // Fetch all orders (Online from /api/admin/orders, Billing from /api/billing/sales)
  const fetchAllOrders = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      const [onlineRes, salesRes] = await Promise.all([
        fetch('/api/admin/orders').then((r) => (r.ok ? r.json() : { orders: [] })).catch(() => ({ orders: [] })),
        fetch('/api/billing/sales').then((r) => (r.ok ? r.json() : { sales: [] })).catch(() => ({ sales: [] })),
      ]);

      const unifiedList: UnifiedOrder[] = [];

      // 1. Process Online Orders
      if (Array.isArray(onlineRes.orders)) {
        onlineRes.orders.forEach((o: any) => {
          const d = parseDate(o.createdAt);
          const rawItems = Array.isArray(o.items) ? o.items : [];
          const normalizedItems = rawItems.map((item: any) => ({
            id: item.id || '',
            name: item.name || 'Component / Kit',
            quantity: Number(item.quantity) || 1,
            price: Number(item.price) || 0,
            total: (Number(item.price) || 0) * (Number(item.quantity) || 1),
            image: item.image || '',
            sku: item.sku || '',
            unit: 'Pcs',
          }));

          unifiedList.push({
            id: o.id,
            type: 'online',
            refNumber: o.id.length > 8 ? `${o.id.substring(0, 8).toUpperCase()}` : o.id,
            customerName: o.customerName || 'Online Customer',
            customerEmail: o.customerEmail || '',
            customerPhone: o.customerPhone || '',
            shippingAddress: o.shippingAddress || null,
            date: d,
            dateFormatted: format(d, 'MMM d, yyyy • h:mm a'),
            status: (o.status || 'paid').toLowerCase(),
            paymentMethod: o.paymentId ? 'Online (Razorpay)' : o.isOfflineOrder ? 'Manual Offline' : 'Online',
            paymentId: o.paymentId || '',
            total: Number(o.total) || 0,
            subtotal: (Number(o.total) || 0) - (Number(o.shippingCharge) || 0),
            discount: 0,
            tax: 0,
            shippingCharge: Number(o.shippingCharge) || 0,
            itemsCount: normalizedItems.length || 1,
            items: normalizedItems,
            userId: o.userId || '',
          });
        });
      }

      // 2. Process POS Billing Sales
      if (Array.isArray(salesRes.sales)) {
        salesRes.sales.forEach((s: BillingSale) => {
          const d = parseDate(s.date);
          const rawItems = Array.isArray(s.items) ? s.items : [];
          const normalizedItems = rawItems.map((item: any) => ({
            id: item.id || '',
            name: item.name || 'Billing Item',
            quantity: Number(item.quantity) || 1,
            price: Number(item.unitPrice) || 0,
            total: Number(item.total) || (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1),
            sku: item.sku || '',
            unit: item.unit || 'Piece',
          }));

          unifiedList.push({
            id: s.id,
            type: 'billing',
            refNumber: s.billNumber || `INV-${s.id.substring(0, 6).toUpperCase()}`,
            customerName: s.customerName || 'Walk-in Customer',
            customerEmail: s.cashierEmail || '',
            customerPhone: s.customerPhone || '',
            shippingAddress: null,
            date: d,
            dateFormatted: format(d, 'MMM d, yyyy • h:mm a'),
            status: (s.status || 'paid').toLowerCase(),
            paymentMethod: (s.paymentMethod || 'cash').toUpperCase(),
            total: Number(s.grandTotal) || Number(s.amount) || 0,
            subtotal: Number(s.amount) || 0,
            discount: (Number(s.discount) || 0) + (Number(s.orderDiscount) || 0),
            tax: Number(s.tax) || 0,
            shippingCharge: 0,
            itemsCount: normalizedItems.length || Number(s.itemsCount) || 1,
            items: normalizedItems,
            cashierName: s.cashierName || 'Admin',
            cashierEmail: s.cashierEmail || '',
            cashReceived: s.cashReceived,
            changeReturned: s.changeReturned,
            notes: s.notes || '',
            rawSale: s,
          });
        });
      }

      // Sort newest to oldest
      unifiedList.sort((a, b) => b.date.getTime() - a.date.getTime());
      setOrders(unifiedList);

      // Cache locally
      try {
        localStorage.setItem('ez_admin_unified_orders_cache', JSON.stringify(unifiedList));
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error('Failed to aggregate orders:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    // Attempt to load instant cache
    try {
      const cached = localStorage.getItem('ez_admin_unified_orders_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const rehydrated = parsed.map((item: any) => ({
            ...item,
            date: new Date(item.date),
          }));
          setOrders(rehydrated);
          setIsLoading(false);
        }
      }
    } catch (e) {
      // ignore
    }

    fetchAllOrders();
  }, []);

  // Compute metrics
  const metrics = useMemo(() => {
    let totalOnlineRev = 0;
    let totalBillingRev = 0;
    let onlineCount = 0;
    let billingCount = 0;

    orders.forEach((o) => {
      if (o.status !== 'cancelled' && o.status !== 'refunded') {
        if (o.type === 'online') {
          totalOnlineRev += o.total;
          onlineCount += 1;
        } else {
          totalBillingRev += o.total;
          billingCount += 1;
        }
      } else {
        if (o.type === 'online') onlineCount += 1;
        else billingCount += 1;
      }
    });

    const totalRev = totalOnlineRev + totalBillingRev;
    const totalCount = orders.length;

    return {
      totalRev,
      totalCount,
      totalOnlineRev,
      totalBillingRev,
      onlineCount,
      billingCount,
      totalUsers: users?.length || 0,
    };
  }, [orders, users]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return orders.filter((order) => {
      // Channel tab filter
      if (channelFilter !== 'all' && order.type !== channelFilter) return false;

      // Status dropdown filter
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;

      // Search query
      if (q) {
        const matchesRef = order.refNumber.toLowerCase().includes(q) || order.id.toLowerCase().includes(q);
        const matchesCustomer =
          order.customerName.toLowerCase().includes(q) ||
          order.customerPhone.toLowerCase().includes(q) ||
          order.customerEmail.toLowerCase().includes(q);
        const matchesStatus = order.status.toLowerCase().includes(q);
        const matchesPayment = order.paymentMethod.toLowerCase().includes(q);
        const matchesItems = order.items.some((it) => it.name.toLowerCase().includes(q));

        if (!matchesRef && !matchesCustomer && !matchesStatus && !matchesPayment && !matchesItems) {
          return false;
        }
      }

      return true;
    });
  }, [orders, channelFilter, statusFilter, searchQuery]);

  // Open detail view
  const handleViewOrder = (order: UnifiedOrder) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  // Open receipt for billing
  const handleOpenReceipt = (order: UnifiedOrder) => {
    if (order.rawSale) {
      setSelectedSaleForReceipt(order.rawSale);
      setIsReceiptModalOpen(true);
    }
  };

  // Open A4 Tax Invoice for online orders
  const handleOpenOnlineInvoice = (order: UnifiedOrder) => {
    const billNumber = order.refNumber.startsWith('INV-')
      ? order.refNumber
      : `INV-OL-${order.id.substring(0, 8).toUpperCase()}`;
    const invoice: OnlineInvoiceData = {
      billNumber,
      orderId: order.id,
      date: order.date ? order.date.toISOString() : new Date().toISOString(),
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentId: order.paymentId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress,
      items: order.items.map((it: any) => ({
        name: it.name || it.productName || 'Component',
        price: Number(it.price || it.unitPrice || 0),
        quantity: Number(it.quantity || 1),
        total: Number(it.total || (Number(it.price || 0) * Number(it.quantity || 1))),
        sku: it.sku || it.productId || 'N/A',
      })),
      subtotal: order.subtotal,
      shippingCharge: order.shippingCharge || 0,
      discount: order.discount,
      tax: order.tax,
      grandTotal: order.total,
      storeInfo: {
        name: 'Crabster Technology',
        address: '12/1 Brindhavan Garden, No.4 Veerapandi, Coimbatore - 641019, Tamil Nadu',
        phone: '+91 7010396642',
        email: 'crabstertechnology@gmail.com',
        gstin: '',
      },
    };
    setSelectedOnlineInvoice(invoice);
    setIsOnlineInvoiceOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Paid</Badge>;
      case 'delivered':
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">Delivered</Badge>;
      case 'shipped':
        return <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">Shipped</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300 font-semibold">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="font-semibold">Cancelled</Badge>;
      case 'refunded':
        return <Badge variant="destructive" className="font-semibold">Refunded</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete order operations & sales overview across Online Store and In-Store POS Billing.
          </p>
        </div>
      </div>

      {/* ── Stats Metric Cards (Online + Billing Combined) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Combined Revenue */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Gross Revenue
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {isLoading ? '...' : `₹${metrics.totalRev.toLocaleString()}`}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1.5 font-medium">
              <span className="text-emerald-600 font-bold">₹{metrics.totalBillingRev.toLocaleString()} POS</span>
              <span>•</span>
              <span className="text-blue-600 font-bold">₹{metrics.totalOnlineRev.toLocaleString()} Online</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Combined Orders */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              All Orders & Bills
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {isLoading ? '...' : metrics.totalCount}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1.5 font-medium">
              <span>{metrics.onlineCount} Online Orders</span>
              <span>•</span>
              <span>{metrics.billingCount} Invoices</span>
            </div>
          </CardContent>
        </Card>

        {/* In-Store POS Billing Sales */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              POS Invoices
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {isLoading ? '...' : metrics.billingCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">
              ₹{metrics.totalBillingRev.toLocaleString()} In-Store sales generated
            </p>
          </CardContent>
        </Card>

        {/* Registered Users */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Registered Users
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {isLoadingUsers ? '...' : metrics.totalUsers}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">
              Active student & maker accounts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Orders & Billing Table Card ── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black flex items-center gap-2">
                All Order Details & Billing
                <Badge variant="secondary" className="text-xs font-bold px-2 py-0.5 rounded-full">
                  {filteredOrders.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Click any row or &quot;View Details&quot; to inspect full items, customer address, payment, and invoices.
              </CardDescription>
            </div>

            {/* Channel Tabs */}
            <Tabs
              value={channelFilter}
              onValueChange={(val) => setChannelFilter(val as any)}
              className="w-full md:w-auto"
            >
              <TabsList className="grid grid-cols-3 w-full md:w-[360px] h-9">
                <TabsTrigger value="all" className="text-xs font-bold">
                  All ({orders.length})
                </TabsTrigger>
                <TabsTrigger value="online" className="text-xs font-bold">
                  Online ({metrics.onlineCount})
                </TabsTrigger>
                <TabsTrigger value="billing" className="text-xs font-bold">
                  POS ({metrics.billingCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-4 pt-2 border-t border-border/60">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by Order ID, Bill #, Customer Name, Phone, Item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs rounded-xl">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery || statusFilter !== 'all' || channelFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setChannelFilter('all');
                  }}
                  className="h-9 text-xs px-2.5 text-muted-foreground hover:text-foreground"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[110px] text-xs font-bold">Channel</TableHead>
                  <TableHead className="w-[140px] text-xs font-bold">Ref / Bill #</TableHead>
                  <TableHead className="text-xs font-bold">Customer</TableHead>
                  <TableHead className="w-[160px] text-xs font-bold">Date & Time</TableHead>
                  <TableHead className="text-xs font-bold">Items Summary</TableHead>
                  <TableHead className="w-[110px] text-xs font-bold">Payment</TableHead>
                  <TableHead className="w-[100px] text-xs font-bold">Status</TableHead>
                  <TableHead className="text-right w-[110px] text-xs font-bold">Grand Total</TableHead>
                  <TableHead className="text-center w-[90px] text-xs font-bold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading all orders and billing sales...
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="font-semibold text-sm">No orders or bills match your filter.</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Try clearing your search query or changing filters.</p>
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading &&
                  filteredOrders.map((order) => {
                    const isOnline = order.type === 'online';

                    return (
                      <TableRow
                        key={`${order.type}-${order.id}`}
                        onClick={() => handleViewOrder(order)}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        {/* Channel Badge */}
                        <TableCell>
                          {isOnline ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-md">
                              <Globe className="h-3 w-3" />
                              Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                              <Store className="h-3 w-3" />
                              POS Bill
                            </span>
                          )}
                        </TableCell>

                        {/* Ref / Bill # */}
                        <TableCell className="font-mono text-xs font-bold text-foreground">
                          {order.refNumber}
                        </TableCell>

                        {/* Customer */}
                        <TableCell>
                          <div className="font-bold text-xs text-foreground truncate max-w-[160px]">
                            {order.customerName}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                            {order.customerPhone || order.customerEmail || '—'}
                          </div>
                        </TableCell>

                        {/* Date */}
                        <TableCell className="text-xs text-muted-foreground">
                          {order.dateFormatted}
                        </TableCell>

                        {/* Items */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-foreground font-medium truncate max-w-[200px]">
                              {order.items[0]?.name || 'Components'}
                              {order.items.length > 1 && ` +${order.items.length - 1} more`}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0 font-bold">
                              ×{order.items.reduce((s, it) => s + (it.quantity || 1), 0)}
                            </Badge>
                          </div>
                        </TableCell>

                        {/* Payment */}
                        <TableCell>
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            {order.paymentMethod}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell>{getStatusBadge(order.status)}</TableCell>

                        {/* Total */}
                        <TableCell className="text-right font-black text-sm text-foreground">
                          ₹{order.total.toLocaleString()}
                        </TableCell>

                        {/* Action */}
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewOrder(order)}
                            className="h-8 px-2 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile / Tablet Cards */}
          <div className="grid grid-cols-1 divide-y divide-border lg:hidden">
            {isLoading && (
              <div className="p-8 text-center text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                Loading orders & billing...
              </div>
            )}

            {!isLoading && filteredOrders.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <p className="font-semibold text-sm">No orders found.</p>
              </div>
            )}

            {!isLoading &&
              filteredOrders.map((order) => {
                const isOnline = order.type === 'online';

                return (
                  <div
                    key={`${order.type}-${order.id}`}
                    onClick={() => handleViewOrder(order)}
                    className="p-4 hover:bg-muted/30 transition-colors cursor-pointer space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isOnline ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 px-1.5 py-0.5 rounded">
                            <Globe className="h-3 w-3" /> Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            <Store className="h-3 w-3" /> POS Bill
                          </span>
                        )}
                        <span className="font-mono text-xs font-bold text-foreground">
                          {order.refNumber}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-foreground">
                          ₹{order.total.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-foreground">{order.customerName}</p>
                        <p className="text-[11px] text-muted-foreground">{order.customerPhone || order.customerEmail || '—'}</p>
                      </div>

                      <div className="text-right">
                        {getStatusBadge(order.status)}
                        <p className="text-[10px] text-muted-foreground mt-1">{order.paymentMethod}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <span>{order.dateFormatted}</span>
                      <span className="font-semibold text-primary flex items-center">
                        View Details <ArrowRight className="h-3 w-3 ml-1" />
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border/60 bg-muted/10 gap-3">
          <p className="text-xs text-muted-foreground">
            Showing <strong className="text-foreground">{filteredOrders.length}</strong> of{' '}
            <strong className="text-foreground">{orders.length}</strong> total transactions.
          </p>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-lg">
              <Link href="/admin/orders">
                Orders Hub <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-lg">
              <Link href="/admin/sales-history">
                Billing Invoices History <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* ======================================================== */}
      {/* COMPREHENSIVE ORDER & BILLING DETAIL DIALOG MODAL        */}
      {/* ======================================================== */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
          {selectedOrder && (
            <>
              {/* Modal Header */}
              <DialogHeader className="p-5 border-b border-border bg-zinc-50 dark:bg-zinc-900/60 shrink-0">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {selectedOrder.type === 'online' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded-md">
                          <Globe className="h-3.5 w-3.5" /> Online Store Order
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                          <Store className="h-3.5 w-3.5" /> In-Store POS Bill
                        </span>
                      )}
                      {getStatusBadge(selectedOrder.status)}
                    </div>

                    <DialogTitle className="text-xl font-black tracking-tight text-foreground font-mono">
                      {selectedOrder.refNumber}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Placed on {selectedOrder.dateFormatted}
                    </DialogDescription>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Grand Total</p>
                    <p className="text-2xl font-black text-foreground">₹{selectedOrder.total.toLocaleString()}</p>
                  </div>
                </div>
              </DialogHeader>

              {/* Scrollable Content */}
              <ScrollArea className="flex-1 p-5 space-y-6 overflow-y-auto">
                {/* 1. Customer & Shipping Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Information */}
                  <div className="p-3.5 rounded-xl border border-border bg-background space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <UserCheck className="h-3.5 w-3.5 text-primary" />
                      <span>Customer Details</span>
                    </div>
                    <p className="text-sm font-bold text-foreground">{selectedOrder.customerName}</p>
                    {selectedOrder.customerPhone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {selectedOrder.customerPhone}
                      </p>
                    )}
                    {selectedOrder.customerEmail && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {selectedOrder.customerEmail}
                      </p>
                    )}
                  </div>

                  {/* Shipping Address or POS Cashier */}
                  <div className="p-3.5 rounded-xl border border-border bg-background space-y-2">
                    {selectedOrder.type === 'online' ? (
                      <>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          <span>Delivery Address</span>
                        </div>
                        {selectedOrder.shippingAddress ? (
                          <div className="text-xs text-foreground/90 space-y-0.5">
                            <p className="font-bold">{selectedOrder.shippingAddress.name}</p>
                            <p>{selectedOrder.shippingAddress.addressLine1}</p>
                            {selectedOrder.shippingAddress.addressLine2 && <p>{selectedOrder.shippingAddress.addressLine2}</p>}
                            <p>
                              {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} - {selectedOrder.shippingAddress.postalCode}
                            </p>
                            <p className="text-muted-foreground font-medium">{selectedOrder.shippingAddress.country}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No physical shipping address provided.</p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <Store className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Store Register & Cashier</span>
                        </div>
                        <div className="text-xs space-y-1">
                          <p className="text-foreground font-bold">{selectedOrder.cashierName || 'Cashier'}</p>
                          <p className="text-muted-foreground">{selectedOrder.cashierEmail || 'Store Terminal 1'}</p>
                          <p className="text-[11px] text-muted-foreground">Store: Crabster Technology, Coimbatore</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 2. Items Purchased Table */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-primary" />
                      Items Ordered ({selectedOrder.items.length})
                    </p>
                  </div>

                  <div className="border border-border rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/40 text-[11px]">
                        <TableRow>
                          <TableHead>Product / Component</TableHead>
                          <TableHead className="text-center w-[80px]">Qty</TableHead>
                          <TableHead className="text-right w-[100px]">Price</TableHead>
                          <TableHead className="text-right w-[110px]">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.items.map((item, idx) => (
                          <TableRow key={idx} className="text-xs">
                            <TableCell>
                              <div className="font-bold text-foreground">{item.name}</div>
                              {item.sku && <div className="text-[10px] text-muted-foreground font-mono">SKU: {item.sku}</div>}
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              ×{item.quantity}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ₹{item.price.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-bold text-foreground">
                              ₹{item.total.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* 3. Financial Breakdown & Payment */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Payment Details */}
                  <div className="p-3.5 rounded-xl border border-border bg-background space-y-2 text-xs">
                    <p className="font-bold uppercase tracking-wider text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-primary" />
                      Payment Information
                    </p>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Method:</span>
                      <span className="font-bold text-foreground">{selectedOrder.paymentMethod}</span>
                    </div>
                    {selectedOrder.paymentId && (
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Transaction ID:</span>
                        <span className="font-mono text-[11px] text-foreground truncate max-w-[150px]">{selectedOrder.paymentId}</span>
                      </div>
                    )}
                    {selectedOrder.cashReceived !== undefined && selectedOrder.cashReceived > 0 && (
                      <>
                        <div className="flex justify-between py-1 border-b border-border/40">
                          <span className="text-muted-foreground">Cash Received:</span>
                          <span className="font-bold text-foreground">₹{selectedOrder.cashReceived.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">Change Returned:</span>
                          <span className="font-bold text-foreground">₹{(selectedOrder.changeReturned || 0).toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Cost Summary */}
                  <div className="p-3.5 rounded-xl border border-border bg-background space-y-1.5 text-xs">
                    <p className="font-bold uppercase tracking-wider text-[11px] text-muted-foreground flex items-center gap-1.5 mb-2">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      Cost Breakdown
                    </p>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal:</span>
                      <span className="font-medium text-foreground">₹{selectedOrder.subtotal.toLocaleString()}</span>
                    </div>

                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-semibold">
                        <span>Discount:</span>
                        <span>-₹{selectedOrder.discount.toLocaleString()}</span>
                      </div>
                    )}

                    {selectedOrder.tax > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tax / GST:</span>
                        <span className="font-medium text-foreground">₹{selectedOrder.tax.toLocaleString()}</span>
                      </div>
                    )}

                    {selectedOrder.shippingCharge !== undefined && selectedOrder.shippingCharge > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Shipping Delivery:</span>
                        <span className="font-medium text-foreground">₹{selectedOrder.shippingCharge.toLocaleString()}</span>
                      </div>
                    )}

                    <Separator className="my-1.5" />
                    <div className="flex justify-between text-sm font-black text-foreground pt-0.5">
                      <span>Grand Total:</span>
                      <span className="text-primary text-base">₹{selectedOrder.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="mt-3 p-3 bg-muted/40 rounded-xl text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">Notes:</span> {selectedOrder.notes}
                  </div>
                )}
              </ScrollArea>

              {/* Modal Footer Actions */}
              <DialogFooter className="p-4 border-t border-border bg-zinc-50 dark:bg-zinc-900/60 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
                <div>
                  {selectedOrder.type === 'billing' && selectedOrder.rawSale && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenReceipt(selectedOrder)}
                      className="rounded-xl border-border h-9 text-xs font-bold"
                    >
                      <Printer className="h-4 w-4 mr-1.5" />
                      Print Bill / Invoice
                    </Button>
                  )}

                  {selectedOrder.type === 'online' && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenOnlineInvoice(selectedOrder)}
                        className="rounded-xl border-primary/30 text-primary hover:bg-primary/5 h-9 text-xs font-bold gap-1.5"
                      >
                        <FileText className="h-4 w-4" />
                        Tax Invoice (A4 PDF)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsDetailModalOpen(false);
                          router.push(`/admin/orders/${selectedOrder.id}?userId=${selectedOrder.userId || ''}`);
                        }}
                        className="rounded-xl border-border h-9 text-xs font-bold"
                      >
                        <ExternalLink className="h-4 w-4 mr-1.5" />
                        Order Hub
                      </Button>
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-xl h-9 text-xs font-bold w-full sm:w-auto"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* THERMAL / A4 / WHATSAPP RECEIPT MODAL FOR BILLING SALES  */}
      {/* ======================================================== */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        sale={selectedSaleForReceipt}
        onNewBill={() => {
          setIsReceiptModalOpen(false);
          router.push('/admin/billing');
        }}
        storeName="Crabster Technology"
        storeAddress="12/1 Brindhavan Garden, No.4 Veerapandi, Coimbatore - 641019, Tamil Nadu"
        storePhone="7010396642"
        storeGstin=""
      />

      {/* A4 Standard Tax Invoice Preview & Download Modal for Online Orders */}
      <A4InvoiceDialog
        isOpen={isOnlineInvoiceOpen}
        onClose={() => setIsOnlineInvoiceOpen(false)}
        invoice={selectedOnlineInvoice}
      />
    </div>
  );
};

export default AdminDashboardPage;
