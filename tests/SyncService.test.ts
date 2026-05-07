import { SyncService } from '../src/services/SyncService';
import { ISyncProvider } from '../src/services/sync/ISyncProvider';
import { BroadcastMessage } from '../src/types';

// Mock BroadcastChannelProvider
const mockDefaultProvider = {
    send: jest.fn(),
    onMessage: jest.fn(),
    close: jest.fn(),
};

jest.mock('../src/services/sync/BroadcastChannelProvider', () => {
    return {
        BroadcastChannelProvider: jest.fn().mockImplementation(() => mockDefaultProvider),
    };
});

// Mock PeerSyncProvider
const mockPeerProvider = {
    getPeerId: jest.fn().mockResolvedValue('peer-id-123'),
    send: jest.fn(),
    onMessage: jest.fn(),
    close: jest.fn(),
};

jest.mock('../src/services/sync/PeerSyncProvider', () => {
    return {
        PeerSyncProvider: jest.fn().mockImplementation(() => mockPeerProvider),
    };
});

describe('SyncService', () => {
    let service: SyncService;
    let mockProvider: jest.Mocked<ISyncProvider>;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        service = new SyncService();

        // Create a manual mock provider
        mockProvider = {
            send: jest.fn(),
            onMessage: jest.fn(),
            close: jest.fn(),
        };
    });

    it('should broadcast messages to all providers', () => {
        service.addProvider(mockProvider);

        const state = { mode: 'GRID' } as any;
        service.syncState(state);

        // Check default provider
        expect(mockDefaultProvider.send).toHaveBeenCalledWith(expect.objectContaining({
            type: 'STATE',
            state,
        }));

        // Check added provider
        expect(mockProvider.send).toHaveBeenCalledWith(expect.objectContaining({
            type: 'STATE',
            state,
        }));
    });

    it('should subscribe to messages from all providers', () => {
        const callback = jest.fn();
        service.addProvider(mockProvider);

        service.onMessage(callback);

        expect(mockDefaultProvider.onMessage).toHaveBeenCalledWith(callback);
        expect(mockProvider.onMessage).toHaveBeenCalledWith(callback);
    });

    it('should subscribe provider when added after onMessage', () => {
        const callback = jest.fn();
        service.onMessage(callback);

        service.addProvider(mockProvider);

        expect(mockProvider.onMessage).toHaveBeenCalledWith(callback);
    });

    it('should close all providers', () => {
        service.addProvider(mockProvider);

        service.close();

        expect(mockDefaultProvider.close).toHaveBeenCalled();
        expect(mockProvider.close).toHaveBeenCalled();
    });

    it('should initialize peer sync', async () => {
        const id = await service.initPeerSync();

        expect(id).toBe('peer-id-123');

        // Verify it receives broadcasts
        const state = { mode: 'GRID' } as any;
        service.syncState(state);

        expect(mockPeerProvider.send).toHaveBeenCalledWith(expect.objectContaining({
            type: 'STATE',
            state,
        }));
    });
});
