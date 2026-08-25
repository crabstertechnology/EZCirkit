'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Clock, ChevronRight, Play, ArrowRight } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Tutorial {
  id: string;
  chapterId: string;
  title: string;
  description: string;
  level: string;
  duration: string;
  order: number;
}

interface Chapter {
  id: string;
  title: string;
  order: number;
  tutorials: Tutorial[];
}

export default function TutorialsHubPage() {
  const firestore = useFirestore();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync cache from localStorage
  useEffect(() => {
    try {
      const cached = localStorage.getItem('ez_tutorials_hub_cache');
      if (cached) {
        setChapters(JSON.parse(cached));
        setIsLoading(false);
      }
    } catch (e) {
      console.error('Error reading tutorials cache:', e);
    }
  }, []);

  // Fetch chapters and sub-tutorials
  useEffect(() => {
    if (!firestore) return;

    let active = true;
    const fetchTutorials = async () => {
      try {
        const chaptersSnap = await getDocs(query(collection(firestore, 'tutorialChapters'), orderBy('order')));
        const chaptersData = chaptersSnap.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || 'Untitled Chapter',
          order: doc.data().order ?? 99,
          tutorials: []
        }));

        const promises = chaptersData.map(async (ch) => {
          const tutsSnap = await getDocs(query(collection(firestore, `tutorialChapters/${ch.id}/tutorials`), orderBy('order')));
          const tuts = tutsSnap.docs.map(doc => ({
            id: doc.id,
            chapterId: ch.id,
            title: doc.data().title || 'Untitled Lesson',
            description: doc.data().description || '',
            level: doc.data().level || 'Beginner',
            duration: doc.data().duration || '10 mins',
            order: doc.data().order ?? 99
          }));
          return { ...ch, tutorials: tuts };
        });

        const fullChapters = await Promise.all(promises);
        
        if (active) {
          setChapters(fullChapters);
          setIsLoading(false);
          try {
            localStorage.setItem('ez_tutorials_hub_cache', JSON.stringify(fullChapters));
          } catch {}
        }
      } catch (err) {
        console.error('Failed to fetch tutorials:', err);
        if (active) setIsLoading(false);
      }
    };

    fetchTutorials();
    return () => { active = false; };
  }, [firestore]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-foreground pt-20 md:pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Tutorials</span>
        </nav>

        {/* Header */}
        <div className="max-w-3xl mb-12 space-y-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">Crabster Technology Electronics Tutorials</p>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Electronics, Arduino Programming & DIY Chapters
          </h1>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            Learn electronics step-by-step with practical hands-on exercises using EZCirkit. From basic components like resistors and LEDs to advanced sensors and coding compilations.
          </p>
        </div>

        {/* Loading skeleton */}
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-3 animate-pulse">
                <div className="h-6 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map((j) => (
                    <div key={j} className="h-24 bg-zinc-100 dark:bg-zinc-900 rounded-xl border"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {chapters.map((chapter) => (
              <div key={chapter.id} className="space-y-4">
                <h2 className="text-base font-black text-foreground flex items-center gap-2 border-b border-border/60 pb-2 uppercase tracking-wider">
                  <BookOpen className="h-4.5 w-4.5 text-primary" /> {chapter.title}
                </h2>

                {chapter.tutorials.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chapter.tutorials.map((tutorial) => (
                      <Link
                        key={tutorial.id}
                        href={`/tutorials/${tutorial.id}`}
                        className="group flex flex-col justify-between p-4 bg-background hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 border border-border/60 hover:border-primary/40 rounded-xl shadow-sm hover:shadow transition-all duration-300"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[9px] font-bold tracking-wider uppercase">
                              {tutorial.level}
                            </Badge>
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold">
                              <Clock className="h-3 w-3" /> {tutorial.duration}
                            </span>
                          </div>
                          <h3 className="text-sm font-black group-hover:text-primary transition-colors leading-snug">
                            {tutorial.title}
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {tutorial.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-4 mt-auto">
                          <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                            <Play className="h-3 w-3 fill-primary/10" /> Read Tutorial
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No tutorials in this chapter yet.</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Global IDE CTA */}
        <div className="mt-12 bg-primary-gradient text-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-primary/15">
          <div className="space-y-1.5 text-center md:text-left">
            <h2 className="text-lg md:text-xl font-black">Learn by Coding Internally</h2>
            <p className="text-xs text-white/80 max-w-xl">
              Launch our cloud compilation space featuring a Monaco Code Editor, live schematic drawings, serial telemetry monitoring, and USB flasher straight from your web browser.
            </p>
          </div>
          <Link
            href="/ide"
            className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-primary text-xs font-extrabold uppercase tracking-wider hover:scale-[1.02] transition-transform shadow-md"
          >
            Launch Web IDE <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

      </div>
    </div>
  );
}
