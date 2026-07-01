'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, Star, Heart, ShoppingCart, SlidersHorizontal, Sparkles, X, ChevronRight, Check } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description?: string;
  stock: number;
  image: string;
  category?: string; // Optional category field
}

export default function ShopPage() {
  const firestore = useFirestore();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const router = useRouter();

  // State controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Products');
  const [sortBy, setSortBy] = useState('Featured');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Sync wishlist from localStorage
  const [wishlist, setWishlist] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('wishlist');
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const toggleWishlist = (id: string, name: string) => {
    let updated;
    const isAdded = wishlist.includes(id);
    if (isAdded) {
      updated = wishlist.filter(item => item !== id);
      toast({
        title: "Removed from Wishlist",
        description: `${name} has been removed.`,
      });
    } else {
      updated = [...wishlist, id];
      toast({
        title: "Added to Wishlist",
        description: `${name} has been added to your wishlist.`,
      });
    }
    setWishlist(updated);
    localStorage.setItem('wishlist', JSON.stringify(updated));
    window.dispatchEvent(new Event('wishlist-updated'));
  };

  // Query Firestore collection
  const productsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'products') : null),
    [firestore]
  );
  const { data: products, isLoading: isFirestoreLoading } = useCollection<Product>(productsQuery);

  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [isLocalLoading, setIsLocalLoading] = useState(true);

  // Load products cache from localStorage immediately on mount
  React.useEffect(() => {
    try {
      const cached = localStorage.getItem('ez_shop_products_cache');
      if (cached) {
        setLocalProducts(JSON.parse(cached));
        setIsLocalLoading(false);
      }
    } catch (e) {
      console.error("Error loading products cache:", e);
    }
  }, []);

  // Sync cache when Firestore data changes
  React.useEffect(() => {
    if (products) {
      setLocalProducts(products);
      setIsLocalLoading(false);
      try {
        localStorage.setItem('ez_shop_products_cache', JSON.stringify(products));
      } catch (e) {
        console.error("Error saving products cache:", e);
      }
    }
  }, [products]);

  const isLoading = isFirestoreLoading && isLocalLoading;

  // Query reviews for the flagship product (pro1) to dynamically sync its rating/review count
  const reviewsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'products', 'pro1', 'reviews'))
        : null,
    [firestore]
  );
  const { data: reviews } = useCollection<any>(reviewsQuery);

  const flagshipRating = React.useMemo(() => {
    if (!reviews || reviews.length === 0) return { average: 4.9, count: 412 };
    const total = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return {
      average: Number((total / reviews.length).toFixed(1)),
      count: reviews.length
    };
  }, [reviews]);

  const categories = [
    'All Products',
    'Sensors',
    'Arduino Boards',
    'Development Boards',
    'Displays',
    'Power Modules',
    'Robotics',
    'Wires & Connectors',
    'Components',
    'DIY Kits',
    'EZCirkit'
  ];

  // Combine query results and default fallback items
  const displayProducts = React.useMemo(() => {
    // Show only database products listed by the admin.
    let list = [...localProducts];

    // Filter by Category
    if (selectedCategory !== 'All Products') {
      list = list.filter(p => {
        // Safe mapping
        const cat = p.category || 'Components';
        return cat.toLowerCase() === selectedCategory.toLowerCase();
      });
    }

    // Filter by Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.description || '').toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'Price: Low to High') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'Price: High to Low') {
      list.sort((a, b) => b.price - a.price);
    }

    return list;
  }, [products, selectedCategory, searchQuery, sortBy]);

  // Calculate discount percentage
  const getDiscountPercent = (price: number, originalPrice?: number) => {
    if (!originalPrice || originalPrice <= price) return null;
    const diff = originalPrice - price;
    return Math.round((diff / originalPrice) * 100);
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (product.stock <= 0) {
      toast({
        title: "Out of Stock",
        description: "This component is currently unavailable.",
        variant: "destructive"
      });
      return;
    }
    addToCart(product);
    toast({
      title: "Added to Cart",
      description: `${product.name} has been added to your shopping cart.`
    });
  };

  const handleBuyNow = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (product.stock <= 0) {
      toast({
        title: "Out of Stock",
        description: "This component is currently unavailable.",
        variant: "destructive"
      });
      return;
    }
    addToCart(product);
    router.push('/checkout');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-foreground">
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-20 md:pt-24 pb-12">

        {/* Compact Page Header */}
        <div className="flex items-center justify-between py-4 border-b border-border/60 mb-6">
          <div className="flex items-center gap-3">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">Shop</p>
            <span className="text-border">|</span>
            <h1 className="text-xl font-black text-foreground">All Products</h1>
            {!isLoading && (
              <span className="text-xs text-muted-foreground font-medium">
                ({displayProducts.length} {displayProducts.length === 1 ? 'product' : 'products'})
              </span>
            )}
          </div>
          {/* Sort */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-background border border-border/80 text-xs font-bold rounded-lg py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option>Featured</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Main Grid */}
        <div className="flex gap-6 items-start">

          {/* ── Sidebar ── */}
          <aside className="hidden lg:flex flex-col gap-5 w-44 flex-shrink-0 sticky top-24">

            {/* Search */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">Search</p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            {/* Categories */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">Categories</p>
              <div className="flex flex-col gap-0.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                      selectedCategory === cat
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Product Grid ── */}
          <div className="flex-1 min-w-0">

            {/* Mobile search + filter bar */}
            <div className="flex lg:hidden gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            {/* Mobile categories row */}
            <div className="flex lg:hidden gap-1.5 overflow-x-auto pb-2 mb-4">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors',
                    selectedCategory === cat
                      ? 'bg-primary text-white border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="rounded-xl border border-border/60 overflow-hidden animate-pulse">
                    <div className="aspect-square bg-zinc-100 dark:bg-zinc-800" />
                    <div className="p-3 space-y-2">
                      <div className="h-3.5 bg-zinc-100 dark:bg-zinc-800 rounded w-3/4" />
                      <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2" />
                      <div className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {displayProducts.map((p) => {
                  const discount = getDiscountPercent(p.price, p.originalPrice);
                  const isWishlisted = wishlist.includes(p.id);

                  return (
                    <div
                      key={p.id}
                      onClick={() => router.push(`/products/${p.id}`)}
                      className="group cursor-pointer flex flex-col rounded-xl overflow-hidden border border-border/60 bg-white dark:bg-zinc-900 hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-zinc-900/50 transition-shadow duration-300"
                    >
                      {/* Image */}
                      <div className="relative aspect-square w-full overflow-hidden bg-zinc-50 dark:bg-zinc-800">
                        <img
                          src={p.image === '/1.jpg' ? '/kit/new-kit-front.png' : (p.image || '/logo.png')}
                          alt={p.name}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-[1.04]"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                        />
                        {!!discount && discount > 0 && (
                          <span className="absolute top-2 left-2 bg-[#ff6c00] text-white text-[10px] font-black px-1.5 py-0.5 rounded-sm">
                            -{discount}%
                          </span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleWishlist(p.id, p.name); }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 dark:bg-zinc-800/90 flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                          aria-label="Wishlist"
                        >
                          <Heart className={cn('h-3 w-3 transition-colors', isWishlisted ? 'fill-red-500 text-red-500' : 'text-zinc-400')} />
                        </button>
                      </div>

                      {/* Info */}
                      <div className="flex flex-col flex-1 p-2.5 gap-1">
                        <h3 className="text-[11px] font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                          {p.name}
                        </h3>
                        <div className="flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {p.id === 'pro1' ? `${flagshipRating.average}` : '4.8'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-auto pt-1">
                          <span className="text-sm font-black text-foreground">₹{p.price.toLocaleString('en-IN')}</span>
                          {p.originalPrice && p.originalPrice > p.price && (
                            <span className="text-[10px] text-muted-foreground line-through">₹{p.originalPrice.toLocaleString('en-IN')}</span>
                          )}
                        </div>
                        <button
                          onClick={(e) => handleAddToCart(e, p)}
                          disabled={p.stock <= 0}
                          className={cn(
                            'mt-1 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors',
                            p.stock <= 0
                              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                              : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-white'
                          )}
                        >
                          <ShoppingCart className="h-3 w-3" />
                          {p.stock <= 0 ? 'Out of Stock' : 'Add'}
                        </button>
                        {p.stock > 0 && (
                          <button
                            onClick={(e) => handleBuyNow(e, p)}
                            className="mt-1 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#ff6c00] hover:bg-[#e05f00] text-white transition-colors"
                          >
                            Buy Now
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-sm text-muted-foreground font-medium">No products found for "{searchQuery || selectedCategory}"</p>
                <button onClick={() => { setSearchQuery(''); setSelectedCategory('All Products'); }} className="mt-3 text-xs text-primary font-bold hover:underline">
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Product Details Modal Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        {selectedProduct && (
          <DialogContent className="max-w-md rounded-2xl border-border">
            <DialogHeader className="space-y-3 text-left">
              <DialogTitle className="text-lg font-black font-headline text-foreground leading-tight">
                {selectedProduct.name}
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-primary">
                Category: {selectedProduct.category || 'Components'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">
              {/* Product Visual */}
              <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border/60 bg-zinc-100">
                <Image
                  src={selectedProduct.image === '/1.jpg' ? '/kit/new-kit-front.png' : selectedProduct.image}
                  alt={selectedProduct.name}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Price and Stock status info */}
              <div className="flex justify-between items-baseline">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-foreground">₹{selectedProduct.price}</span>
                  {selectedProduct.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through">₹{selectedProduct.originalPrice}</span>
                  )}
                </div>
                <div>
                  {selectedProduct.stock > 0 ? (
                    <Badge variant="secondary" className="font-bold">In Stock: {selectedProduct.stock}</Badge>
                  ) : (
                    <Badge variant="destructive" className="font-bold">Out of Stock</Badge>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedProduct.description && (
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Description</h4>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{selectedProduct.description}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                <Button
                  className="flex-1 bg-primary text-white font-extrabold hover:bg-primary/95 rounded-xl h-10 text-xs uppercase tracking-wider shadow-md"
                  onClick={(e) => {
                    handleAddToCart(e, selectedProduct);
                    setSelectedProduct(null);
                  }}
                  disabled={selectedProduct.stock <= 0}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
                <Button
                  variant="outline"
                  className="border-border text-foreground font-bold hover:bg-accent rounded-xl h-10 text-xs px-3"
                  onClick={() => toggleWishlist(selectedProduct.id, selectedProduct.name)}
                >
                  <Heart className={cn("h-4 w-4", wishlist.includes(selectedProduct.id) ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
