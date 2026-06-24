
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/context/cart-context';
import Image from 'next/image';
import { ArrowLeft, PlusCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc, writeBatch, increment } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import AddressCard from '@/components/profile/address-card';
import AddressForm from '@/components/profile/address-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { Address } from '@/components/profile/address-card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


declare global {
  interface Window {
    Razorpay: any;
  }
}

const CheckoutPage = () => {
  const { cartItems, cartTotal, cartSubtotal, cartCount, clearCart } = useCart();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const addressesQuery = useMemoFirebase(
    () => (!isUserLoading && user ? collection(firestore, 'users', user.uid, 'addresses') : null),
    [firestore, user, isUserLoading]
  );
  const { data: addresses, isLoading: isLoadingAddresses } = useCollection<Address>(addressesQuery);

  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddress) {
      setSelectedAddress(addresses[0]);
    }
  }, [addresses, selectedAddress]);

  const createShiprocketShipment = async (orderId: string, razorpayPaymentId: string) => {
    if (!selectedAddress || !user) return;
    
    const shipmentData = {
      orderId: orderId,
      orderDate: new Date().toISOString().split('T')[0],
      billingCustomerName: selectedAddress.name,
      billingAddress: selectedAddress.addressLine1,
      billingCity: selectedAddress.city,
      billingPincode: selectedAddress.postalCode,
      billingState: selectedAddress.state,
      billingCountry: selectedAddress.country,
      billingEmail: user.email || 'customer@example.com',
      billingPhone: selectedAddress.phone,
      orderItems: cartItems.map(item => ({
        name: item.name,
        sku: item.id,
        units: item.quantity,
        selling_price: item.price,
      })),
      paymentMethod: 'Prepaid',
      subTotal: cartSubtotal,
      weight: 0.5,
    };

    try {
      const response = await fetch('/api/create-shiprocket-shipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shipmentData),
      });

      let shiprocketResponse = null;
      if (response.ok) {
        shiprocketResponse = await response.json();
      } else {
        console.error('Shiprocket API error:', await response.text());
      }
      
      await saveOrderToFirestore(razorpayPaymentId, orderId, shiprocketResponse);
    
    } catch (error) {
      console.error('Shipment creation failed:', error);
      toast({
        variant: 'destructive',
        title: 'Shipment Error',
        description: 'Payment successful, but failed to create a shipment. We will process it manually.',
      });
      await saveOrderToFirestore(razorpayPaymentId, orderId, null);
    }
  }


  const handlePlaceOrder = async () => {
    setPaymentError(null);
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Session Expired', description: 'Please log in to continue.' });
      return;
    }
    if (cartTotal <= 0) return;
    if (!selectedAddress) {
      toast({ variant: 'destructive', title: 'No Address Selected', description: 'Please select or add a shipping address.' });
      return;
    }

    setIsProcessingPayment(true);

    try {
      const orderResponse = await fetch('/api/create-razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: cartTotal * 100, currency: 'INR' }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.details || 'Failed to initialize order with Razorpay.');
      }

      const orderData = await orderResponse.json();
      const { id: rzp_order_id } = orderData;
      
      const logoUrl = 'https://mail.crabstertech.in/logo.png'; 
      const newOrderId = doc(collection(firestore, 'users', user.uid, 'orders')).id;

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: cartTotal * 100,
        currency: 'INR',
        name: 'EZCirkit',
        description: 'Course & Electronics Kit',
        image: logoUrl,
        order_id: rzp_order_id,
        handler: function (response: any) {
          createShiprocketShipment(newOrderId, response.razorpay_payment_id);
        },
        prefill: {
          name: user.displayName || selectedAddress.name,
          email: user.email,
          contact: selectedAddress.phone,
        },
        notes: {
          internal_order_id: newOrderId,
        },
        theme: { color: '#FF6600' },
        modal: {
          ondismiss: function() {
            setIsProcessingPayment(false);
            toast({
              variant: 'default',
              title: 'Payment Cancelled',
              description: 'You closed the payment window.',
            });
          }
        }
      };

      if (typeof window.Razorpay === 'undefined') throw new Error('Razorpay SDK not found. Please refresh the page.');

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error: any) {
      console.error('Payment Initialization Error:', error);
      setPaymentError(error.message || 'Could not initiate payment. Please try again.');
      toast({ 
        variant: 'destructive', 
        title: 'Payment Error', 
        description: error.message || 'Could not initiate payment.' 
      });
      setIsProcessingPayment(false);
    }
  };

  const saveOrderToFirestore = async (paymentId: string, orderId: string, shiprocketResponse: any | null) => {
    if (!user || !firestore || !selectedAddress) return;

    const orderRef = doc(firestore, 'users', user.uid, 'orders', orderId);
    const batch = writeBatch(firestore);

    const shippingDetails = {
      name: selectedAddress.name,
      phone: selectedAddress.phone,
      addressLine1: selectedAddress.addressLine1,
      addressLine2: selectedAddress.addressLine2 || '',
      city: selectedAddress.city,
      state: selectedAddress.state,
      postalCode: selectedAddress.postalCode,
      country: selectedAddress.country,
    };

    batch.set(orderRef, {
      id: orderId,
      userId: user.uid,
      createdAt: serverTimestamp(),
      total: cartTotal,
      status: 'paid',
      paymentId: paymentId,
      shippingAddress: shippingDetails,
      shiprocket: shiprocketResponse ? {
        order_id: shiprocketResponse.order_id,
        shipment_id: shiprocketResponse.shipment_id,
        status: shiprocketResponse.status,
        awb_code: shiprocketResponse.awb_code,
        courier_name: shiprocketResponse.courier_name,
        created_at: new Date().toISOString(),
      } : {
        status: 'creation_failed',
        error: 'Shiprocket processing pending.'
      }
    });

    cartItems.forEach((item) => {
      const orderItemRef = doc(collection(orderRef, 'items'));
      batch.set(orderItemRef, {
        productId: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: item.quantity,
      });
      const productRef = doc(firestore, 'products', item.id);
      batch.update(productRef, { stock: increment(-item.quantity) });
    });

    await batch.commit();

    // Trigger Email Notification after successful DB write
    try {
      await fetch('/api/send-order-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          customerEmail: user.email,
          customerName: user.displayName || selectedAddress.name,
          total: cartTotal,
          items: cartItems,
          shippingAddress: shippingDetails
        }),
      });
    } catch (emailError) {
      console.error("Failed to send order confirmation email:", emailError);
    }

    clearCart();
    router.push(`/order-confirmation/${orderId}`);
    setIsProcessingPayment(false);
  };

  if (cartCount === 0 && !isLoadingAddresses && !isUserLoading) {
    return (
      <div className="container mx-auto px-4 md:px-6 pt-24 pb-16 md:pt-40 md:pb-24 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty.</h1>
        <p className="text-muted-foreground mt-2">Add items to your cart to proceed to checkout.</p>
        <Button asChild className="mt-6"><Link href="/">Return to Shop</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 pt-24 pb-16 md:pt-40 md:pb-24">
      <div className="max-w-4xl mx-auto">
        <Link href="/cart" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Cart
        </Link>

        {paymentError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Checkout Failed</AlertTitle>
            <AlertDescription>{paymentError}</AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            <Card>
              <CardHeader><CardTitle>Select Shipping Address</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {isLoadingAddresses || isUserLoading ? (
                  <p>Loading addresses...</p>
                ) : (
                  <>
                    {addresses?.map(address => (
                      <div key={address.id} onClick={() => setSelectedAddress(address)} className="cursor-pointer">
                        <AddressCard address={address} isSelected={selectedAddress?.id === address.id} />
                      </div>
                    ))}
                    {addresses?.length === 0 && <p className="text-muted-foreground">You have no saved addresses.</p>}
                  </>
                )}
                <Dialog open={isAddressFormOpen} onOpenChange={setIsAddressFormOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full mt-4"><PlusCircle className="mr-2 h-4 w-4" /> Add New Address</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add a new address</DialogTitle></DialogHeader>
                    <AddressForm onSave={() => setIsAddressFormOpen(false)} />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="sticky top-24">
              <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <Image src={item.image} alt={item.name} width={64} height={64} className="rounded-md object-cover" />
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="font-semibold">₹{(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between"><p>Subtotal</p><p>₹{cartSubtotal.toLocaleString()}</p></div>
                <div className="flex justify-between"><p>Shipping</p><p className="font-semibold text-green-600">FREE</p></div>
                <Separator />
                <div className="flex justify-between font-bold text-lg"><p>Total</p><p>₹{cartTotal.toLocaleString()}</p></div>
              </CardContent>
              <CardFooter>
                <Button size="lg" className="w-full bg-primary-gradient" onClick={handlePlaceOrder} disabled={!selectedAddress || isProcessingPayment}>
                  {isProcessingPayment ? 'Processing...' : 'Place Order & Pay'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
