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
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-background pt-28 pb-16 md:pt-40 md:pb-24 bg-grid-pattern"
    >
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          {/* Left Column: Text Content */}
          <div className="space-y-8 lg:col-span-7 text-left">
            {/* Dot label */}
            <div className="flex items-center gap-2 text-xs md:text-sm font-bold uppercase tracking-widest text-primary">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              <span>STEM Kits • Arduino • Robotics</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight font-headline text-foreground leading-tight">
              Learn Electronics by <br />
              <span className="text-primary bg-primary-gradient bg-clip-text text-transparent">
                Building Real Projects
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
                <Link href="/projects">Explore Projects</Link>
              </Button>
            </div>

            {/* Stats under the buttons */}
            <div className="pt-6 grid grid-cols-3 gap-6 max-w-md border-t border-border/60">
              <div>
                <p className="text-2xl md:text-3xl font-black text-foreground">10k+</p>
                <p className="text-[10px] md:text-xs font-bold text-muted-foreground tracking-widest uppercase mt-0.5">Learners</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-black text-foreground">20+</p>
                <p className="text-[10px] md:text-xs font-bold text-muted-foreground tracking-widest uppercase mt-0.5">Projects</p>
              </div>
              <div>
                <div className="flex items-baseline gap-0.5">
                  <p className="text-2xl md:text-3xl font-black text-foreground">
                    {isLoading ? '4.9' : averageRating > 0 ? averageRating.toFixed(1) : '4.9'}
                  </p>
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400 shrink-0 self-center ml-0.5" />
                </div>
                <p className="text-[10px] md:text-xs font-bold text-muted-foreground tracking-widest uppercase mt-0.5">Rating</p>
              </div>
            </div>
          </div>

          {/* Right Column: Image with Floating badges (previous style) */}
          <div className="relative lg:col-span-5 flex justify-center items-center">
            <div className="animate-float">
              <Image
                src="/new-kit-front.png"
                alt="EZCirkit Starter Kit board"
                width={600}
                height={500}
                priority
                className="rounded-2xl shadow-2xl"
              />
            </div>
            <div className="absolute -top-4 left-4 animate-float-delay-1 z-20">
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 py-1 px-3 text-sm font-semibold shadow-sm">
                35+ Components
              </Badge>
            </div>
            <div className="absolute -bottom-4 right-4 animate-float-delay-2 z-20">
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 py-1 px-3 text-sm font-semibold shadow-sm">
                45+ Projects
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
