import { ISyncProvider } from './ISyncProvider';
import { BroadcastMessage } from '../../types/index';
import { BROADCAST_CHANNEL_NAME } from '../../types/constants';

/**
 * BroadcastChannel Provider
 * Implements synchronization using the Broadcast Channel API
 * Used for communication between tabs/windows on the same device
 */
export class BroadcastChannelProvider implements ISyncProvider {
    private channel: BroadcastChannel;

    constructor() {
        this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    }

    /**
     * Send message
     */
    send(message: BroadcastMessage): void {
        this.channel.postMessage(message);
    }

    /**
     * Subscribe to messages
     */
    onMessage(callback: (message: BroadcastMessage) => void): void {
        this.channel.onmessage = (event: MessageEvent) => {
            const message = event.data as BroadcastMessage;
            callback(message);
        };
    }

    /**
     * Close connection
     */
    close(): void {
        this.channel.close();
    }
}
