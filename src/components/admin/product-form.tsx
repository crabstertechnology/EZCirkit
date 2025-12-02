
'use client';

import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, collection }from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '../ui/textarea';
import type { Product } from '@/app/admin/products/page';

const productSchema = z.object({
  id: z.string().min(3, 'Product ID must be at least 3 characters.'),
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  description: z.string().optional(),
  price: z.coerce.number().positive('Price must be positive.'),
  originalPrice: z.coerce.number().optional(),
  stock: z.coerce.number().int().nonnegative('Stock cannot be negative.'),
  image: z.string().min(1, 'Image URL is required.'),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  onSave: () => void;
  product?: Product | null;
}

const ProductForm: React.FC<ProductFormProps> = ({ onSave, product }) => {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!product;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      id: '',
      name: '',
      description: '',
      price: 0,
      originalPrice: 0,
      stock: 0,
      image: '/1.jpg',
    },
  });

  useEffect(() => {
    if (product) {
      form.reset(product);
    } else {
      form.reset({
        id: doc(collection(firestore, '_')).id, // Generate a new ID for new products
        name: '',
        description: '',
        price: 0,
        originalPrice: 0,
        stock: 0,
        image: '/1.jpg',
      });
    }
  }, [product, form, firestore]);

  const onSubmit: SubmitHandler<ProductFormValues> = async (data) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'You must be an admin.' });
      return;
    }
    setIsSubmitting(true);
    
    const productRef = doc(firestore, 'products', data.id);
    
    // Use non-blocking set with merge for both creating and updating
    setDocumentNonBlocking(productRef, data, { merge: true });

    toast({ title: `Product ${isEditing ? 'updated' : 'added'} successfully!` });
    onSave();
    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product ID</FormLabel>
              <FormControl>
                <Input placeholder="prod_ezc_01" {...field} disabled={isEditing} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="EZCirkit Complete Kit" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="A short description of the product." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
           <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="2999" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="originalPrice"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Original Price (Optional)</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="3999" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
         <div className="grid grid-cols-2 gap-4">
           <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Stock Quantity</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="100" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
            control={form.control}
            name="image"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Image URL</FormLabel>
                <FormControl>
                    <Input placeholder="/1.jpg" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Product')}
        </Button>
      </form>
    </Form>
  );
};

export default ProductForm;
