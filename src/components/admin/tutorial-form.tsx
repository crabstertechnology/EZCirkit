

'use client';

import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useFirestore } from '@/firebase';
import { doc, collection, setDoc, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Tutorial, TutorialLevel } from '@/lib/tutorials';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Upload, X, Image as ImageIcon, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const tutorialSchema = z.object({
  title: z.string().min(3, 'Title is required.'),
  description: z.string().min(10, 'Description is required.'),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  duration: z.string().optional(),
  imageId: z.string().optional(),
  videoId: z.string().optional(),
  order: z.coerce.number().int().min(0, 'Order must be positive.'),
  code: z.string().optional(),
  transcript: z.string().optional(),
  notes: z.string().optional(),
  diagramUrl: z.string().optional(),
  pinout: z.string().optional(),
});

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

type TutorialFormValues = z.infer<typeof tutorialSchema>;

interface TutorialFormProps {
  onSave: () => void;
  tutorial?: Tutorial | null;
  chapterId: string;
}

const LEVEL_OPTIONS: TutorialLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

const TutorialForm: React.FC<TutorialFormProps> = ({ onSave, tutorial, chapterId }) => {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // Pre-generate the tutorial ID so it is consistent across uploads and submissions
  const [tutorialId] = useState(() => tutorial?.id || doc(collection(firestore, '_')).id);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, onChange: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const base64 = await compressImageToBase64(file);
      onChange(base64);
      toast({ title: 'Diagram image processed and compressed successfully!' });
    } catch (err) {
      console.error("Compression error:", err);
      toast({ variant: 'destructive', title: 'Failed to process image.' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const form = useForm<TutorialFormValues>({
    resolver: zodResolver(tutorialSchema),
    defaultValues: {
      title: '',
      description: '',
      level: 'Beginner',
      duration: '',
      imageId: '',
      videoId: '',
      order: 0,
      code: '',
      transcript: '',
      notes: '',
      diagramUrl: '',
      pinout: '',
    },
  });

  const videoIdValue = form.watch('videoId');

  useEffect(() => {
    if (!videoIdValue) return;

    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = videoIdValue.match(regExp);
    const ytId = (match && match[2].length === 11) ? match[2] : null;

    if (ytId) {
      fetch(`/api/youtube-duration?videoId=${ytId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.duration) {
            form.setValue('duration', data.duration);
          }
        })
        .catch(err => {
          console.error("Error auto-fetching duration:", err);
        });
    }
  }, [videoIdValue, form.setValue]);

  useEffect(() => {
    if (tutorial) {
      form.reset({
        ...tutorial,
        level: tutorial.level || 'Beginner',
        code: tutorial.code || '',
        transcript: tutorial.transcript || '',
        notes: tutorial.notes || '',
        diagramUrl: tutorial.diagramUrl || '',
        pinout: tutorial.pinout || '',
      });
    } else {
      form.reset({
        title: '',
        description: '',
        level: 'Beginner',
        duration: '',
        imageId: '',
        videoId: '',
        order: 0,
        code: '',
        transcript: '',
        notes: '',
        diagramUrl: '',
        pinout: '',
      });

      if (firestore && chapterId) {
        getDocs(collection(firestore, `tutorialChapters/${chapterId}/tutorials`))
          .then((snapshot) => {
            let maxOrder = -1;
            snapshot.forEach((doc) => {
              const data = doc.data();
              if (data && typeof data.order === 'number') {
                if (data.order > maxOrder) {
                  maxOrder = data.order;
                }
              }
            });
            form.setValue('order', maxOrder + 1);
          })
          .catch((err) => {
            console.error("Error fetching tutorials for auto-order:", err);
          });
      }
    }
  }, [tutorial, form.reset, firestore, chapterId, form.setValue]);

  const onSubmit: SubmitHandler<TutorialFormValues> = async (data) => {
    if (!firestore || !chapterId) {
        toast({variant: 'destructive', title: 'Error', description: 'Chapter not specified.'});
        return
    };
    setIsSubmitting(true);

    const isEditing = !!tutorial;
    const docRef = doc(firestore, `tutorialChapters/${chapterId}/tutorials`, tutorialId);
    
    const tutorialData = {
      ...data,
      imageId: data.imageId || 'tutorial-1',
      duration: data.duration || '5 mins',
      id: tutorialId,
      chapterId: chapterId,
    };
    
    try {
      await setDoc(docRef, tutorialData, { merge: isEditing });
      toast({ title: tutorial ? 'Tutorial updated!' : 'Tutorial created!' });
      onSave();
    } catch(error: any) {
        toast({
            variant: 'destructive',
            title: 'Firestore Error',
            description: error.message || 'Could not save tutorial. Check console for details.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <ScrollArea className="h-[70vh] pr-6">
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField name="title" control={form.control} render={({ field }) => (
            <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Blinking an LED" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>


        <FormField name="order" control={form.control} render={({ field }) => (
            <FormItem><FormLabel>Order</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        
        <FormField name="description" control={form.control} render={({ field }) => (
            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="A short summary of the project." {...field} rows={5} /></FormControl><FormMessage /></FormItem>
        )}/>

        <FormField name="videoId" control={form.control} render={({ field }) => (
            <FormItem>
                <FormLabel>Video URL (YouTube, Google Drive, etc.) (Optional)</FormLabel>
                <FormControl>
                    <Input placeholder="https://www.youtube.com/embed/your_video_id" {...field} />
                </FormControl>
                <FormMessage />
            </FormItem>
        )}/>

        <FormField name="diagramUrl" control={form.control} render={({ field }) => (
            <FormItem className="space-y-2">
                <FormLabel>Diagram Image</FormLabel>
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1">
                      <FormControl>
                        <Input placeholder="Paste image URL or upload one" {...field} value={field.value || ''} />
                      </FormControl>
                    </div>
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
                        id="diagram-file-upload"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, field.onChange)}
                        disabled={isUploadingImage}
                      />
                      <label htmlFor="diagram-file-upload">
                        <Button
                          type="button"
                          variant="outline"
                          className="cursor-pointer gap-1.5 h-10"
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
                  {isUploadingImage && (
                    <div className="text-xs text-orange-600 dark:text-orange-400 animate-pulse mt-1.5 flex items-center gap-1.5 font-medium">
                      <span className="h-2 w-2 rounded-full bg-orange-500 animate-ping" />
                      <span>Compressing image for database...</span>
                    </div>
                  )}

                  {field.value && (
                    <div className="relative border border-zinc-200/80 rounded-xl overflow-hidden bg-zinc-50 max-h-48 flex items-center justify-center p-2 group">
                      <img
                        src={field.value}
                        alt="Circuit Diagram Preview"
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
        )}/>

        <FormField name="pinout" control={form.control} render={({ field }) => (
            <FormItem>
                <FormLabel>Pinout Description (Optional)</FormLabel>
                <FormControl>
                    <Textarea placeholder="e.g. Pin 9: LED positive terminal, GND: LED negative terminal" {...field} rows={4} />
                </FormControl>
                <FormMessage />
            </FormItem>
        )}/>

         <FormField name="code" control={form.control} render={({ field }) => (
            <FormItem>
                <FormLabel>Code Snippet (Optional)</FormLabel>
                <FormControl>
                    <Textarea placeholder="Paste your code here..." {...field} rows={8} />
                </FormControl>
                <FormMessage />
            </FormItem>
        )}/>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Tutorial'}
        </Button>
      </form>
    </Form>
    </ScrollArea>
  );
};

export default TutorialForm;
