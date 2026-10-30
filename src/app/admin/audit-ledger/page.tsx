'use client';

import React from 'react';
import { InventoryLedgerTab } from '@/components/admin/billing/inventory-ledger-tab';
import { Layers } from 'lucide-react';

export default function AuditLedgerPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black shrink-0">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Inventory Audit Ledger
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Real-time tracking of every stock change, sale deductions, void rollbacks, and manual adjustments.
          </p>
        </div>
      </div>

      <InventoryLedgerTab />
    </div>
  );
}

