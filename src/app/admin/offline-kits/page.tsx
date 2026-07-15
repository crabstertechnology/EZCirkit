
'use client';

import React, { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import Link from 'next/link';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Package, QrCode, CheckCircle2, Clock, Plus, Download, Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
const ADMIN_SECRET = 'ezcirkit-admin-2024';

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
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  activationCountry?: string;
  activationState?: string;
}

type StatusFilter = 'all' | 'pending' | 'activated' | 'deactivated';

// ---------------------------------------------------------------------------
export default function OfflineKitsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const kitsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'offline_kits'), orderBy('createdAt', 'desc'))
        : null,
    [firestore]
  );
  const { data: kits, isLoading } = useCollection<Kit>(kitsQuery);

  // ── Analytics ───────────────────────────────────────────────────────────
  const total = kits?.length ?? 0;
  const activated = kits?.filter((k) => k.status === 'activated').length ?? 0;
  const pending = kits?.filter((k) => k.status === 'pending').length ?? 0;
  const rate = total > 0 ? Math.round((activated / total) * 100) : 0;

  // ── Filtered ────────────────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    if (!kits) return [];
    const q = search.toLowerCase();
    return kits.filter((k) => {
      const matchSearch =
        !q ||
        k.kitId?.toLowerCase().includes(q) ||
        k.batchName?.toLowerCase().includes(q) ||
        k.shopName?.toLowerCase().includes(q) ||
        k.customerName?.toLowerCase().includes(q) ||
        k.customerEmail?.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || k.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [kits, search, statusFilter]);

  // ── Deactivate ───────────────────────────────────────────────────────────
  async function handleDeactivate(docId: string) {
    try {
      const res = await fetch('/api/offline-kits/deactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': ADMIN_SECRET,
        },
        body: JSON.stringify({ docId }),
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'Kit deactivated' });
    } catch {
      toast({ title: 'Error', description: 'Could not deactivate.', variant: 'destructive' });
    }
  }

  // ── CSV Export ───────────────────────────────────────────────────────────
  function handleExport() {
    const url = `/api/offline-kits/export${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`;
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('x-admin-secret', ADMIN_SECRET);
    // Attach header via fetch + blob download
    fetch(url, { headers: { 'x-admin-secret': ADMIN_SECRET } })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `ezcirkit-kits-${Date.now()}.csv`;
        link.click();
        URL.revokeObjectURL(blobUrl);
      });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  const parseDate = (d: any) => {
    if (!d) return null;
    if (typeof d.toDate === 'function') return d.toDate();
    if (d.seconds) return new Date(d.seconds * 1000);
    return new Date(d);
  };

  const statusBadge = (s: string) => {
    if (s === 'activated') return <Badge className="bg-green-500 hover:bg-green-600">Activated</Badge>;
    if (s === 'deactivated') return <Badge variant="destructive">Deactivated</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Offline Kit Manager</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Generate, track and manage physical kit activations.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button asChild>
            <Link href="/admin/offline-kits/generate">
              <Plus className="h-4 w-4 mr-2" /> Generate Batch
            </Link>
          </Button>
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Generated', value: total, icon: Package, color: 'text-blue-500' },
          { label: 'Activated', value: activated, icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Pending', value: pending, icon: Clock, color: 'text-amber-500' },
          { label: 'Activation Rate', value: `${rate}%`, icon: QrCode, color: 'text-purple-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '…' : value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>All Kits</CardTitle>
          <CardDescription>Search and filter all generated kits.</CardDescription>
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <Input
              placeholder="Search Kit ID, batch, customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <div className="flex items-center gap-2">
              <Label className="shrink-0">Status:</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="activated">Activated</SelectItem>
                  <SelectItem value="deactivated">Deactivated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kit ID</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Activated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Loading kits…
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No kits found.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  filtered.map((kit) => {
                    const created = parseDate(kit.createdAt);
                    const activated = parseDate(kit.activatedAt);
                    return (
                      <TableRow key={kit.id}>
                        <TableCell className="font-mono text-xs">{kit.kitId}</TableCell>
                        <TableCell className="text-sm">{kit.batchName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{kit.shopName || '—'}</TableCell>
                        <TableCell>{statusBadge(kit.status)}</TableCell>
                        <TableCell>
                          {kit.customerName ? (
                            <div>
                              <div className="text-sm font-medium">{kit.customerName}</div>
                              <div className="text-xs text-muted-foreground">{kit.customerEmail}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {created ? format(created, 'dd MMM yyyy') : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {activated ? format(activated, 'dd MMM yyyy') : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {kit.status === 'activated' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Deactivate Kit?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will revoke tutorial access for {kit.customerName || 'this user'}. This action cannot be undone easily.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeactivate(kit.id)}>
                                    Deactivate
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {isLoading && <p className="text-center text-muted-foreground">Loading kits…</p>}
            {!isLoading && filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No kits found.</p>
            )}
            {!isLoading &&
              filtered.map((kit) => {
                const created = parseDate(kit.createdAt);
                return (
                  <Card key={kit.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold">{kit.kitId}</span>
                        {statusBadge(kit.status)}
                      </div>
                      <CardDescription>{kit.batchName} {kit.shopName ? `· ${kit.shopName}` : ''}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground space-y-1">
                      {kit.customerName && <p>👤 {kit.customerName} · {kit.customerEmail}</p>}
                      {created && <p>Created: {format(created, 'dd MMM yyyy')}</p>}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
