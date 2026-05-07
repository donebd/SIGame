import Peer, { DataConnection } from 'peerjs';
import { ISyncProvider } from './ISyncProvider';
import { BroadcastMessage } from '../../types/index';
import { PEER_HOST, PEER_PORT } from '../../config';

/**
 * PeerJS Provider
 * Implements synchronization using WebRTC via PeerJS
 * Used for communication between devices (e.g., Desktop <-> Mobile)
 */
export class PeerSyncProvider implements ISyncProvider {
    private peer: Peer;
    private connections: Map<string, DataConnection> = new Map();
    private onMessageCallback?: (message: BroadcastMessage) => void;

    constructor(id?: string) {
        const peerConfig = {
            host: PEER_HOST,
            port: PEER_PORT,
            path: '/'
        };

        if (id) {
            this.peer = new Peer(id, peerConfig);
        } else {
            this.peer = new Peer(peerConfig);
        }

        this.peer.on('open', (id) => {
            console.log('PeerJS initialized with ID:', id);
        });

        this.peer.on('connection', (conn) => {
            this.handleConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.error('PeerJS error:', err);
        });
    }

    /**
     * Get the Peer ID of this client.
     * Rejects if PeerJS emits an error before the connection is established.
     */
    public getPeerId(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.peer.id) { resolve(this.peer.id); return; }

            const onOpen = (id: string) => { cleanup(); resolve(id); };
            const onError = (err: Error) => { cleanup(); reject(err); };
            const cleanup = () => {
                this.peer.off('open', onOpen);
                this.peer.off('error', onError);
            };

            this.peer.on('open', onOpen);
            this.peer.on('error', onError);
        });
    }

    /**
     * Handle incoming connection
     */
    private handleConnection(conn: DataConnection) {
        conn.on('open', () => {
            console.log('PeerJS connection opened:', conn.peer);
            this.connections.set(conn.peer, conn);
        });

        conn.on('data', (data) => {
            // Runtime guard: data comes from the network and could be anything
            if (this.onMessageCallback && typeof data === 'object' && data !== null && 'type' in data) {
                this.onMessageCallback(data as BroadcastMessage);
            } else {
                console.warn('PeerSyncProvider: received unexpected data shape', data);
            }
        });

        conn.on('close', () => {
            console.log('PeerJS connection closed:', conn.peer);
            this.connections.delete(conn.peer);
        });

        conn.on('error', (err) => {
            console.error('PeerJS connection error:', err);
            this.connections.delete(conn.peer);
        });
    }

    /**
     * Send message to all connected peers
     */
    send(message: BroadcastMessage): void {
        this.connections.forEach((conn) => {
            if (conn.open) {
                conn.send(message);
            }
        });
    }

    /**
     * Subscribe to messages
     */
    onMessage(callback: (message: BroadcastMessage) => void): void {
        this.onMessageCallback = callback;
    }

    /**
     * Close connection
     */
    close(): void {
        this.connections.forEach((conn) => conn.close());
        this.connections.clear();
        this.peer.destroy();
    }
}
