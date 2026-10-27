'use client';

import React, { useState, useEffect } from 'react';
import { BillingCartItem } from '@/types/billing';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface QuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItem: BillingCartItem | null;
  onUpdateQuantity: (quantity: number) => void;
  onRemoveItem: () => void;
}

export const QuantityModal: React.FC<QuantityModalProps> = ({
  isOpen,
  onClose,
  cartItem,
  onUpdateQuantity,
  onRemoveItem,
}) => {
  const [qty, setQty] = useState<number>(1);

  useEffect(() => {
    if (cartItem) {
      setQty(cartItem.quantity);
    }
  }, [cartItem]);

  if (!cartItem) return null;

  const currentStock = Number(cartItem.product.stock ?? cartItem.product.currentStock ?? 0);

  const handleApply = () => {
    if (qty <= 0) {
      onRemoveItem();
    } else {
      onUpdateQuantity(qty);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xs w-full p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
        <DialogHeader className="text-center pb-2">
          <Badge variant="outline" className="w-fit mx-auto mb-1 text-[10px]">
            Already in Cart
          </Badge>
          <DialogTitle className="text-base font-bold text-foreground">
            {cartItem.product.name}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            In-Stock: <span className="font-bold text-foreground">{currentStock}</span> | Current Cart Qty: <span className="font-bold text-primary">{cartItem.quantity}</span>
          </p>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-xl text-lg font-bold"
              onClick={() => setQty(prev => Math.max(0, prev - 1))}
            >
              <Minus className="h-5 w-5" />
            </Button>

            <Input
              type="number"
              min="0"
              step="1"
              value={qty}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setQty(isNaN(val) ? 0 : val);
              }}
              className="h-12 w-24 text-center font-black text-xl rounded-xl"
              autoFocus
            />

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-xl text-lg font-bold"
              onClick={() => setQty(prev => prev + 1)}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {/* Quick preset buttons */}
          <div className="flex justify-center gap-2">
            {[1, 2, 5, 10, 20].map((preset) => (
              <Button
                key={preset}
                type="button"
                variant={qty === preset ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-2.5 text-xs font-semibold rounded-lg"
                onClick={() => setQty(preset)}
              >
                {preset}
              </Button>
            ))}
          </div>
        </div>

        <DialogFooter className="flex flex-row justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onRemoveItem();
              onClose();
            }}
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1 text-xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </Button>

          <Button
            type="button"
            onClick={handleApply}
            className="bg-primary text-white font-bold text-xs px-5 rounded-xl"
          >
            Update Qty
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
