import type { Metadata, Viewport } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import ClientLayout from '@/components/layout/client-layout';

export const viewport: Viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'EZCirkit – Learn Electronics Made Easy | Crabster Technology',
    template: '%s | EZCirkit'
  },
  description: 'Learn electronics and programming easily with the EZCirkit STEM kit. Real-time simulation, step-by-step interactive experiments, and video tutorials by Crabster Technology.',
  keywords: [
    'EZCirkit', 
    'Crabster Technology', 
    'Learn Electronics', 
    'STEM Kit', 
    'Arduino Starter Kit', 
    'Electronics experiments', 
    'Robotics for students', 
    'Arduino simulator', 
    'Online Code Compiler',
    'Arduino Web IDE',
    'Learn Coding',
    'DIY Electronics'
  ],
  authors: [{ name: 'Crabster Technology', url: 'https://crabster.in' }],
  creator: 'Crabster Technology',
  publisher: 'Crabster Technology',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://ezcirkit.crabster.in'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'EZCirkit – Learn Electronics Made Easy | Crabster Technology',
    description: 'Learn electronics easily with hands-on STEM kits, Arduino projects and interactive tutorials.',
    url: 'https://ezcirkit.crabster.in',
    siteName: 'EZCirkit',
    images: [
      {
        url: '/new-kit-front.png',
        width: 1200,
        height: 630,
        alt: 'EZCirkit STEM Starter Kit',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EZCirkit – Learn Electronics Made Easy | Crabster Technology',
    description: 'Learn electronics easily with hands-on STEM kits, Arduino projects and interactive tutorials.',
    images: ['/new-kit-front.png'],
    creator: '@crabstertech',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="!scroll-smooth" suppressHydrationWarning>
      <head>
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
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
