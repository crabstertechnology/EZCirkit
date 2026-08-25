import { MetadataRoute } from 'next';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { CATEGORY_SLUGS, COMPONENT_ID_TO_SLUG, slugify } from '@/lib/seo-mappings';

function getAdminFirestore() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getFirestore();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://shop.crabstertech.in';
  
  // Format date as YYYY-MM-DD for standard W3C datetime compliance
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const now = formatDate(new Date());

  // 1. Static Core Routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/components`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/tutorials`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/ide`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact-us`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms-and-conditions`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/shipping-and-delivery`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/cancellation-and-refund`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  // 2. Component Category Routes
  const categoryRoutes: MetadataRoute.Sitemap = Object.keys(CATEGORY_SLUGS).map((slug) => ({
    url: `${baseUrl}/components/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  // 3. Dynamic Component & Product Pages
  let componentRoutes: MetadataRoute.Sitemap = [];
  let tutorialRoutes: MetadataRoute.Sitemap = [];

  try {
    const db = getAdminFirestore();

    // Fetch Products
    const productsSnap = await db.collection('products').get();
    componentRoutes = productsSnap.docs.map((doc) => {
      const updateTime = doc.updateTime?.toDate();
      const p = doc.data();
      const cleanSlug = COMPONENT_ID_TO_SLUG[doc.id] || slugify(p.name || doc.id);
      return {
        url: `${baseUrl}/components/${cleanSlug}`,
        lastModified: updateTime ? formatDate(updateTime) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.9,
      };
    });

    // Fetch Tutorials
    const tutsSnap = await db.collectionGroup('tutorials').get();
    tutorialRoutes = tutsSnap.docs.map((doc) => {
      const updateTime = doc.updateTime?.toDate();
      return {
        url: `${baseUrl}/tutorials/${doc.id}`,
        lastModified: updateTime ? formatDate(updateTime) : now,
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      };
    });

  } catch (err) {
    console.error('[Sitemap] Failed to fetch dynamic routes from Firestore:', err);
  }

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...componentRoutes,
    ...tutorialRoutes,
  ];
}
