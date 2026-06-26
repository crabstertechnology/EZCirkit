'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, ArrowRight, Cpu, FlaskConical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PROJECTS_DATA } from '@/lib/projects';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export default function ExperimentsShowcase() {
  const firestore = useFirestore();

  const settingsDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'homepage') : null),
    [firestore]
  );

  const { data: homepageSettings } = useDoc<{ selectedExperiments?: string[] }>(settingsDocRef);

  const selectedIds = homepageSettings?.selectedExperiments || [];

  // Filter projects based on settings or default to the first 3
  const projectsToShow = React.useMemo(() => {
    if (selectedIds.length > 0) {
      return PROJECTS_DATA.filter(p => selectedIds.includes(p.id))
        .sort((a, b) => selectedIds.indexOf(a.id) - selectedIds.indexOf(b.id));
    }
    return PROJECTS_DATA.slice(0, 3);
  }, [selectedIds]);

  return (
    <section className="bg-zinc-50/50 dark:bg-zinc-950 py-16 md:py-24 border-t border-border/60">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-black text-primary uppercase tracking-widest">
              <FlaskConical className="h-3.5 w-3.5" /> Hands-on Learning
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
              What You Will <span className="text-primary">Learn & Build</span>
            </h2>
            <p className="text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed">
              Every kit comes with step-by-step guides, wiring layouts, and sample code for dozens of real-world experiments.
            </p>
          </div>
          <Link
            href="/projects"
            className="group inline-flex items-center gap-2 text-sm font-black text-primary hover:text-primary/80 uppercase tracking-wider shrink-0"
          >
            <span>Browse Library ({PROJECTS_DATA.length})</span>
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
              {/* Image */}
              <div className="aspect-[16/10] w-full relative overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-b border-border/40">
                <img
                  src={project.image || '/logo.png'}
                  alt={project.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                />
              </div>

              {/* Info */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge
                      className={cn(
                        "text-[9px] font-black uppercase tracking-wider py-0.5 px-2 border-none shrink-0",
                        project.difficulty === 'Beginner'
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : project.difficulty === 'Intermediate'
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                      )}
                    >
                      {project.difficulty}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-zinc-400" />
                      <span>{project.duration}</span>
                    </div>
                  </div>

                  <h3 className="text-base font-black text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-1">
                    {project.title}
                  </h3>

                  <p className="text-muted-foreground text-xs md:text-sm leading-relaxed line-clamp-2">
                    {project.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/50 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    <Cpu className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Key modules needed:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {project.components.slice(0, 3).map((comp, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] font-bold bg-zinc-50 dark:bg-zinc-800 border border-border/80 px-2 py-0.5 rounded text-muted-foreground"
                      >
                        {comp}
                      </span>
                    ))}
                    {project.components.length > 3 && (
                      <span className="text-[9px] font-black text-primary px-1">
                        +{project.components.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  href={`/projects/${project.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-black text-primary hover:text-primary/80 uppercase tracking-widest pt-2 mt-auto"
                >
                  <span>Build This Experiment</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
