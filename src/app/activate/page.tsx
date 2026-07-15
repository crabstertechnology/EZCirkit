
'use client';

import React, { Suspense } from 'react';
import ActivatePageContent from './activate-content';

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm">Validating your kit…</p>
          </div>
        </div>
      }
    >
      <ActivatePageContent />
    </Suspense>
  );
}
