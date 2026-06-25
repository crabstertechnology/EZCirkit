'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, Star, Heart, ShoppingCart, SlidersHorizontal, Sparkles, X, ChevronRight, Check } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
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
  const { data: products, isLoading } = useCollection<Product>(productsQuery);

  const categories = [
    'All Products',
    'Sensors',
    'Arduino Boards',
    'Displays',
    'Power Modules',
    'Robotics',
    'Wires & Connectors',
    'Components',
    'DIY Kits'
  ];

  // Client side fallback products matching the mockup
  const fallbackProducts: Product[] = [
    {
      id: 'pro1',
      name: 'EZCirkit Electronics Learning Starter Kit',
      price: 2499,
      originalPrice: 3499,
      description: 'Everything you need to start your electronics journey in one box. Includes Arduino UNO R3, sensors, modules, breadboard, jumper wires and a multimeter. Pair it with our free project tutorials and learn by doing.',
      stock: 10,
      image: '/new-kit-front.png',
      category: 'DIY Kits'
    },
    {
      id: 'pro2',
      name: 'Arduino UNO R3 Compatible Board',
      price: 699,
      originalPrice: 899,
      description: 'High-quality micro-controller board compatible with the Arduino Uno R3 platform. Perfect core component for standard robotics and embedded systems projects.',
      stock: 45,
      image: '/2.jpg',
      category: 'Arduino Boards'
    },
    {
      id: 'pro3',
      name: '0.96" OLED Display I2C 128x64',
      price: 249,
      originalPrice: 349,
      description: 'High-contrast graphic monochrome display screen. Uses simple I2C connection pins (SDA/SCL) to report sensor logs, text symbols, or customized graphics.',
      stock: 20,
      image: '/2.jpg',
      category: 'Displays'
    }
  ];

  // Combine query results and default fallback items (ensure fallback items match the mockup details)
  const displayProducts = React.useMemo(() => {
    let list = products && products.length > 0 ? [...products] : [...fallbackProducts];
    
    // Ensure fallback items exist in list if firestore is connected but empty
    if (products && products.length > 0) {
      fallbackProducts.forEach(fallback => {
        if (!list.some(p => p.id === fallback.id)) {
          list.push(fallback);
        }
      });
    }

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

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 text-foreground pt-28 md:pt-40 pb-16">
      <div className="container mx-auto px-4 md:px-6 space-y-12">
        
        {/* Page Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs md:text-sm font-extrabold uppercase tracking-widest text-primary">
            <span>Shop</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight font-headline text-slate-900 dark:text-zinc-50">
            All Products
          </h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-xl">
            Browse our curated catalog of electronics components and kits.
          </p>
        </div>

        <hr className="border-border/60" />

        {/* Main Grid View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Sidebar Filter Section */}
          <div className="lg:col-span-3 space-y-8 lg:sticky lg:top-28">
            {/* Search Box */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Search
              </h3>
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 h-4.5 w-4.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl border-border bg-background"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Categories
              </h3>
              <div className="flex flex-col gap-1.5">
                {categories.map((category) => {
                  const isSelected = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        "w-full text-left px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 tracking-wide",
                        isSelected
                          ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      )}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Product Grid Area */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* Controls Bar */}
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <p className="text-xs md:text-sm font-bold text-muted-foreground">
                {displayProducts.length} {displayProducts.length === 1 ? 'product' : 'products'}
              </p>
              
              <div className="flex items-center gap-3">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-background border border-border/80 text-xs md:text-sm font-bold rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option>Featured</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* Products Grid */}
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">
                Loading products...
              </div>
            ) : displayProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayProducts.map((p) => {
                  const discount = getDiscountPercent(p.price, p.originalPrice);
                  const isWishlisted = wishlist.includes(p.id);
                  
                  return (
                    <Card
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      className="group cursor-pointer border border-border/60 hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden flex flex-col justify-between"
                    >
                      {/* Image header container */}
                      <div className="w-full aspect-[4/3] bg-zinc-100 dark:bg-zinc-900 relative flex items-center justify-center border-b border-border/50 overflow-hidden">
                        <Image
                          src={p.image === '/1.jpg' ? '/new-kit-front.png' : p.image}
                          alt={p.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        
                        {/* Discount overlay badge */}
                        {discount && (
                          <Badge className="absolute top-3 left-3 bg-orange-500 hover:bg-orange-600 border-none font-bold text-white text-[9px] py-0.5 px-2 rounded-md">
                            -{discount}%
                          </Badge>
                        )}

                        {/* Wishlist button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWishlist(p.id, p.name);
                          }}
                          className="absolute top-3 right-3 p-2 rounded-full bg-background border border-border/80 shadow-sm hover:scale-110 active:scale-95 transition-all text-muted-foreground hover:text-red-500 z-10 animate-fade-in"
                        >
                          <Heart className={cn("h-4 w-4 transition-colors", isWishlisted ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
                        </button>
                      </div>

                      {/* Info details */}
                      <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-1.5">
                          <h3 className="font-black text-sm leading-snug group-hover:text-primary transition-colors text-foreground line-clamp-2">
                            {p.name}
                          </h3>
                          
                          {/* Rating fallback */}
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-[11px] font-bold text-muted-foreground">
                              {p.id === 'pro1' ? '4.9 (412)' : p.id === 'pro2' ? '4.8 (1284)' : '4.7 (342)'}
                            </span>
                          </div>
                        </div>

                        {/* Price & Add to Cart button */}
                        <div className="flex items-center justify-between pt-1 border-t border-border/40">
                          <div className="flex flex-col">
                            <span className="text-base font-black text-primary">₹{p.price}</span>
                            {p.originalPrice && (
                              <span className="text-[10px] text-muted-foreground line-through">₹{p.originalPrice}</span>
                            )}
                          </div>

                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/95 text-white font-extrabold rounded-lg gap-1 px-3 py-1.5 h-8 text-[11px] uppercase tracking-wider"
                            onClick={(e) => handleAddToCart(e, p)}
                            disabled={p.stock <= 0}
                          >
                            <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                            Add
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="p-16 text-center border border-dashed rounded-3xl text-muted-foreground text-sm font-semibold max-w-md mx-auto">
                No products found matching those search criteria.
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
                  src={selectedProduct.image === '/1.jpg' ? '/new-kit-front.png' : selectedProduct.image}
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
