
'use client';

import React from 'react';
import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Minus, Plus, Truck, PackageX } from 'lucide-react';
import { placeholderImages } from '@/lib/placeholder-images';
import { PRODUCT_FEATURES } from '@/lib/constants';
import { useCart } from '@/context/cart-context';
import type { Product as CartProduct } from '@/context/cart-context';
import ClientOnly from '../shared/client-only';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit, where } from 'firebase/firestore';
import type { Review } from './testimonials';
import StarRating from '../shared/star-rating';
import { Skeleton } from '../ui/skeleton';

interface Product {
  id: string; 
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  description: string;
  stock: number;
}

interface ProductShowcaseProps {
  reviews: Review[] | null;
  averageRating: number;
  reviewCount: number;
  isLoadingReviews: boolean;
}

const PRODUCT_ID = 'pro1';

const ProductShowcase: React.FC<ProductShowcaseProps> = ({ reviews, averageRating, reviewCount, isLoadingReviews }) => {
  const { addToCart, decrementItem, cartItems } = useCart();
  const firestore = useFirestore();

  const productsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'products'), where('id', '==', PRODUCT_ID), limit(1)) : null),
    [firestore]
  );
  const { data: products, isLoading: isLoadingProduct } = useCollection<Product>(productsQuery);
  let product = products?.[0];

  
  const logicalProductId = product?.id;
  
  const productImages = [
    {
      id: 'product-slide-1',
      description: 'EZCirkit box and components.',
      imageUrl: product?.image || '/1.jpg', // Use product image from DB
      imageHint: 'product box'
    },
     {
      id: 'product-slide-2',
      description: 'Close-up of various electronic components from the kit.',
      imageUrl: '/2.jpg',
      imageHint: 'electronic components'
    },
  ].filter(Boolean) as typeof placeholderImages;
  
  const handleAddToCart = () => {
    if (!product || product.stock <= 0) return;
    addToCart(product);
  };
  
  const handleDecrement = () => {
    if (!logicalProductId) return;
    decrementItem(logicalProductId);
  }

  const productInCart = logicalProductId ? cartItems.find(item => item.id === logicalProductId) : undefined;
  const quantity = productInCart?.quantity ?? 0;
  const isOutOfStock = product?.stock === 0;
  const canAddToCart = product ? quantity < product.stock : false;

  const isLoading = isLoadingProduct;

  if (isLoading) {
    return (
      <section id="products" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center">Loading product...</div>
        </div>
      </section>
    );
  }

  if (!product) {
    return (
      <section id="products" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center text-red-500">Product not found. Please add it in the admin panel with id 'pro1'.</div>
        </div>
      </section>
    );
  }

  return (
    <section id="products" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left Column: Image Carousel */}
          <div className="relative">
            <Carousel className="w-full">
              <CarouselContent>
                {productImages.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="aspect-w-4 aspect-h-3">
                      <Image
                        src={image.imageUrl}
                        alt={image.description}
                        width={800}
                        height={600}
                        data-ai-hint={image.imageHint}
                        className="w-full h-full object-cover rounded-xl shadow-lg"
                      />
                    </div>
                  </CarouselItem>
                ))}
                <CarouselItem>
                   <div className="aspect-w-4 aspect-h-3">
                      <video controls className="w-full h-full object-cover rounded-xl shadow-lg">
                        <source src="/CT003.mp4" type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                   </div>
                </CarouselItem>
              </CarouselContent>
              <CarouselPrevious className="left-4" />
              <CarouselNext className="right-4" />
            </Carousel>
            <Badge className="absolute top-4 left-4 py-1.5 px-3 text-base font-bold bg-[hsl(var(--color-green))] text-white border-none">
              Save 50%
            </Badge>
             {isOutOfStock && (
              <Badge variant="destructive" className="absolute top-4 right-4 py-1.5 px-3 text-base font-bold border-none">
                Out of Stock
              </Badge>
            )}
          </div>

          {/* Right Column: Product Info */}
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-extrabold font-headline">
              {product.name}
            </h2>
            
             {isLoadingReviews ? (
                <Skeleton className="h-6 w-48" />
             ) : (
                reviewCount > 0 && (
                  <div className="flex items-center gap-2">
                    <StarRating rating={averageRating} />
                    <span className="text-muted-foreground text-sm">
                      ({averageRating.toFixed(1)} from {reviewCount} reviews)
                    </span>
                  </div>
                )
             )}

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-primary">₹{product.price}</span>
              {product.originalPrice && <span className="text-xl text-foreground/50 line-through">
                ₹{product.originalPrice}
              </span>}
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {PRODUCT_FEATURES.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[hsl(var(--color-green))]" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <ClientOnly>
               <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <p className="font-semibold">Quantity:</p>
                  <div className="flex items-center border rounded-md">
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={handleDecrement} disabled={quantity === 0}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-10 text-center font-bold">{quantity}</span>
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={handleAddToCart} disabled={!canAddToCart || isOutOfStock}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-4">
                    <Button
                      size="lg"
                      className="flex-1 relative overflow-hidden bg-primary-gradient text-lg font-bold text-primary-foreground shadow-lg transition-transform duration-300 hover:scale-105"
                      onClick={handleAddToCart}
                      disabled={!canAddToCart || isOutOfStock}
                    >
                      {isOutOfStock ? <PackageX className="mr-2 h-5 w-5" /> : null}
                      {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                    </Button>
                </div>
                 {!isOutOfStock && product.stock > 0 && product.stock <= 10 && (
                  <p className="text-sm text-destructive font-medium">
                    Only {product.stock - quantity} left in stock! Order soon.
                  </p>
                )}
               </div>
            </ClientOnly>

            <div className="bg-secondary p-4 rounded-lg flex items-center gap-4">
              <Truck className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold">Free & Fast Shipping</p>
                <p className="text-sm text-foreground/70">
                  Get your kit in 3-5 business days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductShowcase;
