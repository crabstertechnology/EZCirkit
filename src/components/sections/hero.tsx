'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  averageRating: number;
  reviewCount: number;
  isLoading: boolean;
}

const HeroSection: React.FC<HeroSectionProps> = ({ averageRating, reviewCount, isLoading }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [outgoingSlide, setOutgoingSlide] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const isTransitioningRef = useRef(false);
  const currentSlideRef = useRef(0);
  currentSlideRef.current = currentSlide;

  // Always transition strictly from Right to Left (one continuous direction)
  const triggerRightToLeftTransition = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    const fromSlide = currentSlideRef.current;
    const toSlide = fromSlide === 0 ? 1 : 0;

    setOutgoingSlide(fromSlide);
    setCurrentSlide(toSlide);

    setTimeout(() => {
      setOutgoingSlide(null);
      isTransitioningRef.current = false;
    }, 700);
  }, []);

  // Always automatically change slide every 3 seconds (Right to Left continuous auto-change)
  useEffect(() => {
    const interval = setInterval(() => {
      triggerRightToLeftTransition();
    }, 3000);
    return () => clearInterval(interval);
  }, [triggerRightToLeftTransition]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (Math.abs(distance) > 40) {
      triggerRightToLeftTransition();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  const getSlideClasses = (index: number) => {
    if (outgoingSlide === index) {
      // Exiting to the left (0% -> -100%)
      return 'col-start-1 row-start-1 w-full z-10 animate-hero-slide-out-to-left pointer-events-none';
    }
    if (currentSlide === index && outgoingSlide !== null) {
      // Entering from the right (100% -> 0%)
      return 'col-start-1 row-start-1 w-full z-20 animate-hero-slide-in-right';
    }
    if (currentSlide === index) {
      // Resting active slide in center
      return 'col-start-1 row-start-1 w-full z-10 translate-x-0 opacity-100';
    }
    // Inactive slide waiting off-canvas on the right
    return 'col-start-1 row-start-1 w-full z-0 translate-x-full opacity-0 pointer-events-none hidden';
  };

  const stats = [
    { value: '11', label: 'Tutorials' },
    { value: '20', label: 'Components' },
    { value: '11+', label: 'Projects' },
    { value: isLoading ? '5.0★' : `${averageRating > 0 ? averageRating.toFixed(1) : '5.0'}★`, label: 'Rating' },
  ];

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-background pt-32 pb-0 md:pt-24 flex flex-col justify-between min-h-[calc(100vh-80px)]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main Full-Section Slider Area with CSS Grid for stacked Right-to-Left transitions */}
      <div className="relative z-10 flex-grow flex flex-col justify-center overflow-hidden w-full">
        <div className="grid grid-cols-1 grid-rows-1 w-full overflow-hidden items-center">
          
          {/* SLIDE 1: Whole EZCirkit Section (3 seconds) */}
          <div className={cn(getSlideClasses(0), "flex items-center justify-center py-6 md:py-10 bg-grid-pattern")}>
            <div className="container mx-auto px-4 md:px-6">
              <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 w-full">
                {/* Left Column: Text Content */}
                <div className="space-y-6 lg:space-y-8 lg:col-span-6 text-left">
                  {/* Dot label */}
                  <div className="flex items-center gap-2 text-xs md:text-sm font-bold uppercase tracking-widest text-primary">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                    <span>STEM Kits • Arduino • Robotics</span>
                  </div>

                  {/* Title */}
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight font-headline text-foreground leading-tight">
                    Electronics Components, <br />
                    <span className="text-primary bg-primary-gradient bg-clip-text text-transparent">
                      Learning Kits & Projects
                    </span>
                  </h1>

                  {/* Paragraph */}
                  <p className="max-w-xl text-base md:text-lg text-foreground/75 leading-relaxed">
                    Build, experiment, and understand electronics with EZCirkit by Crabster Technology. Discover individual electronic components, sensors, learning kits, and guided Arduino tutorials designed for students and beginners in India.
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

                {/* Right Column: Original EZCirkit Starter Kit floating card with badges */}
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
                        20 Components
                      </Badge>
                    </div>
                    <div className="absolute -bottom-4 right-6 animate-float-delay-2 z-20">
                      <Badge className="bg-orange-50 text-orange-600 border-orange-200 py-1 px-3 text-sm font-semibold shadow-sm">
                        11+ Projects
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 2: Whole Detach Section (3 seconds) - Image covers whole section, no background showing */}
          <div className={cn(getSlideClasses(1), "flex items-center justify-center relative overflow-hidden bg-[#fdfbf3]")}>
            <Link href="/products" className="relative w-full h-full block">
              <div className="relative w-full aspect-[1672/941] min-h-[460px] sm:min-h-[540px] md:min-h-[600px] lg:min-h-[650px] max-h-[calc(100vh-140px)]">
                <Image
                  src="/images/detach-reconnect.png"
                  alt="Detach – Reconnect With What Matters by Crabster Technology"
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover w-full h-full object-center"
                />
              </div>
            </Link>
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
