'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingCart, Trash2, Star, ArrowRight, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/context/cart-context';
import { useFirestore } from '@/firebase';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category?: string;
  stock: number;
  rating?: number;
  description?: string;
}

export default function WishlistPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const firestore = useFirestore();

  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // 1. Load wishlist IDs from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('wishlist');
      setWishlistIds(saved ? JSON.parse(saved) : []);
    } catch {
      setWishlistIds([]);
    }
  }, []);

  // 2. Fetch actual product data for the wishlisted IDs from Firestore
  useEffect(() => {
    if (!isMounted) return;
    if (!firestore || wishlistIds.length === 0) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        // Firestore 'in' query supports up to 30 items
        const chunks: string[][] = [];
        for (let i = 0; i < wishlistIds.length; i += 30) {
          chunks.push(wishlistIds.slice(i, i + 30));
        }
        const results: Product[] = [];
        for (const chunk of chunks) {
          const q = query(collection(firestore, 'products'), where(documentId(), 'in', chunk));
          const snap = await getDocs(q);
          snap.docs.forEach(d => results.push({ id: d.id, ...d.data() } as Product));
        }
        // Preserve wishlist order
        results.sort((a, b) => wishlistIds.indexOf(a.id) - wishlistIds.indexOf(b.id));
        setProducts(results);
      } catch (err) {
        console.error('Error fetching wishlist products:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [isMounted, wishlistIds, firestore]);

  const handleRemove = (id: string, name: string) => {
    const updated = wishlistIds.filter(x => x !== id);
    setWishlistIds(updated);
    setProducts(prev => prev.filter(p => p.id !== id));
    localStorage.setItem('wishlist', JSON.stringify(updated));
    window.dispatchEvent(new Event('wishlist-updated'));
    toast({ title: 'Removed from Wishlist', description: `${name} removed.` });
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast({ variant: 'destructive', title: 'Out of stock', description: `${product.name} is currently unavailable.` });
      return;
    }
    addToCart(product);
    toast({ title: 'Added to Cart', description: `${product.name} added to your cart.` });
  };

  const getDiscount = (price: number, orig?: number) =>
    orig && orig > price ? Math.round(((orig - price) / orig) * 100) : null;

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-foreground">
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-24 md:pt-32 pb-16">

        {/* Breadcrumb */}
        <nav className="text-xs text-muted-foreground flex items-center gap-1.5 mb-8">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>›</span>
          <span className="text-foreground font-medium">Wishlist</span>
        </nav>

        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary mb-1.5">
              My Saves
            </p>
            <h1 className="text-3xl md:text-4xl font-black text-foreground leading-tight tracking-tight flex items-center gap-3">
              My Wishlist
              {wishlistIds.length > 0 && (
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-black">
                  {wishlistIds.length}
                </span>
              )}
            </h1>
          </div>
          {wishlistIds.length > 0 && (
            <Link
              href="/products"
              className="hidden sm:flex items-center gap-1 text-sm font-semibold text-primary hover:underline underline-offset-4"
            >
              Continue Shopping
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border/60 overflow-hidden animate-pulse">
                <div className="aspect-square bg-zinc-100 dark:bg-zinc-800" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-3/4" />
                  <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2" />
                  <div className="h-9 bg-zinc-100 dark:bg-zinc-800 rounded mt-2" />
                </div>
              </div>
            ))}
          </div>

        ) : products.length > 0 ? (
          <>
            {/* Product grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(product => {
                const discount = getDiscount(product.price, product.originalPrice);
                const outOfStock = product.stock <= 0;

                return (
                  <div
                    key={product.id}
                    className="group flex flex-col rounded-xl overflow-hidden border border-border/60 bg-white dark:bg-zinc-900 hover:shadow-lg hover:shadow-zinc-200/60 dark:hover:shadow-zinc-900/60 transition-shadow duration-300"
                  >
                    {/* Image */}
                    <Link href={`/products/${product.id}`} className="relative block aspect-square w-full overflow-hidden bg-zinc-50 dark:bg-zinc-800">
                      <img
                        src={product.image || '/logo.png'}
                        alt={product.name}
                        className="w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-[1.04]"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                      />
                      {/* Discount badge */}
                      {discount && (
                        <span className="absolute top-2.5 left-2.5 bg-[#ff6c00] text-white text-[10px] font-black px-2 py-0.5 rounded-sm">
                          -{discount}%
                        </span>
                      )}
                      {/* Out of stock */}
                      {outOfStock && (
                        <span className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-zinc-900/70 text-xs font-black text-zinc-500 uppercase tracking-wider">
                          Out of Stock
                        </span>
                      )}
                      {/* Remove (heart) */}
                      <button
                        onClick={(e) => { e.preventDefault(); handleRemove(product.id, product.name); }}
                        aria-label="Remove from wishlist"
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 dark:bg-zinc-800/90 flex items-center justify-center shadow-sm hover:scale-110 transition-transform duration-150"
                      >
                        <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
                      </button>
                    </Link>

                    {/* Info */}
                    <div className="flex flex-col flex-1 p-3 gap-1.5">
                      <Link href={`/products/${product.id}`}>
                        <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                          {product.name}
                        </h3>
                      </Link>

                      {product.category && (
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">{product.category}</p>
                      )}

                      {/* Price */}
                      <div className="flex items-center gap-1.5 mt-auto pt-1">
                        <span className="text-sm font-black text-foreground">
                          ₹{product.price.toLocaleString('en-IN')}
                        </span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-xs text-muted-foreground line-through">
                            ₹{product.originalPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-2 mt-1.5">
                        <button
                          onClick={() => handleRemove(product.id, product.name)}
                          className="w-8 h-8 flex items-center justify-center border border-border rounded-lg hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex-shrink-0"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                        </button>
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={outOfStock}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors',
                            outOfStock
                              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                              : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700'
                          )}
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          {outOfStock ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary bar */}
            <div className="mt-10 p-5 rounded-2xl border border-border/60 bg-zinc-50 dark:bg-zinc-900 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{wishlistIds.length} item{wishlistIds.length !== 1 ? 's' : ''} saved</p>
                <p className="text-sm font-black text-foreground">
                  Total value: ₹{products.reduce((sum, p) => sum + p.price, 0).toLocaleString('en-IN')}
                </p>
              </div>
              <Button
                onClick={() => {
                  const inStock = products.filter(p => p.stock > 0);
                  inStock.forEach(p => addToCart(p));
                  if (inStock.length > 0) {
                    toast({ title: 'All items added to cart!', description: `${inStock.length} product${inStock.length !== 1 ? 's' : ''} added.` });
                  }
                }}
                className="bg-[#ff6c00] hover:bg-[#e05f00] text-white font-bold rounded-xl h-10 px-6"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add All to Cart
              </Button>
            </div>
          </>

        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-20 w-20 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center mb-6">
              <Heart className="h-10 w-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2">Your wishlist is empty</h2>
            <p className="text-sm text-muted-foreground max-w-xs mb-8">
              Browse our products and tap the ♡ to save items you love — they'll appear here.
            </p>
            <Button
              onClick={() => router.push('/products')}
              className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-xl h-11 px-8 flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              Browse Products
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
