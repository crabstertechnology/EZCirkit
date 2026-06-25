'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PROJECTS_DATA, ProjectItem } from '@/lib/projects';

const ProjectsPreviewSection = () => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'All' | 'Beginner' | 'Intermediate' | 'Advanced'>('All');

  // Filter projects by difficulty, take at most 3 for the homepage preview
  const filteredProjects = PROJECTS_DATA.filter((project) => {
    if (selectedDifficulty === 'All') return true;
    return project.difficulty === selectedDifficulty;
  }).slice(0, 3);

  const tabs: Array<'All' | 'Beginner' | 'Intermediate' | 'Advanced'> = [
    'All',
    'Beginner',
    'Intermediate',
    'Advanced'
  ];

  return (
    <section id="project-library" className="py-16 md:py-24 bg-background border-b border-border/80">
      <div className="container mx-auto px-4 md:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-3">
            <p className="text-xs md:text-sm font-extrabold uppercase tracking-widest text-primary">
              Project Library
            </p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight font-headline text-slate-900 dark:text-zinc-50">
              Build amazing things with one kit
            </h2>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl">
              Hands-on projects with circuit diagrams, source code and step-by-step instructions.
            </p>
          </div>
          
          {/* Link to all projects page */}
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider group shrink-0"
          >
            <span>View all projects</span>
            <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-2xl w-fit border border-border/40">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedDifficulty(tab)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 tracking-wide",
                selectedDifficulty === tab
                  ? "bg-background text-primary shadow-md border border-border/45"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Grid of Preview Cards */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group border border-border/70 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 bg-card hover:-translate-y-1.5 flex flex-col justify-between"
              >
                {/* Image Container */}
                <div className="aspect-[4/3] w-full relative overflow-hidden bg-zinc-100 border-b border-border/50">
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    {/* Meta Info: Difficulty and Duration */}
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
                      <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{project.duration}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors leading-snug">
                      {project.title}
                    </h3>
                  </div>

                  {/* Learn more trigger */}
                  <div className="pt-2 flex items-center justify-between text-xs font-bold text-primary uppercase tracking-wider">
                    <span>Learn more</span>
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center border border-dashed rounded-2xl text-muted-foreground text-sm font-semibold">
            No projects found for difficulty level "{selectedDifficulty}".
          </div>
        )}

      </div>
    </section>
  );
};

export default ProjectsPreviewSection;
