'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Download, ArrowRight } from 'lucide-react';

const BrochureSection = () => {
  return (
    <section id="brochure" className="py-16 md:py-24 bg-background overflow-hidden border-t">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column: Visual Preview */}
          <div className="relative">
            <div className="absolute -top-10 -left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
            <Card className="relative z-10 border-8 border-secondary rounded-2xl shadow-2xl overflow-hidden transform hover:scale-[1.02] transition-transform duration-500">
              <CardContent className="p-0">
                <Image
                  src="/brochure-1.jpg"
                  alt="EZCirkit Product Brochure Cover"
                  width={800}
                  height={1100}
                  className="w-full h-auto"
                />
              </CardContent>
            </Card>
            <div className="absolute -bottom-6 -right-6 bg-primary-gradient text-white p-6 rounded-xl shadow-xl hidden md:block">
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
              <p className="text-lg text-foreground/70 leading-relaxed">
                Download our detailed 4-page brochure to explore every component, circuit diagram, and project roadmap included in the EZCirkit Educational Starter Kit. 
              </p>
            </div>

            <ul className="space-y-4">
              {[
                'Complete Hardware Specifications',
                'Curriculum & Multi-Level Projects',
                'Learning Outcomes for Students',
                'Bonus: Quick-Start Circuit Guide'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>

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
