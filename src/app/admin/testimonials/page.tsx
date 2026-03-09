'use client';

import React, { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Edit, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import TestimonialVideoForm from '@/components/admin/testimonial-video-form';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TestimonialVideo {
  id: string;
  title: string;
  videoUrl: string;
  aspectRatio: '16:9' | '9:16';
  order: number;
  createdAt: any;
}

const AdminTestimonialsPage = () => {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<TestimonialVideo | null>(null);

  const videosQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'testimonialVideos'), orderBy('order', 'asc')) : null),
    [firestore]
  );
  const { data: videos, isLoading } = useCollection<TestimonialVideo>(videosQuery);

  const handleDelete = (videoId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'testimonialVideos', videoId);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Testimonial video deleted.' });
  };

  const handleOpenForm = (video: TestimonialVideo | null) => {
    setEditingVideo(video);
    setIsFormOpen(true);
  };

  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return '';
    const shortsMatch = url.match(/shorts\/([\w-]{11})/);
    if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    
    const ytMatch = url.match(/(?:embed\/|v=|\/)([\w-]{11})(?:\?|&|#|$)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    
    return url;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Video Testimonials</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenForm(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Testimonial Video
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingVideo ? 'Edit Testimonial' : 'Add Testimonial Video'}</DialogTitle>
            </DialogHeader>
            <TestimonialVideoForm onSave={() => setIsFormOpen(false)} video={editingVideo} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Success Stories</CardTitle>
          <CardDescription>These videos are displayed on the homepage to build trust with new learners.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-center py-8">Loading videos...</p>}
          {!isLoading && videos?.length === 0 && (
            <p className="text-center py-8 text-muted-foreground">No video testimonials found. Click "Add Testimonial Video" to get started.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos?.map((video) => {
              const isShort = video.aspectRatio === '9:16';
              return (
                <Card key={video.id} className="overflow-hidden">
                  <div className={cn(
                    "bg-black relative group",
                    isShort ? "aspect-[9/16]" : "aspect-video"
                  )}>
                     <iframe
                      src={getYoutubeEmbedUrl(video.videoUrl)}
                      title={video.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full"
                    ></iframe>
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold truncate" title={video.title}>{video.title}</h3>
                      <Badge variant="secondary">Order: {video.order}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{video.aspectRatio || 'Unknown Ratio'}</Badge>
                      <p className="text-xs text-muted-foreground truncate" title={video.videoUrl}>{video.videoUrl}</p>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 border-t flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenForm(video)}>
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove this success story from your homepage.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(video.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTestimonialsPage;
