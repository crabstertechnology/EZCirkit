

'use client';

import React, { useEffect, useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, collectionGroup, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Tutorial, TutorialChapter } from '@/lib/tutorials';
import { Lock, FileText, Download, NotebookText, Code, Copy } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import TutorialSidebar from '@/components/tutorials/tutorial-sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';


const LockedOverlay = () => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 z-10">
        <div className="bg-secondary p-8 rounded-lg shadow-xl max-w-md">
            <Lock className="mx-auto h-12 w-12 text-primary mb-4" />
            <CardTitle className="text-2xl font-bold">Access This Tutorial</CardTitle>
            <CardDescription className="text-muted-foreground my-2">
                This content is exclusively for customers who have purchased the crabster.
            </CardDescription>
            <Button asChild className="mt-4">
                <Link href="/#products">Purchase the Kit</Link>
            </Button>
        </div>
    </div>
);


const TutorialPage = ({ params }: { params: { tutorialId: string } }) => {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [hasPurchased, setHasPurchased] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [chaptersWithTutorials, setChaptersWithTutorials] = useState<TutorialChapter[]>([]);
  const [allTutorials, setAllTutorials] = useState<Tutorial[]>([]);
  const [isLoadingCourseData, setIsLoadingCourseData] = useState(true);

  // Find the specific tutorial document
  const [tutorialRef, setTutorialRef] = useState<any>(null);

  const userDocRef = useMemoFirebase(
    () => (user && !isUserLoading ? doc(firestore, 'users', user.uid) : null),
    [firestore, user, isUserLoading]
  );
  const { data: userData } = useDoc<{ isAdmin?: boolean }>(userDocRef);
  const isAdmin = userData?.isAdmin ?? false;

  useEffect(() => {
    const findAndLoadData = async () => {
        if (!firestore) return;
        setIsLoadingCourseData(true);

        // Find the specific tutorial's document reference
        const tutorialsColGroup = collectionGroup(firestore, 'tutorials');
        const q = query(tutorialsColGroup, where('id', '==', params.tutorialId));
        const tutorialSnapshot = await getDocs(q);
        if (!tutorialSnapshot.empty) {
            setTutorialRef(tutorialSnapshot.docs[0].ref);
        }

        // Fetch all chapters and tutorials for the sidebar
        const chaptersRef = collection(firestore, 'tutorialChapters');
        const chaptersQuery = query(chaptersRef, orderBy('order'));
        const chapterSnapshots = await getDocs(chaptersQuery);
        const fetchedChapters = chapterSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data(), tutorials: [] } as TutorialChapter));

        const tutorialPromises = fetchedChapters.map(chapter => 
            getDocs(query(collection(firestore, `tutorialChapters/${chapter.id}/tutorials`), orderBy('order')))
        );
        const allTutorialsSnapshots = await Promise.all(tutorialPromises);

        const chapterMap = new Map(fetchedChapters.map(c => [c.id, c]));
        const allFetchedTutorials: Tutorial[] = [];

        allTutorialsSnapshots.forEach(snapshot => {
            snapshot.docs.forEach(doc => {
                const tutorial = { id: doc.id, ...doc.data() } as Tutorial;
                allFetchedTutorials.push(tutorial);
                const chapter = chapterMap.get(tutorial.chapterId);
                if (chapter) {
                    chapter.tutorials.push(tutorial);
                }
            });
        });
        
        setChaptersWithTutorials(Array.from(chapterMap.values()));
        setAllTutorials(allFetchedTutorials);
        setIsLoadingCourseData(false);
    };
    findAndLoadData();
  }, [firestore, params.tutorialId]);


  const { data: tutorial, isLoading: isLoadingTutorial } = useDoc<Tutorial>(tutorialRef);

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
      const q = query(ordersRef, where('status', '==', 'paid'));
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

  const isLoading = isUserLoading || isVerifying || isLoadingTutorial || isLoadingCourseData;

    const handleCopyCode = () => {
        if (tutorial?.code) {
            navigator.clipboard.writeText(tutorial.code);
            toast({ title: 'Code copied to clipboard!' });
        }
    }

    const VideoPlayer = React.memo(({ videoId }: { videoId: string }) => {
        if (!videoId) {
            return (
              <div className="aspect-square w-full flex items-center justify-center text-muted-foreground bg-muted rounded-lg shadow-lg">
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
                    className="aspect-square w-full rounded-lg bg-black shadow-lg"
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
                    className="aspect-square w-full rounded-lg bg-black shadow-lg"
                ></iframe>
            );
        }
        
        return <video src={videoId} controls className="aspect-square w-full rounded-lg bg-black shadow-lg" />;
    });
    VideoPlayer.displayName = 'VideoPlayer';

  if (isLoading) {
    return (
        <div className="container mx-auto px-4 md:px-6 py-24 md:py-32">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2">
                 <Skeleton className="h-12 w-full mb-4" />
                 <Skeleton className="aspect-square w-full" />
               </div>
               <div className="lg:col-span-1">
                 <Skeleton className="h-96 w-full" />
               </div>
            </div>
        </div>
    );
  }

  if (!tutorial) {
      return <div className="text-center py-24">Tutorial not found.</div>
  }
  
  const currentChapter = chaptersWithTutorials.find(c => c.id === tutorial.chapterId);

  return (
    <div className="min-h-screen bg-secondary">
       <div className="container mx-auto px-4 md:px-6 py-24 md:py-28">
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left/Main Column */}
            <div className="lg:col-span-2 relative">
                {!hasPurchased && <LockedOverlay />}
                <div className={cn("space-y-6", !hasPurchased ? 'blur-sm pointer-events-none' : '')}>
                    {/* Top Bar */}
                    <Card>
                        <CardContent className="p-4 flex justify-between items-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Chapter {currentChapter?.order}: {currentChapter?.title}</p>
                                <p className="text-lg font-bold">{tutorial.title}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold">{allTutorials.length}</p>
                                <p className="text-sm text-muted-foreground">Total Tutorials</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Video Player */}
                    <VideoPlayer videoId={tutorial.videoId || ''} />

                     {/* Tabs Section */}
                    <Tabs defaultValue="code" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="code"><Code className="mr-2" /> Code</TabsTrigger>
                            <TabsTrigger value="transcript"><FileText className="mr-2" /> Transcript</TabsTrigger>
                            <TabsTrigger value="notes"><NotebookText className="mr-2" /> Notes</TabsTrigger>
                        </TabsList>
                         <TabsContent value="code" asChild>
                            <Card>
                                <CardContent className="p-6 relative">
                                     {tutorial.code ? (
                                        <div className="relative">
                                            <ScrollArea className="h-64">
                                                <pre className="bg-muted p-4 rounded-md text-sm"><code className="font-mono">{tutorial.code}</code></pre>
                                            </ScrollArea>
                                            <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-8 w-8" onClick={handleCopyCode}>
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No code snippet available for this tutorial.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="transcript" asChild>
                           <Card>
                                <CardContent className="p-6">
                                    {tutorial.transcript ? (
                                        <p className="text-sm whitespace-pre-wrap">{tutorial.transcript}</p>
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
                                        <p className="text-sm whitespace-pre-wrap">{tutorial.notes}</p>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No notes available for this tutorial.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Right Column: Sidebar */}
            <div className="lg:col-span-1 sticky top-24">
               <TutorialSidebar 
                 isCollapsed={false}
                 setIsCollapsed={() => {}}
                 chapters={chaptersWithTutorials}
                 isLoading={isLoading}
                 isAdmin={isAdmin}
                 activeTutorialId={tutorial.id}
                 onAddChapter={() => {}}
                 onAddTutorial={() => {}}
                 onEditChapter={() => {}}
                 onEditTutorial={() => {}}
                 onDeleteChapter={() => {}}
                 onDeleteTutorial={() => {}}
                 isPageSidebar={true}
               />
            </div>
         </div>
       </div>
    </div>
  );
};

export default TutorialPage;
