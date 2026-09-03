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

/**
 * Resolves an official Google Product Category ID or full taxonomy path.
 * Google requires an official taxonomy ID (e.g. 3702) or the exact breadcrumb path.
 * Reference: http://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt
 */
function resolveGoogleProductCategory(p: any): string {
  // If product explicitly has a valid numeric ID or full taxonomy path (contains ' > ')
  if (p.google_product_category) {
    const customGpc = String(p.google_product_category).trim();
    if (/^\d+$/.test(customGpc) || customGpc.includes(' > ')) {
      return customGpc;
    }
  }

  const cat = (p.category || '').toLowerCase().trim();
  const name = (p.name || '').toLowerCase().trim();

  // Breadboards & Prototyping
  if (name.includes('breadboard') || cat.includes('breadboard')) {
    return '4010'; // Electronics > Circuit Boards & Components > Circuit Prototyping > Breadboards
  }

  // Soldering kits & tools
  if (name.includes('soldering') || cat.includes('soldering')) {
    return '2518'; // Hardware > Tool Accessories > Soldering Iron Accessories
  }

  // Battery Holders
  if (name.includes('battery holder') || name.includes('cell holder')) {
    return '6027'; // Electronics > Electronics Accessories > Power > Battery Accessories > Battery Chargers & Holders
  }

  // Batteries & Power cells
  if (name.includes('18650') || name.includes('battery') || name.includes('li-ion')) {
    return '4744'; // Electronics > Electronics Accessories > Power > Batteries
  }

  // Development Boards / Microcontrollers / Arduino / ESP32 / STM8
  if (
    cat.includes('arduino') ||
    cat.includes('development board') ||
    name.includes('esp32') ||
    name.includes('arduino') ||
    name.includes('stm8') ||
    name.includes('development board') ||
    name.includes('microcontroller')
  ) {
    return '3416'; // Electronics > Circuit Boards & Components > Printed Circuit Boards > Development Boards
  }

  // Electric Motors & Water Pumps
  if (name.includes('motor') || name.includes('pump') || cat.includes('robotics')) {
    return '7275'; // Hardware > Power & Electrical Supplies > Electrical Motors
  }

  // Wires, Cables & Connectors
  if (cat.includes('wire') || cat.includes('connector') || name.includes('cable') || name.includes('jumper')) {
    return '503729'; // Hardware > Power & Electrical Supplies > Wire Terminals & Connectors
  }

  // Power Modules, Boost Converters, Regulators
  if (
    cat.includes('power module') ||
    name.includes('boost converter') ||
    name.includes('power supply') ||
    name.includes('voltage regulator') ||
    name.includes('charging module')
  ) {
    return '505318'; // Hardware > Power & Electrical Supplies > Voltage Transformers & Regulators
  }

  // Default fallback for electronic components, sensors, displays, modules, DIY kits:
  // 3702 is Google's official ID for "Electronics > Circuit Boards & Components"
  return '3702';
}

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
      let rawImage = p.image || '/logo.png';
      if (rawImage.startsWith('data:')) {
        rawImage = '/logo.png';
      }
      const imageUrl = escapeXml(rawImage.startsWith('http')
        ? rawImage
        : `${baseUrl}${rawImage}`);
      
      const price = typeof p.price === 'number' ? p.price : 0;
      const availability = (p.stock ?? 1) > 0 ? 'in_stock' : 'out_of_stock';
      const brand = p.brand || 'EZCirkit';
      const sku = p.sku || id;
      const category = p.category || 'Electronic Components';
      const googleCategory = resolveGoogleProductCategory(p);

      // Additional gallery images if present
      let additionalImagesXml = '';
      if (Array.isArray(p.gallery)) {
        p.gallery.slice(0, 5).forEach((imgUrl: string) => {
          if (imgUrl && typeof imgUrl === 'string' && !imgUrl.startsWith('data:')) {
            const cleanUrl = escapeXml(imgUrl.startsWith('http') ? imgUrl : `${baseUrl}${imgUrl}`);
            if (cleanUrl !== imageUrl) {
              additionalImagesXml += `\n      <g:additional_image_link>${cleanUrl}</g:additional_image_link>`;
            }
          }
        });
      }

      const hasGtin = !!(p.gtin && String(p.gtin).trim());

      itemsXml += `
    <item>
      <g:id>${id}</g:id>
      <g:title><![CDATA[${title}]]></g:title>
      <g:description><![CDATA[${description}]]></g:description>
      <g:link>${link}</g:link>
      <g:image_link>${imageUrl}</g:image_link>${additionalImagesXml}
      <g:price>${price.toFixed(2)} INR</g:price>
      <g:availability>${availability}</g:availability>
      <g:brand><![CDATA[${brand}]]></g:brand>
      <g:condition>new</g:condition>
      <g:mpn><![CDATA[${sku}]]></g:mpn>
      ${hasGtin ? `<g:gtin>${escapeXml(String(p.gtin).trim())}</g:gtin>` : ''}
      <g:identifier_exists>${hasGtin ? 'true' : 'false'}</g:identifier_exists>
      <g:product_type><![CDATA[${category}]]></g:product_type>
      <g:google_product_category>${googleCategory}</g:google_product_category>
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
