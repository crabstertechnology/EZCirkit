'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, writeBatch, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Cpu,
  ArrowUpCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  LogIn,
  Activity,
  Code,
  Trash2,
  Filter
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReChartsTooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

interface TelemetryLogin {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string;
  status: 'success' | 'failed';
  latencyMs: number;
  error: string | null;
  timestamp: any;
  userAgent: string;
}

interface TelemetryCompile {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  status: 'success' | 'failed';
  latencyMs: number;
  codeLength: number;
  error: string | null;
  errorSource: 'network' | 'compiler_server' | 'compiler_error' | 'none';
  timestamp: any;
  userAgent: string;
}

interface TelemetryUpload {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  status: 'success' | 'failed';
  latencyMs: number;
  pageSize: number;
  error: string | null;
  timestamp: any;
  userAgent: string;
}

interface TelemetryInteraction {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  type: 'page_view' | 'click';
  path: string;
  elementId?: string;
  elementLabel?: string;
  timestamp: any;
  userAgent: string;
}

interface MergedEvent {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  status?: 'success' | 'failed';
  latencyMs?: number;
  error?: string | null;
  errorSource?: string;
  timestamp: any;
  userAgent?: string;
  eventType: 'login' | 'compile' | 'upload' | 'interaction';
  details: string;
  rawActionSnippet: string;
}

const DONUT_COLORS = {
  success: '#22c55e',
  failure: '#ef4444',
};

