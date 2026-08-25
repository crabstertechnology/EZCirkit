import type { Metadata } from 'next';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { COMPONENT_ID_TO_SLUG } from '@/lib/seo-mappings';

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
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const baseUrl = 'https://shop.crabstertech.in';

  try {
    const { id } = await params;
    const db = getAdminFirestore();
    const docSnap = await db.collection('products').doc(id).get();

    if (!docSnap.exists) {
      return {
        title: 'Product Not Found',
        description: 'The product you are looking for is not available.',
      };
    }

    const p = docSnap.data() as any;
    const productName: string = p.name || 'Electronic Component';
    const category: string = p.category || 'Electronic Components';
    const brand: string = p.brand || 'EZCirkit';
    const price: number = p.price || 0;
    const sku: string = p.sku || id;

    // Use admin-provided SEO title / description if set, else auto-generate
    const seoTitle: string =
      p.metaTitle ||
      `${productName} – Buy Online at Best Price | EZCirkit`; // ≤ 60 chars target

    const seoDesc: string =
      p.metaDescription ||
      `Buy ${productName} online at ₹${price.toLocaleString('en-IN')}. ${category} from EZCirkit by Crabster Technology. Fast shipping across India. Cash on Delivery available.`; // 140–160 chars

    const cleanSlug = COMPONENT_ID_TO_SLUG[id];
    const canonicalUrl = cleanSlug ? `${baseUrl}/components/${cleanSlug}` : `${baseUrl}/products/${id}`;
    const imageUrl: string =
      p.image?.startsWith('http') ? p.image : `${baseUrl}${p.image || '/logo.png'}`;

    return {
      title: seoTitle,
      description: seoDesc,
      keywords: [
        productName,
        `Buy ${productName}`,
        `${productName} price`,
        `${productName} datasheet`,
        `${productName} specifications`,
        `${productName} supplier India`,
        `${productName} online`,
        `${category} India`,
        brand,
        'EZCirkit',
        'Crabster Technology',
        'electronic components India',
        'buy electronics online India',
        sku,
      ],
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: seoTitle,
        description: seoDesc,
        url: canonicalUrl,
        siteName: 'EZCirkit',
        images: [
          {
            url: imageUrl,
            width: 800,
            height: 800,
            alt: `${productName} – ${category} | EZCirkit`,
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
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
    };
  } catch (err) {
    // Graceful fallback — never break the build
    console.error('[SEO] generateMetadata error for product', err);
    return {
      title: 'Electronic Component | EZCirkit',
      description:
        'Buy quality electronic components, sensors, and development boards from EZCirkit by Crabster Technology. Fast shipping across India.',
    };
  }
}

// ── Pass-through layout wrapper ───────────────────────────────────────────────
export default function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  return <>{children}</>;
}
