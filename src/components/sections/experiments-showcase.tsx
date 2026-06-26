'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, ArrowRight, Code2, FlaskConical } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, getDocs, collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function ExperimentsShowcase() {
  const firestore = useFirestore();
  const [allExperiments, setAllExperiments] = useState<any[]>([]);
  const [isLoadingExps, setIsLoadingExps] = useState(true);

  // Load from localStorage cache immediately on client-side mount to make loading instant
  useEffect(() => {
    try {
      const cached = localStorage.getItem('ez_experiments_cache');
      if (cached) {
        setAllExperiments(JSON.parse(cached));
        setIsLoadingExps(false);
      }
    } catch (e) {
      console.error("Error loading experiments cache:", e);
    }
  }, []);

  const settingsDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'homepage') : null),
    [firestore]
  );

  const { data: homepageSettings } = useDoc<{ selectedExperiments?: string[] }>(settingsDocRef);
  const selectedIds = homepageSettings?.selectedExperiments || [];

  // Load experiments from Firestore
  useEffect(() => {
    if (!firestore) {
      setIsLoadingExps(false);
      return;
    }
    
    let active = true;
    const loadExperiments = async () => {
      try {
        const chaptersSnap = await getDocs(collection(firestore, 'tutorialChapters'));
        const chaptersData = chaptersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Fetch all chapter tutorials in parallel
        const promises = chaptersData.map(async (ch) => {
          const tutsSnap = await getDocs(collection(firestore, `tutorialChapters/${ch.id}/tutorials`));
          return tutsSnap.docs.map(doc => ({
            id: doc.id,
            chapterId: ch.id,
            ...doc.data()
          }));
        });
        
        const results = await Promise.all(promises);
        const loadedTuts = results.flat();
        
        if (active) {
          setAllExperiments(loadedTuts);
          try {
            localStorage.setItem('ez_experiments_cache', JSON.stringify(loadedTuts));
          } catch (e) {
            console.error("Error saving experiments cache:", e);
          }
        }
      } catch (err) {
        console.error("Error loading homepage experiments:", err);
      } finally {
        if (active) {
          setIsLoadingExps(false);
        }
      }
    };

    loadExperiments();
    return () => {
      active = false;
    };
  }, [firestore]);

  // Extract YouTube ID
  const getYoutubeThumbnail = (url?: string) => {
    if (!url) return '/logo.png';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '/logo.png';
  };

  // Filter projects based on settings or default to the first 3
  const projectsToShow = React.useMemo(() => {
    if (selectedIds.length > 0) {
      return allExperiments.filter(p => selectedIds.includes(p.id))
        .sort((a, b) => selectedIds.indexOf(a.id) - selectedIds.indexOf(b.id));
    }
    return allExperiments.slice(0, 3);
  }, [selectedIds, allExperiments]);

  if (isLoadingExps) {
    return (
      <section className="bg-zinc-50/50 dark:bg-zinc-950 py-16 md:py-24 border-t border-border/60">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div className="space-y-3 w-full md:max-w-2xl">
              <div className="h-6 w-32 bg-primary/10 rounded-full animate-pulse" />
              <div className="h-10 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
              <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse shrink-0" />
          </div>

          {/* Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col rounded-2xl overflow-hidden border border-border/60 bg-white dark:bg-zinc-900 space-y-5 p-5"
              >
                <div className="aspect-[16/10] w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
                <div className="space-y-2">
                  <div className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-5/6 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="h-10 w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (projectsToShow.length === 0) {
    return null;
  }

  return (
    <section className="bg-zinc-50/50 dark:bg-zinc-950 py-16 md:py-24 border-t border-border/60">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-black text-primary uppercase tracking-widest">
              <FlaskConical className="h-3.5 w-3.5" /> Hands-on Coding
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
              What You Will <span className="text-primary">Learn & Build</span>
            </h2>
            <p className="text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed">
              Pre-load code and start building right inside our interactive Web IDE workspace with video-assisted tutorials.
            </p>
          </div>
          <Link
            href="/ide"
            className="group inline-flex items-center gap-2 text-sm font-black text-primary hover:text-primary/80 uppercase tracking-wider shrink-0"
          >
            <span>Launch Web IDE ({allExperiments.length} experiments)</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectsToShow.map((project) => (
            <div
              key={project.id}
              className="group flex flex-col rounded-2xl overflow-hidden border border-border/60 bg-white dark:bg-zinc-900 hover:shadow-xl transition-all duration-300"
            >
              {/* Image Container */}
              <div className="relative aspect-[16/10] w-full bg-white overflow-hidden border-b border-border/40 flex items-center justify-center">
                <img
                  src={project.diagramUrl || getYoutubeThumbnail(project.videoId)}
                  alt={project.title}
                  className={`${
                    project.diagramUrl ? 'object-contain' : 'object-cover'
                  } w-full h-full p-2 group-hover:scale-102 transition-transform duration-500`}
                  onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                />
                
                {/* Duration Badge */}
                <div className="absolute bottom-2.5 right-2.5 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-sm text-zinc-700 dark:text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700 shadow-sm">
                  {project.duration}
                </div>
              </div>

              {/* Info */}
              <div className="p-5 flex-grow flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <h3 className="text-base font-black text-zinc-900 dark:text-zinc-50 group-hover:text-primary transition-colors leading-snug line-clamp-1">
                    {project.title}
                  </h3>

                  <p className="text-muted-foreground text-xs md:text-sm leading-relaxed line-clamp-2">
                    {project.description}
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/editor/index.html?experiment=${project.id}&chapter=${project.chapterId}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-primary dark:hover:bg-primary text-zinc-700 dark:text-zinc-200 hover:text-white dark:hover:text-white border border-border/60 hover:border-primary text-xs font-bold transition-all shadow-sm"
                  >
                    <Code2 className="h-4 w-4" />
                    <span>Launch IDE</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
