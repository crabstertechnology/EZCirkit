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
import { ArrowLeft, PlusCircle, AlertCircle, ChevronDown, Check, Loader2 } from 'lucide-react';
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
  const { cartItems, cartSubtotal, cartCount, clearCart, isLoading: isCartLoading } = useCart();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // Dynamic Shiprocket Rates states
  const [shippingOption, setShippingOption] = useState<'standard' | 'premium'>('standard');
  const [shippingCharge, setShippingCharge] = useState<number>(49);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  const [standardCourier, setStandardCourier] = useState<{ id?: number; name: string; rate: number; etd: string }>({
    name: 'Standard (Surface mode)',
    rate: 49,
    etd: 'Upto 7 days'
  });
  
  const [premiumCourier, setPremiumCourier] = useState<{ id?: number; name: string; rate: number; etd: string }>({
    name: 'Premium (Bluedart)',
    rate: 125,
    etd: '2-4 days'
  });

  const [billingOption, setBillingOption] = useState<'same' | 'different'>('same');
  const [discountCode, setDiscountCode] = useState<string>('');

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

  // Fetch dynamic shipping rates from Shiprocket
  useEffect(() => {
    const fetchShippingRates = async () => {
      if (!selectedAddress?.postalCode) return;
      setIsLoadingRates(true);
      setRatesError(null);
      try {
        const response = await fetch('/api/shiprocket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'serviceability',
            delivery_postcode: selectedAddress.postalCode,
            weight: 0.5,
            cod: 0,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch real-time shipping options');
        }

        const res = await response.json();
        const couriers = res.data?.available_courier_companies || [];
        
        if (couriers.length > 0) {
          // 1. Standard: Find cheapest courier
          const sortedCouriers = [...couriers].sort((a: any, b: any) => a.rate - b.rate);
          const cheapest = sortedCouriers[0];
          
          // 2. Premium: Find cheapest air/express courier
          const expressCouriers = couriers.filter((c: any) => 
            /air|express|bluedart|priority/i.test(c.courier_name)
          );
          
          let premium = expressCouriers.sort((a: any, b: any) => a.rate - b.rate)[0];
          if (!premium) {
            premium = sortedCouriers[1] || cheapest;
          }

          const stdRate = Math.ceil(cheapest.rate);
          const premRate = Math.ceil(premium.rate);

          setStandardCourier({
            id: cheapest.courier_company_id,
            name: `Standard (${cheapest.courier_name})`,
            rate: stdRate,
            etd: cheapest.etd ? `Upto ${cheapest.etd}` : '4-7 days',
          });

          setPremiumCourier({
            id: premium.courier_company_id,
            name: `Premium (${premium.courier_name})`,
            rate: premRate,
            etd: premium.etd ? `Upto ${premium.etd}` : '2-4 days',
          });

          // Set dynamic shipping charge
          if (shippingOption === 'standard') {
            setShippingCharge(stdRate);
          } else {
            setShippingCharge(premRate);
          }
        } else {
          // Fallback to defaults
          setStandardCourier({ name: 'Standard (Surface mode)', rate: 49, etd: 'Upto 7 days' });
          setPremiumCourier({ name: 'Premium (Bluedart)', rate: 125, etd: '2-4 days' });
          setShippingCharge(shippingOption === 'standard' ? 49 : 125);
        }
      } catch (err: any) {
        console.error('Error fetching shipping rates:', err);
        setRatesError('Unable to load live courier rates. Default rates applied.');
        setStandardCourier({ name: 'Standard (Surface mode)', rate: 49, etd: 'Upto 7 days' });
        setPremiumCourier({ name: 'Premium (Bluedart)', rate: 125, etd: '2-4 days' });
        setShippingCharge(shippingOption === 'standard' ? 49 : 125);
      } finally {
        setIsLoadingRates(false);
      }
    };

    fetchShippingRates();
  }, [selectedAddress]);

  // Recalculate shipping charge when user toggles radio button manually
  const handleShippingOptionChange = (option: 'standard' | 'premium') => {
    setShippingOption(option);
    if (option === 'standard') {
      setShippingCharge(standardCourier.rate);
    } else {
      setShippingCharge(premiumCourier.rate);
    }
  };

  const finalTotal = cartSubtotal + shippingCharge;
  const taxAmount = (finalTotal * 18) / 118; // 18% included GST

  const createShiprocketShipment = async (orderId: string, razorpayPaymentId: string) => {
    if (!selectedAddress || !user) return;
    
    const courierId = shippingOption === 'standard' ? standardCourier.id : premiumCourier.id;
    
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
      courierId: courierId,
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
  };

  const handlePlaceOrder = async () => {
    setPaymentError(null);
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Session Expired', description: 'Please log in to continue.' });
      return;
    }
    if (finalTotal <= 0) return;
    if (!selectedAddress) {
      toast({ variant: 'destructive', title: 'No Address Selected', description: 'Please select or add a shipping address.' });
      return;
    }

    setIsProcessingPayment(true);

    try {
      const orderResponse = await fetch('/api/create-razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalTotal * 100, currency: 'INR' }),
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
        amount: finalTotal * 100,
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
      total: finalTotal,
      status: 'paid',
      paymentId: paymentId,
      shippingAddress: shippingDetails,
      shippingOption: shippingOption,
      shippingCharge: shippingCharge,
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

    try {
      await fetch('/api/send-order-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          customerEmail: user.email,
          customerName: user.displayName || selectedAddress.name,
          total: finalTotal,
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

  if (cartCount === 0 && !isLoadingAddresses && !isUserLoading && !isCartLoading) {
    return (
      <div className="container mx-auto px-4 md:px-6 pt-24 pb-16 md:pt-40 md:pb-24 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty.</h1>
        <p className="text-muted-foreground mt-2">Add items to your cart to proceed to checkout.</p>
        <Button asChild className="mt-6"><Link href="/">Return to Shop</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 pt-24 pb-16 md:pt-36 md:pb-24">
      <div className="max-w-6xl mx-auto">
        <Link href="/cart" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Cart
        </Link>

        {paymentError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Checkout Failed</AlertTitle>
            <AlertDescription>{paymentError}</AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-5 gap-12 items-start">
          {/* Left Column: Account, Address, Shipping & Payment */}
          <div className="lg:col-span-3 space-y-8">
            {/* Account Info */}
            <div className="flex justify-between items-center text-sm border-b border-border pb-4">
              <span className="font-semibold text-muted-foreground">Account</span>
              <span className="text-foreground font-medium">{user?.email || 'Guest'}</span>
            </div>

            {/* Address Selection (Collapsed / Dropdown layout) */}
            <div className="space-y-3">
              <div 
                className="border border-border p-4 flex justify-between items-center cursor-pointer hover:bg-muted/10 transition-colors"
                onClick={() => setIsAddressDropdownOpen(!isAddressDropdownOpen)}
              >
                <div className="flex gap-4 text-sm">
                  <span className="text-muted-foreground w-16 shrink-0">Ship to</span>
                  {selectedAddress ? (
                    <div>
                      <p className="font-semibold text-foreground">{selectedAddress.name}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {selectedAddress.addressLine1}, {selectedAddress.addressLine2 ? `${selectedAddress.addressLine2}, ` : ''}
                        {selectedAddress.city} {selectedAddress.state}, {selectedAddress.postalCode}, {selectedAddress.country}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No shipping address selected</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>Change</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAddressDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Address dropdown contents */}
              {isAddressDropdownOpen && (
                <div className="border-x border-b border-border p-4 bg-muted/20 space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Choose Shipping Address</p>
                  
                  {isLoadingAddresses || isUserLoading ? (
                    <p className="text-xs">Loading addresses...</p>
                  ) : (
                    <div className="space-y-2">
                      {addresses?.map(address => (
                        <div 
                          key={address.id} 
                          onClick={() => { setSelectedAddress(address); setIsAddressDropdownOpen(false); }} 
                          className="cursor-pointer"
                        >
                          <AddressCard address={address} isSelected={selectedAddress?.id === address.id} />
                        </div>
                      ))}
                      {addresses?.length === 0 && <p className="text-xs text-muted-foreground">You have no saved addresses.</p>}
                    </div>
                  )}

                  <Dialog open={isAddressFormOpen} onOpenChange={setIsAddressFormOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Add New Address</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add a new address</DialogTitle></DialogHeader>
                      <AddressForm onSave={() => setIsAddressFormOpen(false)} />
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>

            {/* Shipping options card selection */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-foreground">Shipping</h3>
              
              <div className="flex items-start justify-between gap-2 p-3 bg-muted/20 border border-border text-xs text-foreground">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                  <p>The shipping options have changed for your order. Review your selection.</p>
                </div>
              </div>

              {!selectedAddress ? (
                <div className="border border-border p-6 bg-muted/5 text-xs text-muted-foreground text-center">
                  Please select or add a shipping address above to view shipping rates.
                </div>
              ) : isLoadingRates ? (
                <div className="border border-border p-8 flex flex-col items-center justify-center space-y-3 bg-muted/5 text-xs text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <p>Calculating live shipping rates for pincode {selectedAddress.postalCode}...</p>
                </div>
              ) : (
                <div className="border border-border">
                  {ratesError && (
                    <div className="p-3 bg-destructive/10 text-destructive text-xs border-b border-border">
                      {ratesError}
                    </div>
                  )}

                  {/* Option 1: Standard */}
                  <div 
                    className={`p-4 flex items-center justify-between cursor-pointer border-b border-border hover:bg-muted/10 transition-colors ${shippingOption === 'standard' ? 'bg-muted/20' : ''}`}
                    onClick={() => handleShippingOptionChange('standard')}
                  >
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        checked={shippingOption === 'standard'} 
                        onChange={() => handleShippingOptionChange('standard')} 
                        className="text-primary focus:ring-primary h-4 w-4"
                      />
                      <div className="text-xs">
                        <p className="font-semibold text-foreground capitalize">{standardCourier.name}</p>
                        <p className="text-muted-foreground text-[10px] mt-0.5">{standardCourier.etd}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-foreground">₹{standardCourier.rate.toLocaleString()}.00</span>
                  </div>
                  
                  {/* Option 2: Premium */}
                  <div 
                    className={`p-4 flex items-center justify-between cursor-pointer hover:bg-muted/10 transition-colors ${shippingOption === 'premium' ? 'bg-muted/20' : ''}`}
                    onClick={() => handleShippingOptionChange('premium')}
                  >
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        checked={shippingOption === 'premium'} 
                        onChange={() => handleShippingOptionChange('premium')} 
                        className="text-primary focus:ring-primary h-4 w-4"
                      />
                      <div className="text-xs">
                        <p className="font-semibold text-foreground capitalize">{premiumCourier.name}</p>
                        <p className="text-muted-foreground text-[10px] mt-0.5">{premiumCourier.etd}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-foreground">₹{premiumCourier.rate.toLocaleString()}.00</span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-foreground">Payment</h3>
              <p className="text-xs text-muted-foreground">All transactions are secure and encrypted.</p>
              
              <div className="border border-border">
                <div className="p-4 bg-muted/20 flex items-center justify-between border-b border-border">
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      checked={true} 
                      readOnly 
                      className="text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="text-sm font-semibold text-foreground">Razorpay Secure</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-muted border border-border px-1.5 py-0.5 font-bold uppercase rounded-sm">UPI</span>
                    <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 font-bold rounded-sm">VISA</span>
                    <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 font-bold rounded-sm">MC</span>
                  </div>
                </div>
                
                <div className="p-6 bg-muted/10 text-center text-xs text-muted-foreground">
                  <p>You'll be redirected to Razorpay (UPI, Cards, Netbanking, Wallets) to complete your purchase securely.</p>
                </div>
              </div>
            </div>

            {/* Billing Address Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-foreground">Billing address</h3>
              
              <div className="border border-border">
                <div 
                  className={`p-4 flex items-center gap-3 cursor-pointer border-b border-border hover:bg-muted/10 transition-colors ${billingOption === 'same' ? 'bg-muted/20' : ''}`}
                  onClick={() => setBillingOption('same')}
                >
                  <input 
                    type="radio" 
                    checked={billingOption === 'same'} 
                    onChange={() => setBillingOption('same')} 
                    className="text-primary focus:ring-primary h-4 w-4"
                  />
                  <label className="text-sm font-medium cursor-pointer">Same as shipping address</label>
                </div>
                <div 
                  className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/10 transition-colors ${billingOption === 'different' ? 'bg-muted/20' : ''}`}
                  onClick={() => setBillingOption('different')}
                >
                  <input 
                    type="radio" 
                    checked={billingOption === 'different'} 
                    onChange={() => setBillingOption('different')} 
                    className="text-primary focus:ring-primary h-4 w-4"
                  />
                  <label className="text-sm font-medium cursor-pointer">Use a different billing address</label>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Items, Discount, breakdown */}
          <div className="lg:col-span-2 space-y-8 bg-muted/10 p-6 border border-border">
            <h3 className="text-lg font-bold text-foreground">Order Items</h3>
            
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Image 
                        src={item.image} 
                        alt={item.name} 
                        width={64} 
                        height={64} 
                        className="border border-border object-cover bg-background" 
                      />
                      <span className="absolute -top-2.5 -right-2.5 bg-black text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border border-background">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="text-xs max-w-[200px]">
                      <p className="font-semibold text-foreground line-clamp-2">{item.name}</p>
                      <p className="text-muted-foreground text-[10px] mt-0.5">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-foreground">₹{(item.price * item.quantity).toLocaleString()}.00</p>
                </div>
              ))}
            </div>

            <Separator />

            {/* Discount Code */}
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Discount code or gift card" 
                className="flex-1 bg-background border border-border px-3 py-2 outline-none text-xs text-foreground"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
              />
              <Button 
                variant="outline" 
                className="text-xs"
                onClick={() => toast({ title: "Discount Code", description: "Discount code is invalid." })}
              >
                Apply
              </Button>
            </div>

            <Separator />

            {/* Cost Breakdown */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal · {cartItems.length} items</span>
                <span className="font-semibold text-foreground">₹{cartSubtotal.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-semibold text-foreground">
                  {isLoadingRates ? 'Calculating...' : `₹${shippingCharge.toLocaleString()}.00`}
                </span>
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-foreground">Total</span>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground mr-1">INR</span>
                  <span className="text-lg font-extrabold text-foreground">₹{finalTotal.toLocaleString()}.00</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-right">
                Including ₹{taxAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} in taxes
              </p>
            </div>

            <Button 
              size="lg" 
              className="w-full bg-primary-gradient py-6 font-bold text-sm tracking-wider uppercase" 
              onClick={handlePlaceOrder} 
              disabled={!selectedAddress || isProcessingPayment || isLoadingRates}
            >
              {isProcessingPayment ? 'Processing...' : 'Place Order & Pay'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
