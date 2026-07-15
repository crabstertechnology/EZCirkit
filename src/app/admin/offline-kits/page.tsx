
'use client';

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
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
  Package, QrCode, CheckCircle2, Clock, Plus, Download,
  Trash2, Eye, XCircle, Loader2, X,
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
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // ── Selection state ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const kitsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'offline_kits'), orderBy('kitId', 'desc'))
        : null,
    [firestore]
  );
  const { data: kits, isLoading } = useCollection<Kit>(kitsQuery);

  // ── Analytics ────────────────────────────────────────────────────────────
  const total = kits?.length ?? 0;
  const activated = kits?.filter((k) => k.status === 'activated').length ?? 0;
  const pending = kits?.filter((k) => k.status === 'pending').length ?? 0;
  const rate = total > 0 ? Math.round((activated / total) * 100) : 0;

  // ── Filtered ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
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

  // ── Selection helpers ────────────────────────────────────────────────────
  const allFilteredIds = filtered.map((k) => k.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));
  const someSelected = allFilteredIds.some((id) => selectedIds.has(id)) && !allSelected;
  const selectedCount = selectedIds.size;

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // ── How many of the selected are activated (for the warning) ─────────────
  const selectedKits = filtered.filter((k) => selectedIds.has(k.id));
  const selectedActivatedCount = selectedKits.filter((k) => k.status === 'activated').length;

  // ── Bulk delete ──────────────────────────────────────────────────────────
  async function handleBulkDelete(force: boolean) {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    setBulkDeleteOpen(false);
    try {
      const res = await fetch('/api/offline-kits/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
        body: JSON.stringify({ docIds: Array.from(selectedIds), force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk delete failed');

      const msg = [
        `${data.deleted} kit${data.deleted !== 1 ? 's' : ''} deleted`,
        data.skipped > 0 ? `${data.skipped} skipped (activated)` : '',
        data.errors > 0 ? `${data.errors} errors` : '',
      ].filter(Boolean).join(' · ');

      toast({ title: 'Bulk delete complete', description: msg });
      clearSelection();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsBulkDeleting(false);
    }
  }

  // ── Single deactivate (from list) ────────────────────────────────────────
  async function handleDeactivate(docId: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const res = await fetch('/api/offline-kits/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
        body: JSON.stringify({ docId }),
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'Kit deactivated' });
    } catch {
      toast({ title: 'Error', description: 'Could not deactivate.', variant: 'destructive' });
    }
  }

  // ── CSV Export ────────────────────────────────────────────────────────────
  function handleExport() {
    const url = `/api/offline-kits/export${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`;
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

  // ── Helpers ───────────────────────────────────────────────────────────────
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

  // ── Bulk delete dialog content ─────────────────────────────────────────
  const bulkDeleteHasActivated = selectedActivatedCount > 0;

  return (
    <div className="space-y-8">

      {/* ── Floating bulk-action bar ────────────────────────────────────── */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border bg-background/95 backdrop-blur-md shadow-2xl px-5 py-3">
          <span className="text-sm font-semibold text-foreground">
            {selectedCount} kit{selectedCount !== 1 ? 's' : ''} selected
          </span>

          <div className="w-px h-5 bg-border" />

          {/* Bulk delete */}
          <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                disabled={isBulkDeleting}
                onClick={() => setBulkDeleteOpen(true)}
              >
                {isBulkDeleting
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <Trash2 className="h-4 w-4 mr-2" />}
                Delete Selected
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {bulkDeleteHasActivated
                    ? `⚠️ Delete ${selectedCount} kits including activated ones?`
                    : `Delete ${selectedCount} kit${selectedCount !== 1 ? 's' : ''}?`}
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  {bulkDeleteHasActivated ? (
                    <>
                      <span className="block text-destructive font-semibold">
                        {selectedActivatedCount} of the selected kits are activated and linked to customers.
                      </span>
                      <span className="block">
                        All {selectedCount} kits will be permanently deleted from Firestore. Customer Firebase accounts will still exist but these kits will no longer be trackable. This cannot be undone.
                      </span>
                    </>
                  ) : (
                    <span>
                      This will permanently delete {selectedCount} kit{selectedCount !== 1 ? 's' : ''} from Firestore. This action cannot be undone.
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={() => handleBulkDelete(true)}
                >
                  Yes, Delete {selectedCount} Kit{selectedCount !== 1 ? 's' : ''}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Clear */}
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
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

      {/* ── Analytics ───────────────────────────────────────────────────── */}
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

      {/* ── Kit Table ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>All Kits</CardTitle>
              <CardDescription>
                {selectedCount > 0
                  ? `${selectedCount} selected · Click rows to select`
                  : 'Click rows to select · use the floating bar to delete selected'}
              </CardDescription>
            </div>
          </div>
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
            {selectedCount > 0 && (
              <Button
                size="sm" variant="ghost"
                className="text-muted-foreground"
                onClick={clearSelection}
              >
                <X className="h-3.5 w-3.5 mr-1" /> Clear selection
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      data-state={someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked'}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                      className="mt-0.5"
                    />
                  </TableHead>
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
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading kits…
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                      No kits found.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  filtered.map((kit) => {
                    const isSelected = selectedIds.has(kit.id);
                    const created = parseDate(kit.createdAt);
                    const activatedDate = parseDate(kit.activatedAt);
                    return (
                      <TableRow
                        key={kit.id}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/5 hover:bg-primary/10'
                            : 'hover:bg-muted/60'
                        }`}
                        onClick={() => toggleOne(kit.id)}
                      >
                        {/* Checkbox cell — stop propagation so clicking it doesn't also navigate */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleOne(kit.id)}
                            aria-label={`Select ${kit.kitId}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold">{kit.kitId}</TableCell>
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
                          {activatedDate ? format(activatedDate, 'dd MMM yyyy') : '—'}
                        </TableCell>
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost" size="icon"
                              title="View details"
                              onClick={() => router.push(`/admin/offline-kits/${kit.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {kit.status === 'activated' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost" size="icon"
                                    className="text-amber-500 hover:text-amber-600"
                                    title="Deactivate"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Deactivate {kit.kitId}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will revoke tutorial access for {kit.customerName || 'this user'}.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={(e) => handleDeactivate(kit.id, e)}>
                                      Deactivate
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {isLoading && (
              <div className="text-center py-8">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              </div>
            )}
            {!isLoading && filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No kits found.</p>
            )}
            {!isLoading &&
              filtered.map((kit) => {
                const isSelected = selectedIds.has(kit.id);
                const created = parseDate(kit.createdAt);
                return (
                  <Card
                    key={kit.id}
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'
                    }`}
                    onClick={() => toggleOne(kit.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleOne(kit.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="font-mono text-sm font-bold">{kit.kitId}</span>
                        </div>
                        {statusBadge(kit.status)}
                      </div>
                      <CardDescription>{kit.batchName}{kit.shopName ? ` · ${kit.shopName}` : ''}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground space-y-1">
                      {kit.customerName && <p>👤 {kit.customerName} · {kit.customerEmail}</p>}
                      {created && <p>Created: {format(created, 'dd MMM yyyy')}</p>}
                      <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => router.push(`/admin/offline-kits/${kit.id}`)}
                        >
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                      </div>
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
