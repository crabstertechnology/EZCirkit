'use client';

import React from 'react';
import { BillingCartItem } from '@/types/billing';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Banknote,
  QrCode,
  Loader2,
  Receipt,
  User,
  Printer,
} from 'lucide-react';

interface PaymentProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: BillingCartItem[];
  grandTotal: number;
  grossSubtotal: number;
  totalDiscount: number;
  totalTax: number;
  orderDiscount: number;
  setOrderDiscount: (discount: number) => void;
  paymentMethod: 'cash' | 'upi' | 'card';
  setPaymentMethod: (method: 'cash' | 'upi' | 'card') => void;
  cashReceived: number;
  setCashReceived: (val: number) => void;
  cashBalanceResult: { status: string; label: string };
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  customerAddress: string;
  setCustomerAddress: (address: string) => void;
  autoPrintOnCheckout: boolean;
  setAutoPrintOnCheckout: (val: boolean) => void;
  isSubmitting: boolean;
  isRefundMode: boolean;
  billNumber: string;
  onConfirmCheckout: () => Promise<void> | void;
}

export const PaymentProcessingModal: React.FC<PaymentProcessingModalProps> = ({
  isOpen,
  onClose,
  cart,
  grandTotal,
  grossSubtotal,
  totalDiscount,
  totalTax,
  orderDiscount,
  setOrderDiscount,
  paymentMethod,
  setPaymentMethod,
  cashReceived,
  setCashReceived,
  cashBalanceResult,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerAddress,
  setCustomerAddress,
  autoPrintOnCheckout,
  setAutoPrintOnCheckout,
  isSubmitting,
  isRefundMode,
  billNumber,
  onConfirmCheckout,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-[95vw] sm:w-full p-4 sm:p-5 rounded-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Receipt className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-foreground">
                  Payment Processing
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Complete billing settlement &amp; generate invoice
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
              #{billNumber}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Summary & Grand Total */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <span>Subtotal: ₹{grossSubtotal.toFixed(2)}</span>
                {totalTax > 0 && <span>• Tax: ₹{totalTax.toFixed(2)}</span>}
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Order Disc:</span>
                <input
                  type="number"
                  min="0"
                  placeholder="₹0"
                  value={orderDiscount || ''}
                  onChange={(e) => setOrderDiscount(parseFloat(e.target.value) || 0)}
                  className="w-14 h-5 px-1 text-[10px] text-right rounded border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-zinc-900 font-mono ml-0.5"
                />
                <span>(-₹{totalDiscount.toFixed(2)})</span>
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-black uppercase tracking-wider text-foreground">
                {isRefundMode ? 'NET REFUND TO CUSTOMER' : 'GRAND TOTAL PAYABLE'}
              </span>
              <span
                className={`text-2xl font-black ${
                  isRefundMode ? 'text-rose-600' : 'text-primary'
                }`}
              >
                ₹{Math.abs(grandTotal).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Customer Details (Optional) */}
          <div className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <User className="h-3.5 w-3.5 text-primary" />
              <span>Customer Details (Optional)</span>
              <span className="text-[10px] text-muted-foreground font-normal italic">
                (defaults to Walk-in Customer)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Customer Name (Optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-8 text-xs rounded-lg"
              />
              <Input
                placeholder="Phone (10 digits - Opt)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
          </div>

          {/* Payment Methods Bar */}
          {!isRefundMode && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'cash', label: 'Cash', icon: Banknote },
                  { id: 'upi', label: 'UPI / QR', icon: QrCode },
                  { id: 'card', label: 'Card', icon: CreditCard },
                ].map((mode) => (
                  <Button
                    key={mode.id}
                    type="button"
                    variant={paymentMethod === mode.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPaymentMethod(mode.id as any)}
                    className="h-9 text-xs font-bold rounded-lg gap-1.5"
                  >
                    <mode.icon className="h-3.5 w-3.5" />
                    {mode.label}
                  </Button>
                ))}
              </div>

              {/* Cash Tender & Change Calculations */}
              {paymentMethod === 'cash' && (
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-bold text-foreground whitespace-nowrap">
                      Cash Received (₹):
                    </Label>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <Input
                        type="number"
                        min="0"
                        value={cashReceived || ''}
                        onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                        className="h-7 w-20 sm:w-24 text-right font-black text-xs rounded-lg"
                      />
                      {/* Quick Presets */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCashReceived(grandTotal)}
                        className="h-7 px-2 text-[10px] font-bold rounded-md"
                      >
                        Exact
                      </Button>
                      {[100, 500, 2000].map((preset) => (
                        <Button
                          key={preset}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCashReceived(preset)}
                          className="h-7 px-1.5 text-[10px] font-bold rounded-md"
                        >
                          ₹{preset}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Cash Balance Display */}
                  <div
                    className={`text-xs font-bold flex items-center justify-between px-2.5 py-1.5 rounded-md ${
                      cashBalanceResult.status === 'CHANGE_TO_RETURN'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : cashBalanceResult.status === 'CUSTOMER_OWES'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}
                  >
                    <span>Cash Status:</span>
                    <span>{cashBalanceResult.label}</span>
                  </div>
                </div>
              )}

              {/* UPI Prompt */}
              {paymentMethod === 'upi' && (
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 flex items-center justify-center shrink-0">
                    <QrCode className="h-4 w-4" />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-foreground">Collect UPI / QR Payment</div>
                    <div className="text-muted-foreground text-[11px]">
                      Collect ₹{grandTotal.toFixed(2)} via store QR scanner
                    </div>
                  </div>
                </div>
              )}

              {/* Card Prompt */}
              {paymentMethod === 'card' && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 flex items-center justify-center shrink-0">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-foreground">Card POS Swipe / Tap</div>
                    <div className="text-muted-foreground text-[11px]">
                      Charge ₹{grandTotal.toFixed(2)} on POS terminal
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Auto-print toggle & Bill number preview */}
          <div className="flex items-center justify-between text-xs px-0.5 pt-0.5">
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-foreground select-none">
              <input
                type="checkbox"
                checked={autoPrintOnCheckout}
                onChange={(e) => setAutoPrintOnCheckout(e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-700 text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
              />
              <span>Auto-print invoice (Full Page PDF / A4)</span>
            </label>
            <span className="text-[10px] text-muted-foreground font-mono">
              Bill #{billNumber}
            </span>
          </div>

          {/* Primary Action Button */}
          <div className="space-y-1.5 pt-1">
            <Button
              type="button"
              onClick={onConfirmCheckout}
              disabled={isSubmitting || cart.length === 0}
              className={`w-full h-10 text-sm font-black rounded-xl shadow-lg transition-all ${
                isRefundMode
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                  : 'bg-primary hover:bg-primary/95 text-white shadow-primary/20'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Committing Transaction...
                </span>
              ) : isRefundMode ? (
                `ISSUE REFUND & RESTOCK (₹${Math.abs(grandTotal).toFixed(2)})`
              ) : (
                `COLLECT PAYMENT & PRINT (₹${grandTotal.toFixed(2)})`
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel / Back to Cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
