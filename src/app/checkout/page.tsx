
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
import { useUser, useFirestore, useCollection, useMemoFirebase, commitBatchNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc, writeBatch, WriteBatch, increment } from 'firebase/firestore';
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

  const handlePlaceOrder = () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'You must be logged in to place an order.' });
      return;
    }

    if (cartTotal <= 0) return;

    if (!selectedAddress) {
      toast({
        variant: 'destructive',
        title: 'No Address Selected',
        description: 'Please select or add a shipping address.',
      });
      return;
    }

    setIsProcessingPayment(true);

    // TODO: Replace this with the public URL of your logo from the Razorpay dashboard.
    const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/studio-2519724075-3b571.appspot.com/o/logo.png?alt=media&token=467c6999-031c-4824-b5a1-d7f879685a97';

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_your_key_here', // Use environment variable
      amount: cartTotal * 100, // Amount in paise
      currency: 'INR',
      name: 'crabster',
      description: 'E-Commerce Transaction',
      image: logoUrl,
      handler: function (response: any) {
        // This function is called on successful payment
        saveOrderToFirestore(response.razorpay_payment_id);
      },
      prefill: {
        name: user.displayName || selectedAddress.name,
        email: user.email,
        contact: selectedAddress.phone,
      },
      notes: {
        address: `${selectedAddress.addressLine1}, ${selectedAddress.city}`,
      },
      theme: {
        color: '#FF6600',
      },
      modal: {
        ondismiss: function() {
          setIsProcessingPayment(false);
          toast({
            variant: 'destructive',
            title: 'Payment Cancelled',
            description: 'Your payment was not completed.',
          });
        }
      }
    };

    if (typeof window.Razorpay === 'undefined') {
      toast({ variant: 'destructive', title: 'Payment Gateway Error', description: 'Razorpay script not loaded.'});
      setIsProcessingPayment(false);
      return;
    }

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const saveOrderToFirestore = (paymentId: string) => {
    if (!user || !firestore || !selectedAddress) return;

    const orderRef = doc(collection(firestore, 'users', user.uid, 'orders'));

    const batch: WriteBatch = writeBatch(firestore);

    // 1. Set the main order document
    batch.set(orderRef, {
      id: orderRef.id,
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
    });

    // 2. Add each cart item to the 'items' subcollection of the order AND update product stock
    const itemsRef = collection(orderRef, 'items');
    cartItems.forEach((item) => {
      // Create a reference for the new order item
      const orderItemRef = doc(itemsRef);
      const { id, ...rest } = item; // `id` here is the productId
      const orderItemData = {
        ...rest,
        id: orderItemRef.id, // Store the unique ID in the document
        orderId: orderRef.id,
        productId: id, // The original product ID
      };
      batch.set(orderItemRef, orderItemData);

      // Create a reference to the product in the main `products` collection
      const productRef = doc(firestore, 'products', id); // `id` from cartItem is the productId
      // Decrement the stock of that product
      batch.update(productRef, { stock: increment(-item.quantity) });
    });

    // 3. Commit the batch
    commitBatchNonBlocking(batch, {
      path: `users/${user.uid}/orders/${orderRef.id}`,
      operation: 'create',
    });

    // 4. Clear the cart (this is a client-side operation)
    clearCart();

    // 5. Redirect to confirmation page
    router.push(`/order-confirmation/${orderRef.id}`);

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
