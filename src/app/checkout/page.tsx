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
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc, writeBatch, WriteBatch, increment, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import AddressCard from '@/components/profile/address-card';
import AddressForm from '@/components/profile/address-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { Address } from '@/components/profile/address-card';


declare global {
  interface Window {
    Razorpay: any;
  }
}

const CheckoutPage = () => {
  const { cartItems, cartTotal, cartSubtotal, shippingCost, cartCount, clearCart } = useCart();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const addressesQuery = useMemoFirebase(
    () => (!isUserLoading && user ? collection(firestore, 'users', user.uid, 'addresses') : null),
    [firestore, user, isUserLoading]
  );
  const { data: addresses, isLoading: isLoadingAddresses } = useCollection<Address>(addressesQuery);

  useEffect(() => {
    // Select the first address by default
    if (addresses && addresses.length > 0 && !selectedAddress) {
      setSelectedAddress(addresses[0]);
    }
  }, [addresses, selectedAddress]);

  const createShiprocketShipment = async (orderId: string, razorpayPaymentId: string) => {
    if (!selectedAddress || !user) return;
    
    // Prepare the order data for our shipment API
    const shipmentData = {
      orderId: orderId,
      orderDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
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
      weight: 0.5, // Default weight in kg, adjust as needed
    };

    try {
      const response = await fetch('/api/create-shiprocket-shipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shipmentData),
      });

      if (!response.ok) {
        throw new Error('Failed to create shipment on the server.');
      }
      
      const shiprocketResponse = await response.json();
      console.log("Shiprocket Response:", shiprocketResponse);

      // Now, save everything to Firestore
      await saveOrderToFirestore(razorpayPaymentId, orderId, shiprocketResponse);
    
    } catch (error) {
      console.error('Shipment creation failed:', error);
      toast({
        variant: 'destructive',
        title: 'Shipment Error',
        description: 'Your payment was successful, but we failed to create a shipment. Please contact support.',
      });
      // IMPORTANT: Even if shipment fails, we still save the order so it's not lost.
      // We pass `null` for the Shiprocket response.
      await saveOrderToFirestore(razorpayPaymentId, orderId, null);
    }
  }


  const handlePlaceOrder = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'You must be logged in to place an order.' });
      return;
    }
    if (cartTotal <= 0) return;
    if (!selectedAddress) {
      toast({ variant: 'destructive', title: 'No Address Selected', description: 'Please select or add a shipping address.' });
      return;
    }

    setIsProcessingPayment(true);

    try {
      // Step 1: Create a Razorpay order
      const orderResponse = await fetch('/api/create-razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: cartTotal * 100, currency: 'INR' }),
      });

      if (!orderResponse.ok) throw new Error('Failed to create Razorpay order.');

      const orderData = await orderResponse.json();
      const { id: order_id } = orderData;
      
      const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/studio-2519724075-3b571.appspot.com/o/logo.png?alt=media&token=467c6999-031c-4824-b5a1-d7f879685a97';
      
      const newOrderId = doc(collection(firestore, 'users', user.uid, 'orders')).id;

      // Step 2: Configure and open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: cartTotal * 100,
        currency: 'INR',
        name: 'crabster',
        description: 'E-Commerce Transaction',
        image: logoUrl,
        order_id: order_id,
        handler: function (response: any) {
          // Step 3: On successful payment, create the Shiprocket shipment
          createShiprocketShipment(newOrderId, response.razorpay_payment_id);
        },
        prefill: {
          name: user.displayName || selectedAddress.name,
          email: user.email,
          contact: selectedAddress.phone,
        },
        notes: {
          address: `${selectedAddress.addressLine1}, ${selectedAddress.city}`,
          internal_order_id: newOrderId,
        },
        theme: { color: '#FF6600' },
        modal: {
          ondismiss: function() {
            setIsProcessingPayment(false);
            toast({
              variant: 'destructive',
              title: 'Payment Cancelled',
            });
          }
        }
      };

      if (typeof window.Razorpay === 'undefined') throw new Error('Razorpay script not loaded.');

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Payment Error:', error);
      toast({ variant: 'destructive', title: 'Payment Error', description: 'Could not initiate payment. Please try again.' });
      setIsProcessingPayment(false);
    }
  };

  const saveOrderToFirestore = async (paymentId: string, orderId: string, shiprocketResponse: any | null) => {
    if (!user || !firestore || !selectedAddress) return;

    const orderRef = doc(firestore, 'users', user.uid, 'orders', orderId);
    const batch = writeBatch(firestore);

    // Main order document
    batch.set(orderRef, {
      id: orderId,
      userId: user.uid,
      createdAt: serverTimestamp(),
      total: cartTotal,
      status: 'paid',
      paymentId: paymentId,
      shippingAddress: {
        name: selectedAddress.name,
        phone: selectedAddress.phone,
        addressLine1: selectedAddress.addressLine1,
        addressLine2: selectedAddress.addressLine2 || '',
        city: selectedAddress.city,
        state: selectedAddress.state,
        postalCode: selectedAddress.postalCode,
        country: selectedAddress.country,
      },
      // Add Shiprocket data if available
      shiprocket: shiprocketResponse ? {
        order_id: shiprocketResponse.order_id,
        shipment_id: shiprocketResponse.shipment_id,
        status: shiprocketResponse.status,
        awb_code: shiprocketResponse.awb_code,
        courier_name: shiprocketResponse.courier_name,
        created_at: new Date().toISOString(),
      } : {
        status: 'creation_failed',
        error: 'Shiprocket API call failed during checkout.'
      }
    });

    // Order items subcollection
    cartItems.forEach((item) => {
      const orderItemRef = doc(collection(orderRef, 'items'));
      batch.set(orderItemRef, {
        productId: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: item.quantity,
      });
      // Decrement stock
      const productRef = doc(firestore, 'products', item.id);
      batch.update(productRef, { stock: increment(-item.quantity) });
    });

    // Commit batch and redirect
    await batch.commit();
    clearCart();
    router.push(`/order-confirmation/${orderId}`);
    setIsProcessingPayment(false);
  };

  if (cartCount === 0 && !isLoadingAddresses && !isUserLoading) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-24 md:py-32 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty.</h1>
        <p className="text-muted-foreground mt-2">
          Add items to your cart to proceed to checkout.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Return to Shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-24 md:py-32">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/cart"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Cart
        </Link>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Shipping and Payment */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Select Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingAddresses || isUserLoading ? (
                  <p>Loading addresses...</p>
                ) : (
                  <>
                    {addresses?.map(address => (
                      <div key={address.id} onClick={() => setSelectedAddress(address)} className="cursor-pointer">
                        <AddressCard
                          address={address}
                          isSelected={selectedAddress?.id === address.id}
                        />
                      </div>
                    ))}
                    {addresses?.length === 0 && (
                      <p className="text-muted-foreground">You have no saved addresses.</p>
                    )}
                  </>
                )}
                <Dialog open={isAddressFormOpen} onOpenChange={setIsAddressFormOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full mt-4">
                      <PlusCircle className="mr-2 h-4 w-4" /> Add New Address
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add a new address</DialogTitle>
                    </DialogHeader>
                    <AddressForm onSave={() => setIsAddressFormOpen(false)} />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="space-y-8">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={64}
                        height={64}
                        className="rounded-md object-cover"
                      />
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Qty: {item.quantity}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold">
                      ₹{(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between">
                  <p>Subtotal</p>
                  <p>₹{cartSubtotal.toLocaleString()}</p>
                </div>
                <div className="flex justify-between">
                  <p>Shipping</p>
                  <p className="font-semibold text-green-600">FREE</p>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <p>Total</p>
                  <p>₹{cartTotal.toLocaleString()}</p>
                </div>
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