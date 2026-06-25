'use client';

import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '../ui/textarea';
import { Upload, X, Image as ImageIcon, Plus, Search } from 'lucide-react';
import type { Product } from '@/app/admin/products/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Asset {
  name: string;
  fileName: string;
  path: string;
  mtime: number;
  size: number;
}

interface AssetPickerProps {
  onSelect: (path: string) => void;
  trigger: React.ReactNode;
}

const AssetPicker: React.FC<AssetPickerProps> = ({ onSelect, trigger }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'>('date-desc');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchAssets = async () => {
        setLoading(true);
        try {
          const res = await fetch('/api/assets');
          const data = await res.json();
          if (data.assets) {
            setAssets(data.assets);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchAssets();
    }
  }, [open]);

  const filteredAndSortedAssets = React.useMemo(() => {
    let result = [...assets];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) => a.name.toLowerCase().includes(q) || a.fileName.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'date-desc') return b.mtime - a.mtime;
      if (sortBy === 'date-asc') return a.mtime - b.mtime;
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      return 0;
    });

    return result;
  }, [assets, search, sortBy]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl w-[95vw] rounded-2xl p-6 border-border bg-white dark:bg-zinc-950 font-sans">
        <DialogHeader>
          <DialogTitle className="font-headline font-black text-xl text-foreground">Asset Gallery</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col sm:flex-row gap-3 py-2 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl h-10 w-full"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="rounded-xl h-10 w-full">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-xs text-muted-foreground font-semibold">Loading assets...</p>
          </div>
        ) : filteredAndSortedAssets.length === 0 ? (
          <div className="h-64 border border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center space-y-2">
            <ImageIcon className="h-10 w-10 text-muted-foreground/60" />
            <p className="text-sm font-bold text-foreground">No assets found</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              {search ? "Try adjusting your search keywords." : "Place image files inside your 'public' folder to populate the gallery."}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[360px] pr-2 mt-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {filteredAndSortedAssets.map((asset) => (
                <button
                  key={asset.path}
                  type="button"
                  onClick={() => {
                    onSelect(asset.path);
                    setOpen(false);
                  }}
                  className="flex flex-col items-stretch p-1.5 border rounded-xl hover:border-primary hover:bg-zinc-50 dark:hover:bg-zinc-900 transition text-left group cursor-pointer bg-white dark:bg-zinc-900/20"
                >
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200/50">
                    <img src={asset.path} alt={asset.name} className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="pt-2 px-1 pb-1 space-y-0.5">
                    <span className="text-[10px] font-bold text-foreground group-hover:text-primary transition-colors block truncate w-full">
                      {asset.name}
                    </span>
                    <span className="text-[9px] font-semibold text-muted-foreground block truncate w-full">
                      {asset.fileName}
                    </span>
                    <div className="flex justify-between items-center text-[8px] text-muted-foreground font-semibold pt-0.5 border-t border-zinc-100 dark:border-zinc-800">
                      <span>{(asset.size / 1024).toFixed(0)} KB</span>
                      <span>{new Date(asset.mtime).toLocaleDateString()}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Define the full product schema matching the detail page requirements
const productSchema = z.object({
  id: z.string().min(3, 'Product ID must be at least 3 characters.'),
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  description: z.string().optional(),
  price: z.coerce.number().positive('Price must be positive.'),
  originalPrice: z.coerce.number().optional(),
  stock: z.coerce.number().int().nonnegative('Stock cannot be negative.'),
  image: z.string().min(1, 'Image URL is required.'),
  category: z.string().optional(),
  
  // Extended fields
  brand: z.string().optional(),
  sku: z.string().optional(),
  features: z.string().optional(), // Newline-separated features
  specifications: z.string().optional(), // Newline-separated "Key: Value" specifications
  additionalResources: z.string().optional(), // Newline-separated "Label: URL" resources
  warranty: z.string().optional(),
  shipping: z.string().optional(),
  gallery: z.array(z.string()).optional(), // Image URLs or Base64 strings
});

const compressImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 800; // Small size for extremely compact Firestore footprint
        const maxHeight = 800;
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
          // Convert to WebP with 0.60 quality for ultra-lightweight storage (usually 15-25 KB)
          const base64 = canvas.toDataURL('image/webp', 0.60);
          resolve(base64);
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = () => {
        resolve(event.target?.result as string);
      };
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
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
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
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
      image: '/new-kit-front.png',
      category: 'Components',
      brand: '',
      sku: '',
      features: '',
      specifications: '',
      additionalResources: '',
      warranty: '',
      shipping: '',
      gallery: [],
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        ...product,
        category: product.category || 'Components',
        brand: (product as any).brand || '',
        sku: (product as any).sku || '',
        features: (product as any).features || '',
        specifications: (product as any).specifications || '',
        additionalResources: (product as any).additionalResources || '',
        warranty: (product as any).warranty || '',
        shipping: (product as any).shipping || '',
        gallery: (product as any).gallery || [],
      });
    } else {
      form.reset({
        id: doc(collection(firestore, '_')).id,
        name: '',
        description: '',
        price: 0,
        originalPrice: 0,
        stock: 0,
        image: '/new-kit-front.png',
        category: 'Components',
        brand: '',
        sku: '',
        features: '',
        specifications: '',
        additionalResources: '',
        warranty: '',
        shipping: '',
        gallery: [],
      });
    }
  }, [product, form, firestore]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, onChange: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const base64 = await compressImageToBase64(file);
      onChange(base64);
      toast({ title: 'Main image processed and compressed successfully!' });
    } catch (err) {
      console.error("Compression error:", err);
      toast({ variant: 'destructive', title: 'Failed to process image.' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingGallery(true);
    
    const currentGallery = form.getValues('gallery') || [];
    const newImages = [...currentGallery];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const base64 = await compressImageToBase64(file);
        newImages.push(base64);
      } catch (err) {
        console.error("Gallery compression error:", err);
      }
    }
    
    form.setValue('gallery', newImages);
    toast({ title: `${files.length} gallery image(s) processed successfully!` });
    setIsUploadingGallery(false);
  };

  const removeGalleryImage = (index: number) => {
    const currentGallery = form.getValues('gallery') || [];
    const updated = currentGallery.filter((_, idx) => idx !== index);
    form.setValue('gallery', updated);
  };

  const addAssetToGallery = (path: string) => {
    const current = form.getValues('gallery') || [];
    if (current.includes(path)) {
      toast({ title: 'This asset is already in the gallery.' });
      return;
    }
    if (current.length >= 5) {
      toast({ variant: 'destructive', title: 'You can only add up to 5 images.' });
      return;
    }
    form.setValue('gallery', [...current, path]);
    toast({ title: 'Added asset to gallery.' });
  };

  const onSubmit: SubmitHandler<ProductFormValues> = async (data) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'You must be authenticated as admin.' });
      return;
    }
    setIsSubmitting(true);
    
    const productRef = doc(firestore, 'products', data.id);
    
    // Write product data
    setDocumentNonBlocking(productRef, data, { merge: true });

    toast({ title: `Product ${isEditing ? 'updated' : 'added'} successfully!` });
    onSave();
    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="basic">1. Basic Info</TabsTrigger>
            <TabsTrigger value="extended">2. Product Details</TabsTrigger>
            <TabsTrigger value="media">3. Gallery & Specs</TabsTrigger>
          </TabsList>

          {/* TAB 1: BASIC INFO */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="ESP32-S3 IoT Development Board" {...field} />
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
                  <FormLabel>Short Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A concise, high-converting product summary." {...field} className="h-20" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2499" {...field} />
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
                    <FormLabel>Original Price (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="3499" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          {/* TAB 2: DETAILED SPECIFICS */}
          <TabsContent value="extended" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand / Manufacturer</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 7Semi, Arduino, Espressif" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU / Part ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. TIFCC0230" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="features"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Features (One bullet point per line)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g.&#10;Combines 4G LTE, Wi-Fi, Bluetooth, and GNSS&#10;Supports multiple LTE and GSM bands&#10;ESP32-S3 dual-core processor" 
                      {...field} 
                      className="h-28 font-sans text-sm" 
                    />
                  </FormControl>
                  <FormDescription>These will render as bold bullet points on the product page.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="warranty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warranty Terms</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g. 6 Months warranty against manufacturing defects." {...field} className="h-20 text-xs" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shipping"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping & Delivery Info</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g. Dispatched in 24 hours. Free delivery for orders above ₹999." {...field} className="h-20 text-xs" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          {/* TAB 3: MEDIA & TECHNICAL DETAILS */}
          <TabsContent value="media" className="space-y-4">
            {/* Main Image */}
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Main Product Image</FormLabel>
                  <div className="flex gap-2.5 items-center">
                    <FormControl className="flex-1">
                      <Input placeholder="Paste image URL or upload one" {...field} />
                    </FormControl>
                    <AssetPicker 
                      onSelect={(path) => field.onChange(path)}
                      trigger={
                        <Button type="button" variant="outline" className="gap-1.5 h-10 cursor-pointer">
                          <ImageIcon className="h-4 w-4" />
                          <span>Gallery</span>
                        </Button>
                      }
                    />
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        id="main-image-upload"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, field.onChange)}
                        disabled={isUploadingImage}
                      />
                      <label htmlFor="main-image-upload">
                        <Button type="button" variant="outline" className="cursor-pointer gap-1.5 h-10" asChild disabled={isUploadingImage}>
                          <span>
                            <Upload className="h-4 w-4" />
                            {isUploadingImage ? 'Processing...' : 'Upload'}
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                  {isUploadingImage && (
                    <div className="text-xs text-orange-600 dark:text-orange-400 animate-pulse mt-1.5 flex items-center gap-1.5 font-medium">
                      <span className="h-2 w-2 rounded-full bg-orange-500 animate-ping" />
                      <span>Compressing image for database...</span>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Gallery Upload */}
            <div className="space-y-2">
              <FormLabel>Product Gallery Images (Up to 5 images)</FormLabel>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  id="gallery-image-upload"
                  className="hidden"
                  onChange={handleGalleryUpload}
                  disabled={isUploadingGallery}
                />
                <label htmlFor="gallery-image-upload" className="flex-1">
                  <Button type="button" variant="outline" className="w-full border-dashed border-2 py-6 h-auto flex flex-col gap-1 items-center justify-center cursor-pointer" asChild disabled={isUploadingGallery}>
                    <span>
                      <Plus className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs font-bold text-muted-foreground">
                        {isUploadingGallery ? 'Compressing...' : 'Upload Multiple Gallery Images'}
                      </span>
                    </span>
                  </Button>
                </label>
                <AssetPicker
                  onSelect={(path) => addAssetToGallery(path)}
                  trigger={
                    <Button type="button" variant="outline" className="border-dashed border-2 py-6 h-auto flex flex-col gap-1 items-center justify-center cursor-pointer px-8">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs font-bold text-muted-foreground">Choose from Gallery</span>
                    </Button>
                  }
                />
              </div>
              {isUploadingGallery && (
                <div className="text-xs text-orange-600 dark:text-orange-400 animate-pulse mt-1.5 flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-orange-500 animate-ping" />
                  <span>Compressing gallery images for database...</span>
                </div>
              )}

              {/* Gallery Preview List */}
              {form.watch('gallery') && form.watch('gallery')!.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {form.watch('gallery')!.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20 border rounded-lg overflow-hidden bg-zinc-50 group">
                      <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-contain" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-5 w-5 rounded-full p-0 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeGalleryImage(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Specifications */}
            <FormField
              control={form.control}
              name="specifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Technical Specifications (Enter "Label: Value", one per line)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g.&#10;Microcontroller: ESP32-S3&#10;Flash Memory: 8MB&#10;Operating Voltage: 3.3V&#10;Connectivity: LTE Cat-1, WiFi, BLE" 
                      {...field} 
                      className="h-24 font-mono text-xs" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Additional Resources */}
            <FormField
              control={form.control}
              name="additionalResources"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Datasheets & Additional Resources (Enter "Name: URL", one per line)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g.&#10;Datasheet: https://example.com/datasheet.pdf&#10;GitHub Library: https://github.com/example/lib" 
                      {...field} 
                      className="h-20 font-mono text-xs" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        <Button type="submit" className="w-full bg-primary text-white hover:bg-primary/95 font-bold h-11" disabled={isSubmitting}>
          {isSubmitting ? 'Saving Product...' : (isEditing ? 'Save Product Details' : 'Publish Product')}
        </Button>
      </form>
    </Form>
  );
};

export default ProductForm;
