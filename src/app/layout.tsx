
'use client';

import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import ScrollToTop from '@/components/shared/scroll-to-top';
import { CartProvider } from '@/context/cart-context';
import Script from 'next/script';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { usePathname } from 'next/navigation';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');

  return (
    <html lang="en" className="!scroll-smooth" suppressHydrationWarning>
      <head>
        <title>EZCirkit – Learn Electronics Made Easy | Crabster Technology</title>
        <meta name="description" content="Learn Electronics Made Easy with hands-on STEM kits, Arduino projects and step-by-step video tutorials by Crabster Technology." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* DNS Prefetch & Preconnect for critical third-party origins */}
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="preconnect" href="https://storage.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <link rel="dns-prefetch" href="https://img.youtube.com" />
        <link rel="dns-prefetch" href="https://checkout.razorpay.com" />

        {/* Optimised Google Font load – display=swap prevents FOIT */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
        />
      </head>
      <body className={cn('font-body antialiased')} suppressHydrationWarning>
        {/* Razorpay loaded lazily – only when browser is idle, non-blocking */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
        <FirebaseClientProvider>
          <CartProvider>
            {!isAdminPage && <Header />}
            <main className="min-h-screen">{children}</main>
            {!isAdminPage && <Footer />}
            <Toaster />
            <ScrollToTop />
          </CartProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
