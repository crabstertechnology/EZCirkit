'use client';

import React from 'react';

interface FAQ {
  question: string;
  answer: string;
}

interface ProductSchemaProps {
  product: {
    id: string;
    name: string;
    description?: string;
    price: number;
    originalPrice?: number;
    image?: string;
    category?: string;
    brand?: string;
    sku?: string;
    stock?: number;
    faqs?: FAQ[]; // stored as JSON string or array in Firestore
  };
  averageRating: number;
  reviewsCount: number;
}

const BASE_URL = 'https://shop.crabstertech.in';

export default function ProductSchema({
  product,
  averageRating,
  reviewsCount,
}: ProductSchemaProps) {
  const productUrl = `${BASE_URL}/products/${product.id}`;
  const imageUrl = product.image?.startsWith('http')
    ? product.image
    : `${BASE_URL}${product.image || '/logo.png'}`;

  // ── 1. Product Schema ────────────────────────────────────────────────────
  const productSchema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description:
      product.description ||
      `Buy ${product.name} online from EZCirkit. Quality electronic components with fast India-wide shipping.`,
    image: [imageUrl],
    sku: product.sku || product.id,
    mpn: product.sku || product.id,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'EZCirkit',
    },
    category: product.category || 'Electronic Components',
    url: productUrl,
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'INR',
      price: product.price,
      priceValidUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      itemCondition: 'https://schema.org/NewCondition',
      availability:
        (product.stock ?? 1) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'EZCirkit by Crabster Technology',
        url: BASE_URL,
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: 0,
          currency: 'INR',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'IN',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 1,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 2,
            maxValue: 7,
            unitCode: 'DAY',
          },
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'IN',
        returnPolicyCategory:
          'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
    },
  };

  // Only add AggregateRating if there are actual reviews
  if (reviewsCount > 0 && averageRating > 0) {
    productSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: averageRating.toFixed(1),
      bestRating: '5',
      worstRating: '1',
      ratingCount: reviewsCount,
    };
  }

  // ── 2. Breadcrumb Schema ─────────────────────────────────────────────────
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: BASE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Shop',
        item: `${BASE_URL}/products`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.category || 'Electronic Components',
        item: `${BASE_URL}/products?category=${encodeURIComponent(product.category || '')}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: product.name,
        item: productUrl,
      },
    ],
  };

  // ── 3. FAQ Schema ────────────────────────────────────────────────────────
  // Parse faqs — can be stored as JSON string or array in Firestore
  let parsedFaqs: FAQ[] = [];
  if (product.faqs) {
    if (typeof product.faqs === 'string') {
      try {
        parsedFaqs = JSON.parse(product.faqs);
      } catch {}
    } else if (Array.isArray(product.faqs)) {
      parsedFaqs = product.faqs;
    }
  }

  const faqSchema =
    parsedFaqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: parsedFaqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer,
            },
          })),
        }
      : null;

  // ── 4. Organization Schema ───────────────────────────────────────────────
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Crabster Technology',
    alternateName: 'EZCirkit',
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      areaServed: 'IN',
      availableLanguage: ['English', 'Tamil', 'Hindi'],
      telephone: '+91-7010396642',
    },
    sameAs: [
      'https://crabster.in',
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
    </>
  );
}
