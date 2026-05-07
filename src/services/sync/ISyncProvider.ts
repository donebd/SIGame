import { BroadcastMessage } from '../../types/index';

/**
 * Interface for synchronization providers
 * Decouples transport layer from application logic
 */
export interface ISyncProvider {
    /**
     * Send a message through the provider
     */
    send(message: BroadcastMessage): void;

    /**
     * Subscribe to incoming messages
     */
    onMessage(callback: (message: BroadcastMessage) => void): void;

    /**
     * Close the connection
     */
    close(): void;
}
