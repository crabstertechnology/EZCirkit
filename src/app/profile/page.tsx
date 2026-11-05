
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { handleLogout } from '@/lib/auth';
import { useAuth } from '@/firebase';
import { collection, query, orderBy, limit, doc, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { PlusCircle, Edit, Trash2, ChevronRight, FileText, Download, Eye, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AddressForm from '@/components/profile/address-form';
import type { Address } from '@/components/profile/address-card';
import AddressCard from '@/components/profile/address-card';
import { useToast } from '@/hooks/use-toast';
import { A4InvoiceDialog } from '@/components/invoice/a4-invoice-dialog';
import { OnlineInvoiceData, downloadInvoicePdf } from '@/lib/invoice-pdf';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateProfile } from 'firebase/auth';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  const [selectedInvoice, setSelectedInvoice] = useState<OnlineInvoiceData | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);

  const ordersQuery = useMemoFirebase(
    () =>
      !isUserLoading && user
        ? query(collection(firestore, 'users', user.uid, 'orders'), orderBy('createdAt', 'desc'), limit(25))
        : null,
    [firestore, user, isUserLoading]
  );
  const { data: orders, isLoading: isLoadingOrders } = useCollection(ordersQuery);

  const buildInvoiceData = async (order: any): Promise<OnlineInvoiceData> => {
    const billNumber = order.billNumber || `INV-OL-${order.id.substring(0, 8).toUpperCase()}`;

    let items = order.items || [];
    if ((!items || items.length === 0) && firestore && user) {
      try {
        const itemsSnap = await getDocs(collection(firestore, 'users', user.uid, 'orders', order.id, 'items'));
        items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.error('Failed to fetch items subcollection:', err);
      }
    }

    const subtotal = order.subtotal !== undefined
      ? Number(order.subtotal)
      : Math.max(0, Number(order.total) - Number(order.shippingCharge || 0));

    return {
      billNumber,
      orderId: order.id,
      date: order.createdAt?.toDate
        ? order.createdAt.toDate().toISOString()
        : (order.createdAt || new Date().toISOString()),
      status: order.status || 'paid',
      paymentMethod: order.paymentMethod || (order.paymentId ? 'Online (Razorpay)' : 'Prepaid Online'),
      paymentId: order.paymentId || '',
      customerName: order.shippingAddress?.name || user?.displayName || displayName || 'Valued Customer',
      customerEmail: user?.email || '',
      customerPhone: order.shippingAddress?.phone || '',
      shippingAddress: order.shippingAddress || null,
      items: items.map((i: any) => ({
        name: i.name || 'Component Item',
        price: Number(i.price) || 0,
        quantity: Number(i.quantity) || 1,
        total: (Number(i.price) || 0) * (Number(i.quantity) || 1),
        sku: i.sku || i.productId || 'N/A',
      })),
      subtotal,
      shippingCharge: Number(order.shippingCharge) || 0,
      discount: Number(order.discount) || 0,
      tax: Number(order.tax) || 0,
      grandTotal: Number(order.total) || 0,
      storeInfo: {
        name: 'Crabster Technology',
        address: '12/1 Brindhavan Garden, No.4 Veerapandi, Coimbatore - 641019, Tamil Nadu, India',
        phone: '+91 7010396642',
        email: 'crabstertechnology@gmail.com',
        gstin: '',
      },
    };
  };

  const handleViewInvoice = async (order: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const data = await buildInvoiceData(order);
    setSelectedInvoice(data);
    setIsInvoiceOpen(true);
  };

  const handleDownloadInvoice = async (order: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDownloadingOrderId(order.id);
    try {
      const data = await buildInvoiceData(order);
      await downloadInvoicePdf(data);
      toast({
        title: 'Invoice Downloaded',
        description: `Invoice ${data.billNumber} saved as PDF.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'Could not generate PDF. Please try printing to PDF instead.',
      });
    } finally {
      setDownloadingOrderId(null);
    }
  };

  const addressesQuery = useMemoFirebase(
    () => (!isUserLoading && user ? collection(firestore, 'users', user.uid, 'addresses') : null),
    [firestore, user, isUserLoading]
  );
  const { data: addresses, isLoading: isLoadingAddresses } = useCollection<Address>(addressesQuery);

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  };
  
  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setIsAddressFormOpen(true);
  }
  
  const handleAddNewAddress = () => {
    setEditingAddress(null);
    setIsAddressFormOpen(true);
  }

  const handleDeleteAddress = (addressId: string) => {
    if (!user || !firestore) return;
    const addressRef = doc(firestore, 'users', user.uid, 'addresses', addressId);
    deleteDocumentNonBlocking(addressRef);
    toast({ title: "Address deleted successfully." });
  }

  const handleNameUpdate = async () => {
    if (!auth.currentUser || !firestore || !displayName) {
        toast({ variant: 'destructive', title: "Name cannot be empty." });
        return;
    }
    setIsSavingName(true);
    try {
        // Update Firebase Auth profile
        await updateProfile(auth.currentUser, { displayName });

        // Update Firestore user document
        const userRef = doc(firestore, 'users', auth.currentUser.uid);
        // Use non-blocking write with merge to preserve existing fields
        setDocumentNonBlocking(userRef, { displayName: displayName }, { merge: true });

        toast({ title: "Name updated successfully!" });

        // Force a re-render or state update if necessary, although onAuthStateChanged should handle it
        router.refresh(); 

    } catch (error) {
        console.error("Error updating name:", error);
        toast({ variant: 'destructive', title: "Error updating name." });
    } finally {
        setIsSavingName(false);
    }
  }


  if (isUserLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 md:px-6 pt-32 pb-16 md:pt-40 md:pb-24">
      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Column: User Profile */}
        <div className="md:col-span-1 space-y-8">
          <Card>
            <CardHeader className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage src={user.photoURL ?? ''} />
                <AvatarFallback className="text-3xl">
                  {getInitials(user.displayName)}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl">{displayName || 'User Profile'}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input 
                    type="text" 
                    id="displayName" 
                    placeholder="Enter your name" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                  <Button onClick={handleNameUpdate} disabled={isSavingName || displayName === user.displayName} className="mt-2">
                    {isSavingName ? 'Saving...' : 'Save Name'}
                  </Button>
              </div>
              <Button variant="destructive" className="w-full" onClick={() => handleLogout(auth).then(() => router.push('/'))}>
                Log Out
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column: Orders and Addresses */}
        <div className="md:col-span-2 space-y-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  My Orders &amp; Tax Invoices
                </CardTitle>
                <CardDescription>
                  View your recent order history and download official computer-generated Tax Invoices as PDF.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingOrders && (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading orders and bills...
                </div>
              )}
              {!isLoadingOrders && (!orders || orders.length === 0) && (
                <div className="text-center py-8 border rounded-xl bg-zinc-50 dark:bg-zinc-900/30">
                  <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="font-semibold text-sm">You haven't placed any orders yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Once you order, your bills and invoices will appear here.</p>
                </div>
              )}
              <div className="space-y-3">
                {orders?.map((order) => {
                  const billNumber = order.billNumber || `INV-OL-${order.id.substring(0, 8).toUpperCase()}`;
                  const orderDate = order.createdAt?.toDate
                    ? format(order.createdAt.toDate(), 'PPP')
                    : order.createdAt
                    ? format(new Date(order.createdAt), 'PPP')
                    : 'Recent Order';

                  return (
                    <div
                      key={order.id}
                      className="border rounded-xl p-4 hover:border-primary/50 transition-all bg-card shadow-sm space-y-3"
                    >
                      {/* Top Bar: Order & Bill No + Status + Total */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-foreground">
                              Order #{order.id.substring(0, 8).toUpperCase()}
                            </span>
                            <Badge
                              variant="outline"
                              className="font-mono text-[11px] bg-primary/5 border-primary/20 text-primary font-bold px-2 py-0.5"
                            >
                              Bill: {billNumber}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{orderDate}</p>
                        </div>

                        <div className="text-right">
                          <p className="font-black text-base text-foreground">₹{Number(order.total).toLocaleString('en-IN')}</p>
                          <Badge
                            variant="secondary"
                            className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 text-[10px] font-bold uppercase"
                          >
                            {order.status || 'Paid'}
                          </Badge>
                        </div>
                      </div>

                      {/* Bottom Bar: Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="text-xs text-muted-foreground">
                          {order.shippingAddress?.city && order.shippingAddress?.state ? (
                            <span>Shipped to: <strong>{order.shippingAddress.city}, {order.shippingAddress.state}</strong></span>
                          ) : (
                            <span>Payment: <strong>Online (Paid)</strong></span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleViewInvoice(order, e)}
                            className="h-8 text-xs font-bold gap-1 rounded-lg"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Bill
                          </Button>

                          <Button
                            size="sm"
                            onClick={(e) => handleDownloadInvoice(order, e)}
                            disabled={downloadingOrderId === order.id}
                            className="h-8 text-xs font-bold gap-1.5 rounded-lg bg-primary text-white hover:bg-primary/95 shadow-sm"
                          >
                            {downloadingOrderId === order.id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Download className="h-3.5 w-3.5" />
                                Download PDF
                              </>
                            )}
                          </Button>

                          <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs font-semibold">
                            <Link href={`/order-confirmation/${order.id}`}>
                              Details <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>My Addresses</CardTitle>
                <CardDescription>Manage your shipping addresses.</CardDescription>
              </div>
               <Dialog open={isAddressFormOpen} onOpenChange={setIsAddressFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddNewAddress}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingAddress ? 'Edit Address' : 'Add a New Address'}</DialogTitle>
                  </DialogHeader>
                  <AddressForm
                    address={editingAddress}
                    onSave={() => {
                      setIsAddressFormOpen(false);
                      setEditingAddress(null);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-4">
               {isLoadingAddresses && <p>Loading addresses...</p>}
               {!isLoadingAddresses && (!addresses || addresses.length === 0) && (
                <p>You have no saved addresses.</p>
              )}
              {addresses?.map(address => (
                <div key={address.id} className="border p-4 rounded-lg flex justify-between items-start">
                   <AddressCard address={address} />
                   <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditAddress(address)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this address.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteAddress(address.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                   </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* A4 Standard Tax Invoice Preview & Download Modal */}
      <A4InvoiceDialog
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        invoice={selectedInvoice}
      />
    </div>
  );
}
