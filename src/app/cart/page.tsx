'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Plus, Minus, X } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const CartPage = () => {
  const { cartItems, cartCount, cartTotal, cartSubtotal, shippingCost, addToCart, decrementItem, removeFromCart } = useCart();

  if (cartCount === 0) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-24 md:py-32">
        <div className="max-w-2xl mx-auto text-center">
          <ShoppingCart className="mx-auto h-16 w-16 text-gray-400" />
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Your cart is empty
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Looks like you haven't added anything to your cart yet.
          </p>
          <div className="mt-6">
            <Button asChild size="lg">
              <Link href="/">Continue Shopping</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-24 md:py-32">
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl mb-8">
        Your Cart
      </h1>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4">
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={100}
                      height={100}
                      className="rounded-md object-cover"
                    />
                    <div className="flex-1">
                      <h2 className="font-semibold">{item.name}</h2>
                      <p className="text-muted-foreground">
                        ₹{item.price.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => decrementItem(item.id)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="font-bold">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => addToCart(item)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="font-semibold w-20 text-right">
                      ₹{(item.price * item.quantity).toLocaleString()}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                       onClick={() => removeFromCart(item.id)}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-2xl font-bold">Order Summary</h2>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{cartSubtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-semibold text-green-600">FREE</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{cartTotal.toLocaleString()}</span>
              </div>
              <Button asChild size="lg" className="w-full bg-primary-gradient mt-4">
                <Link href="/checkout">Proceed to Checkout</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
