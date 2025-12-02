
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export interface Address {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface AddressCardProps {
  address: Address;
  isSelected?: boolean;
  className?: string;
}

const AddressCard: React.FC<AddressCardProps> = ({ address, isSelected, className }) => {
  return (
    <div
      className={cn(
        "p-4 rounded-lg border transition-all",
        isSelected ? "border-primary ring-2 ring-primary" : "border-border",
        className
      )}
    >
      <div className="flex items-start gap-4">
        {isSelected !== undefined && (
           <RadioGroup value={isSelected ? address.id : ''} className="mt-1">
              <RadioGroupItem value={address.id} id={address.id} />
            </RadioGroup>
        )}
        <Label htmlFor={address.id} className="flex-1 cursor-pointer">
          <p className="font-semibold">{address.name}</p>
          <p className="text-sm text-muted-foreground">{address.phone}</p>
          <p className="text-sm text-muted-foreground mt-1">{address.addressLine1}</p>
          {address.addressLine2 && <p className="text-sm text-muted-foreground">{address.addressLine2}</p>}
          <p className="text-sm text-muted-foreground">
            {address.city}, {address.state} {address.postalCode}
          </p>
          <p className="text-sm text-muted-foreground">{address.country}</p>
        </Label>
      </div>
    </div>
  );
};


export default AddressCard;

    