'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, PlusCircle, Sparkles, Loader2, ShieldAlert } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { Tutorial, TutorialChapter } from '@/lib/tutorials';
import TutorialForm from '@/components/admin/tutorial-form';

function NewExperimentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const editId = searchParams.get('id');
  const chapterParam = searchParams.get('chapter');

  const [chapters, setChapters] = useState<TutorialChapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [isLoadingChapters, setIsLoadingChapters] = useState(true);
  const [isLoadingTutorial, setIsLoadingTutorial] = useState(Boolean(editId && chapterParam));
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // Admin validation
  const userDocRef = useMemoFirebase(
    () => (user && !isUserLoading && firestore ? doc(firestore, 'users', user.uid) : null),
    [firestore, user, isUserLoading]
  );
  const { data: userData, isLoading: isLoadingUserDoc } = useDoc<{ isAdmin?: boolean }>(userDocRef);
  const isAdmin = userData?.isAdmin ?? false;

  // Fetch chapters
  useEffect(() => {
    if (!firestore) return;

    const fetchChapters = async () => {
      setIsLoadingChapters(true);
      try {
        const q = query(collection(firestore, 'tutorialChapters'), orderBy('order'));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({
          ...(d.data() as Omit<TutorialChapter, 'id' | 'tutorials'>),
          id: d.id,
          tutorials: []
        }));
        data.sort((a, b) => a.order - b.order);
        setChapters(data);

        // Pre-select chapter
        if (chapterParam && data.some(ch => ch.id === chapterParam)) {
          setSelectedChapter(chapterParam);
        } else if (data.length > 0) {
          setSelectedChapter(data[0].id);
        }
      } catch (err: any) {
        console.error("Error loading chapters:", err);
        toast({ variant: 'destructive', title: 'Error loading chapters', description: err.message });
      } finally {
        setIsLoadingChapters(false);
      }
    };

    fetchChapters();
  }, [firestore, chapterParam, toast]);

  // Fetch existing tutorial if in edit mode
  useEffect(() => {
    if (!firestore || !editId || !chapterParam) {
      setIsLoadingTutorial(false);
      return;
    }

    const fetchTutorial = async () => {
      setIsLoadingTutorial(true);
      try {
        const docRef = doc(firestore, `tutorialChapters/${chapterParam}/tutorials`, editId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setEditingTutorial({ ...docSnap.data(), id: docSnap.id } as Tutorial);
          setSelectedChapter(chapterParam);
        } else {
          toast({ variant: 'destructive', title: 'Experiment not found.' });
          router.push('/ide');
        }
      } catch (err: any) {
        console.error("Error fetching experiment:", err);
        toast({ variant: 'destructive', title: 'Failed to load experiment', description: err.message });
      } finally {
        setIsLoadingTutorial(false);
      }
    };

    fetchTutorial();
  }, [firestore, editId, chapterParam, toast, router]);

  const isPageLoading = isUserLoading || isLoadingUserDoc || isLoadingChapters || isLoadingTutorial;

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center pt-28 pb-16 px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-zinc-900 animate-spin" />
          <p className="text-sm font-semibold text-zinc-600">Loading experiment editor...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center pt-28 pb-16 px-4">
        <div className="max-w-md w-full bg-white border border-zinc-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900">Admin Access Required</h2>
          <p className="text-sm text-zinc-500">
            You must be signed in as an administrator to create or edit experiments.
          </p>
          <Link href="/ide">
            <Button variant="outline" className="bg-white hover:bg-zinc-100 text-black border border-zinc-300 font-bold text-xs h-10 px-4 rounded-xl">
              Back to Experiments
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pt-24 md:pt-28 pb-16 px-3 sm:px-6 md:px-8 xl:px-10 relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[1920px] mx-auto space-y-6 relative z-10">
        
        {/* Top Header Bar: utilizing marked blank space with Destination Chapter and Actions */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          {/* Left: Back button + Title + Subtitle */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Link href="/ide">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-zinc-100 text-black border border-zinc-300 font-bold text-xs h-8 px-3 rounded-xl gap-1.5 shadow-2xs cursor-pointer transition-all"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Experiments
                </Button>
              </Link>
              <span className="text-zinc-300 text-xs font-semibold">/</span>
              <span className="text-xs font-bold text-zinc-500">
                {editingTutorial ? 'Edit Mode' : 'New Experiment'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900">
              {editingTutorial ? 'Edit Experiment' : 'Add New Experiment'}
            </h1>
            <p className="text-xs text-zinc-500 max-w-2xl">
              {editingTutorial
                ? `Update details, code, diagram, or video for "${editingTutorial.title}".`
                : 'Configure coding experiment, introduction video, circuit diagram, hardware components, and Arduino code.'}
            </p>
          </div>

          {/* Right: Utilizes the marked blank space with Chapter Selector & Actions */}
          <div className="flex flex-wrap items-center gap-3 self-start xl:self-center bg-zinc-50/90 p-2.5 rounded-2xl border border-zinc-200 shadow-2xs">
            {chapters.length > 0 && (
              <div className="flex items-center gap-2 px-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
                  Destination Chapter:
                </span>
                <select
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(e.target.value)}
                  className="bg-white border border-zinc-200 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-900 outline-none focus:border-zinc-400 transition-all h-9 cursor-pointer min-w-[180px] shadow-2xs"
                >
                  {chapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="h-6 w-px bg-zinc-200 hidden sm:block" />

            <Link href="/ide">
              <Button
                type="button"
                variant="outline"
                className="h-9 px-4 rounded-xl text-xs font-bold border-zinc-300 text-zinc-800 hover:bg-zinc-100 bg-white cursor-pointer"
              >
                Cancel
              </Button>
            </Link>

            <Button
              type="submit"
              form="tutorial-form"
              disabled={isFormSubmitting}
              className="h-9 px-5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-black text-white shadow-sm cursor-pointer gap-2 transition-all"
            >
              {isFormSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  {editingTutorial ? 'Update Experiment' : 'Save Experiment'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Full-screen Form Content */}
        {chapters.length === 0 ? (
          <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm text-center py-16 space-y-3 p-8">
            <p className="text-sm font-semibold text-zinc-700">No chapters found</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Please create at least one chapter before adding experiments.
            </p>
            <Link href="/ide">
              <Button variant="outline" className="text-xs h-9 font-bold rounded-xl border-zinc-300">
                Return to Experiments Page
              </Button>
            </Link>
          </div>
        ) : (
          <div className="w-full">
            {selectedChapter && (
              <TutorialForm
                isFullScreen={true}
                onSave={() => {
                  toast({
                    title: editingTutorial ? 'Experiment Updated' : 'Experiment Created',
                    description: 'Changes have been saved successfully.',
                  });
                  router.push('/ide');
                }}
                tutorial={editingTutorial}
                chapterId={selectedChapter}
                chapters={chapters}
                onChapterChange={setSelectedChapter}
                onSubmittingChange={setIsFormSubmitting}
              />
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default function NewExperimentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center pt-28 pb-16 px-4">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 text-zinc-900 animate-spin" />
            <p className="text-sm font-semibold text-zinc-600">Loading editor...</p>
          </div>
        </div>
      }
    >
      <NewExperimentContent />
    </Suspense>
  );
}
