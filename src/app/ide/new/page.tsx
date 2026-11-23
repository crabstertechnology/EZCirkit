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
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pt-28 md:pt-36 pb-20 px-4 md:px-8 relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        
        {/* Top Back Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link href="/ide">
            <Button
              variant="outline"
              className="bg-white hover:bg-zinc-100 text-black border border-zinc-300 font-bold text-xs h-9 px-3.5 rounded-xl gap-2 shadow-2xs cursor-pointer transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Experiments
            </Button>
          </Link>
        </div>

        {/* Header Title Banner */}
        <div className="space-y-1.5">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900">
            {editingTutorial ? 'Edit Experiment' : 'Add New Experiment'}
          </h1>
          <p className="text-sm text-zinc-500">
            {editingTutorial
              ? `Update details, code, diagram, or video for "${editingTutorial.title}".`
              : 'Configure coding experiment, introduction video, circuit diagram, hardware components, and Arduino code.'}
          </p>
        </div>

        {/* Full-screen Form Container */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm p-6 md:p-8">
          {chapters.length === 0 ? (
            <div className="text-center py-12 space-y-3">
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
            <div className="space-y-6">
              {/* Destination Chapter Selector (only shown when creating or switching) */}
              {!editingTutorial && (
                <div className="space-y-2 pb-5 border-b border-zinc-100">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                    Destination Chapter <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={selectedChapter}
                    onChange={(e) => setSelectedChapter(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-800 outline-none focus:border-zinc-400 focus:bg-white transition-all h-11"
                  >
                    {chapters.map(ch => (
                      <option key={ch.id} value={ch.id}>
                        {ch.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                />
              )}
            </div>
          )}
        </div>

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
