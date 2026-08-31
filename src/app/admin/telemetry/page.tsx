'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
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
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';  
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { parseDeviceOS } from '@/lib/telemetry';
import {
  Users,
  Cpu,
  ArrowUpCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Filter,
  Download,
  Search,
  Eye,
  Laptop,
  Layers,
  HardDrive,
  Activity,
  Zap,
  Gauge,
  Server,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Terminal,
  Globe,
  Sliders,
  Play
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
  Bar,
  AreaChart,
  Area
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
  codeLength?: number;
  codeLines?: number;
  flashUsedBytes?: number;
  ramUsedBytes?: number;
  boardModel?: string;
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
  pageSize?: number;
  boardModel?: string;
  vendorId?: string | null;
  productId?: string | null;
  baudRate?: number;
  retryCount?: number;
  portType?: string;
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
  boardModel?: string;
  codeLength?: number;
  codeLines?: number;
  flashUsedBytes?: number;
  ramUsedBytes?: number;
  vendorId?: string | null;
  productId?: string | null;
  baudRate?: number;
  retryCount?: number;
  path?: string;
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

const RENDER_SERVER_URL = "https://ezcirkit.onrender.com";
const RENDER_SERVICE_ID = "srv-d8sgl0ernols738l68s0";

export default function AdminTelemetryPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  // Phase 1: Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEventType, setFilterEventType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Phase 2: Tester Inspector Drawer
  const [selectedTesterEmail, setSelectedTesterEmail] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Render Server Live Health State
  const [renderStatus, setRenderStatus] = useState<'checking' | 'online' | 'cold_start' | 'offline'>('checking');
  const [renderLatency, setRenderLatency] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Terminal Console Tab Switch
  const [renderConsoleTab, setRenderConsoleTab] = useState<'logs' | 'links' | 'terminal'>('logs');

  // Delete modal state & retention
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTargetCollection, setDeleteTargetCollection] = useState('all');
  const [deleteMode, setDeleteMode] = useState<'before' | 'range' | 'all'>('before');
  const [beforeDateTime, setBeforeDateTime] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Live Render Container Health Check Function
  const checkRenderServerHealth = useCallback(async () => {
    setRenderStatus('checking');
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(`${RENDER_SERVER_URL}/`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      const elapsed = Math.round(performance.now() - start);
      setRenderLatency(elapsed);
      setLastChecked(new Date());

      if (res.ok || res.status === 304) {
        if (elapsed > 3500) setRenderStatus('cold_start');
        else setRenderStatus('online');
      } else {
        setRenderStatus('offline');
      }
    } catch (err) {
      console.warn('Render health ping failed or timed out:', err);
      const elapsed = Math.round(performance.now() - start);
      setRenderLatency(elapsed);
      setLastChecked(new Date());
      setRenderStatus('offline');
    }
  }, []);

  // Ping Render container on page mount and every 30 seconds
  useEffect(() => {
    checkRenderServerHealth();
    const interval = setInterval(checkRenderServerHealth, 30000);
    return () => clearInterval(interval);
  }, [checkRenderServerHealth]);

  // Set default beforeDateTime to current time when modal opens
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

  // Server Latency & Load Measurement Metrics (p50, p90, p95, peak, load buckets)
  const serverLatencyMetrics = useMemo(() => {
    if (!compiles || compiles.length === 0) {
      return { p50: 0, p90: 0, p95: 0, peak: 0, buckets: [] };
    }

    const latencies = compiles
      .map((c) => c.latencyMs || 0)
      .sort((a, b) => a - b);

    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * latencies.length) - 1;
      return latencies[Math.max(0, index)] / 1000;
    };

    const p50 = getPercentile(50);
    const p90 = getPercentile(90);
    const p95 = getPercentile(95);
    const peak = latencies[latencies.length - 1] / 1000;

    let fast = 0;
    let normal = 0;
    let heavy = 0;
    let critical = 0;

    latencies.forEach((ms) => {
      const sec = ms / 1000;
      if (sec < 1.5) fast++;
      else if (sec <= 3.0) normal++;
      else if (sec <= 5.0) heavy++;
      else critical++;
    });

    const buckets = [
      { category: '⚡ Fast (< 1.5s)', count: fast, fill: '#22c55e' },
      { category: '🟢 Normal (1.5s - 3s)', count: normal, fill: '#3b82f6' },
      { category: '⚠️ Heavy (3s - 5s)', count: heavy, fill: '#f59e0b' },
      { category: '🔴 Critical (> 5s)', count: critical, fill: '#ef4444' },
    ];

    return { p50, p90, p95, peak, buckets };
  }, [compiles]);

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
      const board = c.boardModel || 'Arduino Uno';
      list.push({
        id: c.id,
        userId: c.userId,
        userName: c.userName,
        userEmail: c.userEmail,
        status: c.status,
        latencyMs: c.latencyMs,
        error: c.error,
        errorSource: c.errorSource,
        boardModel: board,
        codeLength: c.codeLength,
        codeLines: c.codeLines,
        flashUsedBytes: c.flashUsedBytes,
        ramUsedBytes: c.ramUsedBytes,
        timestamp: c.timestamp,
        userAgent: c.userAgent,
        eventType: 'compile',
        details: isOk
          ? `${sec}s • ${c.codeLength || 0} chars (${board})`
          : `Failed (${sec}s): ${c.error || 'Syntax error'} [${c.errorSource}]`,
        rawActionSnippet: isOk ? `Compiled sketch (${sec}s)` : `Compile error [${c.errorSource}]`,
      });
    });

    (uploads || []).forEach((u) => {
      const isOk = u.status === 'success';
      const sec = (u.latencyMs / 1000).toFixed(1);
      const payloadKb = ((u.pageSize || 0) * 0.125).toFixed(1);
      const board = u.boardModel || 'Arduino Uno';
      list.push({
        id: u.id,
        userId: u.userId,
        userName: u.userName,
        userEmail: u.userEmail,
        status: u.status,
        latencyMs: u.latencyMs,
        error: u.error,
        boardModel: board,
        vendorId: u.vendorId,
        productId: u.productId,
        baudRate: u.baudRate,
        retryCount: u.retryCount,
        timestamp: u.timestamp,
        userAgent: u.userAgent,
        eventType: 'upload',
        details: isOk
          ? `${sec}s • ${payloadKb} KB (${board})`
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
        path: i.path,
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

  // Phase 1: Filtered merged events for search & dropdowns
  const filteredEvents = useMemo(() => {
    return mergedEvents.filter((e) => {
      if (filterEventType !== 'all' && e.eventType !== filterEventType) return false;
      if (filterStatus === 'success' && e.status !== 'success') return false;
      if (filterStatus === 'failed' && e.status !== 'failed') return false;

      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const emailMatch = (e.userEmail || '').toLowerCase().includes(term);
        const nameMatch = (e.userName || '').toLowerCase().includes(term);
        const detailMatch = e.details.toLowerCase().includes(term);
        const errorMatch = (e.error || '').toLowerCase().includes(term);
        if (!emailMatch && !nameMatch && !detailMatch && !errorMatch) return false;
      }

      return true;
    });
  }, [mergedEvents, filterEventType, filterStatus, searchTerm]);

  // Export Detailed Enterprise CSV Handler (25 Fields)
  const handleExportCSV = () => {
    if (mergedEvents.length === 0) {
      toast({ title: 'No Data', description: 'No telemetry events available to export.' });
      return;
    }

    const headers = [
      'Event ID',
      'Timestamp (Formatted)',
      'Timestamp (Epoch MS)',
      'Event Type',
      'Status',
      'Tester Name',
      'Tester Email',
      'Device OS',
      'Latency (ms)',
      'Latency Performance Tier',
      'Render Backend Host',
      'Render Service ID',
      'Target Board Model',
      'Error Message',
      'Error Source Category',
      'Code Character Count',
      'Code Line Count',
      'Flash Memory Bytes',
      'RAM Memory Bytes',
      'USB Vendor ID',
      'USB Product ID',
      'Baud Rate',
      'Flash Retry Count',
      'Route / Page Path',
      'Browser User Agent'
    ];

    const rows = filteredEvents.map((e) => {
      const parsedDt = parseDate(e.timestamp);
      const latencySec = (e.latencyMs || 0) / 1000;
      let latencyTier = 'N/A';
      if (e.eventType === 'compile' || e.eventType === 'upload') {
        if (latencySec < 1.5) latencyTier = '⚡ Fast (< 1.5s)';
        else if (latencySec <= 3.0) latencyTier = '🟢 Normal (1.5s - 3s)';
        else if (latencySec <= 5.0) latencyTier = '⚠️ Heavy (3s - 5s)';
        else latencyTier = '🔴 Critical (> 5s)';
      }

      const ua = e.userAgent || '';
      const deviceOs = parseDeviceOS(ua);

      return [
        `"${e.id}"`,
        `"${format(parsedDt, 'yyyy-MM-dd HH:mm:ss')}"`,
        `"${parsedDt.getTime()}"`,
        `"${e.eventType}"`,
        `"${e.status || 'N/A'}"`,
        `"${(e.userName || '').replace(/"/g, '""')}"`,
        `"${(e.userEmail || '').replace(/"/g, '""')}"`,
        `"${deviceOs}"`,
        `"${e.latencyMs || 0}"`,
        `"${latencyTier}"`,
        `"${RENDER_SERVER_URL}"`,
        `"${RENDER_SERVICE_ID}"`,
        `"${e.boardModel || 'N/A'}"`,
        `"${(e.error || '').replace(/"/g, '""')}"`,
        `"${e.errorSource || 'N/A'}"`,
        `"${e.codeLength || 0}"`,
        `"${e.codeLines || 0}"`,
        `"${e.flashUsedBytes || 0}"`,
        `"${e.ramUsedBytes || 0}"`,
        `"${e.vendorId || 'N/A'}"`,
        `"${e.productId || 'N/A'}"`,
        `"${e.baudRate || 115200}"`,
        `"${e.retryCount || 0}"`,
        `"${e.path || 'N/A'}"`,
        `"${ua.replace(/"/g, '""')}"`,
      ];
    });

    const metadataHeader = [
      `# EZCirkit Telemetry & Hardware Pilot Enterprise Export`,
      `# Generated Date: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
      `# Total Records: ${filteredEvents.length}`,
      `# Render Container ID: ${RENDER_SERVICE_ID}`,
      `# Render Container URL: ${RENDER_SERVER_URL}`,
      `# Applied Filters: EventType=${filterEventType}, Status=${filterStatus}, Search="${searchTerm}"`,
      ``
    ].join('\n');

    const csvContent = metadataHeader + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ezcirkit_telemetry_enterprise_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Enterprise CSV Exported',
      description: `Downloaded ${filteredEvents.length} telemetry records with 25 diagnostic fields & Render backend metadata.`,
    });
  };

  // Active Users directory
  const activeUsers = useMemo(() => {
    const activeMap = new Map<string, { name: string; email: string; lastSeen: Date; action: string; userAgent: string }>();
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
            userAgent: e.userAgent || 'Unknown Browser',
          });
        }
      }
    });

    return Array.from(activeMap.values()).sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
  }, [mergedEvents]);

  // Open Tester Inspector Sheet
  const handleInspectTester = (email: string) => {
    setSelectedTesterEmail(email);
    setIsInspectorOpen(true);
  };

  // Inspector Data for selected tester
  const testerInspectorData = useMemo(() => {
    if (!selectedTesterEmail) return null;

    const userEvents = mergedEvents.filter((e) => e.userEmail === selectedTesterEmail);
    const userCompiles = userEvents.filter((e) => e.eventType === 'compile');
    const userUploads = userEvents.filter((e) => e.eventType === 'upload');

    const compilePassed = userCompiles.filter((e) => e.status === 'success').length;
    const uploadPassed = userUploads.filter((e) => e.status === 'success').length;

    const sampleUA = userEvents[0]?.userAgent || 'Unknown Device';
    const deviceSummary = parseDeviceOS(sampleUA);

    return {
      email: selectedTesterEmail,
      name: userEvents[0]?.userName || 'Tester',
      deviceSummary,
      rawUA: sampleUA,
      totalEvents: userEvents.length,
      compilesCount: userCompiles.length,
      compileRate: userCompiles.length > 0 ? Math.round((compilePassed / userCompiles.length) * 100) : 100,
      uploadsCount: userUploads.length,
      uploadRate: userUploads.length > 0 ? Math.round((uploadPassed / userUploads.length) * 100) : 100,
      events: userEvents,
    };
  }, [selectedTesterEmail, mergedEvents]);

  // Hardware Board Telemetry Chart Data
  const boardDistributionData = useMemo(() => {
    const counts: { [key: string]: number } = {
      'Arduino Uno': 0,
      'ESP32': 0,
      'Arduino Nano': 0,
      'ESP8266': 0,
      'Other': 0,
    };

    mergedEvents.forEach((e) => {
      if (e.boardModel) {
        if (counts[e.boardModel] !== undefined) counts[e.boardModel]++;
        else counts['Other']++;
      }
    });

    return Object.entries(counts).map(([board, count]) => ({ board, count }));
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
        codeLength: c.codeLength || 0,
      }));
  }, [compiles]);

  const getHealthBadgeVariant = (rate: number): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (rate >= 80) return 'default';
    if (rate >= 50) return 'secondary';
    return 'destructive';
  };

  // Quick preset filter application for delete modal
  const handleApplyPreset = (preset: 'now' | '10m' | '1h' | '24h' | '7d' | '30d') => {
    setDeleteMode('before');
    const now = new Date();
    let cutoff = new Date();
    if (preset === 'now') cutoff = new Date(now.getTime() + 60 * 1000);
    else if (preset === '10m') cutoff = new Date(now.getTime() - 10 * 60 * 1000);
    else if (preset === '1h') cutoff = new Date(now.getTime() - 60 * 60 * 1000);
    else if (preset === '24h') cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    else if (preset === '7d') cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (preset === '30d') cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

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

  const openDeleteModal = () => {
    setBeforeDateTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setIsDeleteOpen(true);
  };

  // System Health Warning Check
  const hasSystemWarning = compileStats.count > 0 && (compileStats.successRate < 75 || uploadStats.successRate < 70);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Telemetry Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time server latency, health performance, and hardware diagnostics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              checkRenderServerHealth();
              window.location.reload();
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isGlobalLoading || renderStatus === 'checking' ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {/* Export CSV Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Export CSV
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
                      <Button type="button" variant="outline" size="sm" onClick={() => handleApplyPreset('30d')}>
                        Older than 30d
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

                <div className="rounded-md border p-3 bg-muted/30 text-xs text-muted-foreground space-y-1">
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <HardDrive className="h-3.5 w-3.5" /> Retention Policy Note
                  </span>
                  <p>Purging logs older than 30 days keeps Firestore query speeds under 50ms and optimizes database storage costs.</p>
                </div>
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

      {/* Real-time System Health Alert Banner */}
      {hasSystemWarning && (
        <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <AlertTitle className="font-semibold">System Health Threshold Warning</AlertTitle>
          <AlertDescription className="text-sm">
            High error rate detected during pilot session! Compile success is {compileStats.successRate}% (Threshold: 75%) and Upload success is {uploadStats.successRate}% (Threshold: 70%). Check Error Diagnostics below.
          </AlertDescription>
        </Alert>
      )}

      {/* Live Render Backend Health Banner */}
      <div className="rounded-xl border p-4 bg-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400">
            <Server className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base">Compiler Backend Service</h3>
              <Badge variant="outline" className="text-[10px] font-mono">
                {RENDER_SERVICE_ID}
              </Badge>
              {renderStatus === 'online' && (
                <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> ONLINE ({renderLatency}ms)
                </Badge>
              )}
              {renderStatus === 'cold_start' && (
                <Badge className="bg-amber-500 hover:bg-amber-500 text-white flex items-center gap-1">
                  <Clock className="h-3 w-3" /> COLD START ({renderLatency}ms)
                </Badge>
              )}
              {renderStatus === 'offline' && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" /> UNREACHABLE
                </Badge>
              )}
              {renderStatus === 'checking' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Pinging...
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              Host: <a href={RENDER_SERVER_URL} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">{RENDER_SERVER_URL}</a> • Render Docker Free Tier Container
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={checkRenderServerHealth}
            disabled={renderStatus === 'checking'}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${renderStatus === 'checking' ? 'animate-spin' : ''}`} />
            Re-ping Container
          </Button>

          <Button
            variant="default"
            size="sm"
            asChild
            className="text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <a href={`https://dashboard.render.com/web/${RENDER_SERVICE_ID}/logs`} target="_blank" rel="noopener noreferrer">
              <Terminal className="h-3.5 w-3.5" /> Render Live Logs <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </div>

      {/* TOP METRIC BAR (4 Live Cards) */}
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
        <div className="overflow-x-auto pb-1 max-w-full">
          <TabsList className="flex sm:grid sm:grid-cols-5 min-w-max sm:min-w-0 max-w-2xl gap-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm px-3 py-1.5">Overview</TabsTrigger>
            <TabsTrigger value="charts" className="text-xs sm:text-sm px-3 py-1.5">Charts</TabsTrigger>
            <TabsTrigger value="latency" className="text-xs sm:text-sm px-3 py-1.5 flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" /> Server Load
            </TabsTrigger>
            <TabsTrigger value="render" className="text-xs sm:text-sm px-3 py-1.5 flex items-center gap-1">
              <Server className="h-3.5 w-3.5 text-purple-500 shrink-0" /> Render Backend
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs sm:text-sm px-3 py-1.5">Live Log Feed</TabsTrigger>
          </TabsList>
        </div>

        {/* TAB A — OVERVIEW */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active User Directory Table */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Active User Directory</CardTitle>
                <CardDescription>
                  Testers active within the last 15 minutes. Click any tester to inspect their activity drawer.
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
                          <TableHead className="w-[80px] text-right">Inspect</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeUsers.map((u) => (
                          <TableRow key={u.email} className="cursor-pointer hover:bg-muted/50" onClick={() => handleInspectTester(u.email)}>
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
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleInspectTester(u.email); }}>
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              </Button>
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

            {/* Hardware Board Telemetry Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Microcontroller Board Distribution</CardTitle>
                <CardDescription>
                  Target hardware board types utilized by testers during compiles & flashes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={boardDistributionData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="board" tick={{ fontSize: 10 }} width={100} />
                      <ReChartsTooltip />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB C — SERVER LOAD & LATENCY MEASUREMENT */}
        <TabsContent value="latency" className="space-y-6 mt-4">
          {/* Server Latency Percentile Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400">
                  p50 Median Load
                </CardTitle>
                <Zap className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {serverLatencyMetrics.p50.toFixed(2)}s
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Median compilation response time
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400">
                  p90 Load Latency
                </CardTitle>
                <Gauge className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {serverLatencyMetrics.p90.toFixed(2)}s
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  90% of requests compile under this limit
                </p>
              </CardContent>
            </Card>

            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-amber-600 dark:text-amber-400">
                  p95 Tail Load
                </CardTitle>
                <Activity className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {serverLatencyMetrics.p95.toFixed(2)}s
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Tail response latency under heavy load
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-red-600 dark:text-red-400">
                  Peak Compile Load
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {serverLatencyMetrics.peak.toFixed(2)}s
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Worst-case build duration logged
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Server Load Latency Distribution Buckets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-amber-500" /> Server Load Latency Distribution
                </CardTitle>
                <CardDescription>
                  Categorizes compiler load into response duration performance tiers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={serverLatencyMetrics.buckets} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={130} />
                      <ReChartsTooltip />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {serverLatencyMetrics.buckets.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Compile Latency Area Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" /> Compiler Load Latency Profile
                </CardTitle>
                <CardDescription>
                  Area latency curve over time showing server build performance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {compileLatencyChartData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No latency data logged yet.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={compileLatencyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <ReChartsTooltip />
                        <Area type="monotone" dataKey="latency" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB D — RENDER BACKEND CONTROL DASHBOARD & LIVE TERMINAL CONSOLE */}
        <TabsContent value="render" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Instance Control Card */}
            <Card className="lg:col-span-1 border-purple-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-purple-500" /> Render Container Profile
                </CardTitle>
                <CardDescription>
                  Docker container runtime configuration on Render.com.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Service Name</span>
                    <span className="font-medium">EZCirkit</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Service ID</span>
                    <span className="font-mono text-xs">{RENDER_SERVICE_ID}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Instance Type</span>
                    <Badge variant="secondary" className="text-[10px]">Docker (Free Tier)</Badge>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Git Repository</span>
                    <span className="font-mono text-xs">crabstertechnology/EZCirkit</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Git Branch</span>
                    <Badge variant="outline" className="text-[10px]">main</Badge>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Compiler Endpoint</span>
                    <span className="font-mono text-xs text-primary truncate max-w-[150px]">
                      {RENDER_SERVER_URL}/api/compile
                    </span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-muted-foreground">Last Live Ping</span>
                    <span className="font-mono text-xs">
                      {lastChecked ? format(lastChecked, 'HH:mm:ss') : 'Never'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Button asChild variant="default" className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2">
                    <a href={`https://dashboard.render.com/web/${RENDER_SERVICE_ID}/logs`} target="_blank" rel="noopener noreferrer">
                      <Terminal className="h-4 w-4" /> Open Render Workstation <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="w-full gap-2">
                    <a href={`https://dashboard.render.com/web/${RENDER_SERVICE_ID}/metrics`} target="_blank" rel="noopener noreferrer">
                      <Activity className="h-4 w-4 text-blue-500" /> View CPU & RAM Metrics <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Embedded Live Compiler Terminal & Render Controls */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-emerald-500" /> Live Compiler Console & Logs
                  </CardTitle>
                  <CardDescription>
                    Direct terminal output, build stdout/stderr traces, and Render management links.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg">
                  <Button
                    variant={renderConsoleTab === 'logs' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setRenderConsoleTab('logs')}
                    className="text-xs h-7 px-2.5"
                  >
                    Terminal Logs
                  </Button>
                  <Button
                    variant={renderConsoleTab === 'links' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setRenderConsoleTab('links')}
                    className="text-xs h-7 px-2.5"
                  >
                    Render Links
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* TAB 1: Live Compiler Terminal Stream */}
                {renderConsoleTab === 'logs' && (
                  <div className="space-y-3">
                    <div className="rounded-xl border bg-black/90 text-emerald-400 font-mono text-xs p-4 h-[340px] overflow-y-auto space-y-2 shadow-inner">
                      <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2 text-[11px] text-emerald-500/70">
                        <span>EZCIRKIT-DOCKER-COMPILER-CONTAINER v1.0.4</span>
                        <span>URL: {RENDER_SERVER_URL}</span>
                      </div>

                      <div className="text-zinc-400 text-[11px]">
                        [SYSTEM] Connected to Google Cloud Firestore telemetry stream (`telemetry_compiles`)
                      </div>
                      <div className="text-emerald-500 text-[11px]">
                        [HEALTH CHECK] Status: {renderStatus.toUpperCase()} • Roundtrip Ping: {renderLatency || 0}ms
                      </div>

                      {compiles && compiles.length > 0 ? (
                        compiles.slice(0, 10).map((c, idx) => (
                          <div key={c.id || idx} className="pt-1.5 border-t border-zinc-800 space-y-0.5">
                            <div className="flex items-center justify-between text-zinc-300">
                              <span className="text-amber-400">
                                [{format(parseDate(c.timestamp), 'HH:mm:ss')}] POST /api/compile ({c.boardModel || 'Arduino Uno'})
                              </span>
                              <span className={c.status === 'success' ? 'text-emerald-400' : 'text-red-400'}>
                                {c.status === 'success' ? `✓ 200 OK (${(c.latencyMs / 1000).toFixed(2)}s)` : `✗ 500 ERR (${c.errorSource})`}
                              </span>
                            </div>
                            <div className="text-zinc-500 text-[11px] pl-3 truncate">
                              Tester: {c.userEmail || 'Anonymous'} • Length: {c.codeLength || 0} chars • Lines: {c.codeLines || 0}
                            </div>
                            {c.error && (
                              <div className="text-red-400 text-[11px] pl-3 font-mono bg-red-950/40 p-1.5 rounded border border-red-800/40">
                                STDERR: {c.error}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-zinc-500 text-center py-12">
                          [WAITING] No compilation logs recorded in the active telemetry window.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: Direct Render Control Dashboard */}
                {renderConsoleTab === 'links' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <a
                      href={`https://dashboard.render.com/web/${RENDER_SERVICE_ID}/logs`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-xl border p-4 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all space-y-2 block"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm flex items-center gap-2">
                          <Terminal className="h-4 w-4 text-purple-500" /> Server Build & Runtime Logs
                        </span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-purple-500 transition-colors" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Inspect stdout/stderr console logs, docker build output, and compiler exception stack traces.
                      </p>
                    </a>

                    <a
                      href={`https://dashboard.render.com/web/${RENDER_SERVICE_ID}/metrics`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-xl border p-4 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all space-y-2 block"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm flex items-center gap-2">
                          <Activity className="h-4 w-4 text-blue-500" /> CPU & Memory Usage
                        </span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Monitor RAM utilization, CPU load spikes, and HTTP request throughput on Render.
                      </p>
                    </a>

                    <a
                      href={`https://dashboard.render.com/web/${RENDER_SERVICE_ID}/env`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-xl border p-4 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all space-y-2 block"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm flex items-center gap-2">
                          <Filter className="h-4 w-4 text-amber-500" /> Environment Variables
                        </span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Configure PORT, compiler secrets, and container environment options.
                      </p>
                    </a>

                    <a
                      href={`https://dashboard.render.com/web/${RENDER_SERVICE_ID}/settings`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-xl border p-4 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all space-y-2 block"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm flex items-center gap-2">
                          <Server className="h-4 w-4 text-emerald-500" /> Container Settings & Deploy
                        </span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Trigger manual redeployments, clear build cache, or update instance scaling.
                      </p>
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB E — LIVE LOG FEED */}
        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Live Log Feed</CardTitle>
                <CardDescription>
                  Merged real-time telemetry stream from logins, compiles, uploads, and interactions.
                </CardDescription>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 text-xs h-9"
                  />
                </div>

                <Select value={filterEventType} onValueChange={setFilterEventType}>
                  <SelectTrigger className="w-[120px] text-xs h-9">
                    <SelectValue placeholder="Event Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="compile">Compiles</SelectItem>
                    <SelectItem value="upload">Uploads</SelectItem>
                    <SelectItem value="login">Logins</SelectItem>
                    <SelectItem value="interaction">Clicks</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[120px] text-xs h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="success">Success Only</SelectItem>
                    <SelectItem value="failed">Failures Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isGlobalLoading ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Loading event logs...</p>
              ) : filteredEvents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No events match your filter search.</p>
              ) : (
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-[110px]">Event Type</TableHead>
                        <TableHead className="w-[150px]">Timestamp</TableHead>
                        <TableHead className="w-[180px]">Tester</TableHead>
                        <TableHead>Detail</TableHead>
                        <TableHead className="w-[60px] text-right">Inspect</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.map((e) => (
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
                              <div
                                className="cursor-pointer hover:underline"
                                onClick={() => handleInspectTester(e.userEmail!)}
                              >
                                <div className="font-medium text-sm truncate max-w-[160px]">{e.userName || 'Tester'}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-[160px]">{e.userEmail}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">Anonymous</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {e.details}
                          </TableCell>
                          <TableCell className="text-right">
                            {e.userEmail && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleInspectTester(e.userEmail!)}
                              >
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            )}
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

      {/* Tester Activity Inspector Sheet Drawer */}
      <Sheet open={isInspectorOpen} onOpenChange={setIsInspectorOpen}>
        <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto">
          {testerInspectorData && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Tester Session Inspector
                </SheetTitle>
                <SheetDescription>
                  Detailed activity log & hardware profile for {testerInspectorData.name}.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 py-6">
                {/* User Profile Card */}
                <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
                  <div>
                    <h4 className="font-semibold text-base">{testerInspectorData.name}</h4>
                    <p className="text-xs text-muted-foreground font-mono">{testerInspectorData.email}</p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Laptop className="h-4 w-4" />
                    <span>{testerInspectorData.deviceSummary}</span>
                  </div>
                </div>

                {/* Session Performance Overview */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">Compile Success</div>
                    <div className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                      {testerInspectorData.compileRate}%
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      ({testerInspectorData.compilesCount} requests)
                    </div>
                  </div>

                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">Upload Success</div>
                    <div className="text-xl font-bold mt-1 text-purple-600 dark:text-purple-400">
                      {testerInspectorData.uploadRate}%
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      ({testerInspectorData.uploadsCount} flashes)
                    </div>
                  </div>
                </div>

                {/* User Timeline */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Layers className="h-4 w-4" /> Tester Timeline ({testerInspectorData.totalEvents} events)
                  </h4>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {testerInspectorData.events.map((evt) => (
                      <div key={evt.id} className="border rounded p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px]">
                            {evt.eventType.toUpperCase()}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {format(parseDate(evt.timestamp), 'HH:mm:ss')}
                          </span>
                        </div>
                        <p className="font-mono text-muted-foreground">{evt.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
