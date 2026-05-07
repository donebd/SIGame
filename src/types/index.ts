/**
 * Core types and interfaces for Music Lotto Game
 */

export type QuestionType = 'mashup' | 'audio' | 'video' | 'text' | 'select';
export type GameMode = 'GRID' | 'QUESTION' | 'RESULTS';
export type SpecialType = 'cat' | 'bet' | 'auction' | 'special' | null;
export type ScreenMode = 'new' | 'popup' | 'same';
export type ActionSource = 'desktop' | 'mobile' | 'hardware';

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

export type Rounds = Record<string, Question[]>;

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

/** Payload for a video sync event sent to the TV screen */
export interface VideoSyncEvent {
    event: 'play' | 'pause' | 'seek' | 'rate';
    currentTime: number;
    isPlaying: boolean;
    playbackRate: number;
    volume: number;
    duration: number;
}

/** VIDEO_SYNC BroadcastMessage member — inline for correct discriminated union narrowing */
export interface VideoSyncMessage extends VideoSyncEvent {
    type: 'VIDEO_SYNC';
}

/** Payload for the special-question preview shown on TV before revealing */
export interface SpecialPreviewData {
    specialType: string;
    specialTypeName: string;
    specialIcon: string;
    specialDescription: string;
    score: number;
}

export type BroadcastMessage =
    | { type: 'STATE'; state: GameState }
    | { type: 'LOAD_ROUND_DATA'; data: RoundData }
    | { type: 'REQUEST_SYNC' }
    | { type: 'ANIMATE'; card: 'music' | 'text' | 'question' | 'answer' }
    | { type: 'ANIMATE_TITLE' }
    | { type: 'CONFETTI' }
    | { type: 'TOGGLE_SNOW'; enabled: boolean }
    | VideoSyncMessage
    | { type: 'SPECIAL_PREVIEW'; data: SpecialPreviewData }
    | { type: 'MEDIA_ACTION'; action: 'play' | 'pause' }
    | { type: 'TOGGLE_FULLSCREEN' }
    | { type: 'GAME_ACTION'; action: GameAction };

export interface SerializedGameState extends Omit<GameState, 'rounds'> {
    rounds: Rounds;
    serializedAt: string;
    totalQuestions?: number;
    playedQuestions?: number;
    totalScore?: number;
}

/** All possible action types (kept for external reference if needed) */
export type ActionType =
    | 'NEXT_QUESTION'
    | 'PREV_QUESTION'
    | 'TOGGLE_AUDIO'
    | 'TOGGLE_VIDEO'
    | 'AWARD_POINTS'
    | 'REVEAL_MEDIA'
    | 'SHOW_ANSWER'
    | 'TOGGLE_SNOW'
    | 'TRIGGER_CONFETTI'
    | 'BACK_TO_GRID'
    | 'TOGGLE_MEDIA'
    | 'SELECT_QUESTION'
    | 'SWITCH_ROUND'
    | 'OPEN_SPECIAL'
    | 'SET_SCORE'
    | 'UPLOAD_PACK'
    | 'UPLOAD_PACK_START'
    | 'UPLOAD_PACK_CHUNK'
    | 'ADD_PLAYER'
    | 'UPDATE_PLAYER'
    | 'REMOVE_PLAYER'
    | 'BAN_THEME';

/**
 * Strongly-typed discriminated union of all game actions.
 * Each case narrows `payload` automatically in a switch statement.
 */
export type GameAction =
    | { type: 'TOGGLE_AUDIO';   source?: ActionSource }
    | { type: 'TOGGLE_VIDEO';   source?: ActionSource }
    | { type: 'SHOW_ANSWER';    source?: ActionSource }
    | { type: 'BACK_TO_GRID';   source?: ActionSource }
    | { type: 'TOGGLE_MEDIA';   source?: ActionSource }
    | { type: 'TRIGGER_CONFETTI'; source?: ActionSource }
    | { type: 'TOGGLE_SNOW';    source?: ActionSource }
    | { type: 'REVEAL_MEDIA';   payload: 'music' | 'text' | 'question'; source?: ActionSource }
    | { type: 'SELECT_QUESTION'; payload: string; source?: ActionSource }
    | { type: 'SWITCH_ROUND';   payload: string; source?: ActionSource }
    | { type: 'OPEN_SPECIAL';   payload: string; source?: ActionSource }
    | { type: 'BAN_THEME';      payload: string; source?: ActionSource }
    | { type: 'UPLOAD_PACK';    payload: { name: string; data: ArrayBuffer }; source?: ActionSource }
    | { type: 'UPLOAD_PACK_START'; payload: { name: string; totalChunks: number; totalSize: number }; source?: ActionSource }
    | { type: 'UPLOAD_PACK_CHUNK'; payload: { name: string; chunkIndex: number; totalChunks: number; data: ArrayBuffer }; source?: ActionSource }
    | { type: 'AWARD_POINTS';   payload: { playerId: number; multiplier: 'full' | 'half' | 'minus' }; source?: ActionSource }
    | { type: 'SET_SCORE';      payload: { playerId: number; score: number }; source?: ActionSource }
    | { type: 'ADD_PLAYER';     payload?: { name?: string }; source?: ActionSource }
    | { type: 'UPDATE_PLAYER';  payload: { playerId: number; name?: string; score?: number }; source?: ActionSource }
    | { type: 'REMOVE_PLAYER';  payload: { playerId: number }; source?: ActionSource }
    | { type: 'NEXT_QUESTION';  source?: ActionSource }
    | { type: 'PREV_QUESTION';  source?: ActionSource };
