import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

// Disable Next.js route caching for the XML feed so it's always fresh
export const revalidate = 0;

export async function GET() {
  const baseUrl = 'https://shop.crabstertech.in';

  try {
    const db = getAdminFirestore();
    const productsSnap = await db.collection('products').get();

    let itemsXml = '';

    productsSnap.docs.forEach((doc) => {
      const p = doc.data();
      const id = doc.id;
      const title = p.name || 'Electronic Component';
      
      // Clean description or use fallback
      let description = p.description || `Buy ${title} online from EZCirkit. Quality electronic components with fast shipping across India.`;
      // Replace any XML/HTML tags or problematic characters in description
      description = description.replace(/<[^>]*>/g, '');

      const escapeXml = (unsafe: string) => {
        return unsafe.replace(/[<>&'"]/g, (c) => {
          switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
          }
        });
      };

      const link = escapeXml(`${baseUrl}/products/${id}`);
      const imageUrl = escapeXml(p.image?.startsWith('http')
        ? p.image
        : `${baseUrl}${p.image || '/logo.png'}`);
      
      const price = typeof p.price === 'number' ? p.price : 0;
      const availability = (p.stock ?? 1) > 0 ? 'in_stock' : 'out_of_stock';
      const brand = p.brand || 'EZCirkit';
      const sku = p.sku || id;
      const category = p.category || 'Electronic Components';

      itemsXml += `
    <item>
      <g:id>${id}</g:id>
      <g:title><![CDATA[${title}]]></g:title>
      <g:description><![CDATA[${description}]]></g:description>
      <g:link>${link}</g:link>
      <g:image_link>${imageUrl}</g:image_link>
      <g:price>${price.toFixed(2)} INR</g:price>
      <g:availability>${availability}</g:availability>
      <g:brand><![CDATA[${brand}]]></g:brand>
      <g:condition>new</g:condition>
      <g:mpn><![CDATA[${sku}]]></g:mpn>
      <g:identifier_exists>false</g:identifier_exists>
      <g:google_product_category><![CDATA[${category}]]></g:google_product_category>
    </item>`;
    });

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>EZCirkit Shop Products Feed</title>
    <link>${baseUrl}</link>
    <description>Google Merchant Center Product Feed for EZCirkit Shop</description>
    ${itemsXml.trim()}
  </channel>
</rss>`;

    return new Response(rssXml.trim(), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[Merchant Feed] Error generating feed:', err);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Error</title>
    <description>Failed to generate product feed: ${err.message || err}</description>
  </channel>
</rss>`,
      {
        status: 500,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
        },
      }
    );
  }
}
