'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import StarRating from '@/components/shared/star-rating';
import { useFirestore, deleteDocumentNonBlocking, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import ReviewForm from './review-form';
import { Skeleton } from '../ui/skeleton';
import { Trash2, Play, Sparkles } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL: string;
  rating: number;
  comment: string;
  createdAt: { toDate: () => Date };
}

interface TestimonialVideo {
  id: string;
  title: string;
  videoUrl: string;
  aspectRatio: '16:9' | '9:16';
  order: number;
}

const PRODUCT_DOC_ID = 'azTYls91q9XKl58LRY4g';

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
          <p className="text-foreground/80 italic">&quot;{review.comment}&quot;</p>
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
  const firestore = useFirestore();

  const videosQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'testimonialVideos'), orderBy('order', 'asc')) : null),
    [firestore]
  );
  const { data: videos, isLoading: isLoadingVideos } = useCollection<TestimonialVideo>(videosQuery);

  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return '';
    const shortsMatch = url.match(/shorts\/([\w-]{11})/);
    if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    
    const ytMatch = url.match(/(?:embed\/|v=|\/)([\w-]{11})(?:\?|&|#|$)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    
    return url;
  };

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

        {/* Video Testimonials Section */}
        {!isLoadingVideos && videos && videos.length > 0 && (() => {
          const landscapeVideos = videos.filter((v) => v.aspectRatio !== '9:16');
          const portraitVideos = videos.filter((v) => v.aspectRatio === '9:16');

          return (
            <div className="my-16 space-y-8">
              <div className="text-center max-w-2xl mx-auto">
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs font-bold py-1 px-3 mb-3">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5 text-orange-600 inline" /> Community in Action
                </Badge>
                <h3 className="text-2xl font-bold md:text-3xl text-foreground">Student Success Stories</h3>
                <p className="text-muted-foreground mt-2 text-sm md:text-base">
                  See how students, teachers, and young makers build real electronics projects with EZCirkit.
                </p>
              </div>

              {/* Seamless balanced layout: Landscape video on Left (7 cols), Shorts on Right (5 cols) */}
              {landscapeVideos.length === 1 && portraitVideos.length > 0 && portraitVideos.length <= 2 ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start max-w-6xl mx-auto">
                  {/* Left Column (7 cols): Featured 16:9 Landscape Video */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Play className="h-3.5 w-3.5 fill-orange-600" /> Featured Project Tutorial
                      </span>
                    </div>
                    <div
                      className="w-full rounded-2xl overflow-hidden shadow-xl border-2 border-border/80 group transition-all duration-300 hover:scale-[1.005] bg-black"
                      style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}
                    >
                      <iframe
                        src={getYoutubeEmbedUrl(landscapeVideos[0].videoUrl)}
                        title={landscapeVideos[0].title}
                        frameBorder="0"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                      />
                    </div>
                    <h4 className="font-bold text-base md:text-lg text-foreground leading-snug">
                      {landscapeVideos[0].title}
                    </h4>
                  </div>

                  {/* Right Column (5 cols): 9:16 Shorts Grid */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Play className="h-3.5 w-3.5 fill-red-600" /> Quick Student Shorts
                      </span>
                    </div>
                    <div className={`grid ${portraitVideos.length === 1 ? 'grid-cols-1 max-w-[280px] mx-auto' : 'grid-cols-2'} gap-3 sm:gap-4`}>
                      {portraitVideos.map((video) => (
                        <div key={video.id} className="space-y-2">
                          <div
                            className="w-full rounded-2xl overflow-hidden shadow-xl border-2 border-border/80 group transition-all duration-300 hover:scale-[1.01] bg-black"
                            style={{ position: 'relative', paddingBottom: '177.77%', height: 0 }}
                          >
                            <iframe
                              src={getYoutubeEmbedUrl(video.videoUrl)}
                              title={video.title}
                              frameBorder="0"
                              loading="lazy"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                            />
                          </div>
                          <p className="font-semibold text-xs text-foreground line-clamp-2 leading-snug" title={video.title}>
                            {video.title}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Generalized layout for other combinations */
                <div className="space-y-8 max-w-6xl mx-auto">
                  {/* Landscape videos */}
                  {landscapeVideos.length > 0 && (
                    <div className={`grid gap-6 ${landscapeVideos.length === 1 ? 'max-w-3xl mx-auto' : 'grid-cols-1 md:grid-cols-2'}`}>
                      {landscapeVideos.map((video) => (
                        <div key={video.id} className="space-y-2">
                          <div
                            className="w-full rounded-2xl overflow-hidden shadow-xl border-2 border-border/80 group transition-all duration-300 hover:scale-[1.005] bg-black"
                            style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}
                          >
                            <iframe
                              src={getYoutubeEmbedUrl(video.videoUrl)}
                              title={video.title}
                              frameBorder="0"
                              loading="lazy"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                            />
                          </div>
                          <h4 className="font-bold text-sm md:text-base text-foreground leading-snug">
                            {video.title}
                          </h4>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Portrait shorts */}
                  {portraitVideos.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                          <Play className="h-3.5 w-3.5 fill-red-600" /> Student Shorts
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                        {portraitVideos.map((video) => (
                          <div key={video.id} className="space-y-2">
                            <div
                              className="w-full rounded-2xl overflow-hidden shadow-xl border-2 border-border/80 group transition-all duration-300 hover:scale-[1.01] bg-black"
                              style={{ position: 'relative', paddingBottom: '177.77%', height: 0 }}
                            >
                              <iframe
                                src={getYoutubeEmbedUrl(video.videoUrl)}
                                title={video.title}
                                frameBorder="0"
                                loading="lazy"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                              />
                            </div>
                            <p className="font-semibold text-xs text-foreground line-clamp-2 leading-snug" title={video.title}>
                              {video.title}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
        
        <ReviewForm productId={PRODUCT_DOC_ID} existingReviews={reviews || []} />
        
      </div>
    </section>
  );
};

export default Testimonials;
