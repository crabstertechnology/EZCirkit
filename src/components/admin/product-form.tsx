
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
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import type { Product } from '@/app/admin/products/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const productSchema = z.object({
  id: z.string().min(3, 'Product ID must be at least 3 characters.'),
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  description: z.string().optional(),
  price: z.coerce.number().positive('Price must be positive.'),
  originalPrice: z.coerce.number().optional(),
  stock: z.coerce.number().int().nonnegative('Stock cannot be negative.'),
  image: z.string().min(1, 'Image URL is required.'),
  category: z.string().optional(),
});

const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 600): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

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
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const isEditing = !!product;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, onChange: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const compressed = await compressImage(base64);
        onChange(compressed);
        toast({ title: 'Image uploaded & compressed!' });
      } catch (err) {
        console.error("Compression error:", err);
        toast({ variant: 'destructive', title: 'Failed to process image.' });
      } finally {
        setIsUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      id: '',
      name: '',
      description: '',
      price: 0,
      originalPrice: 0,
      stock: 0,
      image: '/new-kit-front.png',
      category: 'Components',
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        ...product,
        category: product.category || 'Components',
      });
    } else {
      form.reset({
        id: doc(collection(firestore, '_')).id, // Generate a new ID for new products
        name: '',
        description: '',
        price: 0,
        originalPrice: 0,
        stock: 0,
        image: '/new-kit-front.png',
        category: 'Components',
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
           <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Sensors">Sensors</SelectItem>
                    <SelectItem value="Arduino Boards">Arduino Boards</SelectItem>
                    <SelectItem value="Displays">Displays</SelectItem>
                    <SelectItem value="Power Modules">Power Modules</SelectItem>
                    <SelectItem value="Robotics">Robotics</SelectItem>
                    <SelectItem value="Wires & Connectors">Wires & Connectors</SelectItem>
                    <SelectItem value="Components">Components</SelectItem>
                    <SelectItem value="DIY Kits">DIY Kits</SelectItem>
                    <SelectItem value="EZCirkit">EZCirkit</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
            control={form.control}
            name="image"
            render={({ field }) => (
                <FormItem className="space-y-2">
                <FormLabel>Product Image</FormLabel>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <FormControl>
                        <Input placeholder="Paste image URL or upload one" {...field} value={field.value || ''} />
                      </FormControl>
                    </div>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        id="product-file-upload"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, field.onChange)}
                        disabled={isUploadingImage}
                      />
                      <label htmlFor="product-file-upload">
                        <Button
                          type="button"
                          variant="outline"
                          className="cursor-pointer gap-1.5"
                          asChild
                          disabled={isUploadingImage}
                        >
                          <span>
                            <Upload className="h-4 w-4" />
                            {isUploadingImage ? 'Uploading...' : 'Upload'}
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>

                  {field.value && (
                    <div className="relative border border-zinc-200/80 rounded-xl overflow-hidden bg-zinc-50 max-h-48 flex items-center justify-center p-2 group">
                      <img
                        src={field.value}
                        alt="Product Image Preview"
                        className="max-h-40 object-contain rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => field.onChange('')}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
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
