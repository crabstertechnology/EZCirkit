'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, ArrowRight, Cpu, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PROJECTS_DATA, ProjectItem } from '@/lib/projects';

export default function ProjectsPage() {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'All' | 'Beginner' | 'Intermediate' | 'Advanced'>('All');

  // Filter projects by difficulty
  const filteredProjects = PROJECTS_DATA.filter((project) => {
    if (selectedDifficulty === 'All') return true;
    return project.difficulty === selectedDifficulty;
  });

  const tabs: Array<'All' | 'Beginner' | 'Intermediate' | 'Advanced'> = [
    'All',
    'Beginner',
    'Intermediate',
    'Advanced'
  ];

  // Dynamic project counts
  const getProjectCount = (diff: typeof selectedDifficulty) => {
    if (diff === 'All') return PROJECTS_DATA.length;
    return PROJECTS_DATA.filter(p => p.difficulty === diff).length;
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 text-foreground pt-28 md:pt-40 pb-16">
      <div className="container mx-auto px-4 md:px-6 space-y-12">
        
        {/* Header Hero Section */}
        <div className="space-y-3">
          <p className="text-xs md:text-sm font-extrabold uppercase tracking-widest text-primary">
            Project Library
          </p>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight font-headline text-foreground">
            Build, learn, repeat.
          </h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-xl">
            Hands-on projects with circuit diagrams, source code, and step-by-step instructions.
          </p>
        </div>

        <hr className="border-border/60" />

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-start gap-3 pt-2">
          {tabs.map((tab) => {
            const count = getProjectCount(tab);
            const isSelected = selectedDifficulty === tab;
            return (
              <button
                key={tab}
                onClick={() => setSelectedDifficulty(tab)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 shadow-sm",
                  isSelected
                    ? "bg-primary text-white"
                    : "bg-background border border-border/80 text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-900"
                )}
              >
                {tab === 'All' ? `${tab} (${count})` : tab}
              </button>
            );
          })}
        </div>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="group border border-border/60 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 bg-background flex flex-col justify-between"
              >
                {/* Thumbnail Image */}
                <div className="aspect-[16/10] w-full relative overflow-hidden bg-zinc-100 border-b border-border/40">
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/* Card Content */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    {/* Meta info: Badge + duration */}
                    <div className="flex items-center gap-3">
                      <Badge
                        className={cn(
                          "text-[9px] font-black uppercase tracking-wider py-0.5 px-2 border-none",
                          project.difficulty === 'Beginner'
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : project.difficulty === 'Intermediate'
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                        )}
                      >
                        {project.difficulty}
                      </Badge>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{project.duration}</span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors leading-snug">
                        {project.title}
                      </h3>
                      <p className="text-muted-foreground text-xs md:text-sm leading-relaxed line-clamp-2">
                        {project.description}
                      </p>
                    </div>

                    <hr className="border-border/60" />

                    {/* Components Required list summary */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        <Cpu className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Parts Needed:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {project.components.map((comp, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center text-[10px] font-bold bg-zinc-100 dark:bg-zinc-900 border border-border/80 px-2 py-0.5 rounded"
                          >
                            {comp}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Learn more link */}
                  <Link
                    href={`/projects/${project.id}`}
                    className="inline-flex items-center gap-2 text-xs md:text-sm font-extrabold text-primary hover:text-primary/80 uppercase tracking-widest group pt-2"
                  >
                    <span>Learn more</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center border border-dashed rounded-3xl text-muted-foreground text-sm font-semibold max-w-md mx-auto">
            No projects found matching that difficulty level.
          </div>
        )}

      </div>
    </div>
  );
}
