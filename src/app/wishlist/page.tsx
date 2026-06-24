'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart,
  ShoppingCart,
  Trash2,
  ChevronLeft,
  Sparkles,
  ShoppingBag,
  Hash,
  Grid3X3,
  Cable,
  Thermometer,
  Droplet,
  Cpu,
  ToggleLeft,
  Volume2,
  GitCommit,
  Power,
  Lightbulb,
  ArrowRight,
  Menu,
  Split,
  Waves,
  Gauge,
  Wind
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/context/cart-context';
import { COMPONENTS_DATA, ComponentItem } from '@/lib/components';

const COMPONENT_ICONS_MAP = {
  hash: Hash,
  grid: Grid3X3,
  cable: Cable,
  thermometer: Thermometer,
  droplet: Droplet,
  cpu: Cpu,
  toggle: ToggleLeft,
  volume: Volume2,
  git: GitCommit,
  power: Power,
  lightbulb: Lightbulb,
  arrow: ArrowRight,
  menu: Menu,
  split: Split,
  waves: Waves,
  gauge: Gauge,
  wind: Wind
};

export default function WishlistPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Load wishlist from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('wishlist');
      if (saved) {
        setWishlistIds(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load wishlist", e);
    }
  }, []);

  // Filter components that are in the wishlist
  const wishlistedItems = COMPONENTS_DATA.filter(comp => wishlistIds.includes(comp.id));

  const handleRemove = (id: string, name: string) => {
    const updated = wishlistIds.filter(itemId => itemId !== id);
    setWishlistIds(updated);
    localStorage.setItem('wishlist', JSON.stringify(updated));
    
    // Dispatch a custom event to notify Header of the wishlist count change
    window.dispatchEvent(new Event('wishlist-updated'));

    toast({
      title: "Removed from Wishlist",
      description: `${name} has been removed from your wishlist.`,
    });
  };

  const handleAddToCart = (comp: ComponentItem) => {
    addToCart({
      id: comp.id,
      name: comp.name,
      price: comp.price,
      image: '/logo.png',
      description: comp.description
    });
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 text-foreground pt-24 md:pt-40 pb-16 flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse text-sm font-bold">Loading your wishlist...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 text-foreground pt-24 md:pt-40 pb-16">
      <div className="container mx-auto px-4 md:px-6 space-y-8 max-w-5xl">
        
        {/* Navigation Breadcrumb back to products */}
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-primary pl-0"
            onClick={() => router.push('/products')}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Components Explorer
          </Button>
        </div>

        {/* Header Hero Section */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-500 uppercase tracking-widest">
            <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" /> Saved Components
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-headline text-foreground">
            My <span className="text-gradient bg-primary-gradient">Wishlist</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-prose">
            Review your saved spare parts and hardware modules. Add them directly to your cart or inspect their technical layout.
          </p>
        </div>

        {/* Wishlist Items List */}
        {wishlistedItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistedItems.map((comp) => {
              const IconComponent = COMPONENT_ICONS_MAP[comp.iconName];
              
              return (
                <Card 
                  key={comp.id}
                  className="border border-border flex flex-col justify-between overflow-hidden bg-card hover:shadow-md transition-all duration-300 group"
                >
                  {/* Mock Image Container */}
                  <div className="w-full aspect-[4/3] bg-gradient-to-br from-primary/[0.02] to-primary/[0.08] dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center relative border-b border-border overflow-hidden p-4">
                    {/* Large Center Icon */}
                    <div className="h-16 w-16 rounded-full bg-background border border-border shadow-sm flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                      <IconComponent className="h-8 w-8 text-primary drop-shadow-[0_2px_4px_rgba(249,115,22,0.15)]" />
                    </div>
                    
                    {/* Remove/Trash Button */}
                    <button 
                      onClick={() => handleRemove(comp.id, comp.name)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-background border border-border shadow-sm hover:scale-110 hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all text-muted-foreground"
                      title="Remove from Wishlist"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    {/* Quantity Badge */}
                    <Badge className="absolute bottom-3 left-3 text-[10px] font-bold py-0.5 px-2 bg-background border border-border shadow-sm text-foreground">
                      Qty: {comp.quantity}
                    </Badge>
                  </div>

                  {/* Info Content */}
                  <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <h3 className="font-bold text-sm leading-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {comp.name}
                        </h3>
                        <Badge className={cn(
                          "text-[8px] font-extrabold px-1.5 py-0 border-none shrink-0",
                          comp.difficulty === 'Beginner' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                          comp.difficulty === 'Intermediate' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                          "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                        )}>
                          {comp.difficulty}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                        {comp.description}
                      </p>
                    </div>

                    {/* Price and Add to Cart Row */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground font-semibold leading-none">Price</span>
                        <span className="text-base font-bold text-primary mt-0.5">₹{comp.price}</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-8 text-xs font-bold rounded-lg border-border"
                          onClick={() => {
                            // Save selected component ID in sessionStorage so `/products` page opens it on redirect!
                            sessionStorage.setItem('highlight-target', comp.id);
                            router.push('/products');
                          }}
                        >
                          Inspect
                        </Button>
                        <Button 
                          size="sm"
                          className="h-8 text-xs font-bold rounded-lg bg-primary-gradient text-white shadow-sm hover:opacity-95"
                          onClick={() => handleAddToCart(comp)}
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" /> Add to Cart
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-card border border-border rounded-2xl p-12 text-center max-w-md mx-auto space-y-6 shadow-sm">
            <div className="h-16 w-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <Heart className="h-8 w-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-foreground font-headline">Your Wishlist is Empty</h2>
              <p className="text-xs md:text-sm text-muted-foreground max-w-xs mx-auto">
                Explore the 18 kit modules in the cardboard layout explorer and save your favorite components!
              </p>
            </div>
            <Button 
              className="bg-primary-gradient text-white font-bold shadow-md rounded-xl"
              onClick={() => router.push('/products')}
            >
              Explore Components
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
