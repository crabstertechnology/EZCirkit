
'use client';

import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
} from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  increment,
  writeBatch,
} from 'firebase/firestore';
import { SHIPPING_COST } from '@/lib/constants';

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  originalPrice?: number;
  description?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  decrementItem: (productId: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  cartSubtotal: number;
  shippingCost: number;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const cartColQuery = useMemoFirebase(() => 
    !isUserLoading && user && firestore ? collection(firestore, 'users', user.uid, 'cart') : null
  , [firestore, user, isUserLoading]);

  const { data: cartItems, isLoading } = useCollection<CartItem>(cartColQuery);

  const [optimisticCart, setOptimisticCart] = React.useState<CartItem[] | null>(null);

  // Sync optimistic cart with Firestore updates
  React.useEffect(() => {
    if (cartItems) {
      setOptimisticCart(cartItems);
    }
  }, [cartItems]);

  const displayItems = optimisticCart ?? cartItems ?? [];

  const cartCount =
    displayItems.reduce((acc, item) => acc + item.quantity, 0);
  
  const cartSubtotal =
    displayItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  
  const shippingCost = cartCount > 0 ? SHIPPING_COST : 0;
  
  const cartTotal = cartSubtotal + shippingCost;


  const addToCart = useCallback(
    async (product: Product) => {
      if (!user || !firestore) {
        toast({
          variant: 'destructive',
          title: 'Not logged in',
          description: 'You need to be logged in to add items to your cart.',
        });
        return;
      }

      // Optimistically update cart state immediately
      setOptimisticCart((prev) => {
        const current = prev || [];
        const existing = current.find(item => item.id === product.id);
        if (existing) {
          return current.map(item =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        }
        return [...current, { ...product, quantity: 1 }];
      });

      const cartItemRef = doc(firestore, 'users', user.uid, 'cart', product.id);
      try {
        await setDoc(
          cartItemRef,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image, // Use the image from the product object
            quantity: increment(1),
          },
          { merge: true }
        );
        toast({
          title: 'Added to cart!',
          description: `${product.name} has been added to your cart.`,
        });
      } catch (e) {
        console.error('Error adding to cart:', e);
        // Rollback on error by resetting to actual db state
        if (cartItems) setOptimisticCart(cartItems);
      }
    },
    [user, firestore, toast, cartItems]
  );

  const decrementItem = useCallback(
    async (productId: string) => {
      if (!user || !firestore) return;

      // Optimistically decrement or remove item
      setOptimisticCart((prev) => {
        const current = prev || [];
        const existing = current.find(item => item.id === productId);
        if (existing) {
          if (existing.quantity > 1) {
            return current.map(item =>
              item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
            );
          }
          return current.filter(item => item.id !== productId);
        }
        return current;
      });

      const cartItemRef = doc(firestore, 'users', user.uid, 'cart', productId);
      const currentItem = cartItems?.find(item => item.id === productId);

      try {
        if (currentItem && currentItem.quantity > 1) {
          await setDoc(
            cartItemRef,
            { quantity: increment(-1) },
            { merge: true }
          );
        } else {
          await deleteDoc(cartItemRef);
        }
      } catch (e) {
        console.error('Error decrementing cart item:', e);
        if (cartItems) setOptimisticCart(cartItems);
      }
    },
    [user, firestore, cartItems]
  );

  const removeFromCart = useCallback(
    async (productId: string) => {
      if (!user || !firestore) return;

      // Optimistically remove item from cart
      setOptimisticCart((prev) => {
        const current = prev || [];
        return current.filter(item => item.id !== productId);
      });

      const cartItemRef = doc(firestore, 'users', user.uid, 'cart', productId);
      try {
        await deleteDoc(cartItemRef);
        toast({
          title: 'Removed from cart',
          variant: 'destructive',
        });
      } catch (e) {
        console.error('Error removing cart item:', e);
        if (cartItems) setOptimisticCart(cartItems);
      }
    },
    [user, firestore, toast, cartItems]
  );

  const clearCart = useCallback(() => {
    if (!user || !firestore || !cartItems) return;

    setOptimisticCart([]);

    const batch = writeBatch(firestore);
    cartItems.forEach(item => {
      const docRef = doc(firestore, 'users', user.uid, 'cart', item.id);
      batch.delete(docRef);
    });
    // This is now non-blocking
    batch.commit().catch(e => {
      console.error("Failed to clear cart", e);
      if (cartItems) setOptimisticCart(cartItems);
    });
  }, [user, firestore, cartItems]);


  const value = {
    cartItems: displayItems,
    addToCart,
    removeFromCart,
    decrementItem,
    clearCart,
    cartCount,
    cartTotal,
    cartSubtotal,
    shippingCost,
    isLoading: isUserLoading || (isLoading && !optimisticCart),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
