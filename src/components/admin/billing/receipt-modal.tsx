'use client';

import React, { useState } from 'react';
import { BillingSale } from '@/types/billing';
import { formatWhatsAppInvoice, generateWhatsAppLink } from '@/lib/billing-engine';
import { printThermalReceipt, printA4Invoice } from '@/lib/thermal-printer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, MessageSquare, CheckCircle, RefreshCcw, Trash2, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: BillingSale | null;
  onNewBill?: () => void;
  onSaleDeleted?: (saleId: string) => void;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeGstin?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  onNewBill,
  onSaleDeleted,
  storeName = 'Crabster Technology',
  storeAddress = 'Making Electronics Easy, Affordable, and Understandable.',
  storePhone = '7010396642',
  storeGstin = '',
}) => {
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!sale) return null;

  const handlePrint = () => {
    printThermalReceipt(sale, {
      storeName,
      storeAddress,
      storePhone,
      storeGstin,
    });
  };

  const handlePrintA4 = () => {
    printA4Invoice(sale, {
      storeName,
      storeAddress,
      storePhone,
      storeGstin,
    });
  };

  const handleWhatsApp = () => {
    const text = formatWhatsAppInvoice(sale, storeName);
    const link = generateWhatsAppLink(sale.customerPhone, text);
    window.open(link, '_blank');
  };

  const handleDeleteBill = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch('/api/billing/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: sale.id,
          rollbackStock: sale.status !== 'cancelled',
          adminUser: 'Admin',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete bill');
      }

      toast({
        title: 'Bill Deleted Permanently',
        description: `Invoice ${sale.billNumber} was removed from the database and stock was restored.`,
      });

      setShowDeleteConfirm(false);
      onClose();
      if (onSaleDeleted) {
        onSaleDeleted(sale.id);
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to delete bill',
        description: err.message || 'Server error while deleting.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isRefund = sale.grandTotal < 0;
  const formattedDate = new Date(sale.date).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md w-full p-0 overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <DialogHeader className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <DialogTitle className="text-base font-bold text-foreground">
                  {isRefund ? 'Refund Invoice' : 'Retail Tax Invoice'}
                </DialogTitle>
              </div>
              <Badge variant={isRefund ? 'destructive' : 'default'} className="font-mono text-xs">
                {sale.billNumber}
              </Badge>
            </div>
          </DialogHeader>

          {/* On-screen Receipt Preview */}
          <div id="thermal-receipt" className="p-6 font-sans text-xs text-zinc-900 dark:text-zinc-100 max-h-[65vh] overflow-y-auto space-y-4">
            {/* Header */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-zinc-300 dark:border-zinc-700">
              <h2 className="text-base font-black uppercase tracking-wider">{storeName}</h2>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{storeAddress}</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Ph. No: {storePhone}</p>
              <p className="text-[11px] font-bold mt-1 text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                {isRefund ? 'REFUND CREDIT NOTE' : 'RETAIL TAX INVOICE'}
              </p>
            </div>

            {/* Metadata */}
            <div className="text-[11px] space-y-1 pb-3 border-b border-dashed border-zinc-300 dark:border-zinc-700">
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Invoice No:</span>
                <span className="font-bold">{sale.billNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Date & Time:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Customer:</span>
                <span className="font-semibold">{sale.customerName}</span>
              </div>
              {sale.customerPhone && sale.customerPhone !== 'Walk-in' && (
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Phone:</span>
                  <span>{sale.customerPhone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Cashier:</span>
                <span>{sale.cashierName}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-2 pb-3 border-b border-dashed border-zinc-300 dark:border-zinc-700">
              <div className="flex justify-between font-bold text-[10px] text-zinc-500 dark:text-zinc-400 uppercase pb-1 border-b border-zinc-200 dark:border-zinc-800">
                <span className="w-1/2">Item</span>
                <span className="w-1/6 text-center">Qty</span>
                <span className="w-1/6 text-right">Price</span>
                <span className="w-1/6 text-right">Total</span>
              </div>
              {sale.items.map((item, idx) => {
                const isRet = item.isReturn;
                return (
                  <div key={idx} className="flex justify-between text-[11px] py-0.5">
                    <div className="w-1/2 pr-1">
                      <span className="font-medium">
                        {item.name}
                      </span>
                      {isRet && (
                        <span className="ml-1 text-[8px] border border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 px-1 py-0.2 rounded font-bold">
                          RETURN
                        </span>
                      )}
                      {item.discount > 0 && (
                        <span className="block text-[9px] text-zinc-500 dark:text-zinc-400">Disc: -₹{item.discount}</span>
                      )}
                    </div>
                    <span className="w-1/6 text-center font-bold">{item.quantity}</span>
                    <span className="w-1/6 text-right">₹{item.unitPrice}</span>
                    <span className="w-1/6 text-right font-bold">
                      {item.total < 0 ? `-₹${Math.abs(item.total).toFixed(2)}` : `₹${item.total.toFixed(2)}`}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Financial Totals */}
            <div className="space-y-1.5 text-[11px] pb-3 border-b border-dashed border-zinc-300 dark:border-zinc-700">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Gross Subtotal:</span>
                <span>₹{sale.amount.toFixed(2)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between font-semibold">
                  <span>Total Discount:</span>
                  <span>-₹{sale.discount.toFixed(2)}</span>
                </div>
              )}
              {sale.tax > 0 && (
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Tax:</span>
                  <span>₹{sale.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black pt-1 border-t border-zinc-200 dark:border-zinc-800">
                <span>{isRefund ? 'NET REFUND PAID:' : 'GRAND TOTAL:'}</span>
                <span className="font-black">
                  ₹{Math.abs(sale.grandTotal).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500 dark:text-zinc-400 pt-1">
                <span>Payment Mode:</span>
                <span className="font-bold uppercase">{sale.paymentMethod}</span>
              </div>
              {sale.paymentMethod === 'cash' && typeof sale.cashReceived === 'number' && sale.cashReceived > 0 && (
                <>
                  <div className="flex justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
                    <span>Cash Tendered:</span>
                    <span>₹{sale.cashReceived.toFixed(2)}</span>
                  </div>
                  {sale.changeReturned !== undefined && sale.changeReturned > 0 && (
                    <div className="flex justify-between text-[10px] font-bold">
                      <span>Change Returned:</span>
                      <span>₹{sale.changeReturned.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Note */}
            <div className="text-center pt-2 space-y-1">
              <p className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                THANK YOU FOR VISITING!
              </p>
              <div className="py-1 border-y border-dashed border-zinc-200 dark:border-zinc-800">
                <p className="text-[10px] font-black tracking-wider">
                  *** NO RETURN • NO REFUND ***
                </p>
              </div>
              <p className="text-[9px] text-zinc-500 dark:text-zinc-400">
                Goods once sold will not be returned or refunded.
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <DialogFooter className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handlePrintA4}
              className="flex-1 min-w-[150px] gap-1.5 font-bold rounded-xl bg-primary text-white shadow-sm hover:bg-primary/90"
            >
              <FileText className="h-4 w-4" />
              Print A4 Invoice / PDF
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              className="flex-1 min-w-[130px] gap-1.5 font-bold rounded-xl"
            >
              <Printer className="h-4 w-4" />
              Thermal (80mm)
            </Button>

            {sale.customerPhone && sale.customerPhone !== 'Walk-in' && (
              <Button
                type="button"
                onClick={handleWhatsApp}
                className="flex-1 min-w-[130px] gap-1.5 font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="gap-1.5 font-bold rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
              title="Permanently delete this bill"
            >
              <Trash2 className="h-4 w-4" />
              Delete Bill
            </Button>

            <Button
              type="button"
              onClick={() => {
                onClose();
                if (onNewBill) onNewBill();
              }}
              className="flex-1 min-w-[110px] gap-1.5 font-bold rounded-xl bg-primary text-white"
            >
              <RefreshCcw className="h-4 w-4" />
              New Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Permanently Delete Bill #{sale.billNumber}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-xs space-y-2 pt-2 text-muted-foreground">
                <p>
                  Are you sure you want to permanently delete invoice <span className="font-mono font-bold text-foreground">#{sale.billNumber}</span>?
                </p>
                <p className="font-medium text-foreground">
                  This will delete the invoice record and restore catalog inventory stock for all sold items.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs" disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBill}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

