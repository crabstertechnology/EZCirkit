'use client';

import React from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useScroll } from '@/hooks/use-scroll';

const ScrollToTop = () => {
  const { scrollY } = useScroll();

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Button
      variant="default"
      size="icon"
      className={cn(
        'fixed bottom-4 right-4 h-12 w-12 rounded-full bg-primary-gradient shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl',
        'transform-gpu',
        scrollY > 300 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
      )}
      onClick={handleScrollToTop}
    >
      <ArrowUp className="h-6 w-6 text-white" />
      <span className="sr-only">Scroll to top</span>
    </Button>
  );
};

export default ScrollToTop;
