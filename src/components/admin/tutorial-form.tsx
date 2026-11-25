

'use client';

import React, { useEffect, useState, useRef } from 'react';
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
import { Upload, X, Image as ImageIcon, Search, Cpu, CheckCircle2, AlertCircle, Loader2, Sparkles, Eye, EyeOff, Plus, Trash2, Video, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const tutorialSchema = z.object({
  title: z.string().min(3, 'Title is required.'),
  description: z.string().min(10, 'Description is required.'),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  duration: z.string().optional(),
  imageId: z.string().optional(),
  videoId: z.string().optional(),
  order: z.coerce.number().int().min(0, 'Order must be positive.'),
  code: z.string().optional(),
  compiledHex: z.string().optional(),
  transcript: z.string().optional(),
  notes: z.string().optional(),
  diagramUrl: z.string().optional(),
  pinout: z.string().optional(),
  isHidden: z.boolean().optional(),
  isVideoOnly: z.boolean().optional(),
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
  chapters?: Array<{ id: string; title: string }>;
  onChapterChange?: (chapterId: string) => void;
  defaultVideoOnly?: boolean;
  isFullScreen?: boolean;
  onSubmittingChange?: (submitting: boolean) => void;
  showChapterSelectorInside?: boolean;
}

const LEVEL_OPTIONS: TutorialLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

const TutorialForm: React.FC<TutorialFormProps> = ({
  onSave,
  tutorial,
  chapterId,
  chapters,
  onChapterChange,
  defaultVideoOnly = false,
  isFullScreen = false,
  onSubmittingChange,
  showChapterSelectorInside = false,
}) => {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [components, setComponents] = useState<Array<{ name: string; quantity: string }>>([]);

  const handleAddComponent = () => {
    setComponents((prev) => [...prev, { name: '', quantity: '1' }]);
  };

  const handleUpdateComponent = (index: number, field: 'name' | 'quantity', value: string) => {
    setComponents((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveComponent = (index: number) => {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuickAdd = (name: string, quantity = '1') => {
    setComponents((prev) => {
      const exists = prev.some((c) => c.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        toast({ title: 'Already Added', description: `"${name}" is already in the components list.` });
        return prev;
      }
      return [...prev, { name, quantity }];
    });
  };
  
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
      compiledHex: '',
      transcript: '',
      notes: '',
      diagramUrl: '',
      pinout: '',
      isHidden: false,
      isVideoOnly: defaultVideoOnly,
    },
  });

  const videoIdValue = form.watch('videoId');
  const lastHandledVideoId = useRef<string | null>(null);

  useEffect(() => {
    if (!videoIdValue) return;

    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = videoIdValue.match(regExp);
    const ytId = (match && match[2].length === 11) ? match[2] : null;

    if (!ytId) return;

    // Prevent re-fetching if this video was already processed
    if (lastHandledVideoId.current === ytId) return;
    lastHandledVideoId.current = ytId;

    // NEVER overwrite an existing duration (either loaded from tutorial or typed by user)
    const currentDuration = form.getValues('duration');
    if (currentDuration && currentDuration.trim() !== '') {
      return;
    }

    fetch(`/api/youtube-duration?videoId=${ytId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.duration) {
          const latestDuration = form.getValues('duration');
          if (!latestDuration || latestDuration.trim() === '') {
            form.setValue('duration', data.duration, { shouldDirty: true });
          }
        }
      })
      .catch(err => {
        console.error("Error auto-fetching duration:", err);
      });
  }, [videoIdValue, form]);

  useEffect(() => {
    if (tutorial) {
      lastHandledVideoId.current = tutorial.videoId || null;
      setComponents(
        Array.isArray(tutorial.components) && tutorial.components.length > 0
          ? tutorial.components.map((c) => ({ name: c.name || '', quantity: c.quantity || '1' }))
          : []
      );
      form.reset({
        ...tutorial,
        level: tutorial.level || 'Beginner',
        code: tutorial.code || '',
        compiledHex: tutorial.compiledHex || '',
        transcript: tutorial.transcript || '',
        notes: tutorial.notes || '',
        diagramUrl: tutorial.diagramUrl || '',
        pinout: tutorial.pinout || '',
        isHidden: tutorial.isHidden ?? false,
        isVideoOnly: tutorial.isVideoOnly ?? defaultVideoOnly,
      });
    } else {
      setComponents([]);
      form.reset({
        title: '',
        description: '',
        level: 'Beginner',
        duration: '',
        imageId: '',
        videoId: '',
        order: 0,
        code: '',
        compiledHex: '',
        transcript: '',
        notes: '',
        diagramUrl: '',
        pinout: '',
        isHidden: false,
        isVideoOnly: defaultVideoOnly,
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
      toast({ variant: 'destructive', title: 'Error', description: 'Chapter not specified.' });
      return;
    }
    setIsSubmitting(true);
    onSubmittingChange?.(true);

    const isEditing = !!tutorial;
    const docRef = doc(firestore, `tutorialChapters/${chapterId}/tutorials`, tutorialId);

    const cleanedComponents = components
      .map((c) => ({
        name: c.name.trim(),
        quantity: (c.quantity || '1').trim(),
      }))
      .filter((c) => c.name.length > 0);

    const tutorialData = {
      ...data,
      components: cleanedComponents,
      isHidden: data.isHidden ?? false,
      isVideoOnly: Boolean(data.isVideoOnly),
      compiledHex: data.compiledHex || tutorial?.compiledHex || undefined,
      imageId: data.imageId || 'tutorial-1',
      duration: data.duration?.trim() ? data.duration.trim() : (tutorial?.duration || '5 mins'),
      id: tutorialId,
      chapterId: chapterId,
    };

    try {
      await setDoc(docRef, tutorialData, { merge: isEditing });
      toast({
        title: tutorial ? 'Experiment updated!' : 'Experiment created!',
        description: 'Saved successfully.',
      });
      onSave();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Firestore Error',
        description: error.message || 'Could not save tutorial. Check console for details.',
      });
    } finally {
      setIsSubmitting(false);
      onSubmittingChange?.(false);
    }
  };

  const formContent = (
    <Form {...form}>
      <form id="tutorial-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className={cn(isFullScreen ? "grid grid-cols-1 xl:grid-cols-12 gap-6" : "space-y-5")}>
          
          {/* Left Column: Details, Description, and Hardware Components */}
          <div className={cn(isFullScreen ? "xl:col-span-7 space-y-6" : "space-y-4")}>
            
            {/* Block 1: Basic Information */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <h3 className="font-bold text-sm text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-zinc-900" />
                  Basic Information
                </h3>
              </div>

              {/* Horizontal Row: Chapter (if provided & enabled) & Title */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {showChapterSelectorInside && chapters && chapters.length > 0 ? (
                  <>
                    <div className="md:col-span-5 space-y-2">
                      <Label className="font-bold text-xs text-zinc-900">Destination Chapter</Label>
                      <select
                        value={chapterId}
                        onChange={(e) => onChapterChange?.(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-zinc-400 focus:bg-white transition-all h-10"
                      >
                        {chapters.map(ch => (
                          <option key={ch.id} value={ch.id}>
                            {ch.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-7">
                      <FormField
                        name="title"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-xs text-zinc-900">Experiment Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Blinking an LED, Ultrasonic Distance Sensor" className="h-10 rounded-xl text-xs" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                ) : (
                  <div className="col-span-12">
                    <FormField
                      name="title"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-xs text-zinc-900">Experiment Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Blinking an LED, Ultrasonic Distance Sensor" className="h-10 rounded-xl text-xs" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Horizontal Row: Level, Order, Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  name="level"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs text-zinc-900">Difficulty Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'Beginner'}>
                        <FormControl>
                          <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LEVEL_OPTIONS.map(lvl => (
                            <SelectItem key={lvl} value={lvl} className="text-xs">{lvl}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="order"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs text-zinc-900">Display Order</FormLabel>
                      <FormControl>
                        <Input type="number" className="h-10 rounded-xl text-xs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="duration"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs text-zinc-900">Estimated Duration</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 5 mins" className="h-10 rounded-xl text-xs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Horizontal Row: Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <FormField
                  name="isHidden"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 shadow-2xs">
                      <div className="space-y-0.5 pr-2">
                        <FormLabel className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5 cursor-pointer">
                          {field.value ? <EyeOff className="h-3.5 w-3.5 text-zinc-900" /> : <Eye className="h-3.5 w-3.5 text-zinc-900" />}
                          <span>Hide from Students</span>
                        </FormLabel>
                        <p className="text-[11px] text-zinc-500">
                          {field.value ? 'Admin only.' : 'Visible on catalog.'}
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  name="isVideoOnly"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 shadow-2xs">
                      <div className="space-y-0.5 pr-2">
                        <FormLabel className="text-xs font-bold text-zinc-900 flex items-center gap-1.5 cursor-pointer">
                          <Video className="h-3.5 w-3.5 text-zinc-900" />
                          <span>Video Only (Without IDE)</span>
                        </FormLabel>
                        <p className="text-[11px] text-zinc-500">
                          Intro, unboxing, or theory without code.
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Block 2: Overview & Wiring Instructions */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-zinc-900 uppercase tracking-wider pb-3 border-b border-zinc-100">
                Project Overview & Instructions
              </h3>
              
              <FormField
                name="description"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-xs text-zinc-900">Project Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="A clear summary of what this experiment does and what students will learn..." {...field} rows={4} className="text-xs leading-relaxed" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="pinout"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-xs text-zinc-900">Pinout & Wiring Connections (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g. Pin 9: LED positive terminal, GND: LED negative terminal..." {...field} rows={3} className="text-xs font-mono leading-relaxed" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Block 3: Required Components & Hardware (Bill of Materials) */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100">
                <div>
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-zinc-900" />
                    <Label className="font-bold text-sm text-zinc-900">Required Components & Hardware</Label>
                    {components.length > 0 && (
                      <Badge variant="outline" className="text-[10px] font-bold bg-zinc-100 text-zinc-900 border-zinc-300">
                        {components.length} items
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Add parts and quantities needed. Displayed to students in tabular form inside the IDE and preview.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddComponent}
                  className="h-8 text-xs font-bold gap-1.5 border-zinc-300 bg-white hover:bg-zinc-100 text-black cursor-pointer self-start sm:self-auto rounded-xl shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Component</span>
                </Button>
              </div>

              {/* Quick Add Common Parts */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-zinc-500">Quick Add Common Parts:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: 'Arduino Uno R3', qty: '1' },
                    { name: 'Breadboard', qty: '1' },
                    { name: 'Jumper Wires (M-M)', qty: '10' },
                    { name: 'Jumper Wires (M-F)', qty: '4' },
                    { name: 'LED (5mm)', qty: '1' },
                    { name: '220Ω Resistor', qty: '1' },
                    { name: '10kΩ Resistor', qty: '1' },
                    { name: 'DHT11 Sensor', qty: '1' },
                    { name: 'HC-SR04 Ultrasonic', qty: '1' },
                    { name: 'Buzzer', qty: '1' },
                    { name: 'Push Button', qty: '1' },
                    { name: 'Servo Motor (SG90)', qty: '1' },
                  ].map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleQuickAdd(preset.name, preset.qty)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-50 hover:bg-zinc-100 hover:text-black hover:border-zinc-400 border border-zinc-200 rounded-lg text-zinc-700 transition-colors cursor-pointer shadow-2xs"
                    >
                      + {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Horizontal Block Cards for Components */}
              {components.length > 0 ? (
                <div className="space-y-2 pt-1">
                  {components.map((comp, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-zinc-50/70 border border-zinc-200 rounded-xl shadow-2xs">
                      <span className="w-8 text-center text-xs font-mono font-bold text-zinc-400">
                        #{idx + 1}
                      </span>
                      <div className="flex-1">
                        <Input
                          placeholder="Component Name / Model (e.g. Ultrasonic Sensor HC-SR04)"
                          value={comp.name}
                          onChange={(e) => handleUpdateComponent(idx, 'name', e.target.value)}
                          className="h-9 text-xs rounded-lg bg-white border-zinc-200"
                        />
                      </div>
                      <div className="w-28 sm:w-32">
                        <Input
                          placeholder="Quantity (e.g. 1)"
                          value={comp.quantity}
                          onChange={(e) => handleUpdateComponent(idx, 'quantity', e.target.value)}
                          className="h-9 text-xs text-center font-mono rounded-lg bg-white border-zinc-200"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveComponent(idx)}
                        className="h-8 w-8 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Remove Component"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-zinc-300 rounded-xl p-5 text-center bg-zinc-50/50 space-y-1.5">
                  <p className="text-xs text-zinc-700 font-semibold">No components added yet.</p>
                  <p className="text-[11px] text-zinc-400">
                    Click <strong>Add Component</strong> or select from the quick parts above to add hardware.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Media, Diagram, and Arduino Code */}
          <div className={cn(isFullScreen ? "xl:col-span-5 space-y-6" : "space-y-4")}>

            {/* Block 4: Video Guide & Tutorial */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-zinc-900 uppercase tracking-wider pb-3 border-b border-zinc-100 flex items-center gap-2">
                <Video className="h-4 w-4 text-zinc-900" />
                Video Guide & Tutorial
              </h3>

              <FormField
                name="videoId"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 font-bold text-xs text-zinc-900">
                      <span>YouTube or Video URL</span>
                      {form.watch('isVideoOnly') ? (
                        <Badge variant="outline" className="text-[10px] bg-zinc-100 text-zinc-900 border-zinc-300 font-bold ml-1">
                          Primary Video
                        </Badge>
                      ) : (
                        <span className="text-zinc-400 font-normal text-xs">(Optional)</span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://www.youtube.com/watch?v=..." className="h-10 rounded-xl text-xs" {...field} />
                    </FormControl>
                    <p className="text-[11px] text-zinc-400">
                      Supports YouTube links, shorts, or embeds. Duration is auto-fetched.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Block 5: Circuit Diagram Image */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-zinc-900 uppercase tracking-wider pb-3 border-b border-zinc-100 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-zinc-900" />
                Circuit Diagram & Wiring
              </h3>

              <FormField
                name="diagramUrl"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="font-bold text-xs text-zinc-900">Circuit Diagram Image (Optional)</FormLabel>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <FormControl>
                          <Input placeholder="Paste image URL or upload" {...field} value={field.value || ''} className="h-10 rounded-xl text-xs" />
                        </FormControl>
                      </div>
                      <AssetPicker 
                        onSelect={(path) => field.onChange(path)}
                        trigger={
                          <Button type="button" variant="outline" className="gap-1.5 h-10 px-3 cursor-pointer rounded-xl border-zinc-300 bg-white hover:bg-zinc-100 text-black text-xs font-bold">
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
                            className="cursor-pointer gap-1.5 h-10 px-3 rounded-xl border-zinc-300 bg-white hover:bg-zinc-100 text-black text-xs font-bold"
                            asChild
                            disabled={isUploadingImage}
                          >
                            <span>
                              <Upload className="h-4 w-4" />
                              {isUploadingImage ? '...' : 'Upload'}
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>

                    {isUploadingImage && (
                      <div className="text-xs text-zinc-700 animate-pulse flex items-center gap-1.5 font-medium">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Compressing image for database...</span>
                      </div>
                    )}

                    {field.value && (
                      <div className="relative border border-zinc-200 rounded-xl overflow-hidden bg-zinc-50 max-h-56 flex items-center justify-center p-2 group">
                        <img
                          src={field.value}
                          alt="Circuit Diagram Preview"
                          className="max-h-48 object-contain rounded-lg"
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Block 6: Arduino Sketch Code */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <h3 className="font-bold text-sm text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-zinc-900" />
                  Arduino Sketch Code
                </h3>
                {form.watch('compiledHex') && (
                  <Badge variant="outline" className="border-zinc-300 text-zinc-900 bg-zinc-100 text-[10px] font-bold gap-1 py-0.5">
                    <CheckCircle2 className="h-3 w-3 text-zinc-900" />
                    Hex Ready ({(form.watch('compiledHex')!.length / 1024).toFixed(1)} KB)
                  </Badge>
                )}
              </div>

              <FormField
                name="code"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="font-bold text-xs text-zinc-900">
                      C++ / Arduino .ino Code {form.watch('isVideoOnly') ? '(Optional for Video Guides)' : ''}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={form.watch('isVideoOnly') ? "Optional: Leave empty if this video guide does not require Arduino sketch code." : "Paste your Arduino .ino / C++ sketch here..."}
                        {...field}
                        rows={isFullScreen ? 12 : 7}
                        className="font-mono text-xs leading-relaxed bg-zinc-50 focus:bg-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

          </div>

          {/* Full-width Bottom Action Bar */}
          <div className={cn(isFullScreen ? "xl:col-span-12" : "", "pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3")}>
            <p className="text-xs text-zinc-400">
              Ensure all required fields are filled before saving.
            </p>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="submit"
                className="w-full sm:w-auto bg-zinc-900 hover:bg-black text-white font-bold h-11 px-8 rounded-xl shadow-sm transition-all cursor-pointer text-xs"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  'Saving...'
                ) : (
                  tutorial
                    ? (form.watch('isVideoOnly') ? 'Update Intro / Video Guide' : 'Update Experiment')
                    : (form.watch('isVideoOnly') ? 'Save Intro / Video Guide' : 'Save Experiment')
                )}
              </Button>
            </div>
          </div>

        </div>
      </form>
    </Form>
  );

  if (isFullScreen) {
    return formContent;
  }

  return (
    <ScrollArea className="h-[70vh] pr-6">
      {formContent}
    </ScrollArea>
  );
};

export default TutorialForm;
