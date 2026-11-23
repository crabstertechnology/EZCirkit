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
 * Each kit gets its own clean A4 page (page-break-after: always).
 * The user can print 1 or 10 or 100 kits and each comes out on its own sheet ready to place in the kit box.
 */
export function generateKitGuidePageHtml(kits: PrintableKit[], options?: KitPrintOptions): string {
  const host = options?.hostName || 'shop.crabstertech.in';
  const activateUrl = `https://${host}/activate`;

  const pagesHtml = kits
    .map((kit, index) => {
      return `
    <div class="page">
      <div class="card-border">
        
        <!-- Top Badge -->
        <div class="corner-badge">Official Learning Kit Insert</div>

        <!-- Header -->
        <div class="header">
          <div class="brand-group">
            <div class="brand-title">EZCirkit</div>
            <div class="brand-sub">Hands-On Arduino Electronics & Coding Workspace</div>
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
                : `<div style="width:170px;height:170px;display:flex;align-items:center;justify-content:center;background:#f4f4f5;border-radius:8px;font-size:12px;color:#71717a;">QR Code</div>`
            }
            <div class="qr-caption">Scan to Activate</div>
            <div class="qr-url">${host}/activate</div>
          </div>

          <div class="hero-info">
            <div class="section-title">
              <span class="icon-circle">✓</span>
              <span>How to Use & Get Started</span>
            </div>
            
            <ol class="steps-list">
              <li class="step-item">
                <span class="step-num">1</span>
                <div>
                  <strong>Scan QR Code or Open Link:</strong>
                  Scan the QR code on the left with your mobile camera, or visit <span class="link-highlight">${activateUrl}</span> on your computer.
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
                  Type in <strong>${kit.kitId}</strong> to instantly unlock all 21+ step-by-step coding experiments & YouTube tutorials.
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
                <span><strong>Do NOT discard this card:</strong> Keep it safe inside this kit box for warranty & support.</span>
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
                <span><strong>Interactive Web IDE:</strong> No Arduino software installation required. Compiles & uploads directly in Chrome!</span>
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
                <span><strong>Teacher & Classroom Friendly:</strong> Ideal for robotics clubs, schools, and home STEM projects.</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Experiments Overview Chips -->
        <div class="included-section">
          <div class="included-header">Included Learning Curriculum (21+ Hands-on Experiments)</div>
          <div class="included-tags">
            <span class="tag">LED Blink</span>
            <span class="tag">Traffic Lights</span>
            <span class="tag">IR Obstacle Sensor</span>
            <span class="tag">Ultrasonic Distance</span>
            <span class="tag">PIR Motion Detector</span>
            <span class="tag">LDR Night Lamp</span>
            <span class="tag">Servo Motor Sweep</span>
            <span class="tag">Buzzer Melody</span>
            <span class="tag">Digital Dice</span>
            <span class="tag">7-Segment Display</span>
            <span class="tag">Touch Switch</span>
            <span class="tag">DHT11 Temp & Humidity</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="footer-brand">
            <strong>EZCirkit</strong> by Crabster Technology · Made for curious minds.
          </div>
          <div class="footer-links">
            <span>Website: <strong>${host}</strong></span>
            <span>Support: <strong>support@crabstertech.in</strong></span>
          </div>
          <div class="cut-guide">Page ${index + 1} of ${kits.length}</div>
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
    }

    /* Page container: each kit on its own physical A4 sheet */
    .page {
      width: 100vw;
      min-height: 100vh;
      box-sizing: border-box;
      padding: 12mm 14mm;
      page-break-after: always;
      break-after: page;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .page:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }

    /* Outer border card */
    .card-border {
      border: 2px solid #e4e4e7;
      border-radius: 14px;
      padding: 22px 26px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .corner-badge {
      position: absolute;
      top: -10px;
      right: 24px;
      background: #ea580c;
      color: #ffffff;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 3px 10px;
      border-radius: 6px;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #f4f4f5;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }

    .brand-title {
      font-size: 30px;
      font-weight: 900;
      color: #ea580c;
      letter-spacing: -0.5px;
      line-height: 1;
    }

    .brand-sub {
      font-size: 12px;
      font-weight: 600;
      color: #71717a;
      margin-top: 3px;
    }

    .kit-badge-container {
      text-align: right;
    }

    .kit-badge-label {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #71717a;
    }

    .kit-badge-id {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 18px;
      font-weight: 900;
      color: #09090b;
      background: #f4f4f5;
      padding: 4px 10px;
      border-radius: 8px;
      border: 1px solid #d4d4d8;
      display: inline-block;
      margin-top: 2px;
    }

    /* Hero */
    .hero {
      display: flex;
      gap: 20px;
      align-items: center;
      background: #fafafa;
      border: 1.5px solid #f4f4f5;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .qr-box {
      background: #ffffff;
      border: 1.5px solid #e4e4e7;
      border-radius: 10px;
      padding: 10px;
      text-align: center;
      flex-shrink: 0;
    }

    .qr-box img {
      width: 145px;
      height: 145px;
      display: block;
    }

    .qr-caption {
      font-size: 11px;
      font-weight: 900;
      color: #ea580c;
      margin-top: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .qr-url {
      font-size: 9px;
      font-weight: 600;
      color: #71717a;
      margin-top: 1px;
    }

    .hero-info {
      flex: 1;
    }

    .section-title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #18181b;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .icon-circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      background: #ea580c;
      color: white;
      border-radius: 50%;
      font-size: 10px;
      font-weight: 900;
    }

    .steps-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 11.5px;
      line-height: 1.35;
      color: #3f3f46;
    }

    .step-num {
      width: 18px;
      height: 18px;
      background: #18181b;
      color: #ffffff;
      border-radius: 50%;
      font-size: 10px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .link-highlight {
      color: #ea580c;
      font-weight: 700;
    }

    /* Rules Grid */
    .rules-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }

    .rule-card {
      border: 1px solid #e4e4e7;
      border-radius: 10px;
      padding: 12px 14px;
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
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 7px;
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
      gap: 5px;
      font-size: 10.5px;
      line-height: 1.35;
      color: #4b5563;
    }

    .rule-list li {
      display: flex;
      gap: 5px;
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

    /* Included Curriculum */
    .included-section {
      background: #fafafa;
      border: 1px solid #f4f4f5;
      border-radius: 10px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }

    .included-header {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #71717a;
      margin-bottom: 6px;
    }

    .included-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }

    .tag {
      font-size: 9.5px;
      font-weight: 600;
      background: #ffffff;
      border: 1px solid #e4e4e7;
      border-radius: 5px;
      padding: 2.5px 7px;
      color: #3f3f46;
    }

    /* Footer */
    .footer {
      border-top: 1.5px solid #f4f4f5;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #71717a;
    }

    .footer-links {
      display: flex;
      gap: 12px;
      font-weight: 600;
    }

    .footer-links strong {
      color: #18181b;
    }

    .cut-guide {
      font-size: 9px;
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
      // Small timeout ensures QR images are fully loaded before print dialog triggers
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
