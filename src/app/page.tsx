'use client';

import React from 'react';
import HeroSection from '@/components/sections/hero';
import FlagshipProductSection from '@/components/sections/flagship-product';
import FeaturedProducts from '@/components/sections/featured-products';
import Testimonials from '@/components/sections/testimonials';
import ExperimentsShowcase from '@/components/sections/experiments-showcase';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Review } from '@/components/sections/testimonials';

const PRODUCT_DOC_ID = 'azTYls91q9XKl58LRY4g';

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
      <FlagshipProductSection />
      <ExperimentsShowcase />
      <FeaturedProducts />
      <Testimonials 
         reviews={reviews || []}
         averageRating={averageRating}
         isLoadingReviews={isLoadingReviews}
      />
    </>
  );
}
