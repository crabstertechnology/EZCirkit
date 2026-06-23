

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
import { Upload, X, Image as ImageIcon } from 'lucide-react';

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
    const tutorialId = isEditing ? tutorial.id : doc(collection(firestore, '_')).id;
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
                        id="diagram-file-upload"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, field.onChange)}
                        disabled={isUploadingImage}
                      />
                      <label htmlFor="diagram-file-upload">
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
