'use client';

import React from 'react';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import ScrollToTop from '@/components/shared/scroll-to-top';
import { Toaster } from '@/components/ui/toaster';
import { CartProvider } from '@/context/cart-context';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');

  return (
    <FirebaseClientProvider>
      <CartProvider>
        {/* Razorpay loaded lazily – only when browser is idle, non-blocking */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
        {!isAdminPage && <Header />}
        <main className="min-h-screen">{children}</main>
        {!isAdminPage && <Footer />}
        <Toaster />
        <ScrollToTop />
      </CartProvider>
    </FirebaseClientProvider>
  );
}
