import { GameStateManager } from '../state/GameState';
import { SyncService } from './SyncService';
import { StorageService } from './StorageService';
import { FileService } from './FileService';
import { AudioController } from '../media/AudioController';
import { VideoController } from '../media/VideoController';
import { SiqService } from './SiqService';
import { GameAction, Question, VisibilityState } from '../types/index';

export class GameController {
    constructor(
        private stateManager: GameStateManager,
        private syncService: SyncService,
        private storageService: StorageService,
        private fileService: FileService,
        private siqService: SiqService,
        private audioController?: AudioController | null,
        private videoController?: VideoController | null
    ) {
        // Clean up stale upload buffers every minute (guard against aborted WebRTC uploads)
        setInterval(() => {
            const now = Date.now();
            for (const [name, buf] of this.uploadBuffers) {
                if (now - buf.startedAt > this.UPLOAD_TTL_MS) {
                    console.warn(`[Upload] Stale upload buffer cleaned: ${name}`);
                    this.uploadBuffers.delete(name);
                }
            }
        }, 60_000);
    }

    // Callbacks
    private onSelectQuestion?: (id: string) => void;
    private onOpenSpecial?: (id: string) => void;

    // Chunked upload buffer: name -> { chunks, totalChunks, startedAt }
    private uploadBuffers: Map<string, { chunks: ArrayBuffer[]; totalChunks: number; startedAt: number }> = new Map();
    private readonly UPLOAD_TTL_MS = 5 * 60 * 1000; // 5 min stale-upload cleanup

    public setAudioController(controller: AudioController | null) {
        this.audioController = controller;
    }

    public setVideoController(controller: VideoController | null) {
        this.videoController = controller;
    }

    public registerSelectQuestionCallback(callback: (id: string) => void) {
        this.onSelectQuestion = callback;
    }

    public registerOpenSpecialCallback(callback: (id: string) => void) {
        this.onOpenSpecial = callback;
    }

    public dispatch(action: GameAction) {
        switch (action.type) {
            case 'TOGGLE_AUDIO':
                this.handleToggleAudio();
                break;
            case 'TOGGLE_VIDEO':
                this.handleToggleVideo();
                break;
            case 'AWARD_POINTS':
                this.handleAwardPoints(action.payload);
                break;
            case 'TOGGLE_SNOW':
                this.handleToggleSnow();
                break;
            case 'TRIGGER_CONFETTI':
                this.handleTriggerConfetti();
                break;
            case 'REVEAL_MEDIA':
                this.handleRevealMedia(action.payload);
                break;
            case 'SHOW_ANSWER':
                this.handleShowAnswer();
                break;
            case 'BACK_TO_GRID':
                this.handleBackToGrid();
                break;
            case 'TOGGLE_MEDIA':
                this.handleToggleMedia();
                break;
            case 'SELECT_QUESTION':
                this.handleSelectQuestion(action.payload);
                break;
            case 'SWITCH_ROUND':
                this.handleSwitchRound(action.payload);
                break;
            case 'OPEN_SPECIAL':
                this.handleOpenSpecial(action.payload);
                break;
            case 'SET_SCORE':
                this.handleSetScore(action.payload);
                break;
            case 'ADD_PLAYER':
                this.handleAddPlayer(action.payload ?? {});
                break;
            case 'UPDATE_PLAYER':
                this.handleUpdatePlayer(action.payload);
                break;
            case 'REMOVE_PLAYER':
                this.handleRemovePlayer(action.payload);
                break;
            case 'BAN_THEME':
                this.handleBanTheme(action.payload);
                break;
            case 'UPLOAD_PACK':
                this.handleUploadPack(action.payload);
                break;
            case 'UPLOAD_PACK_START':
                this.handleUploadPackStart(action.payload);
                break;
            case 'UPLOAD_PACK_CHUNK':
                this.handleUploadPackChunk(action.payload);
                break;
            default:
                console.warn('Unknown action type:', action.type);
        }
    }

