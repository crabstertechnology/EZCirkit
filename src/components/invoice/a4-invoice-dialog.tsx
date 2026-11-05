'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { OnlineInvoiceData, downloadInvoicePdf, printA4Invoice } from '@/lib/invoice-pdf';
import { useToast } from '@/hooks/use-toast';

interface A4InvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: OnlineInvoiceData | null;
}

export const A4InvoiceDialog: React.FC<A4InvoiceDialogProps> = ({ isOpen, onClose, invoice }) => {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  if (!invoice) return null;

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await downloadInvoicePdf(invoice);
      toast({
        title: 'Invoice Downloaded',
        description: `Invoice ${invoice.billNumber} saved as PDF.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'Could not generate PDF. Please try printing to PDF instead.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    printA4Invoice(invoice);
  };

  const items = invoice.items && invoice.items.length > 0 ? invoice.items : [
    { name: 'Online Order Item', price: invoice.subtotal || invoice.grandTotal, quantity: 1, total: invoice.subtotal || invoice.grandTotal }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-white dark:bg-zinc-950 text-foreground">
        <DialogHeader className="border-b pb-4 flex flex-row items-center justify-between gap-4">
          <div>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Tax Invoice — {invoice.billNumber}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Standard Tax Invoice • Computer Generated
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs font-bold gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="h-8 text-xs font-bold gap-1.5 bg-primary text-white hover:bg-primary/95 shadow-sm"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        {/* Visual A4 Document Preview */}
        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-2 sm:p-6 rounded-xl border overflow-x-auto">
          <div className="w-full min-w-[620px] bg-white text-zinc-900 border border-zinc-900 p-5 shadow-sm text-xs font-sans">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3 mb-3">
              <div>
                <h2 className="text-base font-black tracking-wide uppercase">CRABSTER TECHNOLOGY</h2>
                <p className="text-[10px] text-zinc-600">
                  12/1 Brindhavan Garden, No.4 Veerapandi, Coimbatore - 641019, Tamil Nadu
                </p>
                <p className="text-[10px] text-zinc-600">
                  Phone: <strong>+91 7010396642</strong> • Email: <strong>crabstertechnology@gmail.com</strong>
                </p>
              </div>
              <div className="text-center border border-zinc-900 px-3 py-1.5 bg-zinc-50">
                <div className="text-[10px] font-black uppercase tracking-wider border-b border-zinc-900 pb-0.5 mb-0.5">
                  TAX INVOICE
                </div>
                <div className="text-[8px] font-bold text-zinc-500 uppercase">BILL NUMBER</div>
                <div className="text-xs font-black font-mono">{invoice.billNumber}</div>
              </div>
            </div>

            {/* Customer & Order Metadata */}
            <div className="grid grid-cols-2 border border-zinc-900 mb-3 text-[11px]">
              <div className="p-3 border-r border-zinc-900">
                <div className="text-[9px] font-black uppercase text-zinc-500 mb-1">BILLED &amp; SHIPPED TO</div>
                <div className="font-bold text-xs">{invoice.customerName}</div>
                {invoice.customerPhone && <div className="text-[10px]">Mobile: {invoice.customerPhone}</div>}
                {invoice.customerEmail && <div className="text-[10px]">Email: {invoice.customerEmail}</div>}
                {invoice.shippingAddress && (
                  <div className="text-[10px] text-zinc-600 mt-1">
                    {[
                      invoice.shippingAddress.addressLine1,
                      invoice.shippingAddress.addressLine2,
                      [invoice.shippingAddress.city, invoice.shippingAddress.state, invoice.shippingAddress.postalCode]
                        .filter(Boolean)
                        .join(' - '),
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                )}
              </div>
              <div className="p-3 space-y-1">
                <div className="text-[9px] font-black uppercase text-zinc-500 mb-1">ORDER METADATA</div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Order ID:</span>
                  <span className="font-mono font-bold">#{invoice.orderId.substring(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Date:</span>
                  <span className="font-semibold">{new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Payment:</span>
                  <span className="font-semibold uppercase">{invoice.paymentMethod || 'Online'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600">Status:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] uppercase">
                    {invoice.status || 'Paid'}
                  </span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full border-collapse border border-zinc-900 mb-3 text-[11px]">
              <thead>
                <tr className="bg-zinc-100 border-b border-zinc-900 text-left">
                  <th className="p-2 border-r border-zinc-900 w-8 text-center">#</th>
                  <th className="p-2 border-r border-zinc-900">Item Description</th>
                  <th className="p-2 border-r border-zinc-900 w-16 text-center">Qty</th>
                  <th className="p-2 border-r border-zinc-900 w-24 text-right">Rate</th>
                  <th className="p-2 w-24 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const lineTotal = item.total !== undefined ? item.total : item.price * item.quantity;
                  return (
                    <tr key={idx} className="border-b border-zinc-300">
                      <td className="p-2 border-r border-zinc-900 text-center">{idx + 1}</td>
                      <td className="p-2 border-r border-zinc-900 font-bold">{item.name}</td>
                      <td className="p-2 border-r border-zinc-900 text-center">{item.quantity}</td>
                      <td className="p-2 border-r border-zinc-900 text-right">₹{item.price.toFixed(2)}</td>
                      <td className="p-2 text-right font-bold">₹{lineTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals Summary */}
            <div className="flex justify-end border border-zinc-900 p-3 bg-zinc-50 mb-3">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal:</span>
                  <span className="font-bold text-zinc-900">₹{(invoice.subtotal || invoice.grandTotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Shipping:</span>
                  <span className="font-bold text-zinc-900">
                    {invoice.shippingCharge ? `₹${invoice.shippingCharge.toFixed(2)}` : 'FREE'}
                  </span>
                </div>
                {invoice.discount && invoice.discount > 0 ? (
                  <div className="flex justify-between text-red-600">
                    <span>Discount:</span>
                    <span className="font-bold">-₹{invoice.discount.toFixed(2)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-sm font-black border-t border-zinc-900 pt-1.5">
                  <span>Total Amount:</span>
                  <span className="text-primary font-mono">₹{invoice.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Note & Certification */}
            <div className="text-[10px] text-zinc-500 border-t border-dashed border-zinc-400 pt-2 flex justify-between items-center">
              <span>Official Computer-Generated Tax Invoice • Crabster Technology</span>
              <span className="flex items-center gap-1 font-bold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> Certified Paid
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row justify-between items-center gap-2 pt-2 border-t">
          <p className="text-[11px] text-muted-foreground">
            Click <strong>Download PDF</strong> to save this document directly onto your device.
          </p>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

