'use client';

import React, { useState } from 'react';
import { BillingCartItem, BillingProduct } from '@/types/billing';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: BillingProduct[];
  onAddReturnItem: (item: BillingCartItem) => void;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  isOpen,
  onClose,
  products,
  onAddReturnItem,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [returnPrice, setReturnPrice] = useState<string>('');
  const [returnQty, setReturnQty] = useState<string>('1');
  const [returnReason, setReturnReason] = useState<string>('Customer Return');

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    const prod = products.find(p => p.id === productId);
    if (prod) {
      setCustomName(prod.name);
      setReturnPrice(String(prod.sellingPrice ?? prod.price ?? ''));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const price = parseFloat(returnPrice) || 0;
    const qty = parseFloat(returnQty) || 1;

    let targetProduct: BillingProduct;

    if (selectedProduct) {
      targetProduct = { ...selectedProduct };
    } else {
      const timestamp = Date.now();
      targetProduct = {
        id: `return-adhoc-${timestamp}`,
        name: customName.trim() || 'Returned Electronic Component',
        sku: `RETURN-${timestamp}`,
        price,
        sellingPrice: price,
        mrp: price,
        stock: 0,
        currentStock: 0,
        unit: 'Piece',
      };
    }

    const returnLineItem: BillingCartItem = {
      id: `return-${targetProduct.id}-${Date.now()}`,
      product: targetProduct,
      quantity: qty,
      customUnitPrice: price,
      discountAmount: 0, // Discounts are never applied to returns per Section 4.2
      isReturn: true,
      returnReason,
    };

    onAddReturnItem(returnLineItem);
    setSelectedProductId('');
    setCustomName('');
    setReturnPrice('');
    setReturnQty('1');
    setReturnReason('Customer Return');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-rose-500" />
            <DialogTitle className="text-base font-bold text-foreground">
              Add Return / Restock Line Item
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Credit a customer return or exchange. This will restock inventory upon checkout.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Select Catalog Product (or enter below)</Label>
            <Select value={selectedProductId} onValueChange={handleProductSelect}>
              <SelectTrigger className="text-xs rounded-xl truncate">
                <SelectValue placeholder="Search / choose product from catalog..." />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                <SelectItem value="none">-- Uncatalogued / Generic Return --</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.sku ? `(${p.sku})` : ''} - ₹{p.sellingPrice ?? p.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="return-name" className="text-xs font-semibold">
              Item Name Snapshot *
            </Label>
            <Input
              id="return-name"
              placeholder="Product Name / Returned Component"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="text-sm rounded-xl"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="return-price" className="text-xs font-semibold">
                Return Credit Unit Price (₹) *
              </Label>
              <Input
                id="return-price"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={returnPrice}
                onChange={(e) => setReturnPrice(e.target.value)}
                className="text-sm rounded-xl font-bold text-rose-600"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="return-qty" className="text-xs font-semibold">
                Return Quantity *
              </Label>
              <Input
                id="return-qty"
                type="number"
                min="0.01"
                step="any"
                value={returnQty}
                onChange={(e) => setReturnQty(e.target.value)}
                className="text-sm rounded-xl text-center font-bold"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Return Reason *</Label>
            <Select value={returnReason} onValueChange={setReturnReason}>
              <SelectTrigger className="text-xs rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Customer Return">Customer Return</SelectItem>
                <SelectItem value="Customer Exchange">Customer Exchange</SelectItem>
                <SelectItem value="Defective / Damaged">Defective / Damaged</SelectItem>
                <SelectItem value="Wrong Item">Wrong Item</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-rose-700 dark:text-rose-400 leading-tight">
              Returned items apply negative line totals <strong className="font-bold">(-₹{(parseFloat(returnPrice) || 0) * (parseFloat(returnQty) || 1)})</strong> and automatically restock catalog inventory upon checkout.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs gap-1.5"
            >
              <RotateCcw className="h-4 w-4" />
              Add Return Line
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
