/**
 * POST /api/internal/bulk-seo
 *
 * Internal-only route that:
 *   1. Signs in as admin via Firebase Auth REST API
 *   2. Uses the admin ID token to write to Firestore via REST (bypasses rules for admin)
 *   3. Batch-updates all products with metaTitle, metaDescription, faqs
 *
 * Called by: scripts/generate-product-seo.js
 */

import { NextResponse } from 'next/server';

// ─── Config ────────────────────────────────────────────────────────────────
const PROJECT_ID = 'studio-2519724075-3b571';
const API_KEY    = 'AIzaSyAaRHpOOODgLR9sinxecEqb2u7s8iT9158';

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL?.trim()    || 'crabstertechnology@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim() || '';

const INTERNAL_SECRET = process.env.INTERNAL_SEO_SECRET || 'ezcirkit-seo-2024-internal';

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ─── Firebase Auth – sign in and get ID token ──────────────────────────────
async function getAdminIdToken(): Promise<string> {
  if (!ADMIN_PASSWORD) {
    throw new Error(
      'ADMIN_PASSWORD env var is not set. Add it to .env.local:\n  ADMIN_PASSWORD=your-firebase-admin-password',
    );
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:             ADMIN_EMAIL,
        password:          ADMIN_PASSWORD,
        returnSecureToken: true,
      }),
    },
  );

  const data = await res.json() as any;
  if (!res.ok || !data.idToken) {
    throw new Error(`Firebase Auth failed: ${data.error?.message || JSON.stringify(data)}`);
  }
  return data.idToken;
}

// ─── Firestore REST helpers ─────────────────────────────────────────────────
function toFsValue(val: any): any {
  if (typeof val === 'string')  return { stringValue: val };
  if (typeof val === 'number')  return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val))       return { arrayValue: { values: val.map(toFsValue) } };
  if (val === null || val === undefined) return { nullValue: 'NULL_VALUE' };
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toFsValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function parseFsField(field: any): any {
  if (!field) return undefined;
  if ('stringValue'  in field) return field.stringValue;
  if ('integerValue' in field) return parseInt(field.integerValue, 10);
  if ('doubleValue'  in field) return field.doubleValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('arrayValue'   in field) return (field.arrayValue?.values || []).map(parseFsField);
  if ('mapValue'     in field) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(field.mapValue?.fields || {})) out[k] = parseFsField(v);
    return out;
  }
  return undefined;
}

async function listAllProducts(token: string) {
  const res = await fetch(`${FIRESTORE_BASE}/products?pageSize=300`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`List products failed: ${res.status} ${await res.text()}`);
  const data = await res.json() as any;
  return (data.documents || []).map((doc: any) => {
    const product: Record<string, any> = { id: doc.name.split('/').pop() };
    for (const [k, v] of Object.entries(doc.fields || {})) product[k] = parseFsField(v as any);
    return product;
  });
}

async function patchProductSeo(
  token:           string,
  productId:       string,
  metaTitle:       string,
  metaDescription: string,
  faqs:            string,
) {
  const url = `${FIRESTORE_BASE}/products/${productId}` +
    `?updateMask.fieldPaths=metaTitle` +
    `&updateMask.fieldPaths=metaDescription` +
    `&updateMask.fieldPaths=faqs`;

  const res = await fetch(url, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        metaTitle:       toFsValue(metaTitle),
        metaDescription: toFsValue(metaDescription),
        faqs:            toFsValue(faqs),
      },
    }),
  });

  if (!res.ok) throw new Error(`Patch failed ${productId}: ${res.status} ${await res.text()}`);
}

// ─── SEO Generators ────────────────────────────────────────────────────────

function generateSeoTitle(p: any): string {
  const name = (p.name || '').trim();
  const opts = [
    `${name} – Buy Online India | EZCirkit`,
    `Buy ${name} Online | EZCirkit`,
    `${name.substring(0, 38).trim()} | EZCirkit`,
  ];
  return opts.find(s => s.length <= 60) ?? opts[2];
}

function generateMetaDescription(p: any): string {
  const name    = (p.name    || 'Electronic Component').trim();
  const cat     = (p.category || 'Electronic Component').trim();
  const brand   = (p.brand   || '').trim();
  const price   = p.price ? `₹${Number(p.price).toLocaleString('en-IN')}` : '';
  const sku     = p.sku ? `(${p.sku}) ` : '';

  const d = `Buy ${name}${brand ? ` by ${brand}` : ''} online${price ? ` at ${price}` : ''}. ${cat} ${sku}– EZCirkit. Fast India shipping, COD available. Perfect for Arduino, ESP32 & DIY projects.`;
  return d.length <= 160 ? d : d.substring(0, 157).trim() + '...';
}

