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
    default: 'Electronics Components, Learning Kits & Projects | Crabster Technology',
    template: '%s | Crabster Technology'
  },
  description: 'Learn electronics and programming easily with the EZCirkit STEM kit. Real-time simulation, step-by-step interactive experiments, and video tutorials by Crabster Technology.',
  keywords: [
    'EZCirkit',
    'Crabster Technology',
    'buy electronic components India',
    'electronic components online India',
    'Arduino starter kit India',
    'electronics components distributor India',
    'sensors for Arduino',
    'ESP32 development board India',
    'STEM kit India',
    'Learn Electronics',
    'Arduino tutorial India',
    'robotics kit for students',
    'buy sensors online India',
    'Arduino components price India',
    'electronics supplier India',
    'DIY electronics India',
    'microcontroller board India',
    'online electronics store India',
    'COD electronics India',
    'Arduino Uno India',
  ],
  authors: [{ name: 'Crabster Technology', url: 'https://crabster.in' }],
  creator: 'Crabster Technology',
  publisher: 'Crabster Technology',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://shop.crabstertech.in'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'EZCirkit – Learn Electronics Made Easy | Crabster Technology',
    description: 'Learn electronics easily with hands-on STEM kits, Arduino projects and interactive tutorials.',
    url: 'https://shop.crabstertech.in',
    siteName: 'EZCirkit',
    images: [
      {
        url: '/kit/new-kit-front.png',
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
    images: ['/kit/new-kit-front.png'],
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
        {/* Organisation schema for E-E-A-T / Knowledge Panel */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'OnlineStore',
              name: 'Crabster Technology',
              alternateName: ['Crabster Technology Electronics', 'Crabster Technology Electronics Components', 'EZCirkit'],
              url: 'https://shop.crabstertech.in',
              logo: 'https://shop.crabstertech.in/logo.png',
              description:
                'Crabster Technology is an online store for electronic components, sensors, development boards, Arduino kits, and STEM learning kits in India. Buy online with fast delivery and Cash on Delivery.',
              foundingDate: '2023',
              areaServed: { '@type': 'Country', name: 'India' },
              contactPoint: {
                '@type': 'ContactPoint',
                telephone: '+91-7010396642',
                contactType: 'customer service',
                areaServed: 'IN',
                availableLanguage: ['English', 'Tamil', 'Hindi'],
              },
              sameAs: ['https://crabster.in'],
              address: {
                '@type': 'PostalAddress',
                addressCountry: 'IN',
              },
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate:
                    'https://shop.crabstertech.in/products?search={search_term_string}',
                },
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
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
