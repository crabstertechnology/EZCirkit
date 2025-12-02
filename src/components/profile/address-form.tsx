
'use client';

import React, { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Address } from './address-card';

const addressSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  phone: z.string().min(10, 'Please enter a valid phone number.'),
  addressLine1: z.string().min(5, 'Address is required.'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City is required.'),
  state: z.string().min(2, 'State is required.'),
  postalCode: z.string().min(5, 'Postal code is required.'),
  country: z.string().min(2, 'Country is required.'),
});

type AddressFormValues = z.infer<typeof addressSchema>;

interface AddressFormProps {
  address?: Address | null;
  onSave: () => void;
}

const AddressForm: React.FC<AddressFormProps> = ({ address, onSave }) => {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      name: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India', // Default country
    },
  });
  
  useEffect(() => {
    if (address) {
      form.reset(address);
    } else {
        form.reset({
            name: '',
            phone: '',
            addressLine1: '',
            addressLine2: '',
            city: '',
            state: '',
            postalCode: '',
            country: 'India',
        });
    }
  }, [address, form]);


  const onSubmit: SubmitHandler<AddressFormValues> = async (data) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);

    try {
        const addressId = address?.id || doc(collection(firestore, 'dummy')).id;
        const addressRef = doc(firestore, 'users', user.uid, 'addresses', addressId);

        await setDoc(addressRef, {
            ...data,
            id: addressId,
            userId: user.uid,
        }, { merge: true });

      toast({ title: `Address ${address ? 'updated' : 'saved'} successfully!` });
      onSave();

    } catch (error) {
      console.error('Error saving address:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save the address.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                    <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                    <Input placeholder="+91 98765 43210" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="addressLine1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address Line 1</FormLabel>
              <FormControl>
                <Input placeholder="123 Tech Street" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="addressLine2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address Line 2 (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Apt, Suite, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
           <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
                <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                    <Input placeholder="Bangalore" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
                <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                    <Input placeholder="Karnataka" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
         <div className="grid grid-cols-2 gap-4">
           <FormField
            control={form.control}
            name="postalCode"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Postal Code</FormLabel>
                <FormControl>
                    <Input placeholder="560001" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                    <Input placeholder="India" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Address'}
        </Button>
      </form>
    </Form>
  );
};

export default AddressForm;

    