
'use client';

import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useFirestore } from '@/firebase';
import { doc, collection, setDoc, SetOptions } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { TutorialChapter } from '@/lib/tutorials';

const chapterSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  order: z.coerce.number().int().min(0, 'Order must be a positive number.'),
});

type ChapterFormValues = z.infer<typeof chapterSchema>;

interface ChapterFormProps {
  onSave: () => void;
  chapter?: TutorialChapter | null;
}

const ChapterForm: React.FC<ChapterFormProps> = ({ onSave, chapter }) => {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ChapterFormValues>({
    resolver: zodResolver(chapterSchema),
    defaultValues: {
      title: '',
      order: 0,
    },
  });

  useEffect(() => {
    if (chapter) {
      form.reset({ title: chapter.title, order: chapter.order });
    } else {
      form.reset({ title: '', order: 0 });
    }
  }, [chapter, form]);

  const onSubmit: SubmitHandler<ChapterFormValues> = async (data) => {
    if (!firestore) return;
    setIsSubmitting(true);

    const isEditing = !!chapter;
    const chapterId = isEditing ? chapter.id : doc(collection(firestore, '_')).id;
    const docRef = doc(firestore, 'tutorialChapters', chapterId);
    
    const chapterData = {
        id: chapterId,
        title: data.title,
        order: data.order,
    };

    const options: SetOptions | undefined = isEditing ? { merge: true } : undefined;

    try {
        await setDoc(docRef, chapterData, options);
        toast({ title: chapter ? 'Chapter updated!' : 'Chapter created!' });
        onSave();
    } catch (error: any) {
        console.error("Error saving chapter:", error);
        toast({
            variant: 'destructive',
            title: 'Firestore Error',
            description: error.message || 'Could not save chapter. Check console for details.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Chapter Title</FormLabel>
              <FormControl>
                <Input placeholder="Chapter 1: The Basics" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Order</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Chapter'}
        </Button>
      </form>
    </Form>
  );
};

export default ChapterForm;
