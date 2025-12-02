
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const Logo = ({ isFooter = false }: { isFooter?: boolean }) => {
  return (
    <Link href="/" className="flex items-center gap-2 text-xl font-bold">
      <Image
        src="/logo.png"
        alt="Crabster Logo"
        width={28}
        height={28}
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
