'use client';

import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const testimonialVideoSchema = z.object({
  title: z.string().min(2, 'Title or student name is required.'),
  videoUrl: z.string().url('Please enter a valid YouTube URL.'),
  aspectRatio: z.enum(['16:9', '9:16']),
  order: z.coerce.number().int().min(0, 'Order must be a positive number.'),
});

type TestimonialVideoFormValues = z.infer<typeof testimonialVideoSchema>;

interface TestimonialVideoFormProps {
  onSave: () => void;
  video?: any | null;
}

const TestimonialVideoForm: React.FC<TestimonialVideoFormProps> = ({ onSave, video }) => {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TestimonialVideoFormValues>({
    resolver: zodResolver(testimonialVideoSchema),
    defaultValues: {
      title: '',
      videoUrl: '',
      aspectRatio: '16:9',
      order: 0,
    },
  });

  useEffect(() => {
    if (video) {
      form.reset({
        title: video.title,
        videoUrl: video.videoUrl,
        aspectRatio: video.aspectRatio || '16:9',
        order: video.order,
      });
    } else {
      form.reset({
        title: '',
        videoUrl: '',
        aspectRatio: '16:9',
        order: 0,
      });
    }
  }, [video, form]);

  const onSubmit: SubmitHandler<TestimonialVideoFormValues> = async (data) => {
    if (!firestore) return;
    setIsSubmitting(true);

    const isEditing = !!video;
    const videoId = isEditing ? video.id : doc(collection(firestore, '_')).id;
    const docRef = doc(firestore, 'testimonialVideos', videoId);
    
    const videoData = {
        ...data,
        id: videoId,
        createdAt: isEditing ? video.createdAt : serverTimestamp(),
    };

    setDocumentNonBlocking(docRef, videoData, { merge: true });
    
    toast({ title: video ? 'Testimonial updated!' : 'Testimonial added!' });
    onSave();
    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title (e.g., Student Name)</FormLabel>
              <FormControl>
                <Input placeholder="Rohan's Success Story" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="videoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>YouTube URL (Shorts supported)</FormLabel>
              <FormControl>
                <Input placeholder="https://youtube.com/shorts/..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="aspectRatio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aspect Ratio</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ratio" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="16:9">16:9 (Standard Widescreen)</SelectItem>
                  <SelectItem value="9:16">9:16 (YouTube Shorts)</SelectItem>
                </SelectContent>
              </Select>
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
          {isSubmitting ? 'Saving...' : 'Save Testimonial Video'}
        </Button>
      </form>
    </Form>
  );
};

export default TestimonialVideoForm;
