'use client';

import React, { Suspense, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Truck, 
  Trash2, 
  Loader2, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Calendar, 
  Search, 
  Package, 
  ExternalLink 
} from 'lucide-react';
import type { User } from '@/app/admin/users/page';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
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
} from "@/components/ui/alert-dialog";

interface ShiprocketData {
  order_id: number;
  shipment_id: number;
  status: string;
  awb_code?: string;
  courier_name?: string;
  created_at: string;
  error?: string;
  manifest_generated?: boolean;
  manifest_url?: string;
  label_generated?: boolean;
  label_url?: string;
  invoice_url?: string;
  pickup_scheduled?: boolean;
}

interface Order {
  id: string;
  userId: string;
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: { toDate: () => Date };
  paymentId: string;
  shippingAddress: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  shiprocket?: ShiprocketData;
  courierId?: number | null;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  productId?: string;
}

const ORDER_STATUSES: Order['status'][] = ['paid', 'shipped', 'delivered', 'cancelled'];

const OrderDetailsComponent = () => {
  const { orderId } = useParams();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [currentStatus, setCurrentStatus] = useState<Order['status'] | undefined>();
  
  // Shiprocket states
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isCheckingServiceability, setIsCheckingServiceability] = useState(false);
  const [serviceableCouriers, setServiceableCouriers] = useState<any[]>([]);
  const [serviceabilityError, setServiceabilityError] = useState<string | null>(null);
  const [isAssigningAwb, setIsAssigningAwb] = useState(false);
  const [isSchedulingPickup, setIsSchedulingPickup] = useState(false);
  const [isGeneratingDocument, setIsGeneratingDocument] = useState<'manifest' | 'label' | 'invoice' | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState<number | null>(null);
  
  const [trackingData, setTrackingData] = useState<any | null>(null);
  const [isFetchingTracking, setIsFetchingTracking] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const userDocRef = useMemoFirebase(
    () => (userId ? doc(firestore, 'users', userId) : null),
    [firestore, userId]
  );
  const { data: user, isLoading: isLoadingUser } = useDoc<User>(userDocRef);

  const orderDocRef = useMemoFirebase(
    () => (userId && orderId ? doc(firestore, 'users', userId, 'orders', orderId as string) : null),
    [firestore, userId, orderId]
  );
  const { data: order, isLoading: isLoadingOrder } = useDoc<Order>(orderDocRef);

  React.useEffect(() => {
    if (order) {
      setCurrentStatus(order.status);
    }
  }, [order]);

  const itemsCollectionRef = useMemoFirebase(
    () => (userId && orderId ? collection(firestore, 'users', userId, 'orders', orderId as string, 'items') : null),
    [firestore, userId, orderId]
  );
  const { data: orderItems, isLoading: isLoadingItems } = useCollection<OrderItem>(itemsCollectionRef);

  const isLoading = isLoadingUser || isLoadingOrder || isLoadingItems;

  // Auto-fetch tracking if AWB exists
  React.useEffect(() => {
    if (order?.shiprocket?.awb_code && !trackingData && !isFetchingTracking) {
      handleFetchTracking();
    }
  }, [order?.shiprocket?.awb_code]);

  const handleStatusChange = (newStatus: Order['status']) => {
    if (!orderDocRef) return;
    if (newStatus === 'cancelled') {
      handleCancelOrder();
      return;
    }
    updateDocumentNonBlocking(orderDocRef, { status: newStatus });
    toast({
      title: "Order Status Updated",
      description: `Order has been marked as ${newStatus}.`,
    });
  };

  const [isCancellingOrder, setIsCancellingOrder] = useState(false);

  const handleCancelOrder = async () => {
    if (!orderDocRef || !order) return;
    setIsCancellingOrder(true);
    try {
      if (order.shiprocket?.order_id) {
        const response = await fetch('/api/shiprocket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'cancel',
            order_id: order.shiprocket.order_id,
          }),
        });

        const res = await response.json();
        if (!response.ok) {
          throw new Error(res.details || res.error || 'Failed to cancel order in Shiprocket');
        }

        toast({
          title: "Shiprocket Order Cancelled",
          description: "The shipment has been successfully cancelled in Shiprocket.",
        });
      }

      const updatedShiprocket = order.shiprocket ? {
        ...order.shiprocket,
        status: 'Cancelled',
      } : {
        status: 'Cancelled',
        created_at: new Date().toISOString(),
      };

      await updateDocumentNonBlocking(orderDocRef, {
        status: 'cancelled',
        shiprocket: updatedShiprocket,
      });

      setCurrentStatus('cancelled');

      toast({
        title: "Order Cancelled",
        description: "Order status has been updated to Cancelled.",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: "Cancellation Error",
        description: error.message || 'Failed to cancel the order',
      });
    } finally {
      setIsCancellingOrder(false);
    }
  };

  const handleDeleteOrder = () => {
    if (!orderDocRef) return;
    
    deleteDocumentNonBlocking(orderDocRef);
    toast({
      title: "Order Deleted",
      description: "The order has been successfully removed.",
    });
    router.replace('/admin/orders');
  };

  // Shiprocket integration operations
  const handleCreateShiprocketOrder = async (customCourierId?: number) => {
    if (!order || !orderItems || !user || !orderDocRef) return;
    setIsCreatingOrder(true);
    try {
      const orderDateStr = order.createdAt?.toDate 
        ? format(order.createdAt.toDate(), 'yyyy-MM-dd') 
        : new Date().toISOString().split('T')[0];

      const orderData = {
        orderId: order.id,
        orderDate: orderDateStr,
        billingCustomerName: order.shippingAddress?.name || user.displayName || 'Customer',
        billingAddress: order.shippingAddress?.addressLine1 || '',
        billingCity: order.shippingAddress?.city || '',
        billingPincode: order.shippingAddress?.postalCode || '',
        billingState: order.shippingAddress?.state || '',
        billingCountry: order.shippingAddress?.country || 'India',
        billingEmail: user.email || 'customer@example.com',
        billingPhone: order.shippingAddress?.phone || '0000000000',
        orderItems: orderItems.map(item => ({
          name: item.name,
          sku: item.productId || item.id,
          units: item.quantity,
          selling_price: item.price,
        })),
        paymentMethod: 'Prepaid',
        subTotal: order.total,
        weight: 0.5,
      };

      const response = await fetch('/api/shiprocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-order',
          orderData,
        }),
      });

      const res = await response.json();
      if (!response.ok) {
        throw new Error(res.details || res.error || 'Failed to create order on Shiprocket');
      }

      await updateDocumentNonBlocking(orderDocRef, {
        shiprocket: {
          order_id: res.order_id,
          shipment_id: res.shipment_id,
          status: 'NEW',
          created_at: new Date().toISOString(),
        }
      });

      toast({
        title: "Shiprocket Order Pushed",
        description: `Shiprocket Order ID: ${res.order_id} created successfully. You can now check rates and assign a courier partner below.`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: "Shiprocket Error",
        description: error.message || 'Failed to create Shiprocket order',
      });
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleCheckServiceability = async () => {
    if (!order?.shippingAddress?.postalCode) return;
    setIsCheckingServiceability(true);
    setServiceabilityError(null);
    try {
      const response = await fetch('/api/shiprocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'serviceability',
          delivery_postcode: order.shippingAddress.postalCode,
          weight: 0.98,
          cod: 0,
          ...(order.shiprocket?.order_id ? { order_id: order.shiprocket.order_id } : {})
        }),
      });

      const res = await response.json();
      if (!response.ok) {
        throw new Error(res.details || res.error || 'Failed to fetch serviceability');
      }

      const couriers = res.data?.available_courier_companies || [];
      setServiceableCouriers(couriers);
      if (couriers.length === 0) {
        setServiceabilityError('No serviceable couriers found for this pincode.');
      }
    } catch (error: any) {
      console.error(error);
      setServiceabilityError(error.message || 'Failed to fetch serviceability');
    } finally {
      setIsCheckingServiceability(false);
    }
  };

  const handleAssignAwb = async (courierId?: number) => {
    if (!order?.shiprocket?.shipment_id || !orderDocRef) return;
    setIsAssigningAwb(true);
    try {
      const response = await fetch('/api/shiprocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign-awb',
          shipment_id: order.shiprocket.shipment_id,
          courier_id: courierId,
        }),
      });

      const res = await response.json();
      if (!response.ok) {
        throw new Error(res.details || res.error || 'Failed to assign AWB');
      }

      const awbData = res.response?.data;
      const awb_code = awbData?.awb_code || res.awb_code;
      const courier_name = awbData?.courier_name || res.courier_name;

      if (!awb_code) {
        throw new Error(awbData?.awb_assign_error || 'AWB Assignment failed or is pending.');
      }

      await updateDocumentNonBlocking(orderDocRef, {
        shiprocket: {
          ...order.shiprocket,
          awb_code,
          courier_name: courier_name || 'Delhivery',
          status: 'AWB Assigned',
        }
      });

      toast({
        title: "AWB Assigned Successfully",
        description: `AWB: ${awb_code} assigned via ${courier_name || 'Delhivery'}`,
      });
      setServiceableCouriers([]);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: "AWB Assignment Error",
        description: error.message || 'Failed to assign AWB',
      });
    } finally {
      setIsAssigningAwb(false);
    }
  };

  const handleRequestPickup = async () => {
    if (!order?.shiprocket?.shipment_id || !orderDocRef) return;
    setIsSchedulingPickup(true);
    try {
      const response = await fetch('/api/shiprocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pickup',
          shipment_id: order.shiprocket.shipment_id,
        }),
      });

      const res = await response.json();
      if (!response.ok) {
        throw new Error(res.details || res.error || 'Failed to schedule pickup');
      }

      await updateDocumentNonBlocking(orderDocRef, {
        shiprocket: {
          ...order.shiprocket,
          pickup_scheduled: true,
          status: 'Pickup Scheduled',
        }
      });

      toast({
        title: "Pickup Scheduled",
        description: "Shipment pickup request has been successfully generated.",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: "Pickup Error",
        description: error.message || 'Failed to schedule pickup',
      });
    } finally {
      setIsSchedulingPickup(false);
    }
  };

  const handleGenerateDocument = async (docType: 'manifest' | 'label' | 'invoice') => {
    if (!order?.shiprocket || !orderDocRef) return;
    setIsGeneratingDocument(docType);
    try {
      let action = '';
      let bodyData: any = {};
      
      if (docType === 'manifest') {
        // Step 1: Generate Manifest first
        const genResponse = await fetch('/api/shiprocket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'manifest-generate',
            shipment_id: order.shiprocket.shipment_id,
          }),
        });
        const genRes = await genResponse.json();
        if (!genResponse.ok) {
          console.warn("Manifest generate returned status:", genRes);
        }

        action = 'manifest-print';
        bodyData = { action, shipment_id: order.shiprocket.shipment_id };
      } else if (docType === 'label') {
        action = 'label-generate';
        bodyData = { action, shipment_id: order.shiprocket.shipment_id };
      } else if (docType === 'invoice') {
        action = 'invoice-print';
        bodyData = { action, order_id: order.shiprocket.order_id };
      }

      const response = await fetch('/api/shiprocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const res = await response.json();
      if (!response.ok) {
        throw new Error(res.details || res.error || `Failed to generate ${docType}`);
      }

      const docUrl = res.label_url || res.manifest_url || res.invoice_url || res.response?.data?.label_url || res.response?.data?.manifest_url || res.response?.data?.invoice_url;
      
      if (!docUrl) {
        throw new Error(`Shiprocket did not return a URL for the ${docType}.`);
      }

      const updateData: any = {};
      if (docType === 'manifest') {
        updateData.shiprocket = {
          ...order.shiprocket,
          manifest_generated: true,
          manifest_url: docUrl,
        };
      } else if (docType === 'label') {
        updateData.shiprocket = {
          ...order.shiprocket,
          label_generated: true,
          label_url: docUrl,
        };
      } else if (docType === 'invoice') {
        updateData.shiprocket = {
          ...order.shiprocket,
          invoice_url: docUrl,
        };
      }

      await updateDocumentNonBlocking(orderDocRef, updateData);

      toast({
        title: `${docType.charAt(0).toUpperCase() + docType.slice(1)} Ready`,
        description: `Successfully generated and saved ${docType} link.`,
      });

      window.open(docUrl, '_blank');

    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: `${docType.charAt(0).toUpperCase() + docType.slice(1)} Error`,
        description: error.message || `Failed to generate ${docType}`,
      });
    } finally {
      setIsGeneratingDocument(null);
    }
  };

  const handleFetchTracking = async () => {
    if (!order?.shiprocket?.awb_code || !orderDocRef) return;
    setIsFetchingTracking(true);
    setTrackingError(null);
    try {
      const response = await fetch('/api/shiprocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'track',
          awb_code: order.shiprocket.awb_code,
        }),
      });

      const res = await response.json();
      if (!response.ok) {
        throw new Error(res.details || res.error || 'Failed to fetch tracking data');
      }

      const trackData = res.tracking_data;
      setTrackingData(trackData);

      const currentStatusStr = trackData?.shipment_track?.[0]?.current_status;
      if (currentStatusStr) {
        const lowerStatus = currentStatusStr.toLowerCase();
        let mappedStatus: Order['status'] | null = null;
        
        if (lowerStatus.includes('deliver')) {
          mappedStatus = 'delivered';
        } else if (lowerStatus.includes('cancel')) {
          mappedStatus = 'cancelled';
        } else if (
          lowerStatus.includes('ship') || 
          lowerStatus.includes('transit') || 
          lowerStatus.includes('pickup') || 
          lowerStatus.includes('dispatch') || 
          lowerStatus.includes('out for delivery') ||
          lowerStatus.includes('out_for_delivery')
        ) {
          mappedStatus = 'shipped';
        }

        const updatedShiprocket = {
          ...order.shiprocket,
          status: currentStatusStr,
        };

        const updateData: any = {
          shiprocket: updatedShiprocket
        };

        if (mappedStatus && mappedStatus !== order.status) {
          updateData.status = mappedStatus;
          setCurrentStatus(mappedStatus);
        }

        if (currentStatusStr !== order.shiprocket?.status || mappedStatus !== order.status) {
          await updateDocumentNonBlocking(orderDocRef, updateData);
        }
      }
    } catch (error: any) {
      console.error(error);
      setTrackingError(error.message || 'Failed to fetch live tracking information.');
    } finally {
      setIsFetchingTracking(false);
    }
  };

  const getShiprocketTrackingUrl = (awb: string | undefined) => {
    if (!awb) return '#';
    return `https://shiprocket.co/tracking/${awb}`;
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading order details...</div>;
  }

  if (!order || !user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold">Order Not Found</h1>
        <p className="text-muted-foreground mt-2">Could not find details for this order.</p>
        <Link href="/admin/orders" className="mt-4 text-sm text-blue-500 hover:underline">
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
       <Link href="/admin/orders" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to All Orders
        </Link>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold">Order Details</h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">{order.id}</p>
        </div>
        <div className="flex items-center gap-2">
            <Select value={currentStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Update status" />
                </SelectTrigger>
                <SelectContent>
                    {ORDER_STATUSES.map(status => (
                        <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Badge variant={order.status === 'paid' ? 'default' : 'secondary'} className="capitalize text-base h-8">
                {order.status}
            </Badge>

            {order.status !== 'cancelled' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="h-8 border-destructive text-destructive hover:bg-destructive/10">
                    {isCancellingOrder && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    Cancel Order
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel order <strong>{order.id.substring(0, 7)}</strong>? If this order has an active Shiprocket shipment, it will also be cancelled in Shiprocket automatically.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Go Back</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelOrder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Cancel Order
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" className="h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete order <strong>{order.id.substring(0, 7)}</strong> and all associated records.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteOrder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete Order
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Order Items ({orderItems?.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems?.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <Image src={item.image} alt={item.name} width={64} height={64} className="rounded-md object-cover" />
                          <span className="font-medium">{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>₹{item.price.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{(item.price * item.quantity).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
           <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <p className="font-semibold">{user.displayName}</p>
                <p className="text-muted-foreground">{user.email}</p>
                <p className="text-muted-foreground font-mono text-xs">{user.id}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Shiprocket Shipment
                </span>
                {order.shiprocket?.status && (
                  <Badge variant="secondary" className="capitalize">
                    {order.shiprocket.status}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {!order.shiprocket || order.shiprocket.status === 'pending' || order.shiprocket.status === 'creation_failed' ? (
                <div className="space-y-4">
                  <div className={`flex items-start gap-2 p-3 text-xs border rounded-sm ${
                    order?.shiprocket?.status === 'creation_failed'
                      ? 'bg-destructive/10 border-destructive/20 text-destructive'
                      : 'bg-primary/10 border-primary/20 text-primary'
                  }`}>
                    {order?.shiprocket?.status === 'creation_failed' ? (
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                    ) : (
                      <Package className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                    )}
                    <div>
                      <p className="font-semibold">
                        {order?.shiprocket?.status === 'creation_failed' ? 'Shipment Booking Failed' : 'Shipment Pending'}
                      </p>
                      <p className="mt-0.5">
                        {order?.shiprocket?.status === 'creation_failed'
                          ? (order.shiprocket.error || 'Failed to push to Shiprocket.')
                          : 'Order has not been pushed to Shiprocket yet.'}
                      </p>
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-primary-gradient" 
                    onClick={() => handleCreateShiprocketOrder()}
                    disabled={isCreatingOrder}
                  >
                    {isCreatingOrder ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Pushing to Shiprocket...
                      </>
                    ) : (
                      'Book Order on Shiprocket'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Shipment Booking Info */}
                  <div className="grid grid-cols-2 gap-2 text-xs border border-border p-3 bg-muted/20">
                    <div>
                      <p className="text-muted-foreground">Shiprocket Order ID</p>
                      <p className="font-semibold">{order.shiprocket.order_id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Shipment ID</p>
                      <p className="font-semibold">{order.shiprocket.shipment_id}</p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-border mt-2">
                      <p className="text-muted-foreground">Courier Partner</p>
                      <p className="font-semibold">{order.shiprocket.courier_name || 'Not Assigned'}</p>
                    </div>
                  </div>

                  {/* AWB Assignment Flow */}
                  {!order.shiprocket.awb_code ? (
                    <div className="space-y-3 pt-2">
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1" 
                          variant="outline"
                          onClick={handleCheckServiceability}
                          disabled={isCheckingServiceability || isAssigningAwb}
                        >
                          {isCheckingServiceability ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Search className="mr-2 h-4 w-4" />
                              Check Rates
                            </>
                          )}
                        </Button>
                        <Button 
                          className="flex-1"
                          onClick={() => handleAssignAwb()}
                          disabled={isAssigningAwb || isCheckingServiceability}
                        >
                          {isAssigningAwb ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Auto-Assign AWB'
                          )}
                        </Button>
                      </div>

                      {serviceabilityError && (
                        <p className="text-xs text-destructive">{serviceabilityError}</p>
                      )}

                      {serviceableCouriers.length > 0 && (
                        <div className="border border-border p-2 space-y-2 bg-muted/40 max-h-64 overflow-y-auto">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Available Serviceable Couriers</p>
                          {serviceableCouriers.map((courier: any) => (
                            <div key={courier.courier_company_id} className="flex items-center justify-between p-2 border border-border bg-card text-xs">
                              <div>
                                <p className="font-semibold">{courier.courier_name}</p>
                                <p className="text-muted-foreground text-[10px]">
                                  Rate: ₹{courier.rate} | Delivery: {courier.etd || '3-5 days'}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleAssignAwb(courier.courier_company_id)}
                                disabled={isAssigningAwb}
                                className="h-7 px-2"
                              >
                                Assign
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Tracking / AWB Display */}
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <p className="text-muted-foreground">AWB Code / Air Waybill</p>
                          <p className="font-mono font-semibold">{order.shiprocket.awb_code}</p>
                        </div>
                        <Button asChild variant="outline" size="sm" className="h-8">
                          <a href={getShiprocketTrackingUrl(order.shiprocket.awb_code)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </div>

                      {/* Pickup Flow */}
                      {!order.shiprocket.pickup_scheduled ? (
                        <Button 
                          className="w-full"
                          variant="secondary"
                          onClick={handleRequestPickup}
                          disabled={isSchedulingPickup}
                        >
                          {isSchedulingPickup ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Scheduling Pickup...
                            </>
                          ) : (
                            <>
                              <Calendar className="mr-2 h-4 w-4" />
                              Schedule Courier Pickup
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-xs">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <p className="font-semibold">Logistics Pickup Scheduled</p>
                        </div>
                      )}

                      <Separator />

                      {/* Documents Grid */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Shipping Documents</p>
                        
                        <div className="grid grid-cols-1 gap-2 text-xs">
                          {/* Invoice Button */}
                          <div className="flex items-center justify-between border border-border p-2 bg-muted/10">
                            <span className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              Order Invoice
                            </span>
                            {order.shiprocket.invoice_url ? (
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-7 px-2" asChild>
                                  <a href={order.shiprocket.invoice_url} target="_blank" rel="noopener noreferrer">View</a>
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleGenerateDocument('invoice')} disabled={isGeneratingDocument === 'invoice'}>
                                  {isGeneratingDocument === 'invoice' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Recreate'}
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="outline" className="h-7" onClick={() => handleGenerateDocument('invoice')} disabled={isGeneratingDocument === 'invoice'}>
                                {isGeneratingDocument === 'invoice' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Generate'}
                              </Button>
                            )}
                          </div>

                          {/* Label Button */}
                          <div className="flex items-center justify-between border border-border p-2 bg-muted/10">
                            <span className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              Shipping Label
                            </span>
                            {order.shiprocket.label_url ? (
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-7 px-2" asChild>
                                  <a href={order.shiprocket.label_url} target="_blank" rel="noopener noreferrer">View</a>
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleGenerateDocument('label')} disabled={isGeneratingDocument === 'label'}>
                                  {isGeneratingDocument === 'label' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Recreate'}
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="outline" className="h-7" onClick={() => handleGenerateDocument('label')} disabled={isGeneratingDocument === 'label'}>
                                {isGeneratingDocument === 'label' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Generate'}
                              </Button>
                            )}
                          </div>

                          {/* Manifest Button */}
                          <div className="flex items-center justify-between border border-border p-2 bg-muted/10">
                            <span className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              Manifest Sheet
                            </span>
                            {order.shiprocket.manifest_url ? (
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-7 px-2" asChild>
                                  <a href={order.shiprocket.manifest_url} target="_blank" rel="noopener noreferrer">View</a>
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleGenerateDocument('manifest')} disabled={isGeneratingDocument === 'manifest'}>
                                  {isGeneratingDocument === 'manifest' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Recreate'}
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="outline" className="h-7" onClick={() => handleGenerateDocument('manifest')} disabled={isGeneratingDocument === 'manifest'}>
                                {isGeneratingDocument === 'manifest' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Generate'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Live Tracking Timeline */}
                      <Separator />
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Live Tracking Timeline</p>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={handleFetchTracking} 
                            disabled={isFetchingTracking}
                          >
                            <RefreshCw className={`h-3 w-3 ${isFetchingTracking ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>

                        {trackingError && (
                          <p className="text-xs text-destructive">{trackingError}</p>
                        )}

                        <div className="space-y-3 pl-2 border-l border-border ml-2">
                          {trackingData?.shipment_track_activities && trackingData.shipment_track_activities.length > 0 ? (
                            trackingData.shipment_track_activities.map((act: any, idx: number) => (
                              <div key={idx} className="relative pl-4 text-xs">
                                <div className="absolute -left-[13px] top-1.5 h-2 w-2 bg-primary border border-background" />
                                <p className="font-semibold text-foreground capitalize">{act.activity}</p>
                                <p className="text-muted-foreground text-[10px]">
                                  {act.date} {act.location ? `| ${act.location}` : ''}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              {isFetchingTracking ? 'Fetching latest status...' : 'Shipment registered. Awaiting courier pickup.'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {order.shippingAddress ? (
                <>
                  <p className="font-semibold">{order.shippingAddress.name}</p>
                  <p>{order.shippingAddress.phone}</p>
                  <p>{order.shippingAddress.addressLine1}</p>
                  {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                  <p>{order.shippingAddress.country}</p>
                </>
              ) : (
                 <p className="text-muted-foreground italic">No shipping details provided (Offline Order).</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>Order Summary</CardTitle>
            </CardHeader>
             <CardContent className="space-y-4">
                 <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Order Date</span>
                    <span>{format(order.createdAt.toDate(), 'PPP p')}</span>
                 </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment ID</span>
                    <span className="font-mono text-xs">{order.paymentId || 'N/A'}</span>
                 </div>
                 <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total Paid</span>
                    <span>₹{order.total.toLocaleString()}</span>
                 </div>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Wrap the component in Suspense because useSearchParams() is a client-side hook
const OrderDetailsPage = () => (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
        <OrderDetailsComponent />
    </Suspense>
);

export default OrderDetailsPage;
