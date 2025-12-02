
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import type { Review } from './testimonials';
import Link from 'next/link';

const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  comment: z.string().min(10, 'Review must be at least 10 characters.'),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  productId: string;
  existingReviews: Review[];
}

const ReviewForm: React.FC<ReviewFormProps> = ({ productId, existingReviews }) => {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
        setIsVerifying(false);
        return;
    }

    // Check if user has already reviewed
    const userHasReviewed = existingReviews.some(review => review.userId === user.uid);
    setHasReviewed(userHasReviewed);

    // Verify purchase
    const verifyPurchase = async () => {
        if (!firestore) return;
        const ordersRef = collection(firestore, 'users', user.uid, 'orders');
        const q = query(ordersRef, where('status', '==', 'paid'));
        try {
            const querySnapshot = await getDocs(q);
            setHasPurchased(!querySnapshot.empty);
        } catch (error) {
            console.error("Error verifying purchase for review:", error);
            setHasPurchased(false);
        } finally {
            setIsVerifying(false);
        }
    };
    verifyPurchase();

  }, [user, isUserLoading, firestore, existingReviews]);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
  });

  const onSubmit: SubmitHandler<ReviewFormValues> = (data) => {
    if (!user || !firestore) return;

    setIsSubmitting(true);
    const reviewsCol = collection(firestore, 'products', productId, 'reviews');
    
    addDocumentNonBlocking(reviewsCol, {
      ...data,
      userId: user.uid,
      userName: user.displayName,
      userPhotoURL: user.photoURL,
      createdAt: serverTimestamp(),
    }).then(() => {
      toast({ title: 'Review submitted!', description: 'Thank you for your feedback.' });
      form.reset();
      setHasReviewed(true); // Prevent submitting another review
    }).finally(() => {
      setIsSubmitting(false);
    });
  };

  if (isUserLoading || isVerifying) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!user) {
    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle>Want to share your thoughts?</CardTitle>
          <CardDescription>
            Please <a href="/login" className="underline font-bold">log in</a> to write a review.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  if (!hasPurchased) {
     return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle>Write a Review</CardTitle>
          <CardDescription>
            Only verified customers can leave a review. <Link href="/#products" className="underline font-bold">Purchase the kit</Link> to share your thoughts!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (hasReviewed) {
    return (
        <Card className="text-center">
            <CardHeader>
                <CardTitle>Thank You for Your Feedback!</CardTitle>
                <CardDescription>
                    You have already submitted a review for this product.
                </CardDescription>
            </CardHeader>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write a Review</CardTitle>
        <CardDescription>Share your thoughts on the crabster with the community.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Rating</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-8 w-8 cursor-pointer transition-colors',
                            field.value > i ? 'text-gold' : 'text-gray-300'
                          )}
                          fill={field.value > i ? 'hsl(var(--color-gold))' : 'transparent'}
                          onClick={() => field.onChange(i + 1)}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Review</FormLabel>
                  <FormControl>
                    <Textarea placeholder="It was a great learning experience..." {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ReviewForm;
