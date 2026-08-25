'use client';

import React, { useState } from 'react';
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
import { collection, query } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import ClientOnly from '../shared/client-only';
import { Button } from '@/components/ui/button';

const FlagshipProductSection = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const { addToCart, cartItems } = useCart();
  const firestore = useFirestore();
  const router = useRouter();

  const productsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'products')) : null),
    [firestore]
  );
  const { data: products, isLoading } = useCollection<any>(productsQuery);

  const product = React.useMemo(() => {
    if (!products || products.length === 0) return null;
    return (
      products.find((p: any) => p.category?.toLowerCase() === 'ezcirkit') ||
      products.find((p: any) => p.id === 'pro1') ||
      products.find((p: any) => p.name?.toLowerCase().includes('ezcirkit')) ||
      null
    );
  }, [products]);

  const reviewsQuery = useMemoFirebase(
    () =>
      firestore && product
        ? query(collection(firestore, 'products', product.id || 'pro1', 'reviews'))
        : null,
    [firestore, product]
  );
  const { data: reviews } = useCollection<any>(reviewsQuery);

  const averageRating = React.useMemo(() => {
    if (!reviews || reviews.length === 0) return null;
    const total = reviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0);
    return Number((total / reviews.length).toFixed(1));
  }, [reviews]);

  // Real count from Firestore — 0 when no reviews, never hardcoded
  const reviewsCount = reviews?.length ?? 0;

  const handleAddToCart = async () => {
    if (product) {
      await addToCart(product);
      router.push('/cart');
    }
  };

  const handleBuyNow = () => {
    if (product) {
      const productInCart = cartItems.find((item: any) => item.id === product.id);
      if (!productInCart) {
        addToCart(product);
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
    // Guard: treat empty string same as missing
    const primaryImg = product.image && product.image.trim() !== '' ? product.image : '/kit/new-kit-front.png';
    if (isKit) {
      return [
        { src: primaryImg, alt: 'Front View' },
        { src: '/kit/kit-inside.png', alt: 'Inside View' },
        { src: '/kit/kit-back.png', alt: 'Back View' },
      ];
    }
    return [
      { src: primaryImg, alt: product.name },
    ];
  }, [product, isKit]);

  React.useEffect(() => {
    if (!api) return;
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
    'Digital Multimeter',
    '830-point Breadboard',
    'Instruction Booklet & Project Guide',
  ];

  const column2Items = [
    'DHT11 Temperature & Humidity Sensor',
    'Resistor Pack (100+ pieces)',
    'Soil Moisture Sensor',
    'Mini Submersible Water Pump',
    '4 x Push Buttons',
    '65 x Jumper Wires (M-M, M-F, F-F)',
    'USB-B Cable',
  ];

  if (isLoading) return null;
  if (!product) return null;

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": product.image || "/kit/new-kit-front.png",
    "description": product.description || "EZCirkit STEM Starter Kit for learning electronics.",
    "brand": { "@type": "Brand", "name": "EZCirkit" },
    "offers": {
      "@type": "Offer",
      "url": "https://ezcirkit.crabster.in",
      "priceCurrency": "INR",
      "price": product.price,
      "itemCondition": "https://schema.org/NewCondition",
      "availability": isOutOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"
    },
    ...(averageRating !== null && reviewsCount > 0 ? {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": averageRating,
        "reviewCount": reviewsCount
      }
    } : {})
  };

  return (
    <section
      id="flagship-product"
      className="bg-white dark:bg-zinc-950 border-t border-b border-border/60"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      {/* Section Header */}
      <div className="text-center pt-10 pb-6 px-4">
        <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-2">
          Flagship Product
        </p>
        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
          {isKit ? 'The EZCirkit Starter Kit' : product.name}
        </h2>
        <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-md mx-auto">
          {isKit
            ? 'The single kit you need to build your first coding experiments.'
            : product.description}
        </p>
      </div>

      {/* Product Card */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-border/70 shadow-lg bg-white dark:bg-zinc-900">

          {/* ── LEFT: Product Image ── */}
          <div className="bg-zinc-50 dark:bg-zinc-800 overflow-hidden flex flex-col justify-center">
            {/* Image grows to fill all available space */}
            <div className="flex-1 relative flex items-center justify-center min-h-[350px]">
              <Carousel setApi={setApi} className="w-full">
                <CarouselContent>
                  {carouselImages.map((img, index) => (
                    <CarouselItem key={index}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.src}
                        alt={img.alt}
                        className="w-full h-auto max-h-[480px] object-contain block mx-auto p-4"
                        loading={index === 0 ? 'eager' : 'lazy'}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/kit/new-kit-front.png';
                        }}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {carouselImages.length > 1 && (
                  <>
                    <CarouselPrevious className="left-3 opacity-70 hover:opacity-100 z-10" />
                    <CarouselNext className="right-3 opacity-70 hover:opacity-100 z-10" />
                  </>
                )}
              </Carousel>

              {/* Slide dots */}
              {isKit && carouselImages.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
                  {carouselImages.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => api?.scrollTo(idx)}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-200",
                        currentSlide === idx
                          ? "bg-primary w-5"
                          : "bg-zinc-300 dark:bg-zinc-600 w-1.5"
                      )}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Trust highlights — fills the empty space below the image */}
            <div className="grid grid-cols-2 gap-px bg-border/40 border-t border-border/40 mt-auto">
              {[
                { icon: '🇮🇳', label: 'Made in India' },
                { icon: '📘', label: 'Free Tutorials' },
                { icon: '🔰', label: 'Beginner Friendly' },
                { icon: '🛠️', label: '30-Day Support' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-zinc-900 text-xs font-semibold text-foreground/70"
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Product Details ── */}
          <div className="flex flex-col justify-between p-6 md:p-8 gap-4">

            {/* Flagship Badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/25 text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                <svg className="w-3 h-3 fill-primary" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 4h16v2l-6 4 2 8H8l2-8-6-4V4z"/>
                </svg>
                Flagship Product
              </span>
            </div>

            {/* Rating — only shown once Firestore data loads */}
            <div className="flex items-center gap-2">
              {averageRating !== null ? (
                <>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => {
                      const ratingValue = i + 1;
                      return (
                        <Star
                          key={i}
                          className={cn(
                            "h-4 w-4",
                            ratingValue <= averageRating
                              ? "fill-amber-400 text-amber-400"
                              : ratingValue - 0.5 <= averageRating
                              ? "fill-amber-400 text-amber-400 opacity-60"
                              : "text-zinc-300"
                          )}
                        />
                      );
                    })}
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {averageRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">• {reviewsCount} {reviewsCount === 1 ? 'review' : 'reviews'}</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {reviews === undefined ? 'Loading reviews…' : 'No reviews yet'}
                </span>
              )}
            </div>

            {/* Product Name */}
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground leading-tight">
                {product.name === 'EZCirkit' ? 'EZCirkit Electronics Learning Kit' : product.name}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {product.description ||
                  "Everything you need to start your electronics journey in one box. Includes Arduino UNO R3, sensors, modules, breadboard, jumper wires and a multimeter. Pair it with our free project tutorials and learn by doing."}
              </p>
            </div>

            {/* Pricing */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-3xl font-black text-foreground">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <>
                  <span className="text-base text-muted-foreground line-through">
                    ₹{product.originalPrice.toLocaleString('en-IN')}
                  </span>
                  <Badge className="bg-orange-500 hover:bg-orange-500 border-none font-bold text-white text-xs px-2.5 py-1 rounded-md uppercase tracking-wide">
                    Save {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                  </Badge>
                </>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border/60" />

            {/* What's Included */}
            {isKit && (
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mb-2.5">
                  What's Included
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div className="space-y-1.5">
                    {column1Items.map((item, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-[1px]" />
                        <span className="text-xs text-foreground/80 leading-snug">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {column2Items.map((item, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-[1px]" />
                        <span className="text-xs text-foreground/80 leading-snug">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CTA Buttons */}
            <ClientOnly>
              <div className="flex gap-3 w-full">
                <Button
                  id="flagship-add-to-cart"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white font-semibold rounded-xl h-12 flex items-center justify-center gap-2 transition-colors duration-200"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>Add to Cart</span>
                </Button>

                {!isOutOfStock && (
                  <Button
                    id="flagship-buy-now"
                    onClick={handleBuyNow}
                    className="flex-1 bg-[#ff6c00] hover:bg-[#e05f00] text-white font-semibold rounded-xl h-12 flex items-center justify-center gap-2 transition-colors duration-200"
                  >
                    <span>Buy Now</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {isOutOfStock && (
                <p className="text-sm text-destructive font-semibold text-center mt-1">
                  Currently Out of Stock
                </p>
              )}
            </ClientOnly>

          </div>
        </div>
      </div>
    </section>
  );
};

export default FlagshipProductSection;