    private handleToggleAudio() {
        if (!this.audioController) return;
        const isPlaying = this.audioController.toggle();
        this.stateManager.setPlaying(isPlaying);
        this.syncService.syncState(this.stateManager.getState());
        this.storageService.saveGameState(this.stateManager.getState());
    }

    private handleToggleVideo() {
        if (!this.videoController) return;
        const isPlaying = this.videoController.toggle();
        this.stateManager.setVideoPlaying(isPlaying);

        // IMPORTANT: We must explicitly tell SyncService to toggle media on clients
        if (isPlaying) {
            this.syncService.sendMediaAction('play'); // You might need to implement this in SyncService if not existing
        } else {
            this.syncService.sendMediaAction('pause');
        }

        this.syncService.syncState(this.stateManager.getState());
        this.storageService.saveGameState(this.stateManager.getState());
    }

    private handleAwardPoints(payload: { playerId: number; multiplier: 'full' | 'half' | 'minus' }): void {
        if (!payload || payload.playerId == null) return;

        const questionId = this.stateManager.getState().currentQuestionId;
        if (!questionId) return;

        if (this.stateManager.awardPoints(payload.playerId, questionId, payload.multiplier)) {
            this.syncService.syncState(this.stateManager.getState());
            this.storageService.saveGameState(this.stateManager.getState());
        }
    }

    private handleToggleSnow() {
        const current = this.storageService.loadSnowEnabled();
        const newState = !current;
        this.storageService.saveSnowEnabled(newState);
        this.syncService.toggleSnow(newState);
        // UI update happens in UI
    }

    private handleTriggerConfetti() {
        this.syncService.triggerConfetti();
    }

    private handleRevealMedia(type: 'music' | 'text' | 'question') {
        const question = this.stateManager.getCurrentQuestion();
        if (!question) {
            console.warn('handleRevealMedia: No current question');
            return;
        }

        if (type === 'music') {
            this.stateManager.setVisibility({ music: true });
        } else if (type === 'text') {
            this.stateManager.setVisibility({ text: true });
        } else if (type === 'question') {
            this.stateManager.setVisibility({ question: true, answer: false });
        }

        // 'music' | 'text' | 'question' is a valid subset of triggerAnimation's union — no cast needed
        this.syncService.triggerAnimation(type);
        this.syncService.syncState(this.stateManager.getState());
        this.storageService.saveGameState(this.stateManager.getState());
    }

    private handleShowAnswer(): void {
        const question = this.stateManager.getCurrentQuestion();
        const visibilityUpdates: Partial<VisibilityState> = { question: false, answer: true };

        if (question && question.type === 'mashup') {
            visibilityUpdates.music = true;
            visibilityUpdates.text = true;
        }

        this.stateManager.setVisibility(visibilityUpdates);

        const currentQ = this.stateManager.getCurrentQuestion();

        // Handle video transitions: only pause and switch if there is a specific answer video.
        // If there's no answer video (e.g. video question with text answer), let the current video keep playing.
        if (currentQ && this.videoController) {
            const files = this.fileService.getFiles(currentQ.id);
            if (files && files.answerVideo) {
                if (this.videoController.isPlaying()) {
                    this.videoController.pause();
                    this.stateManager.setVideoPlaying(false);
                }
                const answerVideoUrl = URL.createObjectURL(files.answerVideo);
                this.videoController.setSource(answerVideoUrl);
            }
        }

        if (question && question.type === 'mashup') {
            this.syncService.triggerTitleAnimation();
        } else {
            this.syncService.triggerAnimation('answer');
        }

        this.syncService.syncState(this.stateManager.getState());
        this.storageService.saveGameState(this.stateManager.getState());
    }

