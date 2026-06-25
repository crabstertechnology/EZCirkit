'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, ShoppingCart, Plus, Minus, Trash2, ArrowRight, PackageOpen } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartSidebar: React.FC<CartSidebarProps> = ({ isOpen, onClose }) => {
  const { cartItems, cartCount, cartSubtotal, cartTotal, shippingCost, addToCart, decrementItem, removeFromCart } = useCart();

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 z-50 h-screen w-full max-w-[400px] bg-background shadow-2xl flex flex-col',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="text-base font-black tracking-tight">Your Cart</h2>
            {cartCount > 0 && (
              <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {cartCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <PackageOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-bold text-foreground">Your cart is empty</p>
                <p className="text-sm text-muted-foreground mt-1">Add products to get started</p>
              </div>
              <Button asChild size="sm" onClick={onClose}>
                <Link href="/products">Browse Products</Link>
              </Button>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="flex gap-3 items-start">
                {/* Image */}
                <div className="relative w-16 h-16 flex-shrink-0 bg-muted rounded-lg overflow-hidden border border-border/60">
                  <img
                    src={item.image || '/logo.png'}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground leading-snug line-clamp-2">{item.name}</p>
                  <p className="text-sm font-black text-primary mt-1">₹{item.price.toLocaleString('en-IN')}</p>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => decrementItem(item.id)}
                      className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted hover:border-primary transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => addToCart(item)}
                      className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted hover:border-primary transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 mt-0.5"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="flex-shrink-0 border-t px-5 py-5 space-y-4 bg-background">
            {/* Subtotal / Shipping / Total */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-semibold text-foreground">₹{cartSubtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span className={cn('font-semibold', shippingCost === 0 ? 'text-green-600' : 'text-foreground')}>
                  {shippingCost === 0 ? 'Free' : `₹${shippingCost}`}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-black text-base">
                <span>Total</span>
                <span className="text-primary">₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-2">
              <Button
                asChild
                className="w-full font-black text-sm gap-2 bg-primary hover:bg-primary/90"
                onClick={onClose}
              >
                <Link href="/checkout">
                  Checkout <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full font-semibold text-sm"
                onClick={onClose}
              >
                <Link href="/cart">View Full Cart</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CartSidebar;
