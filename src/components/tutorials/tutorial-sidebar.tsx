'use client';

import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeftOpen, PlusCircle, Edit, Trash2, CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import type { TutorialChapter, Tutorial } from '@/lib/tutorials';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '../ui/scroll-area';


interface TutorialSidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (isCollapsed: boolean) => void;
    chapters: TutorialChapter[];
    isLoading: boolean;
    isAdmin: boolean;
    onAddChapter: () => void;
    onEditChapter: (chapter: TutorialChapter) => void;
    onDeleteChapter: (chapterId: string) => void;
    onAddTutorial: (chapter: TutorialChapter) => void;
    onEditTutorial: (tutorial: Tutorial) => void;
    onDeleteTutorial: (tutorial: Tutorial) => void;
    onSelectTutorial?: (tutorial: Tutorial) => void;
    isPageSidebar?: boolean;
    activeTutorialId?: string;
}

const TutorialSidebar: React.FC<TutorialSidebarProps> = ({ 
    isCollapsed, 
    setIsCollapsed, 
    chapters, 
    isLoading,
    isAdmin,
    onAddChapter,
    onEditChapter,
    onDeleteChapter,
    onAddTutorial,
    onEditTutorial,
    onDeleteTutorial,
    onSelectTutorial,
    isPageSidebar = false,
    activeTutorialId,
}) => {

    const AdminChapterControls = ({ chapter }: { chapter: TutorialChapter }) => {
        if (!isAdmin || isPageSidebar) return null;
        return (
            <div className="flex items-center gap-1 transition-opacity" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" onClick={() => onEditChapter(chapter)}><Edit className="h-4 w-4" /></Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete Chapter?</AlertDialogTitle><AlertDialogDescription>This will delete the chapter and all tutorials within it. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onDeleteChapter(chapter.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        );
    }
    
    const AdminTutorialControls = ({ tutorial }: { tutorial: Tutorial }) => {
        if (!isAdmin || isPageSidebar) return null;
        return (
             <div className="flex items-center gap-0 pr-1 transition-opacity" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" onClick={() => onEditTutorial(tutorial)}><Edit className="h-4 w-4" /></Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete Tutorial?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onDeleteTutorial(tutorial)}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        )
    }

    const defaultActiveChapter = chapters.find(c => c.tutorials.some(t => t.id === activeTutorialId))?.id;

    const SidebarContent = () => {
        if (isLoading && !isCollapsed) {
            return (
                 <div className="space-y-4 p-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                 </div>
            );
        }
        
        const handleTutorialClick = (tutorial: Tutorial, e: React.MouseEvent) => {
            if (onSelectTutorial) {
                e.preventDefault();
                onSelectTutorial(tutorial);
            }
        };

        return (
             <ScrollArea className="h-full">
                <div className="p-4">
                    {isAdmin && !isPageSidebar && (
                        <Button onClick={onAddChapter} className="w-full mb-4">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Chapter
                        </Button>
                    )}
                    <Accordion type="multiple" defaultValue={defaultActiveChapter ? [defaultActiveChapter] : []} className="w-full">
                        {chapters.map(chapter => (
                            <AccordionItem key={chapter.id} value={chapter.id}>
                                <div className="flex w-full items-center justify-between group hover:bg-accent/50 rounded-md pr-2">
                                <AccordionTrigger className="font-semibold text-base hover:no-underline flex-1 p-0 pl-3">
                                      <span>Chapter {chapter.order}: {chapter.title}</span>
                                </AccordionTrigger>
                                <AdminChapterControls chapter={chapter} />
                                </div>
                                <AccordionContent>
                                <ul className="space-y-1">
                                    {chapter.tutorials.map(tutorial => {
                                        const isActive = tutorial.id === activeTutorialId;
                                        return (
                                            <li key={tutorial.id} className={cn("group flex justify-between items-center rounded-md transition-colors", isActive ? "bg-primary/10" : "hover:bg-secondary")}>
                                                <a href={`/tutorials/${tutorial.id}`} onClick={(e) => handleTutorialClick(tutorial, e)} className={cn("flex-1 p-2 text-sm", isActive ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground")}>
                                                  <div className="flex items-center gap-2">
                                                    {isActive && <CheckCircle className="h-4 w-4 text-primary" />}
                                                    <span>{tutorial.title}</span>
                                                  </div>
                                                </a>
                                                 <AdminTutorialControls tutorial={tutorial} />
                                            </li>
                                        );
                                    })}
                                    {chapter.tutorials.length === 0 && <li className="text-xs text-muted-foreground p-2">No tutorials yet.</li>}
                                    {isAdmin && !isPageSidebar && (
                                        <li>
                                            <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => onAddTutorial(chapter)}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Add Tutorial
                                            </Button>
                                        </li>
                                    )}
                                </ul>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                         {chapters.length === 0 && !isLoading && (
                            <div className="text-center text-sm text-muted-foreground py-8">
                                <p>No chapters yet.</p>
                                {isAdmin && !isPageSidebar && <p>Click 'Add Chapter' to start.</p>}
                            </div>
                        )}
                    </Accordion>
                </div>
            </ScrollArea>
        );
    }

    if (isPageSidebar) {
        return (
            <aside className="h-[calc(100vh-theme(spacing.32))] bg-card border rounded-lg flex flex-col">
                <div className="flex items-center justify-between h-14 border-b px-4">
                    <h2 className="text-lg font-semibold tracking-tight">Course Content</h2>
                </div>
                <SidebarContent />
            </aside>
        )
    }

    // Overlay sidebar implementation
    return (
        <>
            {/* Backdrop */}
            {!isCollapsed && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
                    onClick={() => setIsCollapsed(true)}
                />
            )}
            
            {/* Floating toggle button when collapsed */}
            {isCollapsed && (
                <Button
                    variant="default"
                    size="icon"
                    className="fixed left-4 top-20 z-50 shadow-lg"
                    onClick={() => setIsCollapsed(false)}
                >
                    <PanelLeftOpen className="h-5 w-5" />
                    <span className="sr-only">Open Sidebar</span>
                </Button>
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed left-0 top-0 h-screen bg-background border-r flex flex-col transition-transform duration-300 ease-in-out z-50 shadow-2xl",
                "w-80",
                isCollapsed ? "-translate-x-full" : "translate-x-0"
            )}>
                <div className="flex items-center justify-between h-14 border-b px-4">
                    <h2 className="text-lg font-semibold tracking-tight">Chapters</h2>
                    <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(true)}>
                        <X className="h-5 w-5" />
                        <span className="sr-only">Close Sidebar</span>
                    </Button>
                </div>
                
                <SidebarContent />
            </aside>
        </>
    );
};

export default TutorialSidebar;