    private handleBackToGrid() {
        if (this.videoController) {
            this.videoController.pause();
        }

        if (this.audioController) {
            this.audioController.pause();
        }

        this.stateManager.setMode('GRID');
        this.stateManager.setCurrentQuestion(null);
        this.stateManager.setVisibility({ music: false, text: false, question: false, answer: false });
        this.stateManager.setPlaying(false);
        this.stateManager.setVideoPlaying(false);

        this.syncService.syncState(this.stateManager.getState());
        this.storageService.saveGameState(this.stateManager.getState());
    }

    private handleToggleMedia() {
        const state = this.stateManager.getState();
        const question = this.stateManager.getCurrentQuestion();

        let useVideo = false;

        if (this.videoController && this.videoController.isPlaying()) {
            useVideo = true;
        } else if (question) {
            if (state.visible.question && (question.type === 'video' || question.type === 'mashup')) {
                useVideo = true;
            }
            // Use optional chaining carefully, assuming question object follows interface
            if (state.visible.answer && question.answerVideoUrl) {
                useVideo = true;
            }
        }

        if (useVideo) {
            this.handleToggleVideo();
        } else {
            this.handleToggleAudio();
        }
    }

    private handleSelectQuestion(questionId: string) {
        if (this.onSelectQuestion && questionId) {
            this.onSelectQuestion(questionId);
        }
    }

    private handleSwitchRound(roundName: string) {
        if (this.videoController) {
            this.videoController.pause();
        }

        if (this.audioController) {
            this.audioController.pause();
        }

        this.stateManager.setCurrentRoundName(roundName);
        this.stateManager.setMode('GRID');
        this.stateManager.setCurrentQuestion(null);
        this.stateManager.setVisibility({ music: false, text: false, question: false, answer: false });
        this.stateManager.setPlaying(false);
        this.stateManager.setVideoPlaying(false);

        this.syncService.syncState(this.stateManager.getState());
        this.storageService.saveGameState(this.stateManager.getState());
    }

    private handleOpenSpecial(questionId: string) {
        if (this.onOpenSpecial && questionId) {
            this.onOpenSpecial(questionId);
        }
    }

    private handleSetScore(payload: { playerId: number, score: number }) {
        if (!payload || typeof payload.playerId !== 'number' || typeof payload.score !== 'number') return;

        this.stateManager.updatePlayerScore(payload.playerId, payload.score);
        this.syncService.syncState(this.stateManager.getState());
        this.storageService.saveGameState(this.stateManager.getState());
    }

    private handleAddPlayer(payload: { name?: string } | undefined): void {
        this.stateManager.addPlayer(payload?.name || undefined);
        this.syncService.syncState(this.stateManager.getState());
        this.storageService.saveGameState(this.stateManager.getState());
    }

    private handleUpdatePlayer(payload: { playerId: number; name?: string; score?: number }) {
        if (!payload || typeof payload.playerId !== 'number') return;

        if (payload.name !== undefined) {
            this.stateManager.updatePlayerName(payload.playerId, payload.name);
        }
        if (payload.score !== undefined) {
            this.stateManager.updatePlayerScore(payload.playerId, payload.score);
        }
        this.syncService.syncState(this.stateManager.getState());
        this.storageService.saveGameState(this.stateManager.getState());
    }

    private handleRemovePlayer(payload: { playerId: number }) {
        if (!payload || typeof payload.playerId !== 'number') return;

        if (this.stateManager.removePlayer(payload.playerId)) {
            this.syncService.syncState(this.stateManager.getState());
            this.storageService.saveGameState(this.stateManager.getState());
        }
    }

    private handleBanTheme(theme: string) {
        if (!theme) return;
        this.stateManager.banTheme(theme);
        this.syncService.syncState(this.stateManager.getState());
        this.storageService.saveGameState(this.stateManager.getState());
    }

    private async handleUploadPack(payload: { name: string; data: ArrayBuffer }) {
        try {
            if (!payload || !payload.data) {
                console.error('Invalid upload pack payload');
                return;
            }
            const file = new File([payload.data], payload.name, { type: 'application/octet-stream' });
            await this.loadPack(file);
        } catch (e) {
            console.error('Error handling uploaded pack:', e);
        }
    }

