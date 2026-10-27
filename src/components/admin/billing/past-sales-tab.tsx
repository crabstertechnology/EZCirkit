'use client';

import React, { useState, useEffect } from 'react';
import { BillingSale } from '@/types/billing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Printer, MessageSquare, Ban, Trash2, FileText, RefreshCw } from 'lucide-react';
import { formatWhatsAppInvoice, generateWhatsAppLink } from '@/lib/billing-engine';
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

interface PastSalesTabProps {
  onSelectSaleForReceipt: (sale: BillingSale) => void;
  adminUserName: string;
  onSaleDeleted?: (saleId: string) => void;
}

export const PastSalesTab: React.FC<PastSalesTabProps> = ({
  onSelectSaleForReceipt,
  adminUserName,
  onSaleDeleted,
}) => {
  const { toast } = useToast();
  const [sales, setSales] = useState<BillingSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Void state
  const [saleToVoid, setSaleToVoid] = useState<BillingSale | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);

  // Permanent Delete state
  const [saleToDelete, setSaleToDelete] = useState<BillingSale | null>(null);
  const [rollbackStockOnDelete, setRollbackStockOnDelete] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/billing/sales');
      const data = await res.json();
      if (data.sales) {
        setSales(data.sales);
      }
    } catch (e) {
      console.error('Failed to fetch sales:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const filtered = React.useMemo(() => {
    return sales.filter((s) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        s.billNumber?.toLowerCase().includes(q) ||
        s.customerName?.toLowerCase().includes(q) ||
        s.customerPhone?.toLowerCase().includes(q) ||
        s.cashierName?.toLowerCase().includes(q) ||
        s.paymentMethod?.toLowerCase().includes(q)
      );
    });
  }, [sales, search]);

  const handleConfirmVoid = async () => {
    if (!saleToVoid) return;
    setIsVoiding(true);
    try {
      const res = await fetch('/api/billing/void', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: saleToVoid.id,
          adminUser: adminUserName,
          voidReason: 'Cancelled by administrator',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to void bill');
      }

      toast({
        title: 'Bill Voided & Restocked',
        description: `Order ${saleToVoid.billNumber} was successfully cancelled and catalog inventory restored.`,
      });
      setSaleToVoid(null);
      fetchSales();
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Failed to void bill',
        description: err.message || 'Error executing stock rollback.',
      });
    } finally {
      setIsVoiding(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!saleToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/billing/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: saleToDelete.id,
          rollbackStock: rollbackStockOnDelete,
          adminUser: adminUserName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete invoice');
      }

      toast({
        title: 'Bill Deleted Permanently',
        description: `Invoice ${saleToDelete.billNumber} was permanently deleted${
          rollbackStockOnDelete && saleToDelete.status !== 'cancelled' ? ' and stock was restored' : ''
        }.`,
      });
      setSaleToDelete(null);
      fetchSales();
      if (onSaleDeleted) {
        onSaleDeleted(saleToDelete.id);
      }
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Failed to delete bill',
        description: err.message || 'Error deleting invoice.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleWhatsApp = (sale: BillingSale) => {
    const text = formatWhatsAppInvoice(sale);
    const link = generateWhatsAppLink(sale.customerPhone, text);
    window.open(link, '_blank');
  };

  return (
    <>
      <Card className="border-border/60 shadow-sm bg-white dark:bg-zinc-950 rounded-2xl">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-black tracking-tight">
                  Past Sales & Invoices
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Review completed POS orders, re-print thermal receipts, dispatch WhatsApp bills, void or delete records.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search bill number, customer, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 text-xs h-9 rounded-xl"
                />
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={fetchSales}
                className="h-9 w-9 rounded-xl shrink-0"
                title="Refresh sales list"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-bold w-32">Bill No</TableHead>
                  <TableHead className="text-xs font-bold w-36">Date & Time</TableHead>
                  <TableHead className="text-xs font-bold">Customer</TableHead>
                  <TableHead className="text-xs font-bold w-24">Method</TableHead>
                  <TableHead className="text-xs font-bold text-right w-28">Grand Total</TableHead>
                  <TableHead className="text-xs font-bold text-center w-28">Status</TableHead>
                  <TableHead className="text-xs font-bold text-right w-44">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                      Loading sales history...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                      No matching sales records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((sale) => {
                    const isCancelled = sale.status === 'cancelled';
                    const isRefund = sale.status === 'refunded' || sale.grandTotal < 0;

                    return (
                      <TableRow key={sale.id} className="text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                        <TableCell className="font-mono font-bold text-foreground">
                          {sale.billNumber}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {new Date(sale.date).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-foreground">{sale.customerName}</div>
                          {sale.customerPhone && sale.customerPhone !== 'Walk-in' && (
                            <div className="text-[11px] text-muted-foreground font-mono">{sale.customerPhone}</div>
                          )}
                        </TableCell>
                        <TableCell className="uppercase font-mono text-[11px] text-muted-foreground">
                          {sale.paymentMethod}
                        </TableCell>
                        <TableCell className="text-right font-bold text-sm">
                          <span className={isRefund ? 'text-rose-600' : 'text-foreground'}>
                            {sale.grandTotal < 0 ? `-₹${Math.abs(sale.grandTotal).toFixed(2)}` : `₹${sale.grandTotal.toFixed(2)}`}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {isCancelled ? (
                            <Badge variant="outline" className="text-rose-500 border-rose-300 dark:border-rose-900 text-[10px]">
                              Cancelled
                            </Badge>
                          ) : isRefund ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-900 text-[10px]">
                              Refunded
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-300 dark:border-emerald-900 text-[10px]">
                              Paid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg"
                              title="View & Print Thermal Receipt"
                              onClick={() => onSelectSaleForReceipt(sale)}
                            >
                              <Printer className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                            </Button>

                            {sale.customerPhone && sale.customerPhone !== 'Walk-in' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-emerald-600 hover:text-emerald-700"
                                title="Send WhatsApp Bill"
                                onClick={() => handleWhatsApp(sale)}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            )}

                            {!isCancelled && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-amber-500 hover:text-amber-600"
                                title="Void Order & Restock Inventory"
                                onClick={() => setSaleToVoid(sale)}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              title="Delete Bill Permanently"
                              onClick={() => {
                                setSaleToDelete(sale);
                                setRollbackStockOnDelete(sale.status !== 'cancelled');
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Void Confirmation Alert Dialog */}
      <AlertDialog open={!!saleToVoid} onOpenChange={() => setSaleToVoid(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-amber-600 flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Void Invoice #{saleToVoid?.billNumber}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-xs space-y-2 pt-2 text-muted-foreground">
                <p>
                  Are you sure you want to void this bill?
                </p>
                <p className="font-semibold text-foreground">
                  This will mark the bill as cancelled, immediately roll back all inventory changes to live stocks, and write a signed correction audit ledger entry.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs" disabled={isVoiding}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmVoid}
              disabled={isVoiding}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
            >
              {isVoiding ? 'Restocking...' : 'Yes, Void & Restock'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!saleToDelete} onOpenChange={() => setSaleToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Permanently Delete Invoice #{saleToDelete?.billNumber}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-xs space-y-3 pt-2 text-muted-foreground">
                <p>
                  Are you sure you want to permanently delete this bill? This cannot be undone.
                </p>
                {saleToDelete?.status !== 'cancelled' ? (
                  <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-left">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
                      <input
                        type="checkbox"
                        checked={rollbackStockOnDelete}
                        onChange={(e) => setRollbackStockOnDelete(e.target.checked)}
                        className="rounded border-zinc-400 text-rose-600 focus:ring-rose-500 h-4 w-4"
                      />
                      <span>Restore inventory stock for sold items ({saleToDelete?.items?.length || 0} items)</span>
                    </label>
                    <p className="text-[11px] text-muted-foreground pl-6">
                      When checked, the quantity of products sold in this bill will be returned to your live catalog stocks.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-600 font-medium">
                    Note: This invoice was already cancelled, so its stocks were already restored.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs" disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
