'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight, Cpu, Thermometer, ToggleRight, LayoutGrid, Wrench, Layers } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { COMPONENT_ID_TO_SLUG, CATEGORY_NAME_TO_SLUG } from '@/lib/seo-mappings';
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

export default function ComponentsHubPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all products from Firestore
  const productsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'products'), orderBy('name')) : null),
    [firestore]
  );
  const { data: products, isLoading } = useCollection<Product>(productsQuery);

  // Group products by category
  const categoriesMap = React.useMemo(() => {
    if (!products) return {};
    const map: Record<string, Product[]> = {};
    products.forEach((p) => {
      // Exclude flagship kit from components listing if it's the main kit itself,
      // or group it appropriately.
      if (p.id === 'azTYls91q9XKl58LRY4g') return;
      const cat = p.category || 'Components';
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return map;
  }, [products]);

  // Search filtered products
  const filteredProducts = React.useMemo(() => {
    if (!products) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return products.filter(
      (p) =>
        p.id !== 'azTYls91q9XKl58LRY4g' &&
        (p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  // Map category names to icons
  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('sensor')) return <Thermometer className="h-5 w-5" />;
    if (name.includes('board') || name.includes('arduino')) return <Cpu className="h-5 w-5" />;
    if (name.includes('power')) return <Layers className="h-5 w-5" />;
    if (name.includes('display')) return <LayoutGrid className="h-5 w-5" />;
    if (name.includes('wires') || name.includes('connector')) return <Wrench className="h-5 w-5" />;
    return <ToggleRight className="h-5 w-5" />;
  };

  const getCleanSlug = (id: string, name: string) => {
    return COMPONENT_ID_TO_SLUG[id] || id;
  };

  const getCategorySlug = (name: string) => {
    return CATEGORY_NAME_TO_SLUG[name] || name.toLowerCase().replace(/\s+/g, '-');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-foreground pt-20 md:pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Components</span>
        </nav>

        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">Crabster Technology Electronics</p>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
            Electronic Components & STEM Projects Library
          </h1>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            Browse our comprehensive catalog of educational electronics components, sensors, microcontrollers, and DIY modules. High-quality parts backed by specifications, projects, and Arduino-ready tutorials.
          </p>

          {/* Search bar */}
          <div className="relative max-w-md mx-auto pt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search components (e.g. Ultrasonic Sensor, Resistor)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-border/80 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
            />
          </div>
        </div>

        {/* Search Results */}
        {searchQuery.trim().length > 0 && (
          <div className="mb-12">
            <h2 className="text-lg font-bold mb-4">Search Results ({filteredProducts.length})</h2>
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/components/${getCleanSlug(p.id, p.name)}`}
                    className="group bg-background border border-border/60 hover:border-primary/40 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="aspect-square bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-3">
                      <img
                        src={p.image || '/logo.png'}
                        alt={p.name}
                        className="object-contain max-h-full max-w-full group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="text-[10px] text-muted-foreground font-semibold">{p.category || 'Components'}</p>
                      <h3 className="text-xs font-bold leading-tight group-hover:text-primary transition-colors line-clamp-1">{p.name}</h3>
                      <p className="text-sm font-black pt-1">₹{p.price}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No components matched your search. Try adjusting terms.</p>
            )}
            <hr className="my-8 border-border/60" />
          </div>
        )}

        {/* Categories Grid */}
        <div className="space-y-12">
          
          {/* Subcategories Hub */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Browse by Category</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.keys(categoriesMap).map((catName) => (
                <Link
                  key={catName}
                  href={`/components/${getCategorySlug(catName)}`}
                  className="flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-background hover:border-primary/40 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-all duration-300 group"
                >
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    {getCategoryIcon(catName)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{catName}</h3>
                    <p className="text-[10px] text-muted-foreground">({categoriesMap[catName].length} items)</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Chapters and Components Sections */}
          <div className="space-y-10">
            {Object.entries(categoriesMap).map(([catName, items]) => (
              <div key={catName} className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-primary">{getCategoryIcon(catName)}</span>
                    <h2 className="text-lg font-black text-foreground">{catName}</h2>
                  </div>
                  <Link
                    href={`/components/${getCategorySlug(catName)}`}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
                  >
                    View Category <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {items.slice(0, 4).map((p) => (
                    <Link
                      key={p.id}
                      href={`/components/${getCleanSlug(p.id, p.name)}`}
                      className="group bg-background border border-border/60 hover:border-primary/40 rounded-xl overflow-hidden hover:shadow-md transition-all duration-300"
                    >
                      <div className="aspect-square bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-4">
                        <img
                          src={p.image || '/logo.png'}
                          alt={p.name}
                          className="object-contain max-h-full max-w-full group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-3 space-y-1">
                        <h3 className="text-xs font-black group-hover:text-primary transition-colors leading-tight line-clamp-1">
                          {p.name}
                        </h3>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {p.description || 'Electronic learning kit component.'}
                        </p>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs font-black text-foreground">₹{p.price}</span>
                          <span className="text-[9px] font-bold text-primary uppercase group-hover:translate-x-0.5 transition-transform flex items-center">
                            Specs <ChevronRight className="h-2.5 w-2.5" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* FAQs Section */}
          <div className="bg-white dark:bg-zinc-900 border border-border/60 rounded-2xl p-6 md:p-8 space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-xl md:text-2xl font-black">Frequently Asked Questions</h2>
              <p className="text-xs text-muted-foreground">Common questions about Crabster Technology electronics components and shipping in India.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <h3 className="text-sm font-bold">Are these components compatible with standard Arduino boards?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">Yes, all individual components, sensors, and displays sold on Crabster Technology operate at standard 3.3V/5V logic levels and fit standard solderless breadboards, making them fully compatible with Arduino Uno, Nano, Mega, ESP32, and Raspberry Pi.</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold">Do you offer cash on delivery (COD) in India?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">Yes, we provide Cash on Delivery (COD) shipping options across major pin codes in India. Shipping rates are calculated at checkout, with free delivery available for orders exceeding ₹999.</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold">Do the sensors come with sample code and connection diagrams?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">Absolutely. Every sensor page contains wiring diagrams, operating voltage specs, applications, and verified Arduino test code to help you get started quickly.</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold">Can I purchase components in bulk for school labs?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">Yes, Crabster Technology supplies schools, colleges, and STEM learning labs. Please contact our support team via our contact form or WhatsApp for custom volume discounts and institutional invoices.</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
