
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Truck, Star } from 'lucide-react';
import { placeholderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import StarRating from '../shared/star-rating';
import { Skeleton } from '../ui/skeleton';

const TrustBadge = ({
  icon,
  text,
  children,
}: {
  icon?: React.ReactNode;
  text?: string;
  children?: React.ReactNode;
}) => (
  <div className="flex items-center gap-2 text-sm text-foreground/80">
    {icon && (
       <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
        {icon}
      </div>
    )}
    {text && <span>{text}</span>}
    {children}
  </div>
);

const heroImage = placeholderImages.find((p) => p.id === 'hero-image');

interface HeroSectionProps {
  averageRating: number;
  reviewCount: number;
  isLoading: boolean;
}

const HeroSection: React.FC<HeroSectionProps> = ({ averageRating, reviewCount, isLoading }) => {
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-background pt-24 pb-12 md:pt-32 md:pb-20"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 m-auto h-[400px] w-[400px] animate-pulse-bg rounded-full bg-primary/10 blur-3xl"
      ></div>
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
          {/* Left Column: Text Content */}
          <div className="space-y-6 text-center md:text-left">
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl font-headline">
              Learn{' '}
              <span className="text-gradient bg-primary-gradient">
                Electronics
              </span>{' '}
              Made Easy
            </h1>
            <p className="max-w-prose mx-auto md:mx-0 text-lg text-foreground/70">
              Unlock your potential with EZCirkit, the all-in-one electronics
              kit designed to take you from novice to inventor.
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6">
              <TrustBadge
                icon={<ShieldCheck className="h-5 w-5 text-primary" />}
                text="1 Year Warranty"
              />
              <TrustBadge
                icon={<Truck className="h-5 w-5 text-primary" />}
                text="Free Shipping"
              />
               {isLoading && <Skeleton className="h-8 w-36" />}
               {!isLoading && reviewCount > 0 && (
                  <TrustBadge>
                     <StarRating rating={averageRating} starSize={20} />
                     <span className="ml-2 font-semibold">{averageRating.toFixed(1)}/5</span>
                  </TrustBadge>
               )}
            </div>
            <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4 pt-4">
              <Button
                asChild
                size="lg"
                className="relative overflow-hidden rounded-full bg-primary-gradient text-lg font-bold text-primary-foreground shadow-lg transition-transform duration-300 hover:scale-105"
              >
                <Link href="/#products">Buy Now - ₹2,499</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full text-lg font-bold shadow-sm transition-transform duration-300 hover:scale-105"
              >
                <Link href="/tutorials">Learn More</Link>
              </Button>
            </div>
          </div>

          {/* Right Column: Image */}
          <div className="relative">
            <div className="animate-float">
              {heroImage && (
                <Image
                  src={heroImage.imageUrl}
                  alt={heroImage.description}
                  width={600}
                  height={500}
                  priority
                  data-ai-hint={heroImage.imageHint}
                  className="rounded-2xl shadow-2xl"
                />
              )}
            </div>
            <div className="absolute -top-4 -left-4 animate-float-delay-1">
              <Badge className="bg-green-100 text-green-800 border-green-300 py-1 px-3 text-sm font-semibold">
                50+ Components
              </Badge>
            </div>
            <div className="absolute -bottom-4 -right-4 animate-float-delay-2">
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 py-1 px-3 text-sm font-semibold">
                20+ Projects
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