export default function AdminTelemetryPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  // Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTargetCollection, setDeleteTargetCollection] = useState('all');
  const [deleteMode, setDeleteMode] = useState<'before' | 'range' | 'all'>('before');
  const [beforeDateTime, setBeforeDateTime] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Set default beforeDateTime to now when modal opens
  useEffect(() => {
    if (isDeleteOpen && !beforeDateTime) {
      setBeforeDateTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    }
  }, [isDeleteOpen, beforeDateTime]);

  // Real-time Firestore queries capped at 150 documents each
  const loginsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'telemetry_logins'), orderBy('timestamp', 'desc'), limit(150)) : null),
    [firestore]
  );
  const compilesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'telemetry_compiles'), orderBy('timestamp', 'desc'), limit(150)) : null),
    [firestore]
  );
  const uploadsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'telemetry_uploads'), orderBy('timestamp', 'desc'), limit(150)) : null),
    [firestore]
  );
  const interactionsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'telemetry_interactions'), orderBy('timestamp', 'desc'), limit(150)) : null),
    [firestore]
  );

  const { data: logins, isLoading: loadingLogins } = useCollection<TelemetryLogin>(loginsQuery);
  const { data: compiles, isLoading: loadingCompiles } = useCollection<TelemetryCompile>(compilesQuery);
  const { data: uploads, isLoading: loadingUploads } = useCollection<TelemetryUpload>(uploadsQuery);
  const { data: interactions, isLoading: loadingInteractions } = useCollection<TelemetryInteraction>(interactionsQuery);

  const isGlobalLoading = loadingLogins || loadingCompiles || loadingUploads || loadingInteractions;

  // Safe date helper for Firestore timestamps
  const parseDate = (dateObj: any): Date => {
    if (!dateObj) return new Date();
    if (typeof dateObj.toDate === 'function') return dateObj.toDate();
    if (dateObj.seconds !== undefined) return new Date(dateObj.seconds * 1000);
    return new Date(dateObj);
  };

  // Quick preset filter application
  const handleApplyPreset = (preset: 'now' | '10m' | '1h' | '24h' | '7d') => {
    setDeleteMode('before');
    const now = new Date();
    let cutoff = new Date();
    if (preset === 'now') cutoff = new Date(now.getTime() + 60 * 1000); // 1 minute in future to catch all
    else if (preset === '10m') cutoff = new Date(now.getTime() - 10 * 60 * 1000);
    else if (preset === '1h') cutoff = new Date(now.getTime() - 60 * 60 * 1000);
    else if (preset === '24h') cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    else if (preset === '7d') cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const formatted = format(cutoff, "yyyy-MM-dd'T'HH:mm");
    setBeforeDateTime(formatted);
  };

  // Execute log deletion in Firestore
  const handleDeleteLogs = async () => {
    if (!firestore) return;
    setIsDeleting(true);

    try {
      const collectionsToProcess =
        deleteTargetCollection === 'all'
          ? ['telemetry_logins', 'telemetry_compiles', 'telemetry_uploads', 'telemetry_interactions']
          : [deleteTargetCollection];

      let totalDeleted = 0;

      for (const colName of collectionsToProcess) {
        const snapshot = await getDocs(collection(firestore, colName));
        const docsToDelete = snapshot.docs.filter((docSnap) => {
          if (deleteMode === 'all') return true;
          const docData = docSnap.data();
          const docTime = parseDate(docData.timestamp).getTime();

          if (deleteMode === 'before') {
            if (!beforeDateTime) return true;
            const cutoff = new Date(beforeDateTime).getTime();
            return docTime <= cutoff;
          }

          if (deleteMode === 'range') {
            if (!startDateTime || !endDateTime) return false;
            const start = new Date(startDateTime).getTime();
            const end = new Date(endDateTime).getTime();
            return docTime >= start && docTime <= end;
          }

          return false;
        });

        if (docsToDelete.length > 0) {
          for (let i = 0; i < docsToDelete.length; i += 400) {
            const batch = writeBatch(firestore);
            const chunk = docsToDelete.slice(i, i + 400);
            chunk.forEach((docSnap) => batch.delete(docSnap.ref));
            await batch.commit();
          }
          totalDeleted += docsToDelete.length;
        }
      }

      toast({
        title: 'Logs Deleted',
        description: `Successfully purged ${totalDeleted} telemetry log document(s).`,
      });

      setIsDeleteOpen(false);
    } catch (err: any) {
      console.error('Error deleting logs:', err);
      toast({
        title: 'Deletion Failed',
        description: err.message || 'Failed to delete telemetry logs.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Compile statistics
  const compileStats = useMemo(() => {
    if (!compiles || compiles.length === 0) return { avg: 0, count: 0, successRate: 100, successCount: 0 };
    const successList = compiles.filter((c) => c.status === 'success');
    const totalLatency = successList.reduce((sum, c) => sum + (c.latencyMs || 0), 0);
    return {
      avg: successList.length > 0 ? totalLatency / successList.length : 0,
      count: compiles.length,
      successCount: successList.length,
      successRate: Math.round((successList.length / compiles.length) * 100),
    };
  }, [compiles]);

  // Upload statistics
  const uploadStats = useMemo(() => {
    if (!uploads || uploads.length === 0) return { avg: 0, count: 0, successRate: 100, successCount: 0 };
    const successList = uploads.filter((u) => u.status === 'success');
    const totalLatency = successList.reduce((sum, u) => sum + (u.latencyMs || 0), 0);
    return {
      avg: successList.length > 0 ? totalLatency / successList.length : 0,
      count: uploads.length,
      successCount: successList.length,
      successRate: Math.round((successList.length / uploads.length) * 100),
    };
  }, [uploads]);

  // Merged stream of all events
  const mergedEvents = useMemo((): MergedEvent[] => {
    const list: MergedEvent[] = [];

    (logins || []).forEach((l) => {
      const isOk = l.status === 'success';
      list.push({
        id: l.id,
        userId: l.userId,
        userName: l.userName,
        userEmail: l.userEmail,
        status: l.status,
        latencyMs: l.latencyMs,
        error: l.error,
        timestamp: l.timestamp,
        userAgent: l.userAgent,
        eventType: 'login',
        details: isOk
          ? `Logged in successfully (${(l.latencyMs / 1000).toFixed(1)}s)`
          : `Login failed: ${l.error || 'Authentication error'}`,
        rawActionSnippet: isOk ? 'Logged in' : 'Login failed',
      });
    });

    (compiles || []).forEach((c) => {
      const isOk = c.status === 'success';
      const sec = (c.latencyMs / 1000).toFixed(1);
      list.push({
        id: c.id,
        userId: c.userId,
        userName: c.userName,
        userEmail: c.userEmail,
        status: c.status,
        latencyMs: c.latencyMs,
        error: c.error,
        errorSource: c.errorSource,
        timestamp: c.timestamp,
        userAgent: c.userAgent,
        eventType: 'compile',
        details: isOk
          ? `${sec}s • ${c.codeLength || 0} chars`
          : `Failed (${sec}s): ${c.error || 'Syntax error'} [${c.errorSource}]`,
        rawActionSnippet: isOk ? `Compiled sketch (${sec}s)` : `Compile error [${c.errorSource}]`,
      });
    });

    (uploads || []).forEach((u) => {
      const isOk = u.status === 'success';
      const sec = (u.latencyMs / 1000).toFixed(1);
      const payloadKb = ((u.pageSize || 0) * 0.125).toFixed(1);
      list.push({
        id: u.id,
        userId: u.userId,
        userName: u.userName,
        userEmail: u.userEmail,
        status: u.status,
        latencyMs: u.latencyMs,
        error: u.error,
        timestamp: u.timestamp,
        userAgent: u.userAgent,
        eventType: 'upload',
        details: isOk
          ? `${sec}s • ${payloadKb} KB (${u.pageSize || 0} pages)`
          : `Failed (${sec}s): ${u.error || 'Web Serial error'}`,
        rawActionSnippet: isOk ? `Flashed board (${sec}s)` : `Flash error: ${u.error || 'Upload error'}`,
      });
    });

    (interactions || []).forEach((i) => {
      const label = i.elementLabel || i.elementId || i.path || 'UI Element';
      list.push({
        id: i.id,
        userId: i.userId,
        userName: i.userName,
        userEmail: i.userEmail,
        timestamp: i.timestamp,
        userAgent: i.userAgent,
        eventType: 'interaction',
        details: i.type === 'page_view' ? `Viewed page: ${i.path}` : `Clicked ${label}`,
        rawActionSnippet: i.type === 'page_view' ? `Viewing ${i.path}` : `Clicked ${label}`,
      });
    });

    list.sort((a, b) => parseDate(b.timestamp).getTime() - parseDate(a.timestamp).getTime());
    return list;
  }, [logins, compiles, uploads, interactions]);

  // Active Users directory (active in last 15 minutes)
  const activeUsers = useMemo(() => {
    const activeMap = new Map<string, { name: string; email: string; lastSeen: Date; action: string }>();
    const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;

    mergedEvents.forEach((e) => {
      const email = e.userEmail || '';
      const name = e.userName || 'Anonymous Tester';
      const eventTime = parseDate(e.timestamp);

      if (email && eventTime.getTime() > fifteenMinsAgo) {
        if (!activeMap.has(email)) {
          activeMap.set(email, {
            name,
            email,
            lastSeen: eventTime,
            action: e.rawActionSnippet,
          });
        }
      }
    });

    return Array.from(activeMap.values()).sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
  }, [mergedEvents]);

  // Error Categorization data
  const errorCategorizationData = useMemo(() => {
    if (!compiles) return [];
    let syntax = 0;
    let server = 0;
    let network = 0;

    compiles.forEach((c) => {
      if (c.status === 'failed') {
        if (c.errorSource === 'compiler_error') syntax++;
        else if (c.errorSource === 'compiler_server') server++;
        else if (c.errorSource === 'network') network++;
        else syntax++;
      }
    });

    return [
      { category: 'Code Syntax Error', count: syntax },
      { category: 'Server Container Failure', count: server },
      { category: 'Client Network Error', count: network },
    ].sort((a, b) => b.count - a.count);
  }, [compiles]);

  // Feature Interaction Usage data
  const interactionClicksData = useMemo(() => {
    if (!interactions) return [];
    const counts: { [key: string]: number } = {};
    interactions.forEach((i) => {
      if (i.type === 'click') {
        const label = i.elementLabel || i.elementId || 'Other Control';
        counts[label] = (counts[label] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [interactions]);

  // Compiler Latency chronological line chart
  const compileLatencyChartData = useMemo(() => {
    if (!compiles) return [];
    return compiles
      .slice()
      .reverse()
      .filter((c) => c.status === 'success')
      .map((c) => ({
        time: format(parseDate(c.timestamp), 'HH:mm:ss'),
        latency: parseFloat((c.latencyMs / 1000).toFixed(2)),
      }));
  }, [compiles]);

  const getHealthBadgeVariant = (rate: number): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (rate >= 80) return 'default';
    if (rate >= 50) return 'secondary';
    return 'destructive';
  };

  const openDeleteModal = () => {
    setBeforeDateTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setIsDeleteOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Telemetry Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time health and performance monitoring for pilot testing sessions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isGlobalLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {/* Delete Logs Dialog */}
          <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" onClick={openDeleteModal} className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Logs
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  Delete Telemetry Logs
                </DialogTitle>
                <DialogDescription>
                  Purge telemetry logs by collection, date, and time.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-sm">
                {/* Collection Selection */}
                <div className="space-y-1.5">
                  <Label htmlFor="target-col">Target Collection</Label>
                  <Select value={deleteTargetCollection} onValueChange={setDeleteTargetCollection}>
                    <SelectTrigger id="target-col">
                      <SelectValue placeholder="Select collection" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Telemetry Collections</SelectItem>
                      <SelectItem value="telemetry_compiles">Compiles (telemetry_compiles)</SelectItem>
                      <SelectItem value="telemetry_uploads">Uploads (telemetry_uploads)</SelectItem>
                      <SelectItem value="telemetry_logins">Logins (telemetry_logins)</SelectItem>
                      <SelectItem value="telemetry_interactions">Interactions (telemetry_interactions)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Mode Selection */}
                <div className="space-y-1.5">
                  <Label htmlFor="delete-mode">Filter Type</Label>
                  <Select value={deleteMode} onValueChange={(val: any) => setDeleteMode(val)}>
                    <SelectTrigger id="delete-mode">
                      <SelectValue placeholder="Select deletion rule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="before">Logs Before Specific Date & Time</SelectItem>
                      <SelectItem value="range">Date & Time Range (Start to End)</SelectItem>
                      <SelectItem value="all">Purge All Logs in Collection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Preset Buttons */}
                {deleteMode === 'before' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Filter className="h-3 w-3" /> Quick Presets
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={() => handleApplyPreset('now')}>
                        Up to Now
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleApplyPreset('10m')}>
                        Older than 10m
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleApplyPreset('1h')}>
                        Older than 1h
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleApplyPreset('24h')}>
                        Older than 24h
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleApplyPreset('7d')}>
                        Older than 7d
                      </Button>
                    </div>
                  </div>
                )}

                {/* Date & Time Selectors */}
                {deleteMode === 'before' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="before-dt">Delete Logs On or Before Date & Time</Label>
                    <Input
                      id="before-dt"
                      type="datetime-local"
                      value={beforeDateTime}
                      onChange={(e) => setBeforeDateTime(e.target.value)}
                    />
                  </div>
                )}

                {deleteMode === 'range' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="start-dt">From Date & Time</Label>
                      <Input
                        id="start-dt"
                        type="datetime-local"
                        value={startDateTime}
                        onChange={(e) => setStartDateTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="end-dt">To Date & Time</Label>
                      <Input
                        id="end-dt"
                        type="datetime-local"
                        value={endDateTime}
                        onChange={(e) => setEndDateTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" onClick={handleDeleteLogs} disabled={isDeleting}>
                  {isDeleting ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Deleting...
                    </div>
                  ) : (
                    'Confirm Delete'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 1. TOP METRIC BAR (4 Live Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Testers Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Testers (15m)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isGlobalLoading ? '...' : activeUsers.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active unique users (of 60 enrolled)
            </p>
          </CardContent>
        </Card>

        {/* Compile Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compile Success Rate</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">
                {isGlobalLoading ? '...' : `${compileStats.successRate}%`}
              </div>
              {!isGlobalLoading && (
                <Badge variant={getHealthBadgeVariant(compileStats.successRate)}>
                  {compileStats.successRate >= 80 ? 'Healthy' : compileStats.successRate >= 50 ? 'Warning' : 'Critical'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {compileStats.successCount} passed of {compileStats.count} requests
            </p>
          </CardContent>
        </Card>

        {/* Upload Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upload Success Rate</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">
                {isGlobalLoading ? '...' : `${uploadStats.successRate}%`}
              </div>
              {!isGlobalLoading && (
                <Badge variant={getHealthBadgeVariant(uploadStats.successRate)}>
                  {uploadStats.successRate >= 80 ? 'Healthy' : uploadStats.successRate >= 50 ? 'Warning' : 'Critical'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {uploadStats.successCount} flashed of {uploadStats.count} operations
            </p>
          </CardContent>
        </Card>

        {/* Avg Latencies */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latencies</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {isGlobalLoading ? (
                '...'
              ) : (
                `C ${(compileStats.avg / 1000).toFixed(1)}s | U ${(uploadStats.avg / 1000).toFixed(1)}s`
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average compile & flash speed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="logs">Live Log Feed</TabsTrigger>
        </TabsList>

        {/* TAB A — OVERVIEW */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active User Directory Table */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Active User Directory</CardTitle>
                <CardDescription>
                  Testers active within the last 15 minutes, sorted by recent activity.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    No active user sessions recorded in the last 15 minutes.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px] text-center">Status</TableHead>
                          <TableHead>Tester</TableHead>
                          <TableHead>Last Action</TableHead>
                          <TableHead>Latest Operation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeUsers.map((u) => (
                          <TableRow key={u.email}>
                            <TableCell className="text-center">
                              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{u.name}</div>
                              <div className="text-xs text-muted-foreground">{u.email}</div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(u.lastSeen, { addSuffix: true })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-normal text-xs">
                                {u.action}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Error Diagnostics (Horizontal Bar Chart) */}
            <Card>
              <CardHeader>
                <CardTitle>Error Diagnostics</CardTitle>
                <CardDescription>
                  Categorized breakdown of compiler failures.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {errorCategorizationData.every((d) => d.count === 0) ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    No compilation errors recorded.
                  </p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={errorCategorizationData}
                        layout="vertical"
                        margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={120} />
                        <ReChartsTooltip />
                        <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB B — CHARTS */}
        <TabsContent value="charts" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compiler Latency Line Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Compiler Latency (Seconds)</CardTitle>
                <CardDescription>
                  Chronological compile request latency profile.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {compileLatencyChartData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No compile data available.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={compileLatencyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <ReChartsTooltip />
                        <Line type="monotone" dataKey="latency" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feature Interaction Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Feature Interaction Usage</CardTitle>
                <CardDescription>
                  Ranked breakdown of most-clicked controls in the IDE.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {interactionClicksData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No click logs available.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={interactionClicksData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="action" tick={{ fontSize: 10 }} width={110} />
                        <ReChartsTooltip />
                        <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compile Success Donut */}
            <Card>
              <CardHeader>
                <CardTitle>Compile Success Ring</CardTitle>
                <CardDescription>
                  Ratio of successful compilations vs errors.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center">
                {compileStats.count === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No compile logs available.</p>
                ) : (
                  <div className="h-56 w-full relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Success', value: compileStats.successCount },
                            { name: 'Failure', value: compileStats.count - compileStats.successCount },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          <Cell fill={DONUT_COLORS.success} />
                          <Cell fill={DONUT_COLORS.failure} />
                        </Pie>
                        <ReChartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold">{compileStats.successRate}%</span>
                      <span className="text-xs text-muted-foreground">Success</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upload Success Donut */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Success Ring</CardTitle>
                <CardDescription>
                  Ratio of successful hardware flashes vs errors.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center">
                {uploadStats.count === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No upload logs available.</p>
                ) : (
                  <div className="h-56 w-full relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Success', value: uploadStats.successCount },
                            { name: 'Failure', value: uploadStats.count - uploadStats.successCount },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          <Cell fill={DONUT_COLORS.success} />
                          <Cell fill={DONUT_COLORS.failure} />
                        </Pie>
                        <ReChartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold">{uploadStats.successRate}%</span>
                      <span className="text-xs text-muted-foreground">Success</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB C — LIVE LOG FEED */}
        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Log Feed</CardTitle>
              <CardDescription>
                Merged real-time telemetry stream from logins, compiles, uploads, and interactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isGlobalLoading ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Loading event logs...</p>
              ) : mergedEvents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No events logged yet.</p>
              ) : (
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-[120px]">Event Type</TableHead>
                        <TableHead className="w-[160px]">Timestamp</TableHead>
                        <TableHead className="w-[200px]">Tester</TableHead>
                        <TableHead>Detail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mergedEvents.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell>
                            {e.eventType === 'login' && (
                              <Badge className="bg-blue-500 text-white hover:bg-blue-500">
                                Login
                              </Badge>
                            )}
                            {e.eventType === 'compile' && (
                              <Badge variant={e.status === 'success' ? 'default' : 'destructive'}>
                                Compile
                              </Badge>
                            )}
                            {e.eventType === 'upload' && (
                              <Badge className={e.status === 'success' ? 'bg-purple-600 text-white hover:bg-purple-600' : 'bg-red-500 text-white hover:bg-red-500'}>
                                Upload
                              </Badge>
                            )}
                            {e.eventType === 'interaction' && (
                              <Badge variant="secondary">
                                Click
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs font-mono">
                            {format(parseDate(e.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            {e.userEmail ? (
                              <div>
                                <div className="font-medium text-sm truncate max-w-[180px]">{e.userName || 'Tester'}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-[180px]">{e.userEmail}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">Anonymous</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {e.details}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
