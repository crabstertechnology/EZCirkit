
'use client';

import { useState, useEffect } from 'react';

export function useScroll() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    // This effect runs only on the client
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      const currentScrollY = window.scrollY;
      setScrolled(isScrolled);
      setScrollY(currentScrollY);
    };

    // Set initial state on mount
    handleScroll();

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return { scrolled, scrollY };
}
