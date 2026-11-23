'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, onSnapshot, getDocs, where, Unsubscribe, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Search, Lock, Play, Clock, Sparkles, Code2, PlusCircle, Edit, Trash2, Settings, Eye, EyeOff, Cpu, Zap, Loader2, Video, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import type { Tutorial, TutorialChapter } from '@/lib/tutorials';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ChapterForm from '@/components/admin/chapter-form';
import { ExperimentsTour } from '@/components/experiments-tour';

export default function IdeSelectionPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [chapters, setChapters] = useState<TutorialChapter[]>([]);
  const [allTutorials, setAllTutorials] = useState<Tutorial[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataLoadedOnce, setDataLoadedOnce] = useState(false);

  // Load IDE selection cache on client mount to make loading instant
  useEffect(() => {
    try {
      const cachedChapters = localStorage.getItem('ez_ide_chapters_cache');
      const cachedTutorials = localStorage.getItem('ez_ide_tutorials_cache');
      if (cachedChapters && cachedTutorials) {
        setChapters(JSON.parse(cachedChapters));
        setAllTutorials(JSON.parse(cachedTutorials));
        setIsLoadingData(false);
        setDataLoadedOnce(true);
      }
    } catch (e) {
      console.error("Error loading IDE cache:", e);
    }
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<string>('All');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [hasPurchased, setHasPurchased] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isLockDialogOpen, setIsLockDialogOpen] = useState(false);

  // Admin panel state
  const [isChapterFormOpen, setIsChapterFormOpen] = useState(false);
  const [isManageChaptersOpen, setIsManageChaptersOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<TutorialChapter | null>(null);
  const [previewTutorial, setPreviewTutorial] = useState<Tutorial | null>(null);
  const [activeVideoTutorial, setActiveVideoTutorial] = useState<Tutorial | null>(null);
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Auto-launch tour for first-time visitors
  useEffect(() => {
    try {
      const hasSeen = localStorage.getItem('ezcirkit_experiments_tour_seen');
      if (!hasSeen) {
        const timer = setTimeout(() => {
          setIsTourOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Firestore user doc
  const userDocRef = useMemoFirebase(
    () => (user && !isUserLoading && firestore ? doc(firestore, 'users', user.uid) : null),
    [firestore, user, isUserLoading]
  );
  const { data: userData, isLoading: isLoadingUserDoc } = useDoc<{ isAdmin?: boolean, hasTutorialAccess?: boolean }>(userDocRef);
  const isAdmin = userData?.isAdmin ?? false;
  const hasTutorialAccess = userData?.hasTutorialAccess ?? false;

  // General settings (for bypass check)
  const generalDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'general') : null),
    [firestore]
  );
  const { data: generalData, isLoading: isLoadingGeneral } = useDoc<{ bypassPurchaseValidation?: boolean }>(generalDocRef);
  const bypassPurchaseValidation = generalData?.bypassPurchaseValidation ?? false;

  // Verify purchase
  useEffect(() => {
    let isActive = true;

    if (isAdmin || hasTutorialAccess || bypassPurchaseValidation) {
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
  }, [user, isUserLoading, firestore, isAdmin, hasTutorialAccess, bypassPurchaseValidation]);

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
        setDataLoadedOnce(true);
        try {
          localStorage.setItem('ez_ide_chapters_cache', JSON.stringify(finalChapters));
          localStorage.setItem('ez_ide_tutorials_cache', JSON.stringify(allTutorialsList));
        } catch (e) {
          console.error("Error saving IDE cache:", e);
        }
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

  // Extract YouTube ID & Embed Helpers
  const extractYoutubeId = (url?: string): string | null => {
    if (!url) return null;
    const clean = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/|\&v=)([^#\&\?]*).*/;
    const match = clean.match(regExp);
    if (match && match[2] && match[2].length === 11) return match[2];
    const fallback = clean.match(/([a-zA-Z0-9_-]{11})/);
    return fallback ? fallback[1] : null;
  };

  const getEmbedVideoUrl = (url?: string): string => {
    if (!url) return '';
    const ytId = extractYoutubeId(url);
    if (ytId) {
      return `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`;
    }
    return url;
  };

  const getYoutubeThumbnail = (url?: string) => {
    const ytId = extractYoutubeId(url);
    return ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : '/logo.png';
  };

  // Filtered tutorials list: arrange all unhidden (visible) experiments to show at the top
  const filteredTutorials = useMemo(() => {
    const list = allTutorials.filter(tut => {
      // Non-admins never see hidden tutorials
      if (!isAdmin && tut.isHidden) return false;

      // Admins filter by visibility tab
      if (isAdmin) {
        if (visibilityFilter === 'visible' && tut.isHidden) return false;
        if (visibilityFilter === 'hidden' && !tut.isHidden) return false;
      }

      const matchesSearch = tut.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            tut.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesChapter = selectedChapter === 'All' || tut.chapterId === selectedChapter;
      return matchesSearch && matchesChapter;
    });

    // Arrange unhidden (visible) experiments to show at top, hidden ones below
    return list.sort((a, b) => {
      const aHidden = a.isHidden ? 1 : 0;
      const bHidden = b.isHidden ? 1 : 0;
      if (aHidden !== bHidden) {
        return aHidden - bHidden;
      }
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [allTutorials, searchQuery, selectedChapter, isAdmin, visibilityFilter]);

  const visibleCount = useMemo(() => allTutorials.filter(t => !t.isHidden).length, [allTutorials]);
  const hiddenCount = useMemo(() => allTutorials.filter(t => t.isHidden).length, [allTutorials]);

  const showLoading = isUserLoading || isVerifying || isLoadingData || isLoadingUserDoc || isLoadingGeneral;

  const handleTutorialClick = (e: React.MouseEvent, tut: Tutorial) => {
    if (!hasPurchased) {
      e.preventDefault();
      setIsLockDialogOpen(true);
      return;
    }
    const isVideoItem = Boolean(tut.isVideoOnly || (!tut.code && tut.videoId));
    if (isVideoItem) {
      e.preventDefault();
      setActiveVideoTutorial(tut);
    }
  };

  const handleToggleVisibility = async (tutorial: Tutorial, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!firestore) return;
    const newHiddenState = !tutorial.isHidden;
    try {
      await updateDoc(doc(firestore, `tutorialChapters/${tutorial.chapterId}/tutorials`, tutorial.id), {
        isHidden: newHiddenState,
      });
      toast({
        title: newHiddenState ? 'Experiment Hidden' : 'Experiment Made Visible',
        description: newHiddenState
          ? `"${tutorial.title}" is now hidden from students. You can re-enable it at any time.`
          : `"${tutorial.title}" is now visible to students.`,
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error updating visibility', description: error.message });
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
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pt-32 md:pt-40 pb-16 px-4 md:px-8 relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900">
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">EZCirkit</span> Coding Experiments
          </h1>
          <p className="text-zinc-500 text-sm md:text-base">
            Select one of our step-by-step coding experiments to launch the EZCirkit Web IDE. The workspace will automatically pre-load the project code and matching YouTube video tutorial.
          </p>
        </div>

        {/* Filters, Actions and Search Bar (All in One Row) */}
        <div className="bg-white border border-zinc-200/80 shadow-sm rounded-2xl p-4 flex flex-col xl:flex-row gap-3 justify-between items-center">
          {/* Left: Search Bar + Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
            {/* Search Bar */}
            <div id="tour-search-bar" className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search experiments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 pl-10 pr-4 text-sm text-zinc-800 outline-none focus:border-zinc-400 focus:bg-white transition-all h-10"
              />
            </div>

            {/* Action Buttons: Launch IDE, Add Experiment, Product Tour */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <Link id="tour-launch-ide" href="/editor/index.html" className="flex-1 sm:flex-none">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-white hover:bg-zinc-100 text-black border border-zinc-300 font-bold text-xs h-10 px-4 rounded-xl gap-2 shadow-2xs cursor-pointer transition-all"
                >
                  <Code2 className="h-4 w-4 text-black" />
                  Launch IDE
                </Button>
              </Link>

              <Button
                variant="outline"
                onClick={() => setIsTourOpen(true)}
                className="w-full sm:w-auto bg-white hover:bg-zinc-100 text-black border border-zinc-300 font-bold text-xs h-10 px-3.5 rounded-xl gap-1.5 shadow-2xs cursor-pointer transition-all"
                title="Interactive Guide & Tour"
              >
                <HelpCircle className="h-4 w-4 text-black" />
                Tour
              </Button>

              {isAdmin && (
                <Link href={`/ide/new${selectedChapter !== 'All' ? `?chapter=${selectedChapter}` : ''}`} className="flex-1 sm:flex-none">
                  <Button 
                    variant="outline"
                    className="w-full sm:w-auto bg-white hover:bg-zinc-100 text-black border border-zinc-300 font-bold text-xs h-10 px-4 gap-2 rounded-xl shadow-2xs cursor-pointer transition-all"
                  >
                    <PlusCircle className="h-4 w-4 text-black" />
                    Add Experiment
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Right: Filters & Admin Controls */}
          <div className="flex flex-wrap gap-2 items-center justify-end w-full xl:w-auto">
            {/* Visibility filter for Admin */}
            {isAdmin && (
              <div className="flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs shadow-inner">
                <button
                  type="button"
                  onClick={() => setVisibilityFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    visibilityFilter === 'all'
                      ? 'bg-white text-zinc-900 shadow-sm font-bold'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  All ({allTutorials.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVisibilityFilter('visible')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    visibilityFilter === 'visible'
                      ? 'bg-white text-zinc-900 shadow-sm font-bold'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Visible ({visibleCount})
                </button>
                <button
                  type="button"
                  onClick={() => setVisibilityFilter('hidden')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    visibilityFilter === 'hidden'
                      ? 'bg-zinc-900 text-white shadow-sm font-bold'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <EyeOff className="h-3 w-3" />
                  Hidden ({hiddenCount})
                </button>
              </div>
            )}

            {/* Chapter Filter & Edit Icon if Admin */}
            <div id="tour-chapter-filter" className="flex items-center gap-1.5">
              <select
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-700 outline-none cursor-pointer focus:border-zinc-400 focus:bg-white transition-all h-10"
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
                  className="h-10 w-10 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-700 cursor-pointer"
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
        {!showLoading && dataLoadedOnce && (
          filteredTutorials.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTutorials.map((tut, index) => {
                const isVideoItem = Boolean(tut.isVideoOnly || (!tut.code && tut.videoId));
                return (
                <div key={tut.id} id={index === 0 ? "tour-first-card" : undefined} className="relative group">
                  
                  {/* Admin action overlays on the card */}
                  {isAdmin && (
                    <div className="absolute top-3 left-3 z-20 flex gap-1.5">
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className={`h-8 w-8 shadow-sm transition-all rounded-lg cursor-pointer ${
                          tut.isHidden 
                            ? 'bg-amber-500 text-white hover:bg-amber-600 border-amber-600' 
                            : 'bg-white/95 hover:bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900'
                        }`}
                        onClick={(e) => handleToggleVisibility(tut, e)}
                        title={tut.isHidden ? "Unhide experiment (show to students)" : "Hide experiment from students"}
                      >
                        {tut.isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Link href={`/ide/new?id=${tut.id}&chapter=${tut.chapterId}`}>
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-8 w-8 bg-white/95 hover:bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-black shadow-sm transition-all rounded-lg cursor-pointer"
                          title="Edit Experiment"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="h-8 w-8 bg-white/95 hover:bg-rose-50 border-zinc-200 hover:border-rose-200 text-zinc-700 hover:text-rose-600 shadow-sm transition-all rounded-lg cursor-pointer"
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

                  {/* Top-right badges */}
                  <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1 pointer-events-none">
                    {isAdmin && tut.isHidden && (
                      <Badge variant="outline" className="bg-zinc-900/90 backdrop-blur-sm text-white border-zinc-950 text-[10px] gap-1 font-bold shadow-sm px-2 py-0.5">
                        <EyeOff className="h-3 w-3" /> Hidden
                      </Badge>
                    )}
                    {isVideoItem && (
                      <Badge variant="outline" className="bg-white/95 backdrop-blur-sm text-black border-zinc-300 text-[10px] gap-1 font-bold shadow-2xs px-2 py-0.5">
                        <Video className="h-3 w-3 text-black" /> Intro / Video
                      </Badge>
                    )}
                  </div>

                  <Link
                    href={isVideoItem ? '#' : `/editor/index.html?experiment=${tut.id}&chapter=${tut.chapterId}`}
                    onClick={(e) => handleTutorialClick(e, tut)}
                    className="block h-full"
                  >
                    <Card className={`bg-white hover:bg-zinc-50/50 border transition-all duration-300 overflow-hidden flex flex-col h-full rounded-2xl relative shadow-sm hover:shadow-md ${
                      tut.isHidden 
                        ? 'border-amber-300/80 bg-amber-50/15 border-dashed ring-1 ring-amber-300/40 opacity-80 hover:opacity-100' 
                        : 'border-zinc-200/80 hover:border-orange-200/60'
                    }`}>
                      
                      {/* Image Thumbnail Container */}
                      <div className="relative h-48 w-full bg-white overflow-hidden border-b border-zinc-200/50 flex items-center justify-center">
                        <img
                          src={tut.diagramUrl || getYoutubeThumbnail(tut.videoId)}
                          alt={tut.title}
                          className={`${
                            tut.diagramUrl ? 'object-contain' : 'object-cover'
                          } w-full h-full group-hover:scale-103 transition-transform duration-500`}
                          loading="lazy"
                        />
                        
                        {/* Overlay shadow */}
                        <div className="absolute inset-0 bg-zinc-950/5 group-hover:bg-zinc-950/0 transition-colors" />

                        {/* Duration Badge */}
                        <div className="absolute bottom-2.5 right-2.5 bg-white/95 backdrop-blur-sm text-zinc-700 text-[10px] font-bold px-2 py-0.5 rounded border border-zinc-200/60 shadow-sm">
                          {tut.duration}
                        </div>

                        {/* Play / Launch overlay button on hover */}
                        {hasPurchased && (
                          <div 
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              if (isVideoItem) {
                                e.preventDefault();
                                e.stopPropagation();
                                setActiveVideoTutorial(tut);
                              }
                              // For IDE experiments: do NOT prevent default or stop propagation, so clicking navigates directly to Web IDE!
                            }}
                          >
                            <div className="w-12 h-12 bg-white text-black border border-zinc-200 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                              {isVideoItem ? (
                                <Play className="h-5 w-5 fill-current ml-0.5 text-black" />
                              ) : (
                                <Code2 className="h-5 w-5 text-black" />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Lock overlay if not purchased */}
                        {!hasPurchased && (
                          <div className="absolute inset-0 bg-zinc-950/45 flex items-center justify-center backdrop-blur-[1px]">
                            <div className="w-10 h-10 bg-white/95 text-zinc-900 border border-zinc-200 rounded-full flex items-center justify-center shadow-md">
                              <Lock className="h-4 w-4" />
                            </div>
                          </div>
                        )}
                      </div>

                      <CardHeader className="space-y-1 p-3.5 flex-grow">
                        {(!hasPurchased || (isAdmin && tut.isHidden) || isVideoItem) && (
                          <div className="flex items-center gap-1.5 justify-start mb-1 flex-wrap">
                            {!hasPurchased && (
                              <Badge variant="outline" className="text-[9.5px] text-zinc-800 bg-zinc-100 border-zinc-200 gap-1 py-0.5 px-2 font-bold rounded-full">
                                <Lock className="h-2.5 w-2.5" /> Premium
                              </Badge>
                            )}
                            {isVideoItem && (
                              <Badge variant="outline" className="text-[9.5px] text-zinc-800 bg-zinc-100 border-zinc-200 gap-1 py-0.5 px-2 font-bold rounded-full">
                                <Video className="h-2.5 w-2.5" /> Video Guide
                              </Badge>
                            )}
                            {isAdmin && tut.isHidden && (
                              <Badge variant="outline" className="text-[9.5px] text-zinc-800 bg-zinc-100 border-zinc-200 gap-1 py-0.5 px-2 font-bold rounded-full">
                                <EyeOff className="h-2.5 w-2.5" /> Hidden
                              </Badge>
                            )}
                          </div>
                        )}

                        <CardTitle className="text-[13px] font-bold text-zinc-900 group-hover:text-black transition-colors line-clamp-1">
                          {tut.title}
                        </CardTitle>
                        
                        <CardDescription className="text-zinc-500 text-[10.5px] line-clamp-1 leading-relaxed">
                          {tut.description}
                        </CardDescription>
                      </CardHeader>

                      <CardFooter className="px-3.5 pb-3.5 pt-0">
                        {isVideoItem ? (
                          <Button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleTutorialClick(e, tut);
                            }}
                            className="w-full bg-white hover:bg-zinc-100 text-black border border-zinc-300 font-bold text-[11px] py-1.5 gap-1.5 transition-all shadow-2xs cursor-pointer"
                          >
                            <Play className="h-3.5 w-3.5 fill-current text-black" /> Watch Video
                          </Button>
                        ) : (
                          <Button className="w-full bg-white hover:bg-zinc-100 text-black border border-zinc-300 font-bold text-[11px] py-1.5 gap-1.5 transition-all shadow-2xs cursor-pointer">
                            {hasPurchased ? (
                              <>
                                <Code2 className="h-3.5 w-3.5 text-black" /> Launch IDE
                              </>
                            ) : (
                              <>
                                <Lock className="h-3.5 w-3.5 text-black" /> Unlock Project
                              </>
                            )}
                          </Button>
                        )}
                      </CardFooter>

                    </Card>
                  </Link>
                </div>
                );
              })}
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

      {/* Components & Experiment Details Preview Dialog */}
      <Dialog open={!!previewTutorial} onOpenChange={(open) => !open && setPreviewTutorial(null)}>
        <DialogContent className="max-w-xl w-[95vw] rounded-2xl bg-white border-zinc-200 text-zinc-900 max-h-[85vh] overflow-y-auto p-6 shadow-2xl">
          {previewTutorial && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] bg-orange-50 border-orange-200 text-orange-700 font-bold uppercase">
                    {previewTutorial.level}
                  </Badge>
                  <span className="text-xs text-zinc-400 font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {previewTutorial.duration}
                  </span>
                </div>
                <DialogTitle className="text-lg font-black tracking-tight text-zinc-900">
                  {previewTutorial.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500 line-clamp-3 leading-relaxed">
                  {previewTutorial.description}
                </DialogDescription>
              </DialogHeader>

              {/* Components Table */}
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-orange-500" /> Required Components & Quantity
                  </h4>
                  {previewTutorial.components && previewTutorial.components.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {previewTutorial.components.length} items
                    </Badge>
                  )}
                </div>

                {previewTutorial.components && previewTutorial.components.length > 0 ? (
                  <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600">
                          <th className="py-2 px-3 font-bold w-10 text-center">#</th>
                          <th className="py-2 px-3 font-bold">Component Name</th>
                          <th className="py-2 px-3 font-bold w-28 text-center">Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {previewTutorial.components.map((comp, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="py-2 px-3 text-center text-zinc-400 font-mono font-bold">{idx + 1}</td>
                            <td className="py-2 px-3 font-semibold text-zinc-800">{comp.name}</td>
                            <td className="py-2 px-3 text-center">
                              <Badge variant="outline" className="font-mono font-bold text-[10px] px-2 py-0.5 bg-orange-50 text-orange-700 border-orange-200">
                                {comp.quantity}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 border border-dashed border-zinc-200 rounded-xl text-center text-xs text-zinc-400">
                    No component list added for this experiment yet.
                  </div>
                )}
              </div>

              {/* Diagram preview if available */}
              {previewTutorial.diagramUrl && (
                <div className="space-y-2 pt-2 border-t border-zinc-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">Circuit Wiring Diagram</h4>
                  <div className="border border-zinc-200 rounded-xl p-2 bg-zinc-50 flex items-center justify-center max-h-56 overflow-hidden">
                    <img
                      src={previewTutorial.diagramUrl}
                      alt={previewTutorial.title}
                      className="max-h-52 object-contain rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Pinout Connections */}
              {previewTutorial.pinout && (
                <div className="space-y-2 pt-2 border-t border-zinc-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">Pinout Connections</h4>
                  <pre className="font-mono text-xs bg-zinc-50 border border-zinc-200 p-3 rounded-xl whitespace-pre-wrap text-zinc-700">
                    {previewTutorial.pinout}
                  </pre>
                </div>
              )}

              <div className="pt-3 border-t border-zinc-100 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewTutorial(null)}
                  className="rounded-xl text-xs cursor-pointer"
                >
                  Close
                </Button>
                <Link
                  href={`/editor/index.html?experiment=${previewTutorial.id}&chapter=${previewTutorial.chapterId}`}
                  onClick={(e) => handleTutorialClick(e, previewTutorial)}
                >
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm cursor-pointer">
                    <Code2 className="h-3.5 w-3.5" /> Launch in Web IDE
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      {/* Video Player Modal (Without IDE) */}
      <Dialog open={!!activeVideoTutorial} onOpenChange={(open) => !open && setActiveVideoTutorial(null)}>
        <DialogContent className="max-w-4xl w-[95vw] rounded-2xl bg-white border border-zinc-200 text-zinc-900 p-0 overflow-hidden shadow-2xl">
          {activeVideoTutorial && (
            <div>
              {/* Video Player Frame */}
              <div className="relative aspect-video w-full bg-black">
                {activeVideoTutorial.videoId ? (
                  <iframe
                    src={getEmbedVideoUrl(activeVideoTutorial.videoId)}
                    title={activeVideoTutorial.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full border-none"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-2">
                    <Video className="h-10 w-10 text-zinc-600" />
                    <p className="text-sm">No video URL provided for this tutorial.</p>
                  </div>
                )}
              </div>

              {/* Video Information */}
              <div className="p-6 space-y-4 max-h-[40vh] overflow-y-auto">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="bg-zinc-100 text-zinc-900 border-zinc-200 text-xs font-bold gap-1 py-0.5 px-2.5">
                      <Video className="h-3.5 w-3.5 text-zinc-800" />
                      {activeVideoTutorial.isVideoOnly ? 'Introduction Guide' : 'Video Tutorial'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs font-semibold">
                      {activeVideoTutorial.level}
                    </Badge>
                    <span className="text-xs text-zinc-500 font-medium flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-zinc-400" /> {activeVideoTutorial.duration}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeVideoTutorial.code && (
                      <Link
                        href={`/editor/index.html?experiment=${activeVideoTutorial.id}&chapter=${activeVideoTutorial.chapterId}`}
                      >
                        <Button size="sm" variant="outline" className="text-xs font-bold gap-1.5 rounded-xl border-zinc-300 bg-white hover:bg-zinc-100 text-black">
                          <Code2 className="h-3.5 w-3.5 text-black" /> Open in Web IDE
                        </Button>
                      </Link>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveVideoTutorial(null)}
                      className="text-xs font-bold rounded-xl border-zinc-300 bg-white hover:bg-zinc-100 text-black cursor-pointer"
                    >
                      Close
                    </Button>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                    {activeVideoTutorial.title}
                  </h2>
                  <p className="text-sm text-zinc-600 mt-2 leading-relaxed whitespace-pre-line">
                    {activeVideoTutorial.description}
                  </p>
                </div>

                {activeVideoTutorial.components && activeVideoTutorial.components.length > 0 && (
                  <div className="pt-3 border-t border-zinc-100 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-orange-500" /> Required Components
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {activeVideoTutorial.components.map((c, i) => (
                        <Badge key={i} variant="outline" className="bg-zinc-50 border-zinc-200 text-zinc-700 text-xs py-1 px-2.5">
                          {c.name} {c.quantity ? `(${c.quantity})` : ''}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {activeVideoTutorial.pinout && (
                  <div className="pt-3 border-t border-zinc-100 space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">Pinout / Connections</h4>
                    <pre className="font-mono text-xs bg-zinc-50 border border-zinc-200 p-3 rounded-xl whitespace-pre-wrap text-zinc-700">
                      {activeVideoTutorial.pinout}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Interactive Page Tour */}
      <ExperimentsTour
        isOpen={isTourOpen}
        onClose={() => {
          setIsTourOpen(false);
          try {
            localStorage.setItem('ezcirkit_experiments_tour_seen', 'true');
          } catch (e) {
            // ignore
          }
        }}
      />
    </div>
  );
}
