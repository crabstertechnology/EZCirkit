'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useUser, useFirestore, useDoc, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, orderBy, doc, onSnapshot, Unsubscribe, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Lock, ArrowLeft, ArrowRight, PanelLeftClose, PanelLeftOpen, PlusCircle, Edit, Trash2, Clock, BarChart, Code, FileText, Download, Copy, NotebookText } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


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
    
    const { toast } = useToast();
    
    const handleCopyCode = () => {
        if (tutorial.code) {
            navigator.clipboard.writeText(tutorial.code);
            toast({ title: 'Code copied to clipboard!' });
        }
    }

    const VideoPlayer = React.memo(({ videoId }: { videoId: string }) => {
      if (!videoId) {
          return (
              <div className="w-full h-[300px] flex items-center justify-center text-muted-foreground bg-muted rounded-lg shadow-lg">
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
                  className="w-full h-[300px] rounded-lg bg-black shadow-lg"
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
                  className="w-full h-[300px] rounded-lg bg-black shadow-lg"
              ></iframe>
          );
      }
      
      return <video src={videoId} controls className="w-full h-[300px] rounded-lg bg-black shadow-lg" />;
    });
    VideoPlayer.displayName = 'VideoPlayer';


    return (
     <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-shrink-0">
          <VideoPlayer videoId={tutorial.videoId || ''} />
        </div>

        <ScrollArea className="flex-grow min-h-0 mt-4">
            <div className="space-y-4 pr-4">
                <div className="flex-shrink-0">
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

                <Tabs defaultValue="code" className="w-full mt-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="code"><Code className="mr-2" /> Code</TabsTrigger>
                        <TabsTrigger value="transcript"><FileText className="mr-2" /> Transcript</TabsTrigger>
                        <TabsTrigger value="notes"><NotebookText className="mr-2" /> Notes</TabsTrigger>
                    </TabsList>
                    <TabsContent value="code" asChild>
                        <Card><CardContent className="p-6 relative">
                            {tutorial.code ? (
                                <div className="relative">
                                    <div className="w-full overflow-x-auto rounded-md border bg-muted">
                                        <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-all">{tutorial.code}</pre>
                                    </div>
                                    <div className="absolute top-2 right-2">
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCopyCode}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No code snippet available for this tutorial.</p>
                            )}
                        </CardContent></Card>
                    </TabsContent>
                    <TabsContent value="transcript" asChild>
                        <Card>
                            <CardContent className="p-6">
                                {tutorial.transcript ? (
                                    <ScrollArea className="h-64">
                                      <p className="text-sm whitespace-pre-wrap">{tutorial.transcript}</p>
                                    </ScrollArea>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No transcript available for this tutorial.</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="notes" asChild>
                         <Card>
                            <CardContent className="p-6">
                                {tutorial.notes ? (
                                     <ScrollArea className="h-64">
                                        <p className="text-sm whitespace-pre-wrap">{tutorial.notes}</p>
                                     </ScrollArea>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No notes available for this tutorial.</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </ScrollArea>
        
        <div className="flex justify-end items-center gap-2 flex-shrink-0 pt-4 mt-auto">
            <Button onClick={onPrev} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            <Button onClick={onNext} variant="outline">
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
      </div>
    )
}


export default function TutorialsPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(true);
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

  const userDocRef = useMemo(
    () => (user && !isUserLoading ? doc(firestore, 'users', user.uid) : null),
    [firestore, user, isUserLoading]
  );
  const { data: userData, isLoading: isLoadingUserDoc } = useDoc<{ isAdmin?: boolean }>(userDocRef);
  const isAdmin = userData?.isAdmin ?? false;

  useEffect(() => {
    if (!firestore) {
      setIsLoadingData(false);
      return;
    }

    setIsLoadingData(true);
    const chaptersQuery = query(collection(firestore, 'tutorialChapters'), orderBy('order'));

    let activeTutorialListeners: { [key: string]: Unsubscribe } = {};

    const chapterUnsub = onSnapshot(chaptersQuery, (chaptersSnapshot) => {
      const chaptersData = chaptersSnapshot.docs.map(d => ({
        ...(d.data() as Omit<TutorialChapter, 'id' | 'tutorials'>),
        id: d.id,
        tutorials: []
      }));
      
      const tutorialState: { [key: string]: Tutorial[] } = {};

      const updateFullState = () => {
          const finalChapters: TutorialChapter[] = [];
          const allTutorialsList: Tutorial[] = [];

          chaptersData.forEach(chapter => {
              const tutorials = tutorialState[chapter.id] || [];
              finalChapters.push({ ...chapter, tutorials });
              allTutorialsList.push(...tutorials);
          });
          
          finalChapters.sort((a,b) => a.order - b.order);

          setChaptersWithTutorials(finalChapters);
          setAllTutorials(allTutorialsList);

          if (!selectedTutorial && allTutorialsList.length > 0) {
              setSelectedTutorial(allTutorialsList[0]);
          } else if (selectedTutorial) {
              const updated = allTutorialsList.find(t => t.id === selectedTutorial.id);
              setSelectedTutorial(updated || allTutorialsList[0] || null);
          } else {
              setSelectedTutorial(null);
          }

          setIsLoadingData(false);
      };

      // Clean up old listeners before creating new ones
      Object.values(activeTutorialListeners).forEach(unsub => unsub());
      activeTutorialListeners = {};

      chaptersData.forEach(chapter => {
        const tutorialsQuery = query(collection(firestore, `tutorialChapters/${chapter.id}/tutorials`), orderBy('order'));
        
        activeTutorialListeners[chapter.id] = onSnapshot(tutorialsQuery, (tutorialsSnapshot) => {
          tutorialState[chapter.id] = tutorialsSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Tutorial));
          updateFullState();
        }, (error) => {
          console.error(`Error fetching tutorials for chapter ${chapter.id}:`, error);
          toast({ variant: 'destructive', title: 'Error loading tutorials.' });
        });
      });
      
      updateFullState();

    }, (error) => {
        console.error("Error fetching chapters:", error);
        toast({ variant: 'destructive', title: 'Error loading chapters.' });
        setIsLoadingData(false);
    });

    return () => {
        chapterUnsub();
        Object.values(activeTutorialListeners).forEach(unsub => unsub());
    };
  }, [firestore, toast]);
  

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
    setIsSidebarCollapsed(true); // Close sidebar on mobile when selecting tutorial
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
    deleteDocumentNonBlocking(doc(firestore, 'tutorialChapters', chapterId));
    toast({ title: 'Chapter deleted.' });
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
    if(selectedTutorial?.id === tutorial.id) {
        setSelectedTutorial(null);
    }
  };

  const handleSave = () => {
    setIsChapterFormOpen(false);
    setIsTutorialFormOpen(false);
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
        <div className="flex-1 h-full px-4 md:px-6 min-w-0">
            {showLoadingState && (
                 <div className="w-full h-full flex items-center justify-center">
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