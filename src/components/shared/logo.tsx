
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const Logo = ({ isFooter = false, size = 'md' }: { isFooter?: boolean; size?: 'sm' | 'md' | 'lg' }) => {
  const isLg = size === 'lg';
  const isSm = size === 'sm';
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center font-black tracking-tight shrink-0 select-none",
        isLg ? "text-2xl gap-2" : isSm ? "text-lg gap-1.5" : "text-xl gap-2"
      )}
    >
      <Image
        src="/logo.png"
        alt="Crabster Logo"
        width={isLg ? 36 : isSm ? 24 : 28}
        height={isLg ? 36 : isSm ? 24 : 28}
        className={cn(isFooter ? 'brightness-0 invert' : '')}
      />
      <span
        className={cn(
          isFooter ? 'text-white' : 'text-gradient bg-primary-gradient'
        )}
      >
        Crabster
      </span>
    </Link>
  );
};

export default Logo;
