
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle, Home } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';
import { SHIPPING_COST } from '@/lib/constants';

interface OrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
}

interface Order {
    id: string;
    total: number;
    createdAt: { toDate: () => Date };
    status: string;
    paymentId: string;
    shippingAddress: {
        name: string;
        addressLine1: string;
        city: string;
        state: string;
        postalCode: string;
    };
}


const OrderConfirmationPage = () => {
  const { orderId } = useParams();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const orderDocRef = useMemoFirebase(
    () => (user && orderId ? doc(firestore, 'users', user.uid, 'orders', orderId as string) : null),
    [firestore, user, orderId]
  );
  const { data: order, isLoading: isLoadingOrder } = useDoc<Order>(orderDocRef);

  const itemsCollectionRef = useMemoFirebase(
    () => (user && orderId ? collection(firestore, 'users', user.uid, 'orders', orderId as string, 'items') : null),
    [firestore, user, orderId]
  );
  const { data: orderItems, isLoading: isLoadingItems } = useCollection<OrderItem>(itemsCollectionRef);
  
  const isLoading = isUserLoading || isLoadingOrder || isLoadingItems;
  
  const subtotal = order ? order.total : 0;

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading your order details...</div>;
  }

  if (!order) {
    return (
        <div className="flex h-screen flex-col items-center justify-center text-center">
            <h1 className="text-2xl font-bold">Order Not Found</h1>
            <p className="text-muted-foreground mt-2">We couldn't find the order you're looking for.</p>
             <Button asChild className="mt-6">
                <Link href="/">Go to Homepage</Link>
            </Button>
        </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-24 md:py-32">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <CardTitle className="mt-4 text-3xl font-extrabold">Thank you for your order!</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Your order has been placed successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            {/* Order Details Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                    <p className="text-muted-foreground">Order ID</p>
                    <p className="font-mono">{order.id}</p>
                </div>
                 <div className="space-y-1 md:text-right">
                    <p className="text-muted-foreground">Order Date</p>
                    <p className="font-medium">{order.createdAt ? format(order.createdAt.toDate(), 'PPP') : 'Processing...'}</p>
                </div>
            </div>
          
            {/* Items Ordered Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Items Ordered</h3>
                <Separator />
                {orderItems?.map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                             <Image src={item.image} alt={item.name} width={64} height={64} className="rounded-md" />
                             <div>
                                 <p className="font-semibold">{item.name}</p>
                                 <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                             </div>
                         </div>
                         <p className="font-semibold">₹{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                ))}
                 <Separator />
            </div>

             {/* Total and Shipping Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Shipping To</h3>
                    <div className="text-sm text-muted-foreground">
                        <p className="font-bold text-foreground">{order.shippingAddress.name}</p>
                        <p>{order.shippingAddress.addressLine1}</p>
                        <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                    </div>
                </div>
                 <div className="space-y-4 rounded-lg bg-secondary p-4">
                    <h3 className="text-lg font-semibold">Order Summary</h3>
                     <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>₹{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Shipping</span>
                        <span className="font-semibold text-green-600">FREE</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                        <span>Total Paid</span>
                        <span>₹{order.total.toLocaleString()}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex justify-center gap-4 pt-6">
                <Button asChild>
                    <Link href="/">
                        <Home className="mr-2 h-4 w-4" /> Continue Shopping
                    </Link>
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderConfirmationPage;
