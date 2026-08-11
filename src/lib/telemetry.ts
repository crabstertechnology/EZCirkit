'use client';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

const { firestore, auth } = initializeFirebase();

/**
 * Core generic telemetry event logger
 */
export const logTelemetryEvent = async (collectionName: string, data: any) => {
  if (!firestore) return;
  const user = auth?.currentUser;
  try {
    await addDoc(collection(firestore, collectionName), {
      ...data,
      userId: user ? user.uid : null,
      userName: user ? user.displayName || user.email?.split('@')[0] || 'Tester' : 'Anonymous',
      userEmail: user ? user.email : (data.userEmail || null),
      timestamp: serverTimestamp(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'Server',
    });
  } catch (err) {
    console.error("Telemetry event failed to log:", err);
  }
};

/**
 * Log Authentication & Login Telemetry
 */
export const logLoginTelemetry = async (
  status: 'success' | 'failed',
  userEmail: string,
  latencyMs: number,
  error?: string | null,
  authProvider: 'email' | 'google' = 'email'
) => {
  return logTelemetryEvent('telemetry_logins', {
    status,
    userEmail,
    latencyMs,
    error: error || null,
    authProvider,
  });
};

/**
 * Log C++ Compiler & Build Telemetry
 */
export const logCompileTelemetry = async (data: {
  boardModel?: string;
  codeLength?: number;
  codeLines?: number;
  detectedLibraries?: string[];
  status: 'success' | 'failed';
  latencyMs: number;
  flashUsedBytes?: number;
  flashMaxBytes?: number;
  ramUsedBytes?: number;
  ramMaxBytes?: number;
  error?: string | null;
  errorSource?: 'compiler_error' | 'compiler_server' | 'network';
}) => {
  return logTelemetryEvent('telemetry_compiles', {
    boardModel: data.boardModel || 'Arduino Uno',
    codeLength: data.codeLength || 0,
    codeLines: data.codeLines || 0,
    detectedLibraries: data.detectedLibraries || [],
    status: data.status,
    latencyMs: data.latencyMs,
    flashUsedBytes: data.flashUsedBytes || 0,
    flashMaxBytes: data.flashMaxBytes || 32256,
    ramUsedBytes: data.ramUsedBytes || 0,
    ramMaxBytes: data.ramMaxBytes || 2048,
    error: data.error || null,
    errorSource: data.errorSource || (data.status === 'success' ? 'none' : 'compiler_error'),
  });
};

/**
 * Log Web Serial & Hardware Flash Telemetry
 */
export const logUploadTelemetry = async (data: {
  boardModel?: string;
  vendorId?: string | null;
  productId?: string | null;
  baudRate?: number;
  pageSize?: number;
  bytesTotal?: number;
  retryCount?: number;
  status: 'success' | 'failed';
  latencyMs: number;
  error?: string | null;
  errorType?: string | null;
}) => {
  return logTelemetryEvent('telemetry_uploads', {
    boardModel: data.boardModel || 'Arduino Uno',
    vendorId: data.vendorId || null,
    productId: data.productId || null,
    baudRate: data.baudRate || 115200,
    pageSize: data.pageSize || 0,
    bytesTotal: data.bytesTotal || 0,
    retryCount: data.retryCount || 0,
    status: data.status,
    latencyMs: data.latencyMs,
    error: data.error || null,
    errorType: data.errorType || null,
  });
};

/**
 * Log IDE UI Interaction Telemetry
 */
export const logInteractionTelemetry = async (
  type: 'page_view' | 'click',
  path: string,
  elementId?: string,
  elementLabel?: string,
  metadata?: any
) => {
  return logTelemetryEvent('telemetry_interactions', {
    type,
    path,
    elementId: elementId || null,
    elementLabel: elementLabel || null,
    metadata: metadata || null,
  });
};

/**
 * Log Client-Side Unhandled JS Error Telemetry
 */
export const logErrorTelemetry = async (
  errorName: string,
  errorMessage: string,
  stackTrace?: string,
  url?: string
) => {
  return logTelemetryEvent('telemetry_errors', {
    errorName,
    errorMessage,
    stackTrace: stackTrace || null,
    url: url || (typeof window !== 'undefined' ? window.location.pathname : ''),
  });
};
