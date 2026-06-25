
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const Logo = ({ isFooter = false, size = 'md' }: { isFooter?: boolean; size?: 'sm' | 'md' | 'lg' }) => {
  const isLg = size === 'lg';
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-black tracking-tight", isLg ? "text-2xl" : "text-xl")}>
      <Image
        src="/logo.png"
        alt="Crabster Logo"
        width={isLg ? 36 : 28}
        height={isLg ? 36 : 28}
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
