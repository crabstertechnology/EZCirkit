'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Plus, Star, ShoppingCart } from 'lucide-react';
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
}

const FeaturedProducts = () => {
  const firestore = useFirestore();
  const { addToCart } = useCart();
  const { toast } = useToast();

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

  const getDiscount = (price: number, originalPrice?: number) => {
    if (!originalPrice || originalPrice <= price) return null;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  };

  const getCategoryLabel = (category?: string) => {
    if (!category) return null;
    return category.toUpperCase();
  };

  if (!isLoading && (!products || products.length === 0)) return null;

  return (
    <section className="py-16 md:py-24 bg-white" style={{ borderTop: '2px solid #f1f1f1', borderBottom: '2px solid #f1f1f1', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 8px 40px -8px rgba(0,0,0,0.08)' }}>
      <div className="container mx-auto px-4 md:px-6">

        {/* Section Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-black tracking-[0.2em] uppercase text-primary mb-2">
              02 / FEATURED
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-foreground leading-tight">
              Most loved by makers.
            </h2>
          </div>
          <Link
            href="/products"
            className="hidden sm:flex items-center gap-1.5 text-xs font-black tracking-[0.15em] uppercase text-foreground/60 hover:text-primary transition-colors group"
          >
            View Shop
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/3] w-full rounded-none" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products?.map((product) => {
              const discount = getDiscount(product.price, product.originalPrice);
              const categoryLabel = getCategoryLabel(product.category);

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="group flex flex-col"
                >
                  {/* Image Container */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 mb-4">
                    <img
                      src={product.image || '/logo.png'}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                    />

                    {/* Discount badge – top left */}
                    {discount && (
                      <span className="absolute top-2.5 left-2.5 bg-zinc-900 text-white text-[10px] font-black px-2 py-0.5 tracking-wide">
                        -{discount}%
                      </span>
                    )}

                    {/* Category badge – top right */}
                    {categoryLabel && (
                      <span className="absolute top-2.5 right-2.5 bg-white/90 text-zinc-700 text-[9px] font-black px-2 py-0.5 tracking-widest uppercase">
                        {categoryLabel}
                      </span>
                    )}

                    {/* Add to cart overlay */}
                    <button
                      onClick={(e) => handleAddToCart(e, product)}
                      disabled={product.stock <= 0}
                      className={cn(
                        'absolute bottom-2.5 right-2.5 w-8 h-8 flex items-center justify-center',
                        'bg-white border border-zinc-200 shadow-md',
                        'opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0',
                        'transition-all duration-200',
                        product.stock <= 0 ? 'cursor-not-allowed opacity-50' : 'hover:bg-primary hover:text-white hover:border-primary'
                      )}
                      aria-label="Add to cart"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Product Info */}
                  <div className="flex flex-col flex-1 gap-1.5">
                    {/* Stars + review count */}
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                      ))}
                      <span className="text-[11px] text-zinc-400 ml-0.5 font-medium">
                        (412)
                      </span>
                    </div>

                    {/* Name */}
                    <h3 className="text-sm font-black text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>

                    {/* Description */}
                    {product.description && (
                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    )}

                    {/* Price row */}
                    <div className="flex items-center gap-2 mt-auto pt-2">
                      <span className="text-base font-black text-foreground">
                        ₹{product.price.toLocaleString('en-IN')}
                      </span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-xs text-zinc-400 line-through">
                          ₹{product.originalPrice.toLocaleString('en-IN')}
                        </span>
                      )}

                      {/* + button (always visible on mobile) */}
                      <button
                        onClick={(e) => handleAddToCart(e, product)}
                        disabled={product.stock <= 0}
                        className={cn(
                          'ml-auto w-7 h-7 flex sm:hidden items-center justify-center',
                          'border border-zinc-200',
                          product.stock <= 0
                            ? 'cursor-not-allowed text-zinc-300'
                            : 'hover:bg-primary hover:text-white hover:border-primary transition-colors'
                        )}
                        aria-label="Add to cart"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Mobile view shop link */}
        <div className="flex sm:hidden justify-center mt-10">
          <Link
            href="/products"
            className="flex items-center gap-1.5 text-xs font-black tracking-[0.15em] uppercase text-foreground/60 hover:text-primary transition-colors group"
          >
            View Shop
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

      </div>
    </section>
  );
};

export default FeaturedProducts;
