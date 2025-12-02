
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import StarRating from '@/components/shared/star-rating';
import { useFirestore, deleteDocumentNonBlocking, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import ReviewForm from './review-form';
import { Skeleton } from '../ui/skeleton';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '../ui/button';

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL: string;
  rating: number;
  comment: string;
  createdAt: { toDate: () => Date };
}

const PRODUCT_DOC_ID = 'pP2ohIXBTTLUCUPRk0Z8'; 

interface TestimonialsProps {
  reviews: Review[];
  averageRating: number;
  isLoadingReviews: boolean;
}

const ReviewCard = ({ review }: { review: Review }) => {
  const { user } = useUser();
  const firestore = useFirestore();

  const handleDelete = () => {
    if (!firestore) return;
    const reviewRef = doc(firestore, 'products', PRODUCT_DOC_ID, 'reviews', review.id);
    deleteDocumentNonBlocking(reviewRef);
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) return names[0][0] + names[names.length - 1][0];
    return name.substring(0, 2);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-6 flex-grow flex flex-col justify-between">
        <div>
          <StarRating rating={review.rating} className="mb-4" />
          <p className="text-foreground/80 italic">"{review.comment}"</p>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Avatar>
              <AvatarImage src={review.userPhotoURL} alt={review.userName} />
              <AvatarFallback>{getInitials(review.userName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{review.userName}</p>
              <p className="text-sm text-muted-foreground">Verified Buyer</p>
            </div>
          </div>
           {user?.uid === review.userId && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your review.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


const Testimonials: React.FC<TestimonialsProps> = ({ reviews, averageRating, isLoadingReviews }) => {

  return (
    <section id="testimonials" className="py-16 md:py-24 bg-secondary">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold font-headline">
            Loved by Learners & Educators
          </h2>
          {isLoadingReviews && (
            <Skeleton className="h-6 w-48 mx-auto mt-4" />
          )}
          {!isLoadingReviews && reviews && reviews.length > 0 && (
             <div className="flex items-center justify-center gap-2 mt-4">
                <StarRating rating={averageRating} />
                <span className="text-muted-foreground">({averageRating.toFixed(1)} based on {reviews?.length ?? 0} reviews)</span>
             </div>
            )
          }
        </div>
        
        {isLoadingReviews && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {[...Array(3)].map((_, i) => (
             <Card key={i}>
                <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-12 w-full" />
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                           <Skeleton className="h-4 w-32" />
                           <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
                </CardContent>
            </Card>
            ))}
          </div>
        )}
        
        {!isLoadingReviews && reviews && reviews.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {reviews?.map((review) => <ReviewCard key={review.id} review={review} />)}
          </div>
        )}
        
        <ReviewForm productId={PRODUCT_DOC_ID} existingReviews={reviews || []} />
        
      </div>
    </section>
  );
};

export default Testimonials;
