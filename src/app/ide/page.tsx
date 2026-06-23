'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, onSnapshot, getDocs, where, Unsubscribe, doc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Search, Lock, Play, Clock, Sparkles, Code2, PlusCircle, Edit, Trash2, Settings } from 'lucide-react';
import Link from 'next/link';
import type { Tutorial, TutorialChapter } from '@/lib/tutorials';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import TutorialForm from '@/components/admin/tutorial-form';
import ChapterForm from '@/components/admin/chapter-form';

export default function IdeSelectionPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [chapters, setChapters] = useState<TutorialChapter[]>([]);
  const [allTutorials, setAllTutorials] = useState<Tutorial[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [selectedChapter, setSelectedChapter] = useState<string>('All');
  const [hasPurchased, setHasPurchased] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isLockDialogOpen, setIsLockDialogOpen] = useState(false);

  // Admin panel state
  const [isChapterFormOpen, setIsChapterFormOpen] = useState(false);
  const [isTutorialFormOpen, setIsTutorialFormOpen] = useState(false);
  const [isManageChaptersOpen, setIsManageChaptersOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<TutorialChapter | null>(null);
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [selectedChapterForAdd, setSelectedChapterForAdd] = useState<string>('');

  // Firestore user doc
  const userDocRef = useMemoFirebase(
    () => (user && !isUserLoading && firestore ? doc(firestore, 'users', user.uid) : null),
    [firestore, user, isUserLoading]
  );
  const { data: userData, isLoading: isLoadingUserDoc } = useDoc<{ isAdmin?: boolean, hasTutorialAccess?: boolean }>(userDocRef);
  const isAdmin = userData?.isAdmin ?? false;
  const hasTutorialAccess = userData?.hasTutorialAccess ?? false;

  // Verify purchase
  useEffect(() => {
    let isActive = true;

    if (isAdmin || hasTutorialAccess) {
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
        if (isActive) setIsVerifying(false);
        return;
      }
      const ordersRef = collection(firestore, 'users', user.uid, 'orders');
      const q = query(
        ordersRef,
        where('status', 'in', ['paid', 'shipped', 'delivered'])
      );
      try {
        const querySnapshot = await getDocs(q);
        if (isActive) {
          setHasPurchased(!querySnapshot.empty);
        }
      } catch (error) {
        console.error("Error verifying purchase:", error);
        if (isActive) {
          setHasPurchased(false);
        }
      } finally {
        if (isActive) {
          setIsVerifying(false);
        }
      }
    };
    verifyPurchase();

    return () => {
      isActive = false;
    };
  }, [user, isUserLoading, firestore, isAdmin, hasTutorialAccess]);

  // Load chapters & tutorials
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
        setChapters(finalChapters);
        setAllTutorials(allTutorialsList);
        setIsLoadingData(false);
      };

      // Clean up old listeners
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

  // Extract YouTube ID
  const getYoutubeThumbnail = (url?: string) => {
    if (!url) return '/logo.png';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '/logo.png';
  };

  // Filtered tutorials list
  const filteredTutorials = useMemo(() => {
    return allTutorials.filter(tut => {
      const matchesSearch = tut.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            tut.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLevel = selectedLevel === 'All' || tut.level === selectedLevel;
      const matchesChapter = selectedChapter === 'All' || tut.chapterId === selectedChapter;
      return matchesSearch && matchesLevel && matchesChapter;
    });
  }, [allTutorials, searchQuery, selectedLevel, selectedChapter]);

  const showLoading = isUserLoading || isVerifying || isLoadingData || isLoadingUserDoc;

  const handleTutorialClick = (e: React.MouseEvent, tut: Tutorial) => {
    if (!hasPurchased) {
      e.preventDefault();
      setIsLockDialogOpen(true);
    }
  };

  const handleAddChapter = () => {
    setEditingChapter(null);
    setIsChapterFormOpen(true);
  };

  const handleEditChapter = (chapter: TutorialChapter) => {
    setEditingChapter(chapter);
    setIsChapterFormOpen(true);
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!firestore) return;
    if (confirm("Are you sure you want to delete this chapter? This will not delete its tutorials, which will need to be deleted manually.")) {
      try {
        await deleteDoc(doc(firestore, 'tutorialChapters', chapterId));
        toast({ title: 'Chapter deleted successfully.' });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error deleting chapter', description: error.message });
      }
    }
  };

  const handleAddTutorial = () => {
    setEditingTutorial(null);
    setSelectedChapterForAdd(selectedChapter !== 'All' ? selectedChapter : (chapters[0]?.id || ''));
    setIsTutorialFormOpen(true);
  };

  const handleEditTutorial = (tutorial: Tutorial) => {
    setEditingTutorial(tutorial);
    setIsTutorialFormOpen(true);
  };

  const handleDeleteTutorial = async (tutorial: Tutorial) => {
    if (!firestore) return;
    if (confirm("Are you sure you want to delete this experiment?")) {
      try {
        await deleteDoc(doc(firestore, `tutorialChapters/${tutorial.chapterId}/tutorials`, tutorial.id));
        toast({ title: 'Experiment deleted successfully.' });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error deleting experiment', description: error.message });
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pt-24 pb-16 px-4 md:px-8 relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <Badge className="bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200/60 px-3 py-1 text-xs gap-1.5 rounded-full shadow-sm">
            <Sparkles className="h-3.5 w-3.5" /> Interactive Learning
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900">
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">EZCirkit</span> Coding Experiments
          </h1>
          <p className="text-zinc-500 text-sm md:text-base">
            Select one of our step-by-step coding experiments to launch the EZCirkit Web IDE. The workspace will automatically pre-load the project code and matching YouTube video tutorial.
          </p>
        </div>

        {/* Admin control panel if admin */}
        {isAdmin && (
          <div className="bg-orange-50 border border-orange-200/60 rounded-2xl p-4 flex flex-wrap gap-3 items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <div className="bg-orange-500 text-white p-2 rounded-xl">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 text-sm">Admin Control Panel</h3>
                <p className="text-xs text-zinc-500">Manage experiments and chapters directly on this page.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleAddChapter}
                variant="outline" 
                className="bg-white border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 text-zinc-700 text-xs font-semibold py-2 px-3.5 gap-1.5 rounded-xl transition-all shadow-sm"
              >
                <PlusCircle className="h-4 w-4 text-orange-500" />
                Add Chapter
              </Button>
              <Button 
                onClick={handleAddTutorial}
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold py-2 px-3.5 gap-1.5 rounded-xl transition-all shadow-md"
              >
                <PlusCircle className="h-4 w-4" />
                Add Experiment
              </Button>
            </div>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white border border-zinc-200/80 shadow-sm rounded-2xl p-4">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search experiments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-800 outline-none focus:border-orange-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center justify-end w-full md:w-auto">
            {/* Level Filter */}
            <div className="flex bg-zinc-50 p-1 border border-zinc-200 rounded-xl gap-1">
              {['All', 'Beginner', 'Intermediate', 'Advanced'].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                    selectedLevel === lvl 
                      ? 'bg-orange-500 text-white shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Chapter Filter & Edit Icon if Admin */}
            <div className="flex items-center gap-1.5">
              <select
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-600 outline-none cursor-pointer focus:border-orange-500 focus:bg-white transition-all"
              >
                <option value="All">All Chapters</option>
                {chapters.map(ch => (
                  <option key={ch.id} value={ch.id}>
                    {ch.title}
                  </option>
                ))}
              </select>
              
              {isAdmin && (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setIsManageChaptersOpen(true)}
                  className="h-8 w-8 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-600"
                  title="Manage Chapters"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Loading Skeleton */}
        {showLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-white border border-zinc-200 overflow-hidden shadow-sm">
                <Skeleton className="h-44 w-full bg-zinc-200/60" />
                <CardHeader className="space-y-2">
                  <Skeleton className="h-4 w-1/4 bg-zinc-200/60" />
                  <Skeleton className="h-6 w-3/4 bg-zinc-200/60" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full bg-zinc-200/60" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Experiment Cards Grid */}
        {!showLoading && (
          filteredTutorials.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTutorials.map((tut) => (
                <div key={tut.id} className="relative group">
                  
                  {/* Admin action overlays on the card */}
                  {isAdmin && (
                    <div className="absolute top-3 left-3 z-20 flex gap-1.5">
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="h-8 w-8 bg-white/95 hover:bg-orange-50 border-zinc-200 hover:border-orange-200 text-zinc-700 hover:text-orange-600 shadow-sm transition-all rounded-lg"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEditTutorial(tut);
                        }}
                        title="Edit Experiment"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="h-8 w-8 bg-white/95 hover:bg-rose-50 border-zinc-200 hover:border-rose-200 text-zinc-700 hover:text-rose-600 shadow-sm transition-all rounded-lg"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteTutorial(tut);
                        }}
                        title="Delete Experiment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}

                  <Link
                    href={`/ide/index.html?experiment=${tut.id}&chapter=${tut.chapterId}`}
                    onClick={(e) => handleTutorialClick(e, tut)}
                    className="block h-full"
                  >
                    <Card className="bg-white hover:bg-zinc-50/50 border border-zinc-200/80 hover:border-orange-200/60 transition-all duration-300 overflow-hidden flex flex-col h-full rounded-2xl relative shadow-sm hover:shadow-md">
                      
                      {/* Image Thumbnail Container */}
                      <div className="relative h-48 w-full bg-zinc-100 overflow-hidden border-b border-zinc-200/50">
                        <img
                          src={getYoutubeThumbnail(tut.videoId)}
                          alt={tut.title}
                          className="object-cover w-full h-full group-hover:scale-103 transition-transform duration-500"
                          loading="lazy"
                        />
                        
                        {/* Overlay shadow */}
                        <div className="absolute inset-0 bg-zinc-950/5 group-hover:bg-zinc-950/0 transition-colors" />

                        {/* Duration Badge */}
                        <div className="absolute bottom-2.5 right-2.5 bg-white/95 backdrop-blur-sm text-zinc-700 text-[10px] font-bold px-2 py-0.5 rounded border border-zinc-200/60 shadow-sm">
                          {tut.duration}
                        </div>

                        {/* Play overlay button on hover */}
                        {hasPurchased && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-orange-500/25 transform scale-90 group-hover:scale-100 transition-transform">
                              <Play className="h-5 w-5 fill-current ml-0.5" />
                            </div>
                          </div>
                        )}

                        {/* Lock overlay if not purchased */}
                        {!hasPurchased && (
                          <div className="absolute inset-0 bg-zinc-950/45 flex items-center justify-center backdrop-blur-[1px]">
                            <div className="w-10 h-10 bg-white/95 text-orange-500 border border-zinc-200 rounded-full flex items-center justify-center shadow-md">
                              <Lock className="h-4 w-4" />
                            </div>
                          </div>
                        )}
                      </div>

                      <CardHeader className="space-y-2 p-5 flex-grow">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 rounded-full border-none shadow-none ${
                            tut.level === 'Beginner' ? 'text-teal-600 bg-teal-50' :
                            tut.level === 'Intermediate' ? 'text-amber-600 bg-amber-50' :
                            'text-rose-600 bg-rose-50'
                          }`}>
                            {tut.level}
                          </Badge>
                          {!hasPurchased && (
                            <Badge variant="outline" className="text-[10px] text-orange-600 bg-orange-50 border-orange-100 gap-1 py-0.5 px-2 font-bold rounded-full">
                              <Lock className="h-2.5 w-2.5" /> Premium
                            </Badge>
                          )}
                        </div>

                        <CardTitle className="text-base font-bold text-zinc-900 group-hover:text-orange-500 transition-colors line-clamp-1">
                          {tut.title}
                        </CardTitle>
                        
                        <CardDescription className="text-zinc-500 text-xs line-clamp-2 leading-relaxed">
                          {tut.description}
                        </CardDescription>
                      </CardHeader>

                      <CardFooter className="px-5 pb-5 pt-0">
                        <Button className="w-full bg-zinc-50 hover:bg-orange-500 hover:text-white text-zinc-700 border border-zinc-200 group-hover:border-orange-500/40 text-xs font-semibold py-2.5 gap-1.5 transition-all shadow-sm">
                          {hasPurchased ? (
                            <>
                              <Code2 className="h-3.5 w-3.5" /> Launch IDE
                            </>
                          ) : (
                            <>
                              <Lock className="h-3.5 w-3.5" /> Unlock Project
                            </>
                          )}
                        </Button>
                      </CardFooter>

                    </Card>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white border border-zinc-200 rounded-2xl max-w-md mx-auto space-y-3 shadow-sm">
              <div className="text-zinc-700 font-semibold text-lg">No experiments found</div>
              <p className="text-zinc-500 text-xs px-6">
                We couldn't find any experiments matching your current level, chapter, or search query. Try clearing your filters.
              </p>
            </div>
          )
        )}
      </div>

      {/* Premium Lock Dialog */}
      <Dialog open={isLockDialogOpen} onOpenChange={setIsLockDialogOpen}>
        <DialogContent className="bg-white border border-zinc-200 text-zinc-900 max-w-md rounded-2xl shadow-xl">
          <DialogHeader className="space-y-3">
            <div className="mx-auto w-12 h-12 bg-orange-50 border border-orange-200 text-orange-500 rounded-full flex items-center justify-center shadow-sm">
              <Lock className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-center">Unlock coding experiments</DialogTitle>
            <DialogDescription className="text-zinc-500 text-sm text-center">
              This experiment is exclusively for customers who have purchased the Crabster Electronics Kit. Connect your account to unlock the full step-by-step curriculum and IDE compiler.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2.5 mt-4">
            <Button asChild className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl shadow-md">
              <Link href="/#products">Purchase the Kit</Link>
            </Button>
            <Button variant="ghost" onClick={() => setIsLockDialogOpen(false)} className="w-full text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100">
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Dialogs */}
      {isAdmin && (
        <>
          {/* Chapter Form Dialog */}
          <Dialog open={isChapterFormOpen} onOpenChange={setIsChapterFormOpen}>
            <DialogContent className="bg-white border border-zinc-200 text-zinc-900 max-w-md rounded-2xl shadow-xl p-6">
              <DialogHeader className="pb-3 border-b border-zinc-100 mb-4">
                <DialogTitle className="text-lg font-bold">{editingChapter ? 'Edit Chapter' : 'Add New Chapter'}</DialogTitle>
              </DialogHeader>
              <ChapterForm
                onSave={() => {
                  setIsChapterFormOpen(false);
                  setEditingChapter(null);
                }}
                chapter={editingChapter}
              />
            </DialogContent>
          </Dialog>

          {/* Tutorial Form Dialog */}
          <Dialog open={isTutorialFormOpen} onOpenChange={setIsTutorialFormOpen}>
            <DialogContent className="bg-white border border-zinc-200 text-zinc-900 max-w-lg rounded-2xl shadow-xl p-6">
              <DialogHeader className="pb-3 border-b border-zinc-100 mb-4">
                <DialogTitle className="text-lg font-bold">{editingTutorial ? 'Edit Experiment' : 'Add New Experiment'}</DialogTitle>
              </DialogHeader>
              
              {!editingTutorial && (
                <div className="space-y-1.5 mb-4">
                  <label className="text-xs font-semibold text-zinc-500">Destination Chapter</label>
                  <select
                    value={selectedChapterForAdd}
                    onChange={(e) => setSelectedChapterForAdd(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-800 outline-none cursor-pointer focus:border-orange-500 transition-colors"
                  >
                    <option value="" disabled>Select a chapter...</option>
                    {chapters.map(ch => (
                      <option key={ch.id} value={ch.id}>
                        {ch.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {((editingTutorial || selectedChapterForAdd) && (
                <TutorialForm
                  onSave={() => {
                    setIsTutorialFormOpen(false);
                    setEditingTutorial(null);
                    setSelectedChapterForAdd('');
                  }}
                  tutorial={editingTutorial}
                  chapterId={editingTutorial ? editingTutorial.chapterId : selectedChapterForAdd}
                />
              )) || (
                <p className="text-sm text-zinc-500 py-4 text-center">Please create a chapter first before adding experiments.</p>
              )}
            </DialogContent>
          </Dialog>

          {/* Manage Chapters Dialog */}
          <Dialog open={isManageChaptersOpen} onOpenChange={setIsManageChaptersOpen}>
            <DialogContent className="bg-white border border-zinc-200 text-zinc-900 max-w-md rounded-2xl shadow-xl p-6">
              <DialogHeader className="pb-3 border-b border-zinc-100 mb-4">
                <DialogTitle className="text-lg font-bold">Manage Chapters</DialogTitle>
              </DialogHeader>
              
              <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
                {chapters.length > 0 ? (
                  chapters.map(ch => (
                    <div key={ch.id} className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-100 rounded-xl">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-zinc-800 truncate">{ch.title}</p>
                        <p className="text-[10px] text-zinc-400">Order: {ch.order}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 hover:bg-orange-50 text-zinc-500 hover:text-orange-600 rounded-lg"
                          onClick={() => {
                            handleEditChapter(ch);
                          }}
                          title="Edit Chapter"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 hover:bg-rose-50 text-zinc-500 hover:text-rose-600 rounded-lg"
                          onClick={() => {
                            handleDeleteChapter(ch.id);
                          }}
                          title="Delete Chapter"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500 py-4 text-center">No chapters found.</p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 flex justify-end">
                <Button
                  onClick={() => {
                    setIsManageChaptersOpen(false);
                    handleAddChapter();
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold py-2 px-3.5 gap-1.5 rounded-xl shadow-md"
                >
                  <PlusCircle className="h-4 w-4" />
                  Create Chapter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
