import type { Metadata } from 'next';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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
  params: Promise<{ tutorialId: string }>;
}): Promise<Metadata> {
  const baseUrl = 'https://shop.crabstertech.in';
  const { tutorialId } = await params;

  try {
    const db = getAdminFirestore();
    
    // Query tutorial by id from collection group
    const tutsSnap = await db.collectionGroup('tutorials').where('id', '==', tutorialId).get();

    if (tutsSnap.empty) {
      return {
        title: 'Tutorial Lesson Not Found | Crabster Technology',
        description: 'The educational electronics lesson you are looking for is not available.',
      };
    }

    const tutDoc = tutsSnap.docs[0];
    const tut = tutDoc.data();
    const title = tut.title || 'Electronics Project';
    const description = tut.description || 'Step-by-step electronics and programming tutorial.';
    const level = tut.level || 'Beginner';

    const seoTitle = `${title} | Electronics Project Tutorial | Crabster Technology`;
    const seoDesc = `Build the ${title} project using EZCirkit. Detailed step-by-step ${level.toLowerCase()} lesson guide complete with wiring board diagrams, pinout configurations, video instructions and copyable Arduino code.`;
    const canonicalUrl = `${baseUrl}/tutorials/${tutorialId}`;

    return {
      title: seoTitle,
      description: seoDesc,
      keywords: [
        title,
        `${title} project`,
        `${title} arduino code`,
        `${title} wiring diagram`,
        'electronics tutorial',
        'arduino programming',
        'EZCirkit',
        'Crabster Technology',
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
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title: seoTitle,
        description: seoDesc,
        creator: '@crabstertech',
      },
    };
  } catch (err) {
    console.error('[SEO] generateMetadata error for tutorial', err);
    return {
      title: 'Electronics Project Tutorial | Crabster Technology',
      description: 'Learn Arduino programming and electrical prototyping with guided STEM lessons by Crabster Technology.',
    };
  }
}

// ── Pass-through layout wrapper ───────────────────────────────────────────────
export default function TutorialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
