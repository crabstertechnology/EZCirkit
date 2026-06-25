'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Star, Check, ShoppingCart, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi
} from "@/components/ui/carousel";
import { useCart } from '@/context/cart-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import ClientOnly from '../shared/client-only';
import { Button } from '@/components/ui/button';

const FlagshipProductSection = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const { addToCart, cartItems } = useCart();
  const firestore = useFirestore();
  const router = useRouter();

  // Query all products from Firestore to find the flagship product dynamically
  const productsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'products')) : null),
    [firestore]
  );
  const { data: products, isLoading } = useCollection<any>(productsQuery);

  const product = React.useMemo(() => {
    if (!products || products.length === 0) return null;
    return (
      products.find(p => p.category?.toLowerCase() === 'ezcirkit') ||
      products.find(p => p.id === 'pro1') ||
      products.find(p => p.name?.toLowerCase().includes('ezcirkit')) ||
      null
    );
  }, [products]);

  // Fetch reviews for the flagship product to get dynamic rating and count
  const reviewsQuery = useMemoFirebase(
    () =>
      firestore && product
        ? query(collection(firestore, 'products', product.id || 'pro1', 'reviews'))
        : null,
    [firestore, product]
  );
  const { data: reviews } = useCollection<any>(reviewsQuery);

  const averageRating = React.useMemo(() => {
    if (!reviews || reviews.length === 0) return 4.9;
    const total = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return Number((total / reviews.length).toFixed(1));
  }, [reviews]);

  const reviewsCount = reviews?.length ?? 412;

  const handleAddToCart = async () => {
    if (product) {
      await addToCart(product);
      router.push('/cart');
    }
  };

  const handleBuyNow = async () => {
    if (product) {
      const productInCart = cartItems.find(item => item.id === product.id);
      if (!productInCart) {
        await addToCart(product);
      }
      router.push('/checkout');
    }
  };

  const isOutOfStock = product ? product.stock === 0 : false;

  const isKit = React.useMemo(() => {
    if (!product) return false;
    return (
      product.category?.toLowerCase() === 'ezcirkit' ||
      product.name?.toLowerCase().includes('kit')
    );
  }, [product]);

  const carouselImages = React.useMemo(() => {
    if (!product) return [];
    if (isKit) {
      return [
        { src: product.image, alt: 'Front View' },
        { src: '/kit-inside.png', alt: 'Inside View' },
        { src: '/kit-back.png', alt: 'Back View' },
      ];
    }
    return [
      { src: product.image, alt: product.name },
    ];
  }, [product, isKit]);

  React.useEffect(() => {
    if (!api) return;
    
    // Set default slide to first index
    api.scrollTo(0);
    setCurrentSlide(api.selectedScrollSnap());
    
    api.on("select", () => {
      setCurrentSlide(api.selectedScrollSnap());
    });

    const interval = setInterval(() => {
      const count = api.scrollSnapList().length;
      if (count > 0) {
        const nextIndex = (api.selectedScrollSnap() + 1) % count;
        api.scrollTo(nextIndex);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [api]);

  const column1Items = [
    'Arduino UNO R3',
    '20 x LEDs (5 colors)',
    '0.96" OLED Display',
    '5V Relay Module',
    'Active & Passive Buzzers',
    'Digital Multimeter'
  ];

  const column2Items = [
    'DHT11 Temperature & Humidity Sensor',
    'Resistor Pack (100+ pieces)',
    'Soil Moisture Sensor',
    'Mini Submersible Water Pump',
    '4 x Push Buttons',
    '65 x Jumper Wires (M-M, M-F, F-F)'
  ];

  // Hide the section while loading or if the product does not exist in the database
  if (isLoading) return null;
  if (!product) return null;

  return (
    <section id="flagship-product" className="py-16 md:py-24 bg-zinc-50/50 dark:bg-zinc-950/20 border-t border-b border-border/80">
      <div className="container mx-auto px-4 md:px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <p className="text-xs md:text-sm font-extrabold uppercase tracking-widest text-primary">
            Flagship Product
          </p>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight font-headline text-foreground">
            {isKit ? 'The EZCirkit Starter Kit' : product.name}
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-prose mx-auto">
            {isKit ? 'The single kit you need to build your first coding experiments.' : 'Learn by doing with premium quality components.'}
          </p>
        </div>

        {/* Flagship Card Wrapper */}
        <div className="max-w-5xl mx-auto bg-background border border-border/80 rounded-3xl shadow-xl shadow-zinc-200/50 dark:shadow-none overflow-hidden p-6 md:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: Swipable Carousel with Thumbnail Navigation */}
            <div className="lg:col-span-6 space-y-6">
              <div className="border border-border/60 rounded-3xl overflow-hidden shadow-md bg-background">
                <Carousel setApi={setApi} className="w-full relative">
                  <CarouselContent>
                    {carouselImages.map((img, index) => (
                      <CarouselItem key={index}>
                        <div className="relative aspect-square w-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                          <Image
                            src={img.src}
                            alt={img.alt}
                            width={600}
                            height={600}
                            priority
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.01]"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {carouselImages.length > 1 && (
                    <>
                      <CarouselPrevious className="left-4 opacity-75 hover:opacity-100 z-10" />
                      <CarouselNext className="right-4 opacity-75 hover:opacity-100 z-10" />
                    </>
                  )}
                </Carousel>
              </div>
              
              {/* Thumbnail Buttons */}
              {isKit && carouselImages.length > 1 && (
                <div className="flex gap-3 justify-center">
                  {[
                    { label: 'Front View', slideIndex: 0 },
                    { label: 'Inside View', slideIndex: 1 },
                    { label: 'Back View', slideIndex: 2 },
                  ].map((btn) => (
                    <button
                      key={btn.slideIndex}
                      type="button"
                      onClick={() => api?.scrollTo(btn.slideIndex)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs md:text-sm font-bold border transition-all duration-200 shadow-sm",
                        currentSlide === btn.slideIndex
                          ? "bg-primary/10 text-primary border-primary/40 shadow-sm"
                          : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-zinc-50"
                      )}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Details & Checklist */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Rating and Reviews */}
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => {
                    const ratingValue = i + 1;
                    return (
                      <Star
                        key={i}
                        className={cn(
                          "h-4.5 w-4.5 text-amber-400",
                          ratingValue <= averageRating
                            ? "fill-amber-400"
                            : ratingValue - 0.5 <= averageRating
                            ? "fill-amber-400 opacity-50"
                            : "text-muted-foreground/30"
                        )}
                      />
                    );
                  })}
                </div>
                <span className="text-sm font-bold text-foreground">
                  {averageRating.toFixed(1)} <span className="text-muted-foreground font-normal">• {reviewsCount} reviews</span>
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="text-2xl md:text-3xl font-black text-foreground tracking-tight leading-tight">
                  {product.name}
                </h3>
                <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                  {product.description || "Everything you need to start your electronics journey in one box. Includes Arduino compatible microcontroller, high quality sensors, modules, breadboard, resistors and jumper wires."}
                </p>
              </div>

              {/* Pricing */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-3xl font-black text-primary">₹{product.price.toLocaleString('en-IN')}</span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <>
                    <span className="text-lg text-muted-foreground line-through">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                    <Badge className="bg-orange-500 hover:bg-orange-600 border-none font-bold text-white text-xs py-1 px-2.5 rounded-md uppercase tracking-wider">
                      Save {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                    </Badge>
                  </>
                )}
              </div>

              <hr className="border-border/80" />

              {/* What's Included Section */}
              {isKit && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    What's Included
                  </h4>
                  
                  {/* 2-Column Checklist */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs md:text-sm text-foreground/80">
                    <div className="space-y-3">
                      {column1Items.map((item, index) => (
                        <div key={index} className="flex items-start gap-2.5">
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span className="leading-tight">{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      {column2Items.map((item, index) => (
                        <div key={index} className="flex items-start gap-2.5">
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span className="leading-tight">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <ClientOnly>
                <div className="flex flex-row gap-4 w-full pt-4">
                  <Button
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                    className="flex-1 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white font-semibold rounded-lg py-3 px-6 h-12 flex items-center justify-center gap-2 transition-colors duration-200"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span>Add to Cart</span>
                  </Button>
                  
                  {!isOutOfStock && (
                    <Button
                      onClick={handleBuyNow}
                      className="flex-1 bg-[#ff6c00] hover:bg-[#e05f00] text-white font-semibold rounded-lg py-3 px-6 h-12 flex items-center justify-center gap-2 transition-colors duration-200"
                    >
                      <span>Buy Now</span>
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  )}
                </div>
                
                {isOutOfStock && (
                  <p className="text-sm text-destructive font-semibold text-center mt-2">
                    Out of Stock
                  </p>
                )}
              </ClientOnly>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default FlagshipProductSection;
