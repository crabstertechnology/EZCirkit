'use client';

import React, { useState } from 'react';
import { BillingCartItem, BillingProduct } from '@/types/billing';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Plus } from 'lucide-react';

interface CustomItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomItem: (item: BillingCartItem) => void;
}

export const CustomItemModal: React.FC<CustomItemModalProps> = ({
  isOpen,
  onClose,
  onAddCustomItem,
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [unit, setUnit] = useState('Piece');
  const [tax, setTax] = useState<string>('0');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedPrice = parseFloat(price) || 0;
    const parsedQty = parseFloat(quantity) || 1;
    const parsedTax = parseFloat(tax) || 0;
    const timestamp = Date.now();

    const customProduct: BillingProduct = {
      id: `custom-${timestamp}`,
      name: name.trim(),
      sku: `CUSTOM-${timestamp}`,
      price: parsedPrice,
      sellingPrice: parsedPrice,
      mrp: parsedPrice,
      purchasePrice: 0,
      stock: 9999,
      currentStock: 9999,
      categoryId: 'custom',
      category: 'Custom / Service',
      unit,
      tax: parsedTax,
    };

    const cartItem: BillingCartItem = {
      id: customProduct.id,
      product: customProduct,
      quantity: parsedQty,
      customUnitPrice: parsedPrice,
      discountAmount: 0,
      isReturn: false,
    };

    onAddCustomItem(cartItem);
    setName('');
    setPrice('');
    setQuantity('1');
    setTax('0');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm w-full p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <DialogTitle className="text-base font-bold text-foreground">
              Add Custom / Uncatalogued Item
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Add service fees, custom repairs, or one-off hardware items.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          <div className="space-y-1">
            <Label htmlFor="custom-item-name" className="text-xs font-semibold">
              Item / Service Name *
            </Label>
            <Input
              id="custom-item-name"
              placeholder="e.g. Prototyping Labor / Special Cable"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-sm rounded-xl"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="custom-item-price" className="text-xs font-semibold">
                Unit Price (₹) *
              </Label>
              <Input
                id="custom-item-price"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="text-sm rounded-xl font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="custom-item-qty" className="text-xs font-semibold">
                Quantity
              </Label>
              <Input
                id="custom-item-qty"
                type="number"
                min="0.01"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="text-sm rounded-xl text-center font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Unit of Measure</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Piece">Piece</SelectItem>
                  <SelectItem value="Pair">Pair</SelectItem>
                  <SelectItem value="Packet">Packet</SelectItem>
                  <SelectItem value="Kg">Kg</SelectItem>
                  <SelectItem value="Gram">Gram</SelectItem>
                  <SelectItem value="Litre">Litre</SelectItem>
                  <SelectItem value="Box">Box</SelectItem>
                  <SelectItem value="Service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Tax Bracket (GST)</Label>
              <Select value={tax} onValueChange={setTax}>
                <SelectTrigger className="text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0% (Nil)</SelectItem>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="12">12%</SelectItem>
                  <SelectItem value="18">18%</SelectItem>
                  <SelectItem value="28">28%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-3">
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
              className="bg-primary text-white font-bold rounded-xl text-xs gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add to Cart
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
