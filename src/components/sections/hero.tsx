'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Star } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface HeroSectionProps {
  averageRating: number;
  reviewCount: number;
  isLoading: boolean;
}

const HeroSection: React.FC<HeroSectionProps> = ({ averageRating, reviewCount, isLoading }) => {
  const stats = [
    { value: '50+', label: 'Tutorials' },
    { value: '20+', label: 'Components' },
    { value: '36+', label: 'Projects' },
    { value: isLoading ? '5.0★' : `${averageRating > 0 ? averageRating.toFixed(1) : '5.0'}★`, label: 'Rating' },
  ];

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-background pt-24 pb-0 md:pt-28 bg-grid-pattern flex flex-col justify-between min-h-[calc(100vh-80px)]"
    >
      <div className="container mx-auto px-4 md:px-6 relative z-10 flex-grow flex items-center py-8 md:py-12">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 w-full">
          {/* Left Column: Text Content */}
          <div className="space-y-8 lg:col-span-6 text-left">
            {/* Dot label */}
            <div className="flex items-center gap-2 text-xs md:text-sm font-bold uppercase tracking-widest text-primary">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              <span>STEM Kits • Arduino • Robotics</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight font-headline text-foreground leading-tight">
              Learn Electronics <br />
              <span className="text-primary bg-primary-gradient bg-clip-text text-transparent">
                Made Easy
              </span>
            </h1>

            {/* Paragraph */}
            <p className="max-w-xl text-base md:text-lg text-foreground/75 leading-relaxed">
              Stop learning only theory. Build, experiment, and understand electronics through hands-on projects — at home, at your own pace.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 pt-2">
              <Button
                asChild
                size="lg"
                className="relative overflow-hidden rounded-xl bg-primary text-white shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02] hover:bg-primary/95 text-base font-extrabold px-6 py-6"
              >
                <Link href="/#products" className="flex items-center gap-2">
                  Buy Starter Kit
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-xl border-2 border-border hover:bg-accent text-base font-extrabold px-6 py-6 transition-all duration-300 hover:scale-[1.02]"
              >
                <Link href="/ide">Coding Experiments</Link>
              </Button>
            </div>
          </div>

          {/* Right Column: Image with Floating badges (previous style) */}
          <div className="relative lg:col-span-6 flex justify-center lg:justify-end items-center w-full">
            <div className="relative animate-float max-w-[600px] w-full">
              <Image
                src="/kit/new-kit-front.png"
                alt="EZCirkit Starter Kit board"
                width={600}
                height={500}
                priority
                className="rounded-2xl shadow-2xl w-full h-auto"
              />
              <div className="absolute -top-4 left-6 animate-float-delay-1 z-20">
                <Badge className="bg-orange-50 text-orange-600 border-orange-200 py-1 px-3 text-sm font-semibold shadow-sm">
                  20+ Components
                </Badge>
              </div>
              <div className="absolute -bottom-4 right-6 animate-float-delay-2 z-20">
                <Badge className="bg-orange-50 text-orange-600 border-orange-200 py-1 px-3 text-sm font-semibold shadow-sm">
                  36+ Projects
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar Integrated at the very bottom of Hero */}
      <div className="w-full bg-primary-gradient text-white py-5 mt-auto relative z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((stat, index) => (
              <div key={index}>
                <h3 className="text-2xl md:text-3xl font-black">{stat.value}</h3>
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-90 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
