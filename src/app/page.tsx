
'use client';

import React from 'react';
import HeroSection from '@/components/sections/hero';
import StatsSection from '@/components/sections/stats';
import FeaturesSection from '@/components/sections/features';
import ProductShowcase from '@/components/sections/product-showcase';
import Testimonials from '@/components/sections/testimonials';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import type { Review } from '@/components/sections/testimonials';
import { Skeleton } from '@/components/ui/skeleton';


const PRODUCT_DOC_ID = 'pP2ohIXBTTLUCUPRk0Z8';

export default function Home() {
  const firestore = useFirestore();

  const reviewsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'products', PRODUCT_DOC_ID, 'reviews'), orderBy('createdAt', 'desc'))
        : null,
    [firestore]
  );
  const { data: reviews, isLoading: isLoadingReviews } = useCollection<Review>(reviewsQuery);

  const averageRating = React.useMemo(() => {
    if (!reviews || reviews.length === 0) return 0;
    const total = reviews.reduce((acc, review) => acc + review.rating, 0);
    return total / reviews.length;
  }, [reviews]);
  
  const reviewCount = reviews?.length ?? 0;

  return (
    <>
      <HeroSection 
        averageRating={averageRating}
        reviewCount={reviewCount}
        isLoading={isLoadingReviews}
      />
      <StatsSection averageRating={averageRating} isLoading={isLoadingReviews} />
      <FeaturesSection />
      <ProductShowcase 
        reviews={reviews}
        averageRating={averageRating}
        reviewCount={reviewCount}
        isLoadingReviews={isLoadingReviews}
      />
      <Testimonials 
         reviews={reviews || []}
         averageRating={averageRating}
         isLoadingReviews={isLoadingReviews}
      />
    </>
  );
}
