'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
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
  Wind,
  Layers,
  Code,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Heart,
  ShoppingCart,
  X
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

export default function ProductsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const [selectedComp, setSelectedComp] = useState<ComponentItem>(COMPONENTS_DATA.find(c => c.id === 'comp-arduino') || COMPONENTS_DATA[0]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [viewMode, setViewMode] = useState<'box' | 'list'>('box');
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  
  // Local storage synced wishlist state
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
        description: `${name} has been removed from your wishlist.`,
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

  const handleAddToCart = (comp: ComponentItem) => {
    addToCart({
      id: comp.id,
      name: comp.name,
      price: comp.price,
      image: '/logo.png', // Generic path, mapped inside shopping cart
      description: comp.description
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast({
      title: "Code Copied!",
      description: "Sample code has been copied to your clipboard.",
    });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getColComponents = (colIndex: number) => {
    return COMPONENTS_DATA.filter(c => c.colIndex === colIndex).sort((a, b) => a.rowIndex - b.rowIndex);
  };

  const selectComponent = (comp: ComponentItem) => {
    setSelectedComp(comp);
    setIsPanelOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 text-foreground pt-24 md:pt-40 pb-16">
      <div className="container mx-auto px-4 md:px-6 space-y-12">
        
        {/* Header Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary text-gradient bg-primary-gradient uppercase tracking-widest animate-pulse">
            <Sparkles className="h-3 w-3" /> Kit Inventory Explorer
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight font-headline text-foreground">
            EZCirkit <span className="text-gradient bg-primary-gradient">Component Box</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-prose mx-auto">
            Every component in your starter kit is aligned below exactly as it sits in the physical box. Select any component to view detailed specifications, copy sample code, add individual replacements to your cart, or save them to your wishlist.
          </p>
          
          {/* View Toggle Mode */}
          <div className="flex justify-center gap-3 pt-2">
            <Button 
              onClick={() => setViewMode('box')} 
              variant={viewMode === 'box' ? 'default' : 'outline'}
              className="rounded-full font-bold shadow-sm text-xs md:text-sm"
              size="sm"
            >
              <Layers className="mr-2 h-4 w-4" /> Physical Box View
            </Button>
            <Button 
              onClick={() => setViewMode('list')} 
              variant={viewMode === 'list' ? 'default' : 'outline'}
              className="rounded-full font-bold shadow-sm text-xs md:text-sm"
              size="sm"
            >
              <Menu className="mr-2 h-4 w-4" /> Structured Directory View
            </Button>
          </div>
        </div>

        {/* main Explorer Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Area (Interactive Box Map or List Directory) */}
          <div className={cn(
            "space-y-6 transition-all duration-300",
            isPanelOpen ? "lg:col-span-8" : "lg:col-span-12"
          )}>
            
            {viewMode === 'box' ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground px-2 uppercase tracking-wider">
                  <span>Physical Layout Map</span>
                  <span>6 Columns arranged as in foam</span>
                </div>
                
                {/* Visual Cardboard Electronics Box Container */}
                <div className="border-8 border-amber-800/10 bg-amber-50/20 dark:bg-amber-950/5 p-4 md:p-6 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-sm">
                  {/* Subtle Cardboard Box Flaps */}
                  <div className="absolute inset-x-0 top-0 h-2 bg-amber-800/10 border-b border-amber-900/10"></div>
                  <div className="absolute inset-y-0 left-0 w-2 bg-amber-800/10 border-r border-amber-900/10"></div>
                  <div className="absolute inset-y-0 right-0 w-2 bg-amber-800/10 border-l border-amber-900/10"></div>
                  
                  {/* Foam cutouts layout mimicking the actual photo */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4 bg-zinc-900 p-4 rounded-xl shadow-inner border border-zinc-800">
                    
                    {/* Columns 0 to 5 mapped directly */}
                    {[0, 1, 2, 3, 4, 5].map((colIndex) => {
                      const colComponents = getColComponents(colIndex);
                      return (
                        <div key={colIndex} className="flex flex-col gap-3 md:gap-4 h-full">
                          {colComponents.map((comp) => {
                            const IconComponent = COMPONENT_ICONS_MAP[comp.iconName];
                            const isSelected = selectedComp.id === comp.id && isPanelOpen;
                            
                            return (
                              <button
                                id={comp.id}
                                key={comp.id}
                                onClick={() => selectComponent(comp)}
                                className={cn(
                                  "w-full text-left p-3 rounded-lg border transition-all duration-300 flex flex-col justify-between group relative overflow-hidden",
                                  isSelected 
                                    ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(249,115,22,0.15)] ring-2 ring-primary/40" 
                                    : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                                )}
                                style={{
                                  minHeight: comp.id === 'comp-breadboard' ? '140px' : comp.id === 'comp-leads' ? '120px' : '85px',
                                  flexGrow: comp.id === 'comp-breadboard' ? 2 : 1
                                }}
                              >
                                {isSelected && (
                                  <div className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-primary m-2 animate-ping"></div>
                                )}
                                
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-1">
                                      <div className={cn(
                                        "p-1 rounded-md",
                                        isSelected ? "bg-primary/20 text-primary" : "bg-zinc-900 text-slate-400 group-hover:text-primary transition-colors"
                                      )}>
                                        <IconComponent className="h-3.5 w-3.5" />
                                      </div>
                                      <span className="text-[9px] font-bold text-slate-400 tracking-wider">
                                        QTY: {comp.quantity}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-primary">₹{comp.price}</span>
                                  </div>
                                  <h3 className={cn(
                                    "text-[10px] md:text-[11px] font-bold leading-tight line-clamp-2 mt-1",
                                    isSelected ? "text-primary font-extrabold" : "text-slate-200 group-hover:text-primary transition-colors"
                                  )}>
                                    {comp.name}
                                  </h3>
                                </div>
                                
                                <div className="mt-2 flex justify-between items-center w-full">
                                  <Badge className={cn(
                                    "text-[8px] font-bold py-0 px-1 border-none",
                                    comp.difficulty === 'Beginner' ? "bg-emerald-500/15 text-emerald-400" :
                                    comp.difficulty === 'Intermediate' ? "bg-blue-500/15 text-blue-400" :
                                    "bg-purple-500/15 text-purple-400"
                                  )}>
                                    {comp.difficulty}
                                  </Badge>
                                  <ChevronRight className="h-3 w-3 text-slate-500 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              // Structured Directory List View (E-Commerce Catalog)
              <div className={cn(
                "grid grid-cols-1 sm:grid-cols-2 gap-6 transition-all duration-300",
                isPanelOpen ? "md:grid-cols-3" : "md:grid-cols-4"
              )}>
                {COMPONENTS_DATA.map((comp) => {
                  const IconComponent = COMPONENT_ICONS_MAP[comp.iconName];
                  const isSelected = selectedComp.id === comp.id && isPanelOpen;
                  const isWishlisted = wishlist.includes(comp.id);
                  
                  return (
                    <Card 
                      id={comp.id}
                      key={comp.id}
                      onClick={() => selectComponent(comp)}
                      className={cn(
                        "cursor-pointer border transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg flex flex-col justify-between group overflow-hidden bg-card",
                        isSelected 
                          ? "border-primary bg-primary/[0.02] shadow-md shadow-primary/5" 
                          : "border-border hover:border-zinc-300 dark:hover:border-zinc-800"
                      )}
                    >
                      {/* Component Mock Image Container */}
                      <div className="w-full aspect-[4/3] bg-gradient-to-br from-primary/[0.03] to-primary/[0.08] dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center relative border-b border-border overflow-hidden p-4">
                        {/* Large Center Icon acting as image */}
                        <div className="h-16 w-16 rounded-full bg-background border border-border shadow-sm flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:border-primary/20">
                          <IconComponent className="h-8 w-8 text-primary drop-shadow-[0_2px_4px_rgba(249,115,22,0.15)]" />
                        </div>
                        
                        {/* Wishlist Heart Button */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWishlist(comp.id, comp.name);
                          }}
                          className="absolute top-3.5 right-3.5 p-2 rounded-full bg-background border border-border shadow-sm hover:scale-110 active:scale-95 transition-all text-muted-foreground hover:text-red-500 z-10"
                        >
                          <Heart className={cn("h-4 w-4 transition-colors", isWishlisted ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
                        </button>

                        {/* Quantity Badge */}
                        <Badge className="absolute bottom-3.5 left-3.5 text-[10px] font-bold py-0.5 px-2 bg-background border border-border shadow-sm text-foreground">
                          Qty: {comp.quantity}
                        </Badge>
                      </div>

                      {/* Component Information */}
                      <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <h3 className={cn(
                              "font-bold text-sm leading-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors",
                              isSelected && "text-primary"
                            )}>
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

                        {/* Price & Action Row */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground font-semibold leading-none">Spare Price</span>
                            <span className="text-base font-bold text-primary mt-0.5">₹{comp.price}</span>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-8 text-xs font-bold rounded-lg border-border"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectComponent(comp);
                              }}
                            >
                              Specs
                            </Button>
                            <Button 
                              size="sm"
                              className="h-8 text-xs font-bold rounded-lg bg-primary-gradient text-white shadow-sm hover:opacity-95"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(comp);
                              }}
                            >
                              <ShoppingCart className="h-3 w-3 mr-1" /> Add
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Right Area (Component Specifications & Code Playground Panel) */}
          {isPanelOpen && (
            <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-6 animate-in slide-in-from-right-4 duration-300">
              
              <Card className="border-border bg-card shadow-lg rounded-2xl overflow-hidden relative">
                <div className="absolute top-0 h-1.5 w-full bg-primary-gradient"></div>
                
                <CardHeader className="space-y-3 pb-4 p-5 md:p-6 pr-20 relative">
                  <div className="flex items-center justify-between">
                    <Badge className={cn(
                      "text-[10px] font-bold px-2 py-0.5 border-none",
                      selectedComp.difficulty === 'Beginner' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                      selectedComp.difficulty === 'Intermediate' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                      "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                    )}>
                      {selectedComp.difficulty} Level
                    </Badge>
                    <div className="text-[11px] font-bold text-muted-foreground">
                      COL {selectedComp.colIndex + 1} • ROW {selectedComp.rowIndex + 1}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-primary-gradient text-white shadow-md">
                        {React.createElement(COMPONENT_ICONS_MAP[selectedComp.iconName], { className: "h-5 w-5" })}
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold font-headline text-foreground leading-tight">{selectedComp.name}</CardTitle>
                        <CardDescription className="text-xs font-bold text-primary mt-0.5">Quantity: {selectedComp.quantity} included</CardDescription>
                      </div>
                    </div>
                  </div>

                  {/* Actions Group (Wishlist + Close X button) in Top-Right */}
                  <div className="absolute top-4 right-4 flex items-center gap-1.5">
                    {/* Wishlist button */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full border-border text-muted-foreground hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      onClick={() => toggleWishlist(selectedComp.id, selectedComp.name)}
                      title="Add to Wishlist"
                    >
                      <Heart className={cn("h-3.5 w-3.5", wishlist.includes(selectedComp.id) ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
                    </Button>
                    
                    {/* Close panel button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      onClick={() => setIsPanelOpen(false)}
                      title="Close Panel"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-5 pt-0 border-t border-border p-5 md:p-6">
                  
                  {/* Mock Image Display for Selected Component */}
                  <div className="w-full aspect-[16/10] bg-gradient-to-br from-primary/[0.02] to-primary/[0.08] dark:from-zinc-900/50 dark:to-zinc-800/50 rounded-xl flex items-center justify-center relative border border-border overflow-hidden">
                    <div className="h-16 w-16 rounded-full bg-background border border-border shadow-sm flex items-center justify-center">
                      {React.createElement(COMPONENT_ICONS_MAP[selectedComp.iconName], { className: "h-8 w-8 text-primary" })}
                    </div>
                    <span className="absolute bottom-2 right-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-background/80 px-2 py-0.5 rounded border border-border shadow-sm">
                      EZCirkit Parts
                    </span>
                  </div>

                  {/* Price Display */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-foreground">₹{selectedComp.price}</span>
                    <span className="text-xs text-muted-foreground font-semibold">Replacement Part Price</span>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Description</h4>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{selectedComp.description}</p>
                  </div>
                  
                  {/* Specifications List */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Specifications</h4>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {selectedComp.specifications.map((spec, i) => (
                        <li key={i} className="flex items-start gap-2 leading-relaxed">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                          <span>{spec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Sample Arduino Code */}
                  {selectedComp.sampleCode && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Sample Arduino Code</h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyCode(selectedComp.sampleCode || '')}
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                        >
                          {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                      <div className="relative rounded-xl bg-zinc-950 p-3.5 border border-zinc-800 overflow-x-auto max-h-[180px] overflow-y-auto font-mono text-[10px] md:text-[11px] text-emerald-400/90 leading-relaxed shadow-inner">
                        <pre><code>{selectedComp.sampleCode}</code></pre>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2.5 pt-1">
                    <Button 
                      className="bg-primary-gradient text-white font-bold shadow-md hover:opacity-95 transition-all rounded-xl w-full text-xs md:text-sm h-10"
                      onClick={() => handleAddToCart(selectedComp)}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" /> Add replacement part to cart
                    </Button>
                    
                    {selectedComp.sampleCode && (
                      <Button 
                        variant="outline"
                        className="border-border text-foreground hover:bg-accent rounded-xl w-full text-xs md:text-sm h-10"
                        onClick={() => router.push('/ide')}
                      >
                        <Code className="mr-2 h-4 w-4" /> Run code in IDE
                      </Button>
                    )}
                  </div>

                </CardContent>
              </Card>
            </div>
          )}
          
        </div>

      </div>
    </div>
  );
}
