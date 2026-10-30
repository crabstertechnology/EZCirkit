'use client';

import React, { useState } from 'react';
import { PastSalesTab } from '@/components/admin/billing/past-sales-tab';
import { ReceiptModal } from '@/components/admin/billing/receipt-modal';
import { BillingSale } from '@/types/billing';
import { useUser } from '@/firebase';
import { History } from 'lucide-react';

export default function SalesHistoryPage() {
  const { user } = useUser();
  const [selectedSale, setSelectedSale] = useState<BillingSale | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black shrink-0">
          <History className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Sales Invoices History
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Browse past customer sales, void bills, view receipts, and share WhatsApp invoices.
          </p>
        </div>
      </div>

      <PastSalesTab
        adminUserName={user?.displayName || user?.email || 'Admin'}
        onSelectSaleForReceipt={(sale) => {
          setSelectedSale(sale);
          setIsReceiptModalOpen(true);
        }}
        onSaleDeleted={() => {
          setSelectedSale(null);
        }}
      />

      {/* Printable / WhatsApp Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        sale={selectedSale}
        onNewBill={() => {}}
        onSaleDeleted={() => {
          setSelectedSale(null);
        }}
        storeName="Crabster Technology"
        storeAddress="12/1 Brindhavan Garden, No.4 Veerapandi, Coimbatore - 641019, Tamil Nadu"
        storePhone="7010396642"
        storeGstin=""
      />
    </div>
  );
}

