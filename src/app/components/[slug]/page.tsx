'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Thermometer, Cpu, LayoutGrid, Wrench, Layers, ToggleRight, ArrowRight } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import ProductDetailPage from '@/app/products/[id]/page';
import { resolveSeoSlug, COMPONENT_ID_TO_SLUG, CATEGORY_NAME_TO_SLUG, slugify } from '@/lib/seo-mappings';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export default function DynamicComponentSlugPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params.slug as string) || '';

  const firestore = useFirestore();
  const [resolvedType, setResolvedType] = useState<'component' | 'category' | null>(null);
  const [resolvedValue, setResolvedValue] = useState<string>('');
  const [isResolving, setIsResolving] = useState(true);

  // Fetch all products from Firestore to check dynamic slugs as a fallback
  const productsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'products'), orderBy('name')) : null),
    [firestore]
  );
  const { data: products, isLoading: isProductsLoading } = useCollection<Product>(productsQuery);

  useEffect(() => {
    if (!slug) return;
    
    // 1. Try static resolution (mappings)
    const { type, value } = resolveSeoSlug(slug);
    if (type) {
      setResolvedType(type);
      setResolvedValue(value);
      setIsResolving(false);
      return;
    }

    // 2. If static mapping fails, try dynamic slugify lookup from loaded products
    if (!isProductsLoading && products) {
      const matchedProduct = products.find(p => slugify(p.name) === slug.toLowerCase());
      if (matchedProduct) {
        setResolvedType('component');
        setResolvedValue(matchedProduct.id);
        setIsResolving(false);
        return;
      }

      // Check if it's a slugified category
      const matchedCategory = products.find(p => p.category && slugify(p.category) === slug.toLowerCase());
      if (matchedCategory && matchedCategory.category) {
        setResolvedType('category');
        setResolvedValue(matchedCategory.category);
        setIsResolving(false);
        return;
      }

      // 404 fallback
      setResolvedType(null);
      setIsResolving(false);
    }
  }, [slug, products, isProductsLoading]);

  // Loading spinner
  if (isResolving || isProductsLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center pt-20">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary border-r-2"></div>
          <p className="text-xs text-muted-foreground font-semibold">Resolving path...</p>
        </div>
      </div>
    );
  }

  // 404 State
  if (!resolvedType) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center pt-20 px-4 text-center space-y-4">
        <h1 className="text-4xl font-black text-foreground">Component Not Found</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          The electronic component or category you are looking for does not exist, or has been relocated.
        </p>
        <Link
          href="/components"
          className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider hover:scale-[1.02] transition-transform"
        >
          Browse Components Library
        </Link>
      </div>
    );
  }

  // Render Component Product Detail View
  if (resolvedType === 'component') {
    return <ProductDetailPage overrideId={resolvedValue} />;
  }

  // Render Category Page
  return <CategoryPageView categoryName={resolvedValue} products={products || []} />;
}

