'use client';

import React from 'react';
import { BillingSale } from '@/types/billing';
import { formatWhatsAppInvoice, generateWhatsAppLink } from '@/lib/billing-engine';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, MessageSquare, CheckCircle, RefreshCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: BillingSale | null;
  onNewBill?: () => void;
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
  storeName = 'Crabster Technology',
  storeAddress = 'Electronics Innovation Lab, India',
  storePhone = '+91 98765 43210',
  storeGstin = '33ABCDE1234F1Z5',
}) => {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const text = formatWhatsAppInvoice(sale, storeName);
    const link = generateWhatsAppLink(sale.customerPhone, text);
    window.open(link, '_blank');
  };

  const isRefund = sale.grandTotal < 0;
  const formattedDate = new Date(sale.date).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
        <DialogHeader className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <DialogTitle className="text-base font-bold text-foreground">
                {isRefund ? 'Refund Issued Successfully' : 'Bill Created Successfully'}
              </DialogTitle>
            </div>
            <Badge variant={isRefund ? 'destructive' : 'default'} className="font-mono text-xs">
              {sale.billNumber}
            </Badge>
          </div>
        </DialogHeader>

        {/* Thermal / Printable Receipt Content */}
        <div id="thermal-receipt" className="p-6 font-mono text-xs text-zinc-900 dark:text-zinc-100 max-h-[70vh] overflow-y-auto space-y-4 print:p-0 print:max-h-none print:overflow-visible">
          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-zinc-300 dark:border-zinc-700">
            <h2 className="text-base font-black uppercase tracking-wider">{storeName}</h2>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{storeAddress}</p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Phone: {storePhone}</p>
            {storeGstin && <p className="text-[10px] text-zinc-500 dark:text-zinc-400">GSTIN: {storeGstin}</p>}
            <p className="text-[11px] font-bold mt-1 text-primary">RETAIL TAX INVOICE</p>
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
            <div className="flex justify-between font-bold text-[10px] text-zinc-400 uppercase pb-1 border-b border-zinc-200 dark:border-zinc-800">
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
                    <span className={isRet ? 'text-rose-500 font-bold' : 'font-medium'}>
                      {item.name}
                    </span>
                    {item.discount > 0 && (
                      <span className="block text-[9px] text-emerald-600">Disc: -₹{item.discount}</span>
                    )}
                  </div>
                  <span className="w-1/6 text-center">{item.quantity}</span>
                  <span className="w-1/6 text-right">₹{item.unitPrice}</span>
                  <span className={`w-1/6 text-right font-bold ${isRet ? 'text-rose-600' : ''}`}>
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
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Total Discount:</span>
                <span>-₹{sale.discount.toFixed(2)}</span>
              </div>
            )}
            {sale.tax > 0 && (
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Tax (GST):</span>
                <span>₹{sale.tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black pt-1 border-t border-zinc-200 dark:border-zinc-800">
              <span>{isRefund ? 'NET REFUND PAID:' : 'GRAND TOTAL:'}</span>
              <span className={isRefund ? 'text-rose-600' : 'text-primary'}>
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
                  <div className="flex justify-between text-[10px] font-bold text-emerald-600">
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
            <p className="text-[9px] text-zinc-400 dark:text-zinc-500">
              Goods once sold can be returned/exchanged within 7 days with this bill.
            </p>
          </div>
        </div>

        {/* Print Stylesheet */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #thermal-receipt, #thermal-receipt * {
              visibility: visible;
            }
            #thermal-receipt {
              position: absolute;
              left: 0;
              top: 0;
              width: 80mm !important;
              max-width: 80mm !important;
              padding: 4mm !important;
              margin: 0 !important;
              font-size: 11px !important;
              color: black !important;
              background: white !important;
            }
          }
        `}} />

        {/* Action Controls */}
        <DialogFooter className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-2 print:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            className="flex-1 gap-1.5 font-bold rounded-xl"
          >
            <Printer className="h-4 w-4" />
            Print Bill (80mm)
          </Button>

          {sale.customerPhone && sale.customerPhone !== 'Walk-in' && (
            <Button
              type="button"
              onClick={handleWhatsApp}
              className="flex-1 gap-1.5 font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <MessageSquare className="h-4 w-4" />
              WhatsApp Bill
            </Button>
          )}

          <Button
            type="button"
            onClick={() => {
              onClose();
              if (onNewBill) onNewBill();
            }}
            className="flex-1 gap-1.5 font-bold rounded-xl bg-primary text-white"
          >
            <RefreshCcw className="h-4 w-4" />
            New Bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
