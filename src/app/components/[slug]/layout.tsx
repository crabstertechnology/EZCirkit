import type { Metadata } from 'next';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { resolveSeoSlug, slugify } from '@/lib/seo-mappings';

// ── Firebase Admin initialisation (server-only) ──────────────────────────────
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

// ── Dynamic Metadata Generation ───────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const baseUrl = 'https://shop.crabstertech.in';
  const { slug } = await params;

  try {
    const db = getAdminFirestore();

    // 1. Resolve slug to target value
    let { type, value } = resolveSeoSlug(slug);

    // 2. If static lookup failed, search database products dynamically by slugified name
    if (!type) {
      const productsSnap = await db.collection('products').get();
      const matchedProduct = productsSnap.docs.find(doc => slugify(doc.data().name || '') === slug.toLowerCase());
      if (matchedProduct) {
        type = 'component';
        value = matchedProduct.id;
      } else {
        // Check categories dynamically
        const matchedCategory = productsSnap.docs.find(doc => {
          const cat = doc.data().category;
          return cat && slugify(cat) === slug.toLowerCase();
        });
        if (matchedCategory) {
          type = 'category';
          value = matchedCategory.data().category;
        }
      }
    }

    // 3. Generate Metadata based on Type
    if (type === 'category') {
      const categoryName = value;
      const seoTitle = `${categoryName} Components | Crabster Technology`;
      const seoDesc = `Shop quality ${categoryName.toLowerCase()} electronic components and modules at Crabster Technology. Verified specifications, project ideas and fast shipping across India.`;
      const canonicalUrl = `${baseUrl}/components/${slug.toLowerCase()}`;

      return {
        title: seoTitle,
        description: seoDesc,
        keywords: [
          categoryName,
          `${categoryName} components`,
          `buy ${categoryName} online`,
          'Crabster Technology',
          'electronic components India',
          'STEM learning kit',
        ],
        alternates: {
          canonical: canonicalUrl,
        },
        openGraph: {
          title: seoTitle,
          description: seoDesc,
          url: canonicalUrl,
          siteName: 'Crabster Technology',
          locale: 'en_IN',
          type: 'website',
        },
        twitter: {
          card: 'summary_large_image',
          title: seoTitle,
          description: seoDesc,
          creator: '@crabstertech',
        },
      };
    }

    if (type === 'component') {
      const productId = value;
      const docSnap = await db.collection('products').doc(productId).get();

      if (!docSnap.exists) {
        return {
          title: 'Component Not Found | Crabster Technology',
          description: 'The electronic component you are looking for is not available.',
        };
      }

      const p = docSnap.data() as any;
      const productName: string = p.name || 'Electronic Component';
      const category: string = p.category || 'Electronic Components';
      const price: number = p.price || 0;

      // Unique title: "[Component Name] | Electronic Component | Crabster Technology"
      const seoTitle = p.metaTitle || `${productName} | Electronic Component | Crabster Technology`;

      // Unique meta description containing name, purpose, brand, and purchase intent
      const seoDesc =
        p.metaDescription ||
        `Buy the ${productName} electronic component from Crabster Technology. Explore specifications, wiring diagrams, applications and Arduino projects for ₹${price.toLocaleString('en-IN')}.`;

      const canonicalUrl = `${baseUrl}/components/${slug.toLowerCase()}`;
      const imageUrl: string = p.image?.startsWith('http') ? p.image : `${baseUrl}${p.image || '/logo.png'}`;

      return {
        title: seoTitle,
        description: seoDesc,
        keywords: [
          productName,
          `Buy ${productName}`,
          `${productName} price`,
          `${productName} specifications`,
          `${productName} supplier India`,
          `${category} India`,
          'Crabster Technology',
          'EZCirkit',
          'electronic components India',
        ],
        alternates: {
          canonical: canonicalUrl,
        },
        openGraph: {
          title: seoTitle,
          description: seoDesc,
          url: canonicalUrl,
          siteName: 'Crabster Technology',
          images: [
            {
              url: imageUrl,
              width: 800,
              height: 800,
              alt: `${productName} | Electronic Component | Crabster Technology`,
            },
          ],
          locale: 'en_IN',
          type: 'website',
        },
        twitter: {
          card: 'summary_large_image',
          title: seoTitle,
          description: seoDesc,
          images: [imageUrl],
          creator: '@crabstertech',
        },
      };
    }

    // Default Fallback
    return {
      title: 'Electronic Components & Modules | Crabster Technology',
      description: 'Shop quality microcontrollers, sensor modules, LEDs, displays, power drivers and resistors at Crabster Technology. Coding guides and fast delivery across India.',
    };

  } catch (err) {
    console.error('[SEO] generateMetadata error for component slug', err);
    return {
      title: 'Electronic Components | Crabster Technology',
      description: 'Buy quality electronic components, sensors, and development boards from Crabster Technology. Fast shipping across India.',
    };
  }
}

// ── Pass-through layout wrapper ───────────────────────────────────────────────
export default function ComponentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