// ── Category Page Render Component ───────────────────────────────────────────
function CategoryPageView({ categoryName, products }: { categoryName: string; products: Product[] }) {
  const categoryProducts = React.useMemo(() => {
    return products.filter(
      p => p.id !== 'azTYls91q9XKl58LRY4g' && p.category?.toLowerCase() === categoryName.toLowerCase()
    );
  }, [products, categoryName]);

  const getCleanSlug = (id: string) => {
    return COMPONENT_ID_TO_SLUG[id] || id;
  };

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('sensor')) return <Thermometer className="h-5 w-5" />;
    if (name.includes('board') || name.includes('arduino')) return <Cpu className="h-5 w-5" />;
    if (name.includes('power')) return <Layers className="h-5 w-5" />;
    if (name.includes('display')) return <LayoutGrid className="h-5 w-5" />;
    if (name.includes('wires') || name.includes('connector')) return <Wrench className="h-5 w-5" />;
    return <ToggleRight className="h-5 w-5" />;
  };

  const categoryDescriptions: Record<string, string> = {
    'Sensors': 'Explore our range of electronic sensors including temperature, humidity, light, distance, soil moisture, motion, and touch sensors to add environmental detection to your Arduino projects.',
    'Arduino Boards': 'High-performance microcontrollers and development boards compatible with standard Arduino IDE environments. The fundamental brain for all programming and electronic control circuits.',
    'Development Boards': 'WiFi and Bluetooth-enabled microcontrollers like ESP32 and specialized processing boards for IoT, smart home automation, and advanced coding projects.',
    'Displays': 'OLED screens, 16x2 LCD display modules, and 7-segment displays to provide telemetry values, numeric readouts, and visual feedback for your electronics.',
    'Power Modules': 'Breadboard power supplies, boost converters, and battery charging modules (TP4056) to regulate, boost, and deliver clean, stable power to your components.',
    'Robotics': 'Servo motors, DC motors, submersible pumps, and relay drivers to control physical motion, water systems, and high-power household devices.',
    'Wires & Connectors': 'Male-to-male and male-to-female jumper wire sets, multimeter test leads, and USB programming cables to bridge electrical connections.',
    'Components': 'Passive elements like resistors, diodes, and push button tactile switches to control current flow and trigger program states.',
  };

  const categoryFaqs: Record<string, { q: string; a: string }[]> = {
    'Sensors': [
      { q: 'What is an electronic sensor?', a: 'An electronic sensor is a device that detects changes in the physical environment (like heat, light, distance, or moisture) and converts them into electrical signals that microcontrollers can process.' },
      { q: 'How do analog and digital sensors differ?', a: 'Analog sensors output a continuous voltage proportional to the measured value (e.g., LM35 outputting 10mV per °C), which is read via analog pins (A0-A5). Digital sensors output discrete high/low states or serial data packages (e.g., DHT11 using a single-wire protocol).' },
      { q: 'Can these sensors be used with Raspberry Pi?', a: 'Yes. Most sensors support 3.3V logic, making them directly compatible with Raspberry Pi. For 5V-only sensors, a logic level converter is recommended to protect Pi GPIO pins.' }
    ],
    'Arduino Boards': [
      { q: 'Is the board compatible with the official Arduino IDE?', a: 'Yes, it uses the standard CH340 or Atmega16U2 serial driver, allowing it to program seamlessly via standard Arduino IDE board profiles (e.g., Arduino Uno).' },
      { q: 'What is the input voltage limit?', a: 'It can be powered via USB (5V) or via the DC power jack (recommended 7V–12V). Do not exceed 20V to prevent burning the onboard voltage regulator.' }
    ]
  };

  const currentDesc = categoryDescriptions[categoryName] || `Buy quality ${categoryName} components online at Crabster Technology. Fast India shipping, COD available.`;
  const faqs = categoryFaqs[categoryName] || [
    { q: `What projects use ${categoryName} components?`, a: `These components are used in educational science projects, college engineering experiments, and DIY hobby setups. Browse EZCirkit tutorials for wiring guides.` },
    { q: 'Are these parts reusable?', a: 'Yes, all modules are fully breadboard-compatible, meaning they plug and unplug without soldering, perfect for repeated prototyping and experiments.' }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-foreground pt-20 md:pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/components" className="hover:text-primary transition-colors">Components</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{categoryName}</span>
        </nav>

        {/* Category Header */}
        <div className="max-w-4xl mb-12 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              {getCategoryIcon(categoryName)}
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">{categoryName} Components</h1>
          </div>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            {currentDesc}
          </p>
        </div>

        {/* Products Grid */}
        <div className="space-y-12">
          {categoryProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {categoryProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/components/${getCleanSlug(p.id)}`}
                  className="group bg-background border border-border/60 hover:border-primary/40 rounded-xl overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col"
                >
                  <div className="aspect-square bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-4">
                    <img
                      src={p.image || '/logo.png'}
                      alt={p.name}
                      className="object-contain max-h-full max-w-full group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-3 space-y-1 flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-black group-hover:text-primary transition-colors leading-tight line-clamp-2">
                        {p.name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed pt-1">
                        {p.description || `High-quality ${categoryName} module.`}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 mt-auto">
                      <span className="text-sm font-black text-foreground">₹{p.price}</span>
                      <span className="text-[9px] font-bold text-primary uppercase group-hover:translate-x-0.5 transition-transform flex items-center">
                        Details <ChevronRight className="h-2.5 w-2.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed rounded-xl bg-background">
              <p className="text-sm text-muted-foreground">No components found in this category.</p>
            </div>
          )}

          {/* Category FAQs */}
          <div className="bg-white dark:bg-zinc-900 border border-border/60 rounded-2xl p-6 md:p-8 space-y-6">
            <h2 className="text-lg font-black text-foreground border-b border-border/60 pb-2">
              FAQs on {categoryName}
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="space-y-1">
                  <h3 className="text-xs md:text-sm font-bold text-foreground">{faq.q}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Internal Links/Funnels */}
          <div className="bg-primary/5 rounded-2xl border border-primary/10 p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <h2 className="text-base font-black text-foreground">Ready to start experimenting?</h2>
              <p className="text-xs text-muted-foreground max-w-xl">
                Get all these components, sensors, displays, and wiring leads grouped inside the **EZCirkit Electronics Learning Kit** backed by interactive programming lessons.
              </p>
            </div>
            <Link
              href="/components/ezcirkit"
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider hover:scale-[1.02] transition-transform"
            >
              Explore EZCirkit <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
