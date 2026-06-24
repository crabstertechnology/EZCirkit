'use client';
import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

const brochureImages = [
  { src: '/brochure-1.jpg', alt: 'EZCirkit Product Blueprint - Page 1' },
  { src: '/brochure-2.jpg', alt: 'EZCirkit Product Blueprint - Page 2' },
  { src: '/brochure-3.jpg', alt: 'EZCirkit Product Blueprint - Page 3' },
  { src: '/brochure-4.jpg', alt: 'EZCirkit Product Blueprint - Page 4' },
];

const BrochureSection = () => {
  return (
    <section id="brochure" className="py-16 md:py-24 bg-background overflow-hidden border-t">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column: Visual Preview Carousel */}
          <div className="relative">
            <div className="absolute -top-10 -left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
            <Carousel className="w-full relative z-10 max-w-lg mx-auto">
              <CarouselContent>
                {brochureImages.map((image, index) => (
                  <CarouselItem key={index}>
                    <Card className="border-8 border-secondary rounded-2xl shadow-2xl overflow-hidden transform hover:scale-[1.01] transition-transform duration-500">
                      <CardContent className="p-0">
                        <Image
                          src={image.src}
                          alt={image.alt}
                          width={800}
                          height={1100}
                          className="w-full h-auto object-contain"
                          priority={index === 0}
                        />
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-4 bg-background/80 hover:bg-background border-border text-foreground transition-all duration-200" />
              <CarouselNext className="right-4 bg-background/80 hover:bg-background border-border text-foreground transition-all duration-200" />
            </Carousel>
            <div className="absolute -bottom-6 -right-6 bg-primary-gradient text-white p-6 rounded-xl shadow-xl z-20 hidden md:block">
              <p className="text-2xl font-bold">4 Pages</p>
              <p className="text-sm opacity-90">In-Depth Details</p>
            </div>
          </div>

          {/* Right Column: Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-extrabold font-headline leading-tight">
                Get the Full <br />
                <span className="text-gradient bg-primary-gradient">Product Blueprint</span>
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" className="bg-primary-gradient shadow-lg" asChild>
                <a href="/brochure.pdf" target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-5 w-5" /> Download PDF
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#products">Check Pricing</a>
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground italic">
              * Recommended for educators and inquisitive learners.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrochureSection;

