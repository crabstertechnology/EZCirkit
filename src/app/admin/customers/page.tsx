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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { BillingCustomer } from '@/types/billing';
import {
  UserCheck,
  Search,
  Plus,
  RefreshCw,
  Phone,
  Mail,
  Receipt,
  Edit2,
  Trash2,
  MessageSquare,
  ExternalLink,
  Store,
  DollarSign,
  User,
  ShoppingBag,
  ArrowRight,
  MapPin,
  Calendar,
} from 'lucide-react';
import { cn, normalizePhone10, formatPhoneWithCountryCode } from '@/lib/utils';

export default function CustomersPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<BillingCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with-phone' | 'with-email' | 'repeat'>('all');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<BillingCustomer | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete Confirmation state
  const [customerToDelete, setCustomerToDelete] = useState<BillingCustomer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch customers from API
  const fetchCustomers = async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      const res = await fetch('/api/billing/customers');
      const data = await res.json();
      if (Array.isArray(data.customers)) {
        setCustomers(data.customers);
      }
    } catch (e) {
      console.error('Failed to load customers:', e);
      toast({
        variant: 'destructive',
        title: 'Failed to fetch customers',
        description: 'Could not load customer records from database.',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Open modal for Adding
  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Open modal for Editing
  const handleOpenEditModal = (customer: BillingCustomer) => {
    setEditingCustomer(customer);
    setFormName(customer.name || '');
    setFormPhone(customer.phone ? normalizePhone10(customer.phone) : '');
    setFormEmail(customer.email || '');
    setFormAddress(customer.address || '');
    setFormNotes(customer.notes || '');
    setIsModalOpen(true);
  };

  // Save Customer (POST or PUT)
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast({ variant: 'destructive', title: 'Name required', description: 'Please enter customer name.' });
      return;
    }

    const cleanPhone = normalizePhone10(formPhone);
    if (formPhone.trim() && cleanPhone.length !== 10) {
      toast({
        variant: 'destructive',
        title: 'Invalid Mobile Number',
        description: 'Please enter exactly 10 digits for the mobile number without country code.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const method = editingCustomer ? 'PUT' : 'POST';
      const payload: any = {
        name: formName.trim(),
        phone: cleanPhone,
        email: formEmail.trim().toLowerCase(),
        address: formAddress.trim(),
        notes: formNotes.trim(),
      };
      if (editingCustomer) {
        payload.id = editingCustomer.id;
      }

      const res = await fetch('/api/billing/customers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save customer');
      }

      toast({
        title: editingCustomer ? 'Customer Updated' : 'Customer Added',
        description: `${payload.name} has been saved to the database.`,
      });

      setIsModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      console.error('Save customer error:', err);
      toast({
        variant: 'destructive',
        title: 'Error saving customer',
        description: err.message || 'Could not save customer record.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/billing/customers?id=${encodeURIComponent(customerToDelete.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to delete customer');
      }

      toast({
        title: 'Customer Deleted',
        description: `${customerToDelete.name} has been removed.`,
      });
      setCustomerToDelete(null);
      fetchCustomers();
    } catch (err: any) {
      console.error('Delete customer error:', err);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: err.message || 'Could not delete customer.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick POS Bill Creation: redirect to POS with customer query params
  const handleCreateBillForCustomer = (customer: BillingCustomer) => {
    const params = new URLSearchParams();
    if (customer.id) params.set('customerId', customer.id);
    if (customer.name) params.set('customerName', customer.name);
    if (customer.phone) params.set('customerPhone', customer.phone);
    if (customer.email) params.set('customerEmail', customer.email);
    router.push(`/admin/billing?${params.toString()}`);
  };

  // WhatsApp Link Helper
  const getWhatsAppLink = (phone: string, name: string) => {
    const clean10 = normalizePhone10(phone);
    const text = encodeURIComponent(`Hello ${name || 'Customer'}, thank you for shopping with Crabster Technology!`);
    return `https://wa.me/91${clean10}?text=${text}`;
  };

  // Computed Metrics
  const metrics = useMemo(() => {
    let withPhone = 0;
    let withEmail = 0;
    let repeatCount = 0;
    let totalSpend = 0;

    customers.forEach((c) => {
      if (c.phone) withPhone++;
      if (c.email) withEmail++;
      if ((c.totalOrders || 0) > 1) repeatCount++;
      totalSpend += c.totalSpent || 0;
    });

    return {
      total: customers.length,
      withPhone,
      withEmail,
      repeatCount,
      totalSpend,
    };
  }, [customers]);

  // Filtered & Searched Customers
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return customers.filter((c) => {
      // Type filter
      if (filterType === 'with-phone' && !c.phone) return false;
      if (filterType === 'with-email' && !c.email) return false;
      if (filterType === 'repeat' && (c.totalOrders || 0) <= 1) return false;

      // Query
      if (q) {
        const matchName = c.name?.toLowerCase().includes(q);
        const matchPhone = c.phone?.includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        const matchAddr = c.address?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchAddr) {
          return false;
        }
      }

      return true;
    });
  }, [customers, searchQuery, filterType]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black shrink-0">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Customer Directory &amp; CRM
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Store, search, and manage customer contact details (Name, Mobile, Mail ID) with billing auto-recommendation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCustomers(true)}
            disabled={isRefreshing}
            className="rounded-xl h-9 text-xs"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>

          <Button
            onClick={handleOpenAddModal}
            size="sm"
            className="rounded-xl bg-primary text-white hover:bg-primary/95 h-9 font-bold shadow-sm text-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* ── Metrics Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="p-3.5 sm:p-4 pb-1">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-4 pt-0">
            <div className="text-2xl font-black text-foreground">{isLoading ? '...' : metrics.total}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Saved in database</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="p-3.5 sm:p-4 pb-1">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              With Mobile Number
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-4 pt-0">
            <div className="text-2xl font-black text-emerald-600">{isLoading ? '...' : metrics.withPhone}</div>
            <p className="text-[11px] text-muted-foreground mt-1">WhatsApp &amp; SMS ready</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="p-3.5 sm:p-4 pb-1">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              With Mail ID
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-4 pt-0">
            <div className="text-2xl font-black text-blue-600">{isLoading ? '...' : metrics.withEmail}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Email invoice capable</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="p-3.5 sm:p-4 pb-1">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total In-Store Spend
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-4 pt-0">
            <div className="text-2xl font-black text-primary">
              {isLoading ? '...' : `₹${metrics.totalSpend.toLocaleString()}`}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{metrics.repeatCount} repeat buyers</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Customer Directory Card ── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by Name, Mobile Number, or Mail ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>

            {/* Quick Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: `All (${customers.length})` },
                { id: 'with-phone', label: `With Phone (${metrics.withPhone})` },
                { id: 'with-email', label: `With Mail ID (${metrics.withEmail})` },
                { id: 'repeat', label: `Repeat (${metrics.repeatCount})` },
              ].map((tab) => (
                <Button
                  key={tab.id}
                  type="button"
                  variant={filterType === tab.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType(tab.id as any)}
                  className="h-8 text-xs font-bold rounded-lg px-2.5"
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-bold w-[220px]">Customer Name</TableHead>
                  <TableHead className="text-xs font-bold w-[180px]">Mobile Number</TableHead>
                  <TableHead className="text-xs font-bold w-[220px]">Mail ID (Email)</TableHead>
                  <TableHead className="text-xs font-bold">Address / City</TableHead>
                  <TableHead className="text-center text-xs font-bold w-[90px]">Orders</TableHead>
                  <TableHead className="text-right text-xs font-bold w-[120px]">Total Spent</TableHead>
                  <TableHead className="text-center text-xs font-bold w-[170px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading customer directory...
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && filteredCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <UserCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="font-semibold text-sm">No customers match your search.</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Add new customers or clear your search query.
                      </p>
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading &&
                  filteredCustomers.map((cust) => (
                    <TableRow key={cust.id} className="hover:bg-muted/40 transition-colors">
                      {/* Name */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {cust.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                              <span>{cust.name}</span>
                              {(cust.totalOrders || 0) > 1 && (
                                <Badge className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-[9px] px-1 py-0 h-4 font-semibold">
                                  Repeat
                                </Badge>
                              )}
                            </div>
                            {cust.createdDate && (
                              <p className="text-[10px] text-muted-foreground">
                                Added {format(new Date(cust.createdDate), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Mobile Number */}
                      <TableCell>
                        {cust.phone ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-foreground">
                              +91 {normalizePhone10(cust.phone)}
                            </span>
                            <a
                              href={getWhatsAppLink(cust.phone, cust.name)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Chat on WhatsApp"
                              className="text-emerald-600 hover:text-emerald-700 p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </a>
                            <a
                              href={`tel:+91${normalizePhone10(cust.phone)}`}
                              title="Call"
                              className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </TableCell>

                      {/* Mail ID */}
                      <TableCell>
                        {cust.email ? (
                          <a
                            href={`mailto:${cust.email}`}
                            className="text-xs text-foreground hover:text-primary flex items-center gap-1 truncate max-w-[200px]"
                          >
                            <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{cust.email}</span>
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </TableCell>

                      {/* Address */}
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {cust.address || '—'}
                      </TableCell>

                      {/* Orders */}
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono text-[11px] font-bold">
                          {cust.totalOrders || 0}
                        </Badge>
                      </TableCell>

                      {/* Total Spent */}
                      <TableCell className="text-right font-black text-xs text-foreground">
                        ₹{(cust.totalSpent || 0).toLocaleString()}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Create new bill for this customer"
                            onClick={() => handleCreateBillForCustomer(cust)}
                            className="h-8 px-2 text-xs font-bold text-primary hover:bg-primary/10"
                          >
                            <Store className="h-3.5 w-3.5 mr-1" />
                            Bill
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit Customer"
                            onClick={() => handleOpenEditModal(cust)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete Customer"
                            onClick={() => setCustomerToDelete(cust)}
                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="divide-y divide-border md:hidden">
            {isLoading && (
              <div className="p-8 text-center text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                Loading customers...
              </div>
            )}

            {!isLoading && filteredCustomers.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <p className="font-semibold text-sm">No customers found.</p>
              </div>
            )}

            {!isLoading &&
              filteredCustomers.map((cust) => (
                <div key={cust.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                        {cust.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-sm text-foreground">{cust.name}</span>
                    </div>

                    <span className="font-black text-sm text-primary">
                      ₹{(cust.totalSpent || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    {cust.phone && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-mono">
                          <Phone className="h-3 w-3 text-muted-foreground" /> +91 {normalizePhone10(cust.phone)}
                        </span>
                        <div className="flex items-center gap-2">
                          <a
                            href={getWhatsAppLink(cust.phone, cust.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 font-bold text-[11px] flex items-center gap-1"
                          >
                            <MessageSquare className="h-3 w-3" /> WhatsApp
                          </a>
                        </div>
                      </div>
                    )}

                    {cust.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{cust.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                    <span className="text-[11px] text-muted-foreground">
                      {cust.totalOrders || 0} bills • Total spend
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCreateBillForCustomer(cust)}
                        className="h-7 px-2 text-xs font-bold"
                      >
                        <Store className="h-3 w-3 mr-1" /> New Bill
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEditModal(cust)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>

        <CardFooter className="p-4 border-t border-border/60 bg-muted/10 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Total <strong className="text-foreground">{filteredCustomers.length}</strong> customers displayed.
          </p>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-lg">
            <Link href="/admin/billing">
              Active POS Terminal <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </CardFooter>
      </Card>

      {/* ── Add / Edit Customer Modal ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md p-5 rounded-2xl">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Save customer name, mobile number, and mail ID for automatic billing recommendations.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCustomer} className="space-y-3.5 pt-2">
            <div>
              <Label className="text-xs font-bold text-foreground">
                Customer Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Ramesh Kumar"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">Mobile Number</Label>
                <span className="text-[10px] font-mono font-semibold text-muted-foreground">
                  {formPhone.length}/10 digits
                </span>
              </div>
              <div className="relative flex items-center mt-1">
                <span className="inline-flex items-center px-3 h-9 rounded-l-xl border border-r-0 border-border bg-muted/60 text-xs font-bold text-foreground select-none shrink-0">
                  🇮🇳 +91
                </span>
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9876543210"
                  value={formPhone}
                  onChange={(e) => {
                    let digits = e.target.value.replace(/\D/g, '');
                    if (digits.length === 12 && digits.startsWith('91')) {
                      digits = digits.slice(2);
                    } else if (digits.length === 11 && digits.startsWith('0')) {
                      digits = digits.slice(1);
                    }
                    setFormPhone(digits.slice(0, 10));
                  }}
                  className="rounded-l-none rounded-r-xl h-9 text-xs font-mono tracking-wider"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Enter only 10 digits without country code (+91 is pre-built).
              </p>
            </div>

            <div>
              <Label className="text-xs font-bold text-foreground">Mail ID (Email Address)</Label>
              <Input
                type="email"
                placeholder="e.g. ramesh@gmail.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Used for emailing tax invoices and order updates</p>
            </div>

            <div>
              <Label className="text-xs font-bold text-foreground">Address / City (Optional)</Label>
              <Input
                placeholder="e.g. RS Puram, Coimbatore"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-foreground">Notes / Tags (Optional)</Label>
              <Input
                placeholder="e.g. Engineering student, regular kit buyer"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl h-9 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                size="sm"
                className="rounded-xl bg-primary text-white hover:bg-primary/95 h-9 font-bold text-xs"
              >
                {isSaving ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Save Customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Delete Customer Record?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete <strong>{customerToDelete?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl h-9 text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              disabled={isDeleting}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold h-9 text-xs"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

