/**
 * Core types and interfaces for Music Lotto Game
 */

export type QuestionType = 'mashup' | 'audio' | 'video' | 'text' | 'select';
export type GameMode = 'GRID' | 'ROUND' | 'RESULTS';
export type SpecialType = 'cat' | 'bet' | 'auction' | 'special' | null;
export type ScreenMode = 'new' | 'popup' | 'same';

export interface Player {
    id: number;
    name: string;
    score: number;
}

export interface Question {
    id: string;
    round: string;
    type: QuestionType;
    category: string;
    score: number;
    played: boolean;
    specialType?: SpecialType;
    specialDescription?: string;
    question?: string;
    answer?: string;
    // Media for questions (can be text, image, video, audio)
    questionImageUrl?: string;
    questionVideoUrl?: string;
    questionAudioUrl?: string;
    // Media for answers (can be text, image, video, audio)
    answerImageUrl?: string;
    answerVideoUrl?: string;
    answerAudioUrl?: string;
    // Original question media (for mashup, audio, video types)
    audioUrl?: string;
    videoUrl?: string;
    audioFileName?: string;
    videoFileName?: string;
    previewMusic?: string;
    previewText?: string;
    answerOptions?: string[]; // For 'select' type questions
}

export interface Rounds {
    [roundName: string]: Question[];
}

export interface VisibilityState {
    music: boolean;
    text: boolean;
    question: boolean;
    answer: boolean;
}

export interface GameState {
    rounds: Rounds;
    players: Player[];
    mode: GameMode;
    currentRoundId: string | null;
    currentQuestionId: string | null;
    visible: VisibilityState;
    isPlaying: boolean;
    isVideoPlaying: boolean;
    version: string;
    lastUpdated: number;
    loadedFolder: string | null;
    currentRoundName: string;
    roundNames: string[];
    roundTypes: { [roundName: string]: 'regular' | 'final' };
    bannedThemes: string[];
    specialMode: SpecialType;
    packageName?: string;
}

export interface TVState {
    music: { visible: boolean; src: string | null; element: HTMLElement | null };
    text: { visible: boolean; src: string | null; element: HTMLElement | null };
    question: { visible: boolean; text: string | null; element: HTMLElement | null };
    answer: { visible: boolean; text: string | null; element: HTMLElement | null };
}

export interface VideoSyncState {
    admin: {
        currentTime: number;
        isPlaying: boolean;
        playbackRate: number;
    };
    tv: {
        currentTime: number;
        isPlaying: boolean;
        playbackRate: number;
    };
    lastUpdate?: number;
}

export interface FileStorage {
    [questionId: string]: {
        audio?: File;
        video?: File;
        music?: File;
        text?: File;
        questionImage?: File;
        questionVideo?: File;
        questionAudio?: File;
        answerImage?: File;
        answerVideo?: File;
        answerAudio?: File;
    };
}

export interface RoundData {
    type: QuestionType;
    category: string;
    score: number;
    question?: string;
    answer?: string;
    // Mashup media
    music?: string; // base64
    text?: string; // base64
    // Original question media
    audio?: string; // base64
    video?: string; // base64
    // Question media (for text/audio/video types)
    questionImage?: string; // base64
    questionVideo?: string; // base64
    questionAudio?: string; // base64
    // Answer media (for all types)
    answerImage?: string; // base64
    answerVideo?: string; // base64
    answerAudio?: string; // base64
    answerOptions?: string[];
}

export interface BroadcastMessage {
    type: string;
    [key: string]: any;
}

export interface SerializedGameState extends Omit<GameState, 'rounds'> {
    rounds: Rounds;
    serializedAt: string;
    totalQuestions?: number;
    playedQuestions?: number;
    totalScore?: number;
}
