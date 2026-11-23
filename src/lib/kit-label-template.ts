/**
 * Reusable HTML generator for EZCirkit Kit Labels and Full-Page Activation Guides.
 * Designed for clean browser printing without headers/footers (@page { margin: 0; }),
 * with 1 complete guide card per page for easy insertion into physical kit boxes.
 */

export interface PrintableKit {
  kitId: string;
  qrDataUrl?: string;
  batchName?: string;
  shopName?: string;
}

export interface KitPrintOptions {
  hostName?: string;
  baseUrl?: string;
  title?: string;
}

/**
 * Generates Full A4 Kit Activation Guide Sheets.
 * Each kit gets its own clean A4 page, filling the entire sheet without blank trailing pages.
 */
export function generateKitGuidePageHtml(kits: PrintableKit[], options?: KitPrintOptions): string {
  const host = options?.hostName || 'shop.crabstertech.in';

  const pagesHtml = kits
    .map((kit, index) => {
      const isLast = index === kits.length - 1;
      // Only break page after if there are more kits to follow (prevents blank trailing page)
      const pageBreakCss = isLast ? '' : 'page-break-after: always; break-after: page;';

      return `
    <div class="page" style="${pageBreakCss}">
      <div class="card-border">

        <!-- Header -->
        <div class="header">
          <div class="brand-group">
            <div class="brand-title">EZCirkit</div>
            <div class="brand-sub">Hands-On Arduino Electronics &amp; Coding Workspace</div>
          </div>
          <div class="kit-badge-container">
            <div class="kit-badge-label">Unique Kit ID</div>
            <div class="kit-badge-id">${kit.kitId}</div>
          </div>
        </div>

        <!-- Activation Hero: QR Code + How to Use -->
        <div class="hero">
          <div class="qr-box">
            ${
              kit.qrDataUrl
                ? `<img src="${kit.qrDataUrl}" alt="QR Code" />`
                : `<div style="width:200px;height:200px;display:flex;align-items:center;justify-content:center;background:#f4f4f5;border-radius:12px;font-size:14px;color:#71717a;">QR Code</div>`
            }
            <div class="qr-caption">Scan to Activate</div>
            <div class="qr-url">${host}/activate</div>
          </div>

          <div class="hero-info">
            <div class="section-title">
              <span class="icon-circle">✓</span>
              <span>How to Use &amp; Get Started</span>
            </div>
            
            <ol class="steps-list">
              <li class="step-item">
                <span class="step-num">1</span>
                <div>
                  <strong>Scan QR Code:</strong>
                  Scan the QR code on the left with your mobile camera to begin activation.
                </div>
              </li>
              <li class="step-item">
                <span class="step-num">2</span>
                <div>
                  <strong>Sign In or Create Account:</strong>
                  Log in with Google or your email to link this physical hardware kit to your student profile.
                </div>
              </li>
              <li class="step-item">
                <span class="step-num">3</span>
                <div>
                  <strong>Enter Your Kit ID:</strong>
                  Type in <strong>${kit.kitId}</strong> to instantly unlock coding experiments &amp; YouTube tutorials.
                </div>
              </li>
              <li class="step-item">
                <span class="step-num">4</span>
                <div>
                  <strong>Launch Web IDE:</strong>
                  Connect your Arduino Uno via USB, click <em>Launch IDE</em>, verify circuit pinouts, and flash sketches with one click!
                </div>
              </li>
            </ol>
          </div>
        </div>

        <!-- Guidelines Grid: What NOT to Do & Pro Tips -->
        <div class="rules-grid">
          <!-- What NOT to Do Card -->
          <div class="rule-card warning">
            <div class="rule-title">⚠️ What NOT to Do (Important Warnings)</div>
            <ul class="rule-list">
              <li>
                <span class="cross">✕</span>
                <span><strong>Do NOT share your Kit ID:</strong> It is single-use and permanently binds to your account.</span>
              </li>
              <li>
                <span class="cross">✕</span>
                <span><strong>Do NOT discard this card:</strong> Keep it safe inside this kit box for warranty &amp; support.</span>
              </li>
              <li>
                <span class="cross">✕</span>
                <span><strong>Do NOT wire with power connected:</strong> Unplug the USB cable before plugging components.</span>
              </li>
              <li>
                <span class="cross">✕</span>
                <span><strong>Do NOT short-circuit:</strong> Never bridge 5V / 3.3V directly to GND without a resistor or component.</span>
              </li>
            </ul>
          </div>

          <!-- Best Practices / Pro Tips Card -->
          <div class="rule-card tips">
            <div class="rule-title">💡 Pro Tips for Young Makers</div>
            <ul class="rule-list">
              <li>
                <span class="check">✓</span>
                <span><strong>Interactive Web IDE:</strong> No software installation needed. Compiles &amp; uploads directly in Chrome!</span>
              </li>
              <li>
                <span class="check">✓</span>
                <span><strong>Video Guides:</strong> Every experiment includes a video breakdown and full circuit schematics.</span>
              </li>
              <li>
                <span class="check">✓</span>
                <span><strong>Precompiled Hex:</strong> Upload pre-tested code in 2 seconds to test sensor hardware instantly.</span>
              </li>
              <li>
                <span class="check">✓</span>
                <span><strong>Classroom Ready:</strong> Ideal for robotics clubs, schools, STEM labs, and home projects.</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="footer-brand">
            <strong>EZCirkit</strong> by Crabster Technology · Hands-On STEM Learning.
          </div>
          <div class="footer-links">
            <span>Website: <strong>${host}</strong></span>
            <span>Support: <strong>crabstertech@gmail.com</strong></span>
          </div>
          ${kits.length > 1 ? `<div class="cut-guide">Page ${index + 1} of ${kits.length}</div>` : ''}
        </div>

      </div>
    </div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${options?.title || 'EZCirkit Activation Guide'}</title>
  <style>
    /* Suppress browser default header (date & title) and footer (URL & 1/1) */
    @page {
      size: A4 portrait;
      margin: 0;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      background: #ffffff;
      color: #18181b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      width: 210mm;
      height: 297mm;
      overflow: hidden;
    }

    /* Page container: exact A4 sheet boundary (210mm x 297mm) */
    .page {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      box-sizing: border-box;
      padding: 12mm 14mm;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
      display: flex;
      flex-direction: column;
    }

    .page:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    /* Outer border card: fills the full A4 page */
    .card-border {
      border: 2.5px solid #d4d4d8;
      border-radius: 18px;
      padding: 24px 28px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      box-sizing: border-box;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #f4f4f5;
      padding-bottom: 16px;
    }

    .brand-title {
      font-size: 38px;
      font-weight: 900;
      color: #ea580c;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }

    .brand-sub {
      font-size: 14px;
      font-weight: 600;
      color: #52525b;
      margin-top: 4px;
    }

    .kit-badge-container {
      text-align: right;
    }

    .kit-badge-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #71717a;
    }

    .kit-badge-id {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 22px;
      font-weight: 900;
      color: #09090b;
      background: #f4f4f5;
      padding: 6px 14px;
      border-radius: 10px;
      border: 1.5px solid #d4d4d8;
      display: inline-block;
      margin-top: 3px;
    }

    /* Hero */
    .hero {
      display: flex;
      gap: 24px;
      align-items: center;
      background: #fafafa;
      border: 1.5px solid #e4e4e7;
      border-radius: 16px;
      padding: 22px;
    }

    .qr-box {
      background: #ffffff;
      border: 1.5px solid #d4d4d8;
      border-radius: 14px;
      padding: 12px;
      text-align: center;
      flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }

    .qr-box img {
      width: 190px;
      height: 190px;
      display: block;
    }

    .qr-caption {
      font-size: 13px;
      font-weight: 900;
      color: #ea580c;
      margin-top: 8px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    .qr-url {
      font-size: 11px;
      font-weight: 700;
      color: #52525b;
      margin-top: 2px;
    }

    .hero-info {
      flex: 1;
    }

    .section-title {
      font-size: 16px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #18181b;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .icon-circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      background: #ea580c;
      color: white;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 900;
    }

    .steps-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      font-size: 13.5px;
      line-height: 1.45;
      color: #27272a;
    }

    .step-num {
      width: 22px;
      height: 22px;
      background: #18181b;
      color: #ffffff;
      border-radius: 50%;
      font-size: 11px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* Rules Grid */
    .rules-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .rule-card {
      border: 1.5px solid #e4e4e7;
      border-radius: 14px;
      padding: 18px 20px;
      background: #ffffff;
    }

    .rule-card.warning {
      background: #fffbeb;
      border-color: #fde68a;
    }

    .rule-card.tips {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }

    .rule-title {
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }

    .rule-card.warning .rule-title {
      color: #b45309;
    }

    .rule-card.tips .rule-title {
      color: #15803d;
    }

    .rule-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 12.5px;
      line-height: 1.4;
      color: #3f3f46;
    }

    .rule-list li {
      display: flex;
      gap: 8px;
    }

    .cross {
      color: #dc2626;
      font-weight: 900;
      flex-shrink: 0;
    }

    .check {
      color: #16a34a;
      font-weight: 900;
      flex-shrink: 0;
    }

    /* Footer */
    .footer {
      border-top: 2px solid #f4f4f5;
      padding-top: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #52525b;
    }

    .footer-links {
      display: flex;
      gap: 18px;
      font-weight: 600;
    }

    .footer-links strong {
      color: #18181b;
    }

    .cut-guide {
      font-size: 10px;
      color: #a1a1aa;
      font-weight: 700;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  ${pagesHtml}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;
}

/**
 * Generates Compact Sticker Labels in a 3x3 Grid on A4 sheets.
 */
export function generateKitStickerGridHtml(kits: PrintableKit[], options?: KitPrintOptions): string {
  const host = options?.hostName || 'shop.crabstertech.in';

  const cells = kits
    .map(
      (kit) => `
    <div class="kit-card">
      <div class="brand">EZCirkit</div>
      <div class="kit-id">Kit ID: ${kit.kitId}</div>
      ${kit.qrDataUrl ? `<img src="${kit.qrDataUrl}" alt="QR Code" />` : ''}
      <div class="scan-text">Scan to Activate</div>
      <div class="url">${host}/activate</div>
    </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${options?.title || 'EZCirkit Sticker Labels'}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; padding: 12mm 10mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .kit-card {
      border: 1.5px dashed #ccc; border-radius: 8px; padding: 12px;
      display: flex; flex-direction: column; align-items: center;
      gap: 6px; text-align: center; page-break-inside: avoid; background: #ffffff;
    }
    .brand { font-size: 16px; font-weight: 900; letter-spacing: 0.5px; color: #ea580c; }
    .kit-id { font-size: 11px; font-family: monospace; color: #333; font-weight: bold; background: #f4f4f5; padding: 2px 6px; border-radius: 4px; }
    img { width: 120px; height: 120px; }
    .scan-text { font-size: 10px; font-weight: bold; color: #555; }
    .url { font-size: 9px; color: #71717a; font-weight: 600; }
  </style>
</head>
<body>
  <div class="grid">${cells}</div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;
}
