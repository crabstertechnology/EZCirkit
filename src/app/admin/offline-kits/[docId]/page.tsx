
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import Link from 'next/link';

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ChevronLeft, Download, Printer, Trash2, Loader2,
  QrCode, User, Calendar, MapPin, Phone, Mail, Building,
  CheckCircle2, Clock, XCircle, Shield,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
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

interface Kit {
  id: string;
  kitId: string;
  activationToken: string;
  batchId: string;
  batchName: string;
  shopName: string;
  status: 'pending' | 'activated' | 'deactivated';
  createdAt: any;
  activatedAt: any;
  activatedBy?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  activationCountry?: string;
  activationState?: string;
}

// ---------------------------------------------------------------------------
export default function KitDetailPage() {
  const { docId } = useParams<{ docId: string }>();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [kit, setKit] = useState<Kit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Load kit from Firestore ──────────────────────────────────────────────
  useEffect(() => {
    if (!firestore || !docId) return;
    getDoc(doc(firestore, 'offline_kits', docId)).then((snap) => {
      if (snap.exists()) {
        setKit({ id: snap.id, ...snap.data() } as Kit);
      }
      setIsLoading(false);
    });
  }, [firestore, docId]);

  // ── Render QR once kit loads ─────────────────────────────────────────────
  useEffect(() => {
    if (!kit?.activationToken) return;
    const url = `${getBaseUrl()}/activate?token=${kit.activationToken}`;
    QRCode.toDataURL(url, { width: 400, margin: 2 }).then(setQrDataUrl);
  }, [kit]);

  // ── Download QR PNG ──────────────────────────────────────────────────────
  function downloadQR() {
    if (!qrDataUrl || !kit) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${kit.kitId}.png`;
    a.click();
  }

  // ── Print label ──────────────────────────────────────────────────────────
  function printLabel() {
    if (!kit || !qrDataUrl) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html><html><head>
        <title>EZCirkit Label – ${kit.kitId}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: Arial, sans-serif; }
          .label {
            border: 2px dashed #ccc; border-radius: 10px; padding: 20px;
            display: flex; flex-direction: column; align-items: center;
            gap: 8px; text-align: center; width: 260px;
          }
          .brand { font-size: 22px; font-weight: 900; color: #F97316; letter-spacing: 1px; }
          .kit-id { font-family: monospace; font-size: 13px; font-weight: bold; color: #333; }
          img { width: 180px; height: 180px; }
          .scan { font-size: 11px; font-weight: bold; color: #555; }
          .url { font-size: 10px; color: #999; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head><body>
        <div class="label">
          <div class="brand">EZCirkit</div>
          <div class="kit-id">Kit ID: ${kit.kitId}</div>
          <img src="${qrDataUrl}" alt="QR Code" />
          <div class="scan">Scan to Activate</div>
          <div class="url">${getHostName()}/activate</div>
        </div>
        <script>window.onload = () => window.print();</script>
      </body></html>
    `);
    w.document.close();
  }

  // ── Deactivate ───────────────────────────────────────────────────────────
  async function handleDeactivate() {
    if (!kit) return;
    setIsDeactivating(true);
    try {
      const res = await fetch('/api/offline-kits/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
        body: JSON.stringify({ docId: kit.id }),
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'Kit deactivated' });
      setKit((prev) => prev ? { ...prev, status: 'deactivated' } : prev);
    } catch {
      toast({ title: 'Error', description: 'Could not deactivate.', variant: 'destructive' });
    } finally {
      setIsDeactivating(false);
    }
  }

  // ── Permanent Delete ─────────────────────────────────────────────────────
  async function handleDelete(force = false) {
    if (!kit) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/offline-kits/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
        body: JSON.stringify({ docId: kit.id, force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete');
      toast({ title: `Kit ${kit.kitId} deleted permanently.` });
      router.push('/admin/offline-kits');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setIsDeleting(false);
    }
  }


  const parseDate = (d: any) => {
    if (!d) return null;
    if (typeof d.toDate === 'function') return d.toDate();
    if (d.seconds) return new Date(d.seconds * 1000);
    return new Date(d);
  };

  const statusBadge = (s: string) => {
    if (s === 'activated') return <Badge className="bg-green-500 hover:bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" /> Activated</Badge>;
    if (s === 'deactivated') return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Deactivated</Badge>;
    return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
  };

  // ── Loading / not found ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!kit) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/offline-kits"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
        <p className="text-muted-foreground">Kit not found.</p>
      </div>
    );
  }

  const createdDate = parseDate(kit.createdAt);
  const activatedDate = parseDate(kit.activatedAt);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/offline-kits">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to All Kits
        </Link>
      </Button>

      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold font-mono">{kit.kitId}</h1>
            {statusBadge(kit.status)}
          </div>
          <p className="text-muted-foreground text-sm">
            Batch: <strong>{kit.batchName}</strong>
            {kit.shopName && <> · Shop: <strong>{kit.shopName}</strong></>}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={downloadQR} disabled={!qrDataUrl}>
            <Download className="h-4 w-4 mr-2" /> Download QR
          </Button>
          <Button variant="outline" size="sm" onClick={printLabel} disabled={!qrDataUrl}>
            <Printer className="h-4 w-4 mr-2" /> Print Label
          </Button>

          {/* Deactivate — only for activated kits */}
          {kit.status === 'activated' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-amber-500 text-amber-600 hover:bg-amber-50" disabled={isDeactivating}>
                  {isDeactivating
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <XCircle className="h-4 w-4 mr-2" />}
                  Deactivate
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deactivate {kit.kitId}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will revoke tutorial access for {kit.customerName || 'this user'} and mark the kit as deactivated.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeactivate}>Deactivate</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Delete — available for all statuses, extra warning for activated */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeleting}>
                {isDeleting
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <Trash2 className="h-4 w-4 mr-2" />}
                Delete Kit
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {kit.status === 'activated'
                    ? `⚠️ Delete Activated Kit ${kit.kitId}?`
                    : `Delete Kit ${kit.kitId}?`}
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  {kit.status === 'activated' ? (
                    <>
                      <span className="block text-destructive font-semibold">
                        This kit is linked to customer {kit.customerName} ({kit.customerEmail}).
                      </span>
                      <span className="block">
                        Deleting it will permanently remove the kit record. The customer&apos;s Firebase account will still exist, but this kit will be untrackable.
                      </span>
                    </>
                  ) : (
                    <span>This will permanently delete kit {kit.kitId} from Firestore. This action cannot be undone.</span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={() => handleDelete(kit.status === 'activated')}
                >
                  Yes, Delete Permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* QR Code card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" /> Activation QR Code
            </CardTitle>
            <CardDescription>
              Customer scans this to register and activate their kit.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {/* Label preview */}
            <div className="border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2 w-fit">
              <span className="text-xl font-black text-primary tracking-wider">EZCirkit</span>
              <span className="font-mono text-xs font-bold text-foreground">Kit ID: {kit.kitId}</span>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="w-44 h-44" />
              ) : (
                <div className="w-44 h-44 bg-muted rounded flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              <Badge variant="secondary" className="text-xs">Scan to Activate</Badge>
              <span className="text-xs text-muted-foreground">{getHostName()}/activate</span>
            </div>

            {/* Activation URL */}
            <div className="w-full bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Activation URL</p>
              <code className="text-xs break-all text-foreground">
                {getBaseUrl()}/activate?token={kit.activationToken}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Kit info + Customer details */}
        <div className="space-y-6">
          {/* Kit Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Kit Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow label="Kit ID" value={<span className="font-mono font-bold">{kit.kitId}</span>} />
              <InfoRow label="Batch Name" value={kit.batchName} />
              <InfoRow label="Shop / Retailer" value={kit.shopName || '—'} />
              <InfoRow label="Status" value={statusBadge(kit.status)} />
              <Separator />
              <InfoRow
                label="Created"
                icon={<Calendar className="h-3.5 w-3.5" />}
                value={createdDate ? format(createdDate, 'dd MMM yyyy, hh:mm a') : '—'}
              />
              <InfoRow
                label="Activated"
                icon={<Calendar className="h-3.5 w-3.5" />}
                value={activatedDate ? format(activatedDate, 'dd MMM yyyy, hh:mm a') : 'Not yet activated'}
              />
            </CardContent>
          </Card>

          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Customer Details
              </CardTitle>
              {!kit.customerName && (
                <CardDescription>This kit has not been activated by a customer yet.</CardDescription>
              )}
            </CardHeader>
            {kit.customerName ? (
              <CardContent className="space-y-3 text-sm">
                <InfoRow
                  label="Full Name"
                  icon={<User className="h-3.5 w-3.5" />}
                  value={kit.customerName}
                />
                <InfoRow
                  label="Email"
                  icon={<Mail className="h-3.5 w-3.5" />}
                  value={
                    <a href={`mailto:${kit.customerEmail}`} className="text-primary underline">
                      {kit.customerEmail}
                    </a>
                  }
                />
                <InfoRow
                  label="Phone"
                  icon={<Phone className="h-3.5 w-3.5" />}
                  value={kit.customerPhone || '—'}
                />
                <Separator />
                <InfoRow
                  label="Location"
                  icon={<MapPin className="h-3.5 w-3.5" />}
                  value={[kit.activationState, kit.activationCountry].filter(Boolean).join(', ') || '—'}
                />
                {kit.activatedBy && (
                  <InfoRow
                    label="Firebase UID"
                    icon={<Building className="h-3.5 w-3.5" />}
                    value={<span className="font-mono text-xs break-all">{kit.activatedBy}</span>}
                  />
                )}
              </CardContent>
            ) : (
              <CardContent>
                <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
                  <User className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No customer linked yet</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground flex items-center gap-1.5 shrink-0 min-w-[110px]">
        {icon}
        {label}
      </span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
