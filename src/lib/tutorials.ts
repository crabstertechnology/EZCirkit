
import type { WithId } from '@/firebase';

export type TutorialLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Tutorial {
    id: string;
    chapterId: string;
    title: string;
    description: string;
    level: TutorialLevel;
    duration: string;
    imageId: string;
    videoId?: string;
    order: number;
    code?: string;
    transcript?: string;
    notes?: string;
}

export interface TutorialChapter {
    id: string;
    title: string;
    order: number;
    tutorials: WithId<Tutorial>[];
}
