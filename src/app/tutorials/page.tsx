

'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useUser, useFirestore, useDoc, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, orderBy, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Lock, ArrowLeft, ArrowRight, PanelLeftClose, PanelLeftOpen, PlusCircle, Edit, Trash2, Clock, BarChart } from 'lucide-react';
import type { Tutorial, TutorialChapter } from '@/lib/tutorials';
import Link from 'next/link';
import TutorialSidebar from '@/components/tutorials/tutorial-sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ChapterForm from '@/components/admin/chapter-form';
import TutorialForm from '@/components/admin/tutorial-form';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';


const LockedOverlay = () => (
    <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 z-10">
      <div className="bg-secondary p-8 rounded-lg shadow-xl">
        <Lock className="mx-auto h-12 w-12 text-primary mb-4" />
        <CardTitle className="text-2xl font-bold">Access All Tutorials</CardTitle>
        <CardDescription className="text-muted-foreground my-2">
          This content is exclusively for customers who have purchased the crabster.
        </CardDescription>
        <Button asChild className="mt-4">
          <Link href="/#products">Purchase the Kit</Link>
        </Button>
      </div>
    </div>
  );

const TutorialViewer = ({ tutorial, onNext, onPrev }: { tutorial: Tutorial, onNext: () => void, onPrev: () => void }) => {
    
    const VideoPlayer = React.memo(({ videoId }: { videoId: string }) => {
      if (!videoId) {
          return (
              <div className="aspect-video w-full flex items-center justify-center text-muted-foreground bg-muted rounded-lg shadow-lg">
                  <p>Video coming soon!</p>
              </div>
          );
      }
  
      const ytVideoIdMatch = videoId.match(/(?:embed\/|v=|\/)([\w-]{11})(?:\?|&|#|$)/);
      const ytVideoId = ytVideoIdMatch ? ytVideoIdMatch[1] : null;
  
      if (ytVideoId) {
          return (
              <iframe
                  src={`https://www.youtube.com/embed/${ytVideoId}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="aspect-video absolute top-0 left-0 w-full h-full rounded-lg bg-black shadow-lg"
              ></iframe>
          );
      }
  
      const driveIdMatch = videoId.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      const driveVideoId = driveIdMatch ? driveIdMatch[1] : null;
      
      if (driveVideoId) {
           return (
               <iframe
                  src={`https://drive.google.com/file/d/${driveVideoId}/preview`}
                  title="Google Drive video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  sandbox="allow-scripts allow-same-origin"
                  className="aspect-video absolute top-0 left-0 w-full h-full rounded-lg bg-black shadow-lg"
              ></iframe>
          );
      }
      
      return <video src={videoId} controls className="aspect-video absolute top-0 left-0 w-full h-full rounded-lg bg-black shadow-lg" />;
  });
  VideoPlayer.displayName = 'VideoPlayer';


    return (
     <div className="h-full flex flex-col overflow-hidden">
        {/* Video Player takes up available space */}
        <div className="flex-grow relative">
            <VideoPlayer videoId={tutorial.videoId || ''} />
        </div>
        {/* Controls are at the bottom */}
        <div className="flex-shrink-0 pt-6 flex flex-col h-1/2">
            <div className="flex-grow overflow-y-auto pr-4">
                <h2 className="text-3xl font-bold">{tutorial.title}</h2>
                <div className="flex items-center gap-4 text-muted-foreground mt-2">
                        <Badge variant={
                            tutorial.level === 'Beginner' ? 'secondary' :
                            tutorial.level === 'Intermediate' ? 'default' :
                            'destructive'
                        }>{tutorial.level}</Badge>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{tutorial.duration}</span>
                        </div>
                    </div>
                <p className="text-muted-foreground mt-2">{tutorial.description}</p>
            </div>
            <div className="flex justify-end items-center gap-2 flex-shrink-0 pt-4">
                <Button onClick={onPrev} variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                <Button onClick={onNext} variant="outline">
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
      </div>
    )
}


export default function TutorialsPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [chaptersWithTutorials, setChaptersWithTutorials] = useState<TutorialChapter[]>([]);
  const [allTutorials, setAllTutorials] = useState<Tutorial[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);

  // Admin states
  const [isChapterFormOpen, setIsChapterFormOpen] = useState(false);
  const [isTutorialFormOpen, setIsTutorialFormOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<TutorialChapter | null>(null);
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [chapterForNewTutorial, setChapterForNewTutorial] = useState<TutorialChapter | null>(null);
  
  // State to trigger re-fetch
  const [dataVersion, setDataVersion] = useState(0);
  const refreshData = useCallback(() => setDataVersion(v => v + 1), []);


  const userDocRef = useMemo(
    () => (user && !isUserLoading ? doc(firestore, 'users', user.uid) : null),
    [firestore, user, isUserLoading]
  );
  const { data: userData, isLoading: isLoadingUserDoc } = useDoc<{ isAdmin?: boolean }>(userDocRef);
  const isAdmin = userData?.isAdmin ?? false;

  useEffect(() => {
    async function fetchAllData() {
      if (!firestore) {
        setIsLoadingData(false);
        return;
      }
      setIsLoadingData(true);
      
      const chaptersRef = collection(firestore, 'tutorialChapters');
      const chaptersQuery = query(chaptersRef, orderBy('order'));
      const chapterSnapshots = await getDocs(chaptersQuery);
      const fetchedChapters = chapterSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Omit<TutorialChapter, 'tutorials'>));

      const tutorialPromises = fetchedChapters.map(chapter => {
        const tutorialsRef = collection(firestore, `tutorialChapters/${chapter.id}/tutorials`);
        const tutorialsQuery = query(tutorialsRef, orderBy('order'));
        return getDocs(tutorialsQuery);
      });

      const tutorialSnapshots = await Promise.all(tutorialPromises);
      
      const chapterMap = new Map(fetchedChapters.map(c => [c.id, { ...c, tutorials: [] as Tutorial[] }]));
      const allFetchedTutorials : Tutorial[] = [];

      tutorialSnapshots.forEach((snapshot) => {
        snapshot.docs.forEach(doc => {
            const tutorial = { id: doc.id, ...doc.data() } as Tutorial;
            allFetchedTutorials.push(tutorial);
            const chapter = chapterMap.get(tutorial.chapterId);
            if (chapter) {
              chapter.tutorials.push(tutorial);
            }
        });
      });
      
      const sortedChapters = Array.from(chapterMap.values()).sort((a,b) => a.order - b.order);
      setChaptersWithTutorials(sortedChapters);
      setAllTutorials(allFetchedTutorials);

      setIsLoadingData(false);
    }
    
    fetchAllData();

  }, [firestore, dataVersion]);
  

  const [hasPurchased, setHasPurchased] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      setHasPurchased(true);
      setIsVerifying(false);
      return;
    }
    if (isUserLoading) return;
    if (!user) {
      setIsVerifying(false);
      setHasPurchased(false);
      return;
    }

    const verifyPurchase = async () => {
      if (!firestore) {
        setIsVerifying(false);
        return;
      }
      const ordersRef = collection(firestore, 'users', user.uid, 'orders');
      const q = query(
        ordersRef,
        where('status', '==', 'paid')
      );
      try {
        const querySnapshot = await getDocs(q);
        setHasPurchased(!querySnapshot.empty);
      } catch (error) {
        console.error("Error verifying purchase:", error);
        setHasPurchased(false);
      } finally {
        setIsVerifying(false);
      }
    };
    verifyPurchase();
  }, [user, isUserLoading, firestore, isAdmin]);

  const handleSelectTutorial = (tutorial: Tutorial) => {
    setSelectedTutorial(tutorial);
  };
  
  const handleNextTutorial = () => {
    if (!selectedTutorial) return;
    const currentIndex = allTutorials.findIndex(t => t.id === selectedTutorial.id);
    if (currentIndex < allTutorials.length - 1) {
        setSelectedTutorial(allTutorials[currentIndex + 1]);
    }
  }

  const handlePrevTutorial = () => {
    if (!selectedTutorial) return;
    const currentIndex = allTutorials.findIndex(t => t.id === selectedTutorial.id);
    if (currentIndex > 0) {
        setSelectedTutorial(allTutorials[currentIndex - 1]);
    }
  }


  // Admin handlers
  const handleAddChapter = () => {
    setEditingChapter(null);
    setIsChapterFormOpen(true);
  };
  
  const handleEditChapter = (chapter: TutorialChapter) => {
    setEditingChapter(chapter);
    setIsChapterFormOpen(true);
  };

  const handleDeleteChapter = (chapterId: string) => {
    if (!firestore) return;
    // Note: Deleting a chapter does not automatically delete subcollections in Firestore.
    // A cloud function would be required for full cleanup. This deletes the chapter doc only.
    deleteDocumentNonBlocking(doc(firestore, 'tutorialChapters', chapterId));
    toast({ title: 'Chapter deleted.' });
    refreshData();
  };
  
  const handleAddTutorial = (chapter: TutorialChapter) => {
    setEditingTutorial(null);
    setChapterForNewTutorial(chapter);
    setIsTutorialFormOpen(true);
  };
  
  const handleEditTutorial = (tutorial: Tutorial) => {
    setEditingTutorial(tutorial);
    setIsTutorialFormOpen(true);
  };

  const handleDeleteTutorial = (tutorial: Tutorial) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, `tutorialChapters/${tutorial.chapterId}/tutorials`, tutorial.id));
    toast({ title: 'Tutorial deleted.' });
    refreshData();
    if(selectedTutorial?.id === tutorial.id) {
        setSelectedTutorial(null);
    }
  };

  const handleSave = () => {
    setIsChapterFormOpen(false);
    setIsTutorialFormOpen(false);
    refreshData();
  };

  const showLoadingState = isUserLoading || isVerifying || isLoadingData || isLoadingUserDoc;

  return (
    <>
    <div className="pt-16 pb-4">
       <div className="flex flex-row items-start h-[calc(100vh-theme(spacing.20))]">
        <TutorialSidebar 
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          chapters={chaptersWithTutorials}
          isLoading={showLoadingState}
          isAdmin={isAdmin}
          onAddChapter={handleAddChapter}
          onAddTutorial={handleAddTutorial}
          onEditChapter={handleEditChapter}
          onEditTutorial={handleEditTutorial}
          onDeleteChapter={handleDeleteChapter}
          onDeleteTutorial={handleDeleteTutorial}
          onSelectTutorial={handleSelectTutorial}
          activeTutorialId={selectedTutorial?.id}
        />
        <div className="flex-1 h-full px-4 md:px-6">
            {showLoadingState && (
                 <div className="text-center py-12">
                    <p>Loading tutorials...</p>
                 </div>
            )}
            {!showLoadingState && !hasPurchased && <LockedOverlay />}
            {!showLoadingState && hasPurchased && (
                <main className="h-full">
                    {selectedTutorial ? (
                        <TutorialViewer tutorial={selectedTutorial} onNext={handleNextTutorial} onPrev={handlePrevTutorial} />
                    ) : (
                        <div className="text-center pt-16">
                            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
                            Online Tutorials
                            </h1>
                            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                            Select a tutorial from the sidebar to get started.
                            </p>
                        </div>
                    )}
                </main>
            )}
        </div>
      </div>
    </div>
    
    {isAdmin && (
      <>
        <Dialog open={isChapterFormOpen} onOpenChange={setIsChapterFormOpen}>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>{editingChapter ? 'Edit Chapter' : 'Add New Chapter'}</DialogTitle>
                </DialogHeader>
                <ChapterForm
                onSave={handleSave}
                chapter={editingChapter}
                />
            </DialogContent>
        </Dialog>
        
        <Dialog open={isTutorialFormOpen} onOpenChange={setIsTutorialFormOpen}>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>{editingTutorial ? 'Edit Tutorial' : 'Add New Tutorial'}</DialogTitle>
                </DialogHeader>
                <TutorialForm
                onSave={handleSave}
                tutorial={editingTutorial}
                chapterId={editingTutorial?.chapterId || chapterForNewTutorial?.id || ''}
                />
            </DialogContent>
        </Dialog>
      </>
    )}
    </>
  );
}




