import { GameController } from '../src/services/GameController';
import { GameStateManager } from '../src/state/GameState';
import { SyncService } from '../src/services/SyncService';
import { StorageService } from '../src/services/StorageService';
import { AudioController } from '../src/media/AudioController';
import { VideoController } from '../src/media/VideoController';
import { FileService } from '../src/services/FileService';
import { SiqService } from '../src/services/SiqService';

describe('GameController', () => {
    let controller: GameController;
    let mockStateManager: jest.Mocked<GameStateManager>;
    let mockSyncService: jest.Mocked<SyncService>;
    let mockStorageService: jest.Mocked<StorageService>;
    let mockFileService: jest.Mocked<FileService>;
    let mockSiqService: jest.Mocked<SiqService>;
    let mockAudioController: jest.Mocked<AudioController>;
    let mockVideoController: jest.Mocked<VideoController>;

    beforeEach(() => {
        // Manual mocks with jest.fn() for methods we need to test
        mockStateManager = {
            getState: jest.fn().mockReturnValue({ visible: {} }),
            setPlaying: jest.fn(),
            setVideoPlaying: jest.fn(),
            awardPoints: jest.fn(),
            setVisibility: jest.fn(),
            getCurrentQuestion: jest.fn(),
        } as unknown as jest.Mocked<GameStateManager>;

        mockSyncService = {
            syncState: jest.fn(),
            toggleSnow: jest.fn(),
            triggerConfetti: jest.fn(),
            triggerAnimation: jest.fn(),
            triggerTitleAnimation: jest.fn(),
            sendMediaAction: jest.fn(),
        } as unknown as jest.Mocked<SyncService>;

        mockStorageService = {
            saveGameState: jest.fn(),
            loadSnowEnabled: jest.fn(),
            saveSnowEnabled: jest.fn(),
        } as unknown as jest.Mocked<StorageService>;

        mockFileService = {
            getFiles: jest.fn(),
        } as unknown as jest.Mocked<FileService>;

        mockSiqService = {
            parseSiq: jest.fn(),
        } as unknown as jest.Mocked<SiqService>;

        mockAudioController = {
            toggle: jest.fn(),
        } as unknown as jest.Mocked<AudioController>;

        mockVideoController = {
            toggle: jest.fn(),
            isPlaying: jest.fn(),
            pause: jest.fn(),
            setSource: jest.fn(),
        } as unknown as jest.Mocked<VideoController>;

        controller = new GameController(
            mockStateManager,
            mockSyncService,
            mockStorageService,
            mockFileService,
            mockSiqService,
            mockAudioController,
            mockVideoController
        );
    });

    it('should toggle audio', () => {
        mockAudioController.toggle.mockReturnValue(true);

        controller.dispatch({ type: 'TOGGLE_AUDIO' });

        expect(mockAudioController.toggle).toHaveBeenCalled();
        expect(mockStateManager.setPlaying).toHaveBeenCalledWith(true);
        expect(mockSyncService.syncState).toHaveBeenCalled();
    });

    it('should toggle video', () => {
        mockVideoController.toggle.mockReturnValue(true);

        controller.dispatch({ type: 'TOGGLE_VIDEO' });

        expect(mockVideoController.toggle).toHaveBeenCalled();
        expect(mockStateManager.setVideoPlaying).toHaveBeenCalledWith(true);
        expect(mockSyncService.syncState).toHaveBeenCalled();
    });

    it('should award points', () => {
        mockStateManager.getState.mockReturnValue({ currentQuestionId: 'q1' } as any);
        mockStateManager.awardPoints.mockReturnValue(true);

        controller.dispatch({
            type: 'AWARD_POINTS',
            payload: { playerId: 1, multiplier: 'full' }
        });

        expect(mockStateManager.awardPoints).toHaveBeenCalledWith(1, 'q1', 'full');
        expect(mockSyncService.syncState).toHaveBeenCalled();
        expect(mockStorageService.saveGameState).toHaveBeenCalled();
    });

    it('should reveal media', () => {
        mockStateManager.getCurrentQuestion.mockReturnValue({ type: 'mashup' } as any);

        controller.dispatch({ type: 'REVEAL_MEDIA', payload: 'music' });

        expect(mockStateManager.setVisibility).toHaveBeenCalledWith({ music: true });
        expect(mockSyncService.triggerAnimation).toHaveBeenCalledWith('music');
        expect(mockSyncService.syncState).toHaveBeenCalled();
    });

    it('should show answer', () => {
        mockStateManager.getCurrentQuestion.mockReturnValue({ type: 'text' } as any);

        controller.dispatch({ type: 'SHOW_ANSWER' });

        expect(mockStateManager.setVisibility).toHaveBeenCalledWith({ question: false, answer: true });
        expect(mockSyncService.triggerAnimation).toHaveBeenCalledWith('answer');
        expect(mockSyncService.syncState).toHaveBeenCalled();
    });

    it('should switch video source on answer if available', () => {
        const mockQuestion = { id: 'q1', type: 'video' };
        mockStateManager.getCurrentQuestion.mockReturnValue(mockQuestion as any);

        const mockFiles = { answerVideo: new File([], 'answer.mp4', { type: 'video/mp4' }) };
        mockFileService.getFiles.mockReturnValue(mockFiles as any);

        // Mock URL.createObjectURL
        global.URL.createObjectURL = jest.fn(() => 'blob:url');

        controller.dispatch({ type: 'SHOW_ANSWER' });

        expect(mockFileService.getFiles).toHaveBeenCalledWith('q1');
        expect(mockVideoController.setSource).toHaveBeenCalledWith('blob:url');
        expect(mockStateManager.setVisibility).toHaveBeenCalledWith({ question: false, answer: true });
    });
});
