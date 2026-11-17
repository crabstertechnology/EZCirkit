
import type { WithId } from '@/firebase';

export type TutorialLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface ExperimentComponent {
    name: string;
    quantity: string;
}

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
    isHidden?: boolean;
    components?: ExperimentComponent[];
    code?: string;
    compiledHex?: string;
    transcript?: string;
    notes?: string;
    diagramUrl?: string;
    pinout?: string;
}

export interface TutorialChapter {
    id: string;
    title: string;
    order: number;
    tutorials: WithId<Tutorial>[];
}