function generateFaqs(p: any) {
  const name     = (p.name    || 'this product').trim();
  const cat      = (p.category || '').toLowerCase();
  const price    = p.price ? `₹${Number(p.price).toLocaleString('en-IN')}` : 'the listed price';
  const brand    = p.brand    || 'EZCirkit';
  const warranty = p.warranty || '7 days';
  const shipping = p.shipping || '2–7 business days';

  const base = [
    {
      question: `What is the price of ${name}?`,
      answer: `The current price of ${name} is ${price} on EZCirkit. Prices are inclusive of taxes and may vary with promotional offers.`,
    },
    {
      question: `Is Cash on Delivery available for ${name}?`,
      answer: `Yes, Cash on Delivery (COD) is available for ${name} across most serviceable pin codes in India via EZCirkit.`,
    },
    {
      question: `How long does delivery take for ${name}?`,
      answer: `${name} is dispatched within 24 hours of order confirmation. Standard delivery takes ${shipping} across India depending on your location.`,
    },
    {
      question: `What warranty does ${name} come with?`,
      answer: `${name} is covered by a ${warranty} warranty against manufacturing defects when purchased from EZCirkit.`,
    },
    {
      question: `Is ${name} compatible with Arduino and ESP32?`,
      answer: `Yes, ${name} is compatible with Arduino Uno, Nano, Mega, ESP32, ESP8266, and Raspberry Pi. It supports 3.3V–5V operation. See the Specifications tab for exact electrical details.`,
    },
    {
      question: `Can I get a datasheet or documentation for ${name}?`,
      answer: `Yes, datasheets and documentation for ${name} are available in the "Additional Resources" tab on this product page. You can also contact EZCirkit support via WhatsApp for technical assistance.`,
    },
  ];

  const extra: Record<string, any[]> = {
    sensor: [
      { question: `How do I wire ${name} to Arduino?`, answer: `Connect VCC to 5V (or 3.3V), GND to GND, and the signal pin to a digital or analog pin on your Arduino. Refer to the product datasheet for exact pin assignments.` },
      { question: `What library should I use for ${name}?`, answer: `Search for "${brand}" or the model number in Arduino IDE under Sketch → Include Library → Manage Libraries.` },
    ],
    'arduino board': [
      { question: `How do I program ${name}?`, answer: `Connect via USB, select the correct Board and Port in Arduino IDE Tools menu, then click Upload.` },
      { question: `Does ${name} support WiFi or Bluetooth?`, answer: `Connectivity features are listed in the Specifications tab on this page. Check the spec sheet for exact wireless capabilities.` },
    ],
    'development board': [
      { question: `What programming language can I use with ${name}?`, answer: `${name} supports C/C++ via Arduino IDE and may also support MicroPython or CircuitPython. Visit EZCirkit tutorials for getting-started guides.` },
      { question: `What is the GPIO voltage of ${name}?`, answer: `Most development boards operate at 3.3V GPIO logic with a 5V USB input. Exact voltage specs are in the Specifications tab.` },
    ],
    display: [
      { question: `What interface protocol does ${name} use?`, answer: `${name} typically uses I2C or SPI. Interface details are in the Specifications tab.` },
      { question: `What is the display resolution of ${name}?`, answer: `The resolution of ${name} is listed in the Specifications tab. See the datasheet in Additional Resources for full display parameters.` },
    ],
    'power module': [
      { question: `What is the output voltage of ${name}?`, answer: `The output voltage specifications are listed in the Specifications tab. Typical modules offer 3.3V and 5V regulated outputs.` },
      { question: `What is the current rating of ${name}?`, answer: `The current rating is listed in the Specifications tab. Do not exceed the rated current to prevent module damage.` },
    ],
    kit: [
      { question: `Is ${name} suitable for beginners?`, answer: `Yes, ${name} is beginner-friendly and comes with step-by-step tutorials on the EZCirkit learning platform.` },
      { question: `Does ${name} require soldering?`, answer: `No soldering required. All components are breadboard-compatible, perfect for school projects and first-time builders.` },
      { question: `What projects can I build with ${name}?`, answer: `Build temperature monitors, traffic lights, distance meters, automatic plant watering systems, and more. Explore the EZCirkit projects page for guided project tutorials.` },
    ],
    ezcirkit: [
      { question: `What is the EZCirkit kit?`, answer: `EZCirkit is a comprehensive STEM electronics learning kit by Crabster Technology with components, tutorials, and an online IDE for students and hobbyists.` },
      { question: `Is ${name} suitable for school projects?`, answer: `Yes, ${name} is designed for school science projects, engineering college labs, and STEM competitions.` },
    ],
  };

  let extraFaqs: any[] = [];
  for (const [key, faqs] of Object.entries(extra)) {
    if (cat.includes(key)) { extraFaqs = faqs; break; }
  }

  return [...base, ...extraFaqs].slice(0, 8);
}

// ─── Route ─────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const secret = request.headers.get('x-internal-secret');
  if (secret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let token: string;
  try {
    token = await getAdminIdToken();
  } catch (err: any) {
    return NextResponse.json({ error: `Auth failed: ${err.message}` }, { status: 500 });
  }

  let products: any[];
  try {
    products = await listAllProducts(token);
  } catch (err: any) {
    return NextResponse.json({ error: `List failed: ${err.message}` }, { status: 500 });
  }

  const results: any[] = [];
  const errors: any[]  = [];

  for (const product of products) {
    const metaTitle       = generateSeoTitle(product);
    const metaDescription = generateMetaDescription(product);
    const faqs            = generateFaqs(product);

    try {
      await patchProductSeo(token, product.id, metaTitle, metaDescription, JSON.stringify(faqs));
      results.push({ id: product.id, name: product.name, metaTitle, metaDescription, faqCount: faqs.length });
    } catch (err: any) {
      errors.push({ id: product.id, name: product.name, error: err.message });
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    updated: results.length,
    failed:  errors.length,
    products: results,
    errors,
  });
}
