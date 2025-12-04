
'use client';

import type { Metadata } from 'next';
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

// export const metadata: Metadata = {
//   title: 'crabster E-Commerce',
//   description: 'Learn Electronics Made Easy with crabster',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');

  return (
    <html lang="en" className="!scroll-smooth">
      <head>
        <title>EZCirkit-Crabster Technology</title>
        <meta name="description" content="Learn Electronics Made Easy with crabster" />
      </head>
      <body className={cn('font-body antialiased')}>
        <Script src="https://checkout.razorpay.com/v1/checkout.js"></Script>
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