    private handleUploadPackStart(payload: { name: string; totalChunks: number; totalSize: number }) {
        if (!payload || !payload.name) return;
        console.log(`[Upload] Starting chunked upload: ${payload.name} (${payload.totalChunks} chunks, ${(payload.totalSize / 1024 / 1024).toFixed(1)} MB)`);
        this.uploadBuffers.set(payload.name, { chunks: [], totalChunks: payload.totalChunks, startedAt: Date.now() });
    }

    private async handleUploadPackChunk(payload: { name: string; chunkIndex: number; totalChunks: number; data: ArrayBuffer }) {
        if (!payload || !payload.name || !payload.data) return;

        let buffer = this.uploadBuffers.get(payload.name);
        if (!buffer) {
            // Handle case where START was missed — create buffer on first chunk
            buffer = { chunks: [], totalChunks: payload.totalChunks, startedAt: Date.now() };
            this.uploadBuffers.set(payload.name, buffer);
        }

        const safeBuffer = buffer; // narrowed: not undefined from here on

        safeBuffer.chunks[payload.chunkIndex] = payload.data;

        const receivedCount = safeBuffer.chunks.filter(Boolean).length;
        console.log(`[Upload] Chunk ${payload.chunkIndex + 1}/${payload.totalChunks} received (${receivedCount} total)`);

        if (receivedCount >= payload.totalChunks) {
            console.log(`[Upload] All chunks received, reassembling ${payload.name}...`);
            try {
                // Concatenate all chunks in order
                const totalBytes = safeBuffer.chunks.reduce((s, c) => s + c.byteLength, 0);
                const combined = new Uint8Array(totalBytes);
                let offset = 0;
                for (const chunk of safeBuffer.chunks) {
                    combined.set(new Uint8Array(chunk), offset);
                    offset += chunk.byteLength;
                }
                this.uploadBuffers.delete(payload.name);
                const file = new File([combined], payload.name, { type: 'application/octet-stream' });
                await this.loadPack(file);
                console.log(`[Upload] Pack loaded successfully: ${payload.name}`);
            } catch (e) {
                console.error('[Upload] Error reassembling pack:', e);
            }
        }
    }

    public async loadPack(file: File) {
        try {
            const result = await this.siqService.parseSiq(file);

            // Merge file storage
            const currentStorage = this.fileService.getFileStorage();
            const newStorage = { ...currentStorage, ...result.fileStorage };
            this.fileService.setFileStorage(newStorage);

            // Set round types
            if (result.roundTypes) {
                Object.entries(result.roundTypes).forEach(([name, type]) => {
                    this.stateManager.setRoundType(name, type);
                });
            }

            // Create game state - preserve order of appearance
            const roundNames: string[] = [];
            const roundData = result.questions.reduce((acc, q) => {
                if (!acc[q.round]) {
                    acc[q.round] = [];
                    roundNames.push(q.round);
                }
                acc[q.round].push(q);
                return acc;
            }, {} as Record<string, Question[]>);

            // Sort questions within rounds by score
            Object.values(roundData).forEach(questions => {
                questions.sort((a, b) => a.score - b.score);
            });

            // Set game state
            this.stateManager.setRounds(roundData, roundNames);
            this.stateManager.setLoadedFolder(file.name.replace('.siq', ''));
            this.stateManager.setPackageName(file.name);

            // Restore current round
            const state = this.stateManager.getState();
            if (state.currentRoundName && roundNames.includes(state.currentRoundName)) {
                // Keep current
            } else if (roundNames.length > 0) {
                this.stateManager.setCurrentRoundName(roundNames[0]);
            }

            this.syncService.syncState(this.stateManager.getState());
            this.storageService.saveGameState(this.stateManager.getState());

        } catch (error) {
            console.error('Error loading pack:', error);
            throw error;
        }
    }
}
