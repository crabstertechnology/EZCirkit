'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description?: string;
  stock: number;
  image: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
}

const FeaturedProducts = () => {
  const firestore = useFirestore();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const [wishlist, setWishlist] = useState<string[]>([]);

  // Sync with localStorage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('wishlist');
      setWishlist(saved ? JSON.parse(saved) : []);
    } catch { setWishlist([]); }
  }, []);

  const productsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'products'), orderBy('name')) : null),
    [firestore]
  );
  const { data: products, isLoading } = useCollection<Product>(productsQuery);

  const handleAddToCart = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) return;
    await addToCart(product);
    toast({
      title: 'Added to cart!',
      description: `${product.name} has been added to your cart.`,
    });
  };

  const handleBuyNow = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) return;
    await addToCart(product);
    router.push('/checkout');
  };

  const toggleWishlist = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    const isIn = wishlist.includes(id);
    const updated = isIn ? wishlist.filter(x => x !== id) : [...wishlist, id];
    setWishlist(updated);
    localStorage.setItem('wishlist', JSON.stringify(updated));
    window.dispatchEvent(new Event('wishlist-updated'));
    toast({
      title: isIn ? 'Removed from Wishlist' : 'Added to Wishlist',
      description: `${name} has been ${isIn ? 'removed from' : 'added to'} your wishlist.`,
    });
  };

  const getDiscount = (price: number, originalPrice?: number) => {
    if (!originalPrice || originalPrice <= price) return null;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  };

  if (!isLoading && (!products || products.length === 0)) return null;

  return (
    <section className="bg-white dark:bg-zinc-950 py-12 md:py-16 border-t border-border/60">
      <div className="max-w-7xl mx-auto px-4 md:px-8">

        {/* Section Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary mb-1.5">
              Featured Products
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-foreground leading-tight tracking-tight">
              Best-selling components
            </h2>
          </div>
          <Link
            href="/products"
            className="hidden sm:flex items-center gap-1 text-sm font-semibold text-primary hover:underline underline-offset-4 transition-colors"
          >
            Shop all
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M7 17L17 7M17 7H7M17 7v10"/>
            </svg>
          </Link>
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products?.map((product) => {
              const discount = getDiscount(product.price, product.originalPrice);
              const inWishlist = wishlist.includes(product.id);
              const rating = product.rating ?? 4.8;
              const reviewCount = product.reviewCount ?? 0;

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="group flex flex-col rounded-xl overflow-hidden border border-border/60 bg-white dark:bg-zinc-900 hover:shadow-lg hover:shadow-zinc-200/60 dark:hover:shadow-zinc-900/60 transition-shadow duration-300"
                >
                  {/* Image */}
                  <div className="relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    <img
                      src={product.image || '/logo.png'}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                    />

                    {/* Discount badge — top left */}
                    {discount && (
                      <span className="absolute top-2.5 left-2.5 bg-[#ff6c00] text-white text-[10px] font-black px-2 py-0.5 rounded-sm">
                        -{discount}%
                      </span>
                    )}

                    {/* Wishlist — top right */}
                    <button
                      onClick={(e) => toggleWishlist(e, product.id, product.name)}
                      aria-label="Add to wishlist"
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 dark:bg-zinc-800/90 flex items-center justify-center shadow-sm hover:scale-110 transition-transform duration-150"
                    >
                      <Heart
                        className={cn(
                          "h-3.5 w-3.5 transition-colors",
                          inWishlist ? "fill-red-500 text-red-500" : "text-zinc-400"
                        )}
                      />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="flex flex-col flex-1 p-3 gap-1.5">

                    {/* Product Name */}
                    <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>

                    {/* Stars + count */}
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="text-[11px] font-semibold text-foreground/80">
                        {rating.toFixed(1)}
                      </span>
                      {reviewCount > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          ({reviewCount})
                        </span>
                      )}
                    </div>

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

                    {/* Add to Cart Button */}
                    <button
                      onClick={(e) => handleAddToCart(e, product)}
                      disabled={product.stock <= 0}
                      className={cn(
                        "mt-1.5 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-colors duration-200",
                        product.stock <= 0
                          ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed"
                          : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-white"
                      )}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {product.stock <= 0 ? 'Out of Stock' : 'Add'}
                    </button>

                    {/* Buy Now Button */}
                    {product.stock > 0 && (
                      <button
                        onClick={(e) => handleBuyNow(e, product)}
                        className="mt-1 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold bg-[#ff6c00] hover:bg-[#e05f00] text-white transition-colors duration-200"
                      >
                        Buy Now
                      </button>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Mobile shop link */}
        <div className="flex sm:hidden justify-center mt-8">
          <Link
            href="/products"
            className="text-sm font-semibold text-primary hover:underline underline-offset-4 flex items-center gap-1"
          >
            Shop all
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M7 17L17 7M17 7H7M17 7v10"/>
            </svg>
          </Link>
        </div>

      </div>
    </section>
  );
};

export default FeaturedProducts;
