

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
import { doc, collection, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Tutorial, TutorialLevel } from '@/lib/tutorials';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const tutorialSchema = z.object({
  title: z.string().min(3, 'Title is required.'),
  description: z.string().min(10, 'Description is required.'),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  duration: z.string().min(3, 'Duration is required.'),
  imageId: z.string().min(1, 'Image ID is required.'),
  videoId: z.string().url('Please enter a valid URL.').optional().or(z.literal('')),
  order: z.coerce.number().int().min(0, 'Order must be positive.'),
});

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
    },
  });

  useEffect(() => {
    if (tutorial) {
      form.reset({
        ...tutorial,
        level: tutorial.level || 'Beginner',
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
      });
    }
  }, [tutorial, form.reset]);

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
      id: tutorialId,
      chapterId: chapterId,
    };
    
    try {
      await setDoc(docRef, tutorialData, { merge: isEditing });
      toast({ title: tutorial ? 'Tutorial updated!' : 'Tutorial created!' });
      onSave(); // This now correctly waits for setDoc to finish
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

        <FormField
          control={form.control}
          name="level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Level</FormLabel>
               <div className="grid grid-cols-3 gap-2">
                {LEVEL_OPTIONS.map(level => (
                  <Button
                    key={level}
                    type="button"
                    variant={field.value === level ? 'default' : 'outline'}
                    onClick={() => field.onChange(level)}
                  >
                    {level}
                  </Button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
             <FormField name="duration" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Duration</FormLabel><FormControl><Input placeholder="45 mins" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField name="order" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Order</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
        </div>

        <FormField name="imageId" control={form.control} render={({ field }) => (
            <FormItem><FormLabel>Image ID</FormLabel><FormControl><Input placeholder="tutorial-1" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        
        <FormField name="description" control={form.control} render={({ field }) => (
            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="A short summary of the project." {...field} rows={5} /></FormControl><FormMessage /></FormItem>
        )}/>

        <FormField name="videoId" control={form.control} render={({ field }) => (
            <FormItem>
                <FormLabel>Video URL (YouTube, Google Drive, etc.)</FormLabel>
                <FormControl>
                    <Input placeholder="https://www.youtube.com/embed/your_video_id" {...field} />
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
