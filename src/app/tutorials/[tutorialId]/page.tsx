'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Clock, Cpu, Play, Copy, Check, ArrowRight, ExternalLink } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, getDoc, collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { slugify } from '@/lib/seo-mappings';

interface Tutorial {
  id: string;
  chapterId: string;
  title: string;
  description: string;
  level: string;
  duration: string;
  videoId?: string;
  diagramUrl?: string;
  pinout?: string;
  code?: string;
  notes?: string;
}

export default function TutorialDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tutorialId = (params.tutorialId as string) || '';
  
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [chapterTitle, setChapterTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Fetch tutorial data
  useEffect(() => {
    if (!firestore || !tutorialId) return;

    const fetchTutorialDetails = async () => {
      try {
        // Query using collectionGroup since tutorials is a subcollection: tutorialChapters/{chId}/tutorials/{tutId}
        const tutsQuery = query(
          collectionGroup(firestore, 'tutorials'),
          where('id', '==', tutorialId)
        );
        const querySnap = await getDocs(tutsQuery);
        
        if (querySnap.empty) {
          setIsLoading(false);
          return;
        }

        const tutDoc = querySnap.docs[0];
        const tutData = tutDoc.data();
        
        // Find parent chapter title
        const chapterRef = tutDoc.ref.parent.parent;
        if (chapterRef) {
          const chapterSnap = await getDoc(chapterRef);
          if (chapterSnap.exists()) {
            setChapterTitle(chapterSnap.data().title || '');
          }
        }

        setTutorial({
          id: tutDoc.id,
          chapterId: chapterRef ? chapterRef.id : '',
          title: tutData.title || 'Untitled Lesson',
          description: tutData.description || '',
          level: tutData.level || 'Beginner',
          duration: tutData.duration || '10 mins',
          videoId: tutData.videoId || '',
          diagramUrl: tutData.diagramUrl || '',
          pinout: tutData.pinout || '',
          code: tutData.code || '',
          notes: tutData.notes || '',
        });
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching tutorial details:', err);
        setIsLoading(false);
      }
    };

    fetchTutorialDetails();
  }, [firestore, tutorialId]);

  const handleCopyCode = () => {
    if (!tutorial?.code) return;
    navigator.clipboard.writeText(tutorial.code);
    setCopied(true);
    toast({
      title: 'Code Copied',
      description: 'The Arduino sketch has been copied to your clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Safe basic markdown parser rendering utility
  const parseNotesMarkdown = (text?: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      
      // Headers
      if (trimmed.startsWith('### ')) {
        return <h3 key={idx} className="text-sm font-black text-foreground pt-4 pb-1 uppercase tracking-wider">{trimmed.substring(4)}</h3>;
      }
      if (trimmed.startsWith('## ')) {
        return <h2 key={idx} className="text-base font-black text-foreground pt-5 pb-2 uppercase tracking-wide border-b border-border/40">{trimmed.substring(3)}</h2>;
      }
      if (trimmed.startsWith('# ')) {
        return <h1 key={idx} className="text-xl font-black text-foreground pt-6 pb-3">{trimmed.substring(2)}</h1>;
      }
      
      // Bullets
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        return (
          <ul key={idx} className="list-disc pl-5 space-y-1 my-1">
            <li className="text-xs md:text-sm text-muted-foreground leading-relaxed">{trimmed.substring(2)}</li>
          </ul>
        );
      }
      
      // Empty line
      if (trimmed === '') {
        return <div key={idx} className="h-2" />;
      }
      
      // Standard paragraph
      return (
        <p key={idx} className="text-xs md:text-sm text-muted-foreground leading-relaxed my-2">
          {trimmed}
        </p>
      );
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center pt-20">
        <div className="flex flex-col items-center gap-2 animate-pulse">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          <p className="text-xs text-muted-foreground font-semibold">Loading article details...</p>
        </div>
      </div>
    );
  }

  if (!tutorial) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center pt-20 text-center px-4">
        <h1 className="text-4xl font-black">Tutorial Not Found</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">The tutorial lesson has been removed or modified.</p>
        <Link href="/tutorials" className="mt-4 text-xs font-black text-primary hover:underline">
          Return to Tutorials Library
        </Link>
      </div>
    );
  }

  // Related components mock based on terms
  const componentsUsed = [
    { name: 'Arduino Uno R3 Compatible', slug: 'esp32-board' },
    { name: 'Vibrant LEDs Pack', slug: 'led' },
    { name: 'Resistors Pack', slug: 'resistor' },
    { name: 'Solderless Breadboard', slug: 'breadboard' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-foreground pt-20 md:pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/tutorials" className="hover:text-primary transition-colors">Tutorials</Link>
          <ChevronRight className="h-3 w-3" />
          {chapterTitle && (
            <>
              <span className="max-w-[150px] truncate">{chapterTitle}</span>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="text-foreground max-w-[150px] truncate">{tutorial.title}</span>
        </nav>

        {/* Title and Metadata */}
        <div className="space-y-4 border-b border-border/60 pb-6 mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="font-extrabold text-[10px] tracking-wider uppercase">
              {tutorial.level}
            </Badge>
            <span className="text-xs text-muted-foreground font-bold flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {tutorial.duration} read
            </span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            {tutorial.title}
          </h1>
          
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium">
            {tutorial.description}
          </p>
        </div>

        {/* Dynamic Content Grid */}
        <div className="space-y-8">
          
          {/* Video Embed */}
          {tutorial.videoId && (
            <div className="space-y-3">
              <h2 className="text-base font-black flex items-center gap-1.5 uppercase tracking-wider text-foreground">
                <Play className="h-4.5 w-4.5 fill-primary/10 text-primary" /> Step-by-Step Video Guide
              </h2>
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-border/60 shadow-md">
                <iframe
                  src={`https://www.youtube.com/embed/${tutorial.videoId}`}
                  title="EZCirkit Tutorial Video Player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-none"
                ></iframe>
              </div>
            </div>
          )}

          {/* Diagram and Pinout split */}
          {(tutorial.diagramUrl || tutorial.pinout) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Wiring Diagram */}
              {tutorial.diagramUrl && (
                <div className="space-y-2">
                  <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Wiring Diagram</h2>
                  <div className="border border-border/60 rounded-xl p-3 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center aspect-[4/3] overflow-hidden">
                    <img
                      src={tutorial.diagramUrl}
                      alt={`Wiring diagram for ${tutorial.title}`}
                      className="object-contain max-h-full max-w-full hover:scale-102 transition-transform duration-300"
                    />
                  </div>
                </div>
              )}

              {/* Pinout Config */}
              {tutorial.pinout && (
                <div className="space-y-2">
                  <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Pinout Connections</h2>
                  <div className="border border-border/60 rounded-xl overflow-hidden bg-background">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-border/80">
                          <th className="p-3 font-bold text-muted-foreground uppercase tracking-wider">Board Pin</th>
                          <th className="p-3 font-bold text-muted-foreground uppercase tracking-wider">Component Pin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tutorial.pinout.split('\n').filter(Boolean).map((line, idx) => {
                          const parts = line.split('->');
                          return (
                            <tr key={idx} className="border-b border-border/40 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                              <td className="p-3 font-mono font-bold text-primary">{parts[0]?.trim() || line}</td>
                              <td className="p-3 font-mono text-muted-foreground">{parts[1]?.trim() || 'Connection'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Notes (Full Markdown content) */}
          {tutorial.notes && (
            <div className="border-t border-border/40 pt-6 space-y-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Lesson Guide</h2>
              <div className="bg-zinc-50/30 dark:bg-zinc-900/10 p-5 rounded-2xl border border-border/60">
                {parseNotesMarkdown(tutorial.notes)}
              </div>
            </div>
          )}

          {/* Code Sandbox section */}
          {tutorial.code && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black flex items-center gap-2 uppercase tracking-wider text-foreground">
                  <Cpu className="h-4.5 w-4.5 text-primary" /> Arduino C++ Code Sketch
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCode}
                  className="h-8 border-border/80 hover:bg-accent text-xs font-bold gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy Code
                    </>
                  )}
                </Button>
              </div>
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 text-zinc-100 p-4 font-mono text-[11px] md:text-xs leading-relaxed max-h-[350px] overflow-y-auto">
                <pre>{tutorial.code}</pre>
              </div>
            </div>
          )}

          {/* CTA: Launch Interactive IDE */}
          <div className="bg-primary/5 rounded-2xl border border-primary/10 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 text-center md:text-left">
              <h3 className="text-base font-black text-foreground">Load code straight to your Arduino board</h3>
              <p className="text-xs text-muted-foreground max-w-xl">
                Ready to program? Open this lesson directly inside the **EZCirkit IDE** to flash the code, view schematic drawings, and interact via our browser-based serial monitor.
              </p>
            </div>
            <Link
              href={`/ide?tutorial=${tutorial.id}`}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-6 py-3 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider hover:scale-[1.02] transition-transform shadow-md"
            >
              Open Interactive IDE <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Recommended Components purchase links (Funnel) */}
          <div className="border-t border-border/60 pt-8 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Required Components for this Project</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {componentsUsed.map((comp, idx) => (
                <Link
                  key={idx}
                  href={`/components/${comp.slug}`}
                  className="group p-3 border border-border/60 rounded-xl bg-background hover:border-primary/40 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-all duration-300 text-center"
                >
                  <h3 className="text-xs font-bold leading-tight group-hover:text-primary transition-colors text-foreground line-clamp-1">{comp.name}</h3>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase group-hover:text-primary transition-colors inline-flex items-center gap-0.5 mt-2">
                    Buy Part <ChevronRight className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
