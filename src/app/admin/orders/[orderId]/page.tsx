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
import { ArrowLeft, Truck, Trash2 } from 'lucide-react';
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
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
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
        setCurrentStatus(order.status)
    }
  }, [order]);


  const itemsCollectionRef = useMemoFirebase(
    () => (userId && orderId ? collection(firestore, 'users', userId, 'orders', orderId as string, 'items') : null),
    [firestore, userId, orderId]
  );
  const { data: orderItems, isLoading: isLoadingItems } = useCollection<OrderItem>(itemsCollectionRef);

  const isLoading = isLoadingUser || isLoadingOrder || isLoadingItems;

  const handleStatusChange = (newStatus: Order['status']) => {
    if (!orderDocRef) return;
    updateDocumentNonBlocking(orderDocRef, { status: newStatus });
    toast({
        title: "Order Status Updated",
        description: `Order has been marked as ${newStatus}.`,
    })
  }

  const handleDeleteOrder = () => {
    if (!orderDocRef) return;
    
    deleteDocumentNonBlocking(orderDocRef);
    toast({
      title: "Order Deleted",
      description: "The order has been successfully removed.",
    });
    router.replace('/admin/orders');
  };
  
  const getShiprocketTrackingUrl = (awb: string | undefined) => {
    if (!awb) return '#';
    // This is a generic tracking URL format, adjust if Shiprocket provides a different one
    return `https://shiprocket.co/tracking/${awb}`;
  }

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
              <CardTitle>Shipment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
               {order.shiprocket && order.shiprocket.status !== 'creation_failed' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shiprocket Status</span>
                    <Badge variant="secondary" className="capitalize">{order.shiprocket.status}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Courier</span>
                    <span>{order.shiprocket.courier_name || 'Not Assigned'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tracking ID (AWB)</span>
                    <span className="font-mono text-xs">{order.shiprocket.awb_code || 'Not Assigned'}</span>
                  </div>
                   {order.shiprocket.awb_code && (
                     <Button asChild className="w-full mt-2">
                        <a href={getShiprocketTrackingUrl(order.shiprocket.awb_code)} target="_blank" rel="noopener noreferrer">
                          <Truck className="mr-2 h-4 w-4" /> Track on Shiprocket
                        </a>
                      </Button>
                   )}
                </>
               ) : (
                 <p className="text-destructive text-center">
                   {order.shiprocket?.error || 'Shipment creation failed or is pending.'}
                 </p>
               )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-semibold">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.phone}</p>
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
              <p>{order.shippingAddress.country}</p>
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
                    <span className="font-mono text-xs">{order.paymentId}</span>
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
