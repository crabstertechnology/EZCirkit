
'use client';

import React, { useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Download, ChevronLeft, QrCode, Printer } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

const ADMIN_SECRET = 'ezcirkit-admin-2024';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://shop.crabstertech.in';
};

const getHostName = () => {
  if (typeof window !== 'undefined') {
    return window.location.host;
  }
  return 'shop.crabstertech.in';
};

interface GeneratedKit {
  kitId: string;
  activationToken: string;
  qrDataUrl?: string;
}

export default function GenerateBatchPage() {
  const { toast } = useToast();

  // Form state
  const [batchName, setBatchName] = useState('');
  const [shopName, setShopName] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // Result state
  const [kits, setKits] = useState<GeneratedKit[]>([]);
  const [batchId, setBatchId] = useState('');
  const [isRenderingQR, setIsRenderingQR] = useState(false);

  // ── Generate batch via API ──────────────────────────────────────────────
  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!batchName.trim()) { setError('Batch name is required.'); return; }
    if (quantity < 1 || quantity > 500) { setError('Quantity must be between 1 and 500.'); return; }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/offline-kits/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
        body: JSON.stringify({ batchName, shopName, quantity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      setBatchId(data.batchId);

      // Render QR codes client-side
      setIsRenderingQR(true);
      const withQR: GeneratedKit[] = await Promise.all(
        data.kits.map(async (kit: GeneratedKit) => {
          const url = `${getBaseUrl()}/activate?token=${kit.activationToken}`;
          try {
            const qrDataUrl = await QRCode.toDataURL(url, {
              width: 400,
              margin: 2,
              color: { dark: '#000000', light: '#FFFFFF' },
            });
            return { ...kit, qrDataUrl };
          } catch {
            return kit;
          }
        })
      );
      setIsRenderingQR(false);
      setKits(withQR);
      toast({ title: `✅ ${data.quantity} kits generated successfully!` });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  }

  // ── Download single QR PNG ──────────────────────────────────────────────
  function downloadSingleQR(kit: GeneratedKit) {
    if (!kit.qrDataUrl) return;
    const a = document.createElement('a');
    a.href = kit.qrDataUrl;
    a.download = `${kit.kitId}.png`;
    a.click();
  }

  // ── Download all QRs as print PDF sheet (browser print) ─────────────────
  function printAll() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const cells = kits
      .map(
        (kit) => `
      <div class="kit-card">
        <div class="brand">EZCirkit</div>
        <div class="kit-id">Kit ID: ${kit.kitId}</div>
        ${kit.qrDataUrl ? `<img src="${kit.qrDataUrl}" alt="QR Code" />` : ''}
        <div class="scan-text">Scan to Activate</div>
        <div class="url">${getHostName()}/activate</div>
      </div>`
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>EZCirkit Activation Labels – ${batchName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; background: #fff; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 16px; }
          .kit-card {
            border: 1.5px dashed #ccc; border-radius: 8px; padding: 12px;
            display: flex; flex-direction: column; align-items: center;
            gap: 6px; text-align: center; page-break-inside: avoid;
          }
          .brand { font-size: 16px; font-weight: 900; letter-spacing: 1px; color: #F97316; }
          .kit-id { font-size: 11px; font-family: monospace; color: #333; font-weight: bold; }
          img { width: 120px; height: 120px; }
          .scan-text { font-size: 10px; font-weight: bold; color: #555; }
          .url { font-size: 9px; color: #999; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="grid">${cells}</div>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  // ── Download all QRs as ZIP (individual PNGs via browser) ───────────────
  async function downloadAllPNG() {
    // Dynamically import JSZip only when needed to keep bundle small
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const folder = zip.folder(`EZCirkit-${batchName}`)!;

    for (const kit of kits) {
      if (!kit.qrDataUrl) continue;
      const base64 = kit.qrDataUrl.split(',')[1];
      folder.file(`${kit.kitId}.png`, base64, { base64: true });
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = `EZCirkit-${batchName.replace(/\s+/g, '_')}-QRCodes.zip`;
    a.click();
  }

  const isBusy = isGenerating || isRenderingQR;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Back link */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/offline-kits">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Kit Manager
          </Link>
        </Button>
      </div>

      <h1 className="text-3xl font-bold">Generate Kit Batch</h1>

      {/* Generation form */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Settings</CardTitle>
          <CardDescription>
            Each kit gets a unique ID (EZC-XXXXXX) and a cryptographically secure activation token.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-5 max-w-lg">
            <div className="space-y-1.5">
              <Label htmlFor="batchName">Batch Name *</Label>
              <Input
                id="batchName"
                placeholder="e.g. Townhall Electronics – July 2025"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shopName">Shop / Retailer Name (optional)</Label>
              <Input
                id="shopName"
                placeholder="e.g. Townhall Electronics"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Number of Kits *</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={500}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
              />
              <p className="text-xs text-muted-foreground">Maximum 500 per batch.</p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={isBusy}>
              {isBusy ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isRenderingQR ? 'Rendering QR codes…' : 'Generating…'}
                </>
              ) : (
                <><QrCode className="h-4 w-4 mr-2" /> Generate {quantity} Kit{quantity !== 1 ? 's' : ''}</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {kits.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>Generated Kits</CardTitle>
                <CardDescription>
                  Batch: <strong>{batchName}</strong> · {kits.length} kits
                  {shopName && <> · {shopName}</>}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={printAll}>
                  <Printer className="h-4 w-4 mr-2" /> Print Labels
                </Button>
                <Button variant="outline" size="sm" onClick={downloadAllPNG}>
                  <Download className="h-4 w-4 mr-2" /> Download ZIP
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {kits.map((kit) => (
                <div
                  key={kit.kitId}
                  className="border rounded-lg p-3 flex flex-col items-center gap-2 text-center bg-card hover:shadow-md transition-shadow"
                >
                  <span className="text-xs font-black text-primary tracking-wider">EZCirkit</span>
                  <span className="font-mono text-xs font-bold">{kit.kitId}</span>
                  {kit.qrDataUrl ? (
                    <img src={kit.qrDataUrl} alt={`QR for ${kit.kitId}`} className="w-28 h-28" />
                  ) : (
                    <div className="w-28 h-28 bg-muted rounded flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  <Badge variant="secondary" className="text-xs">Scan to Activate</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => downloadSingleQR(kit)}
                    disabled={!kit.qrDataUrl}
                  >
                    <Download className="h-3 w-3 mr-1" /> PNG
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
