import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Buy Electronic Components Online India | EZCirkit Shop',
  description:
    'Shop Arduino sensors, ESP32 boards, development kits, PIR sensors, displays and 100+ electronic components online in India. Fast shipping, COD available. Best prices.',
  keywords: [
    'buy electronic components India',
    'Arduino components online India',
    'buy sensors online India',
    'ESP32 development board price India',
    'DHT11 sensor India',
    'PIR motion sensor India',
    'buy Arduino kit India',
    'STEM components India',
    'electronic parts online India',
    'microcontroller India',
    'electronics distributor India',
    'buy electronics COD India',
    'EZCirkit shop',
    'Crabster Technology store',
  ],
  alternates: {
    canonical: 'https://shop.crabstertech.in/products',
  },
  openGraph: {
    title: 'Buy Electronic Components Online India | EZCirkit Shop',
    description:
      'Shop Arduino sensors, ESP32 boards, development kits and 100+ components online in India. Fast shipping and Cash on Delivery.',
    url: 'https://shop.crabstertech.in/products',
    siteName: 'EZCirkit',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: 'https://shop.crabstertech.in/kit/new-kit-front.png',
        width: 1200,
        height: 630,
        alt: 'EZCirkit Electronic Components Store',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Buy Electronic Components Online India | EZCirkit Shop',
    description:
      'Shop Arduino sensors, ESP32 boards, and development kits. COD available. Fast India-wide shipping.',
    images: ['https://shop.crabstertech.in/kit/new-kit-front.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export { default } from './page';
