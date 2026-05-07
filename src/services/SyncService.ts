/**
 * Sync Service - handles BroadcastChannel communication
 * Single Responsibility: Managing state synchronization between admin and TV screens
 */

import { GameState, BroadcastMessage, RoundData, VideoSyncEvent, SpecialPreviewData } from '../types/index';
import { ISyncProvider } from './sync/ISyncProvider';
import { BroadcastChannelProvider } from './sync/BroadcastChannelProvider';
import { PeerSyncProvider } from './sync/PeerSyncProvider';

export class SyncService {
  private providers: ISyncProvider[] = [];
  private onMessageCallback?: (message: BroadcastMessage) => void;

  constructor() {
    // Initialize default provider
    this.addProvider(new BroadcastChannelProvider());
  }

  /**
   * Initialize PeerJS synchronization
   */
  /**
   * Whether a PeerSyncProvider has already been initialised
   */
  private peerProvider: PeerSyncProvider | null = null;

  async initPeerSync(): Promise<string> {
    // Guard: reuse existing provider instead of creating a second one
    if (this.peerProvider) {
      return this.peerProvider.getPeerId();
    }
    this.peerProvider = new PeerSyncProvider();
    this.addProvider(this.peerProvider);
    return this.peerProvider.getPeerId();
  }

  /**
   * Add a synchronization provider
   */
  addProvider(provider: ISyncProvider): void {
    this.providers.push(provider);

    // If we already have a message listener, subscribe the new provider
    if (this.onMessageCallback) {
      provider.onMessage(this.onMessageCallback);
    }
  }

  /**
   * Broadcast message to all providers
   */
  private broadcast(message: BroadcastMessage): void {
    this.providers.forEach(p => p.send(message));
  }

  /**
   * Send game state to TV screen
   */
  syncState(state: GameState): void {
    this.broadcast({
      type: 'STATE',
      state,
    });
  }

  /**
   * Send round data to TV screen
   */
  sendRoundData(data: RoundData): void {
    this.broadcast({
      type: 'LOAD_ROUND_DATA',
      data,
    });
  }

  /**
   * Request state sync from admin
   */
  requestSync(): void {
    this.broadcast({
      type: 'REQUEST_SYNC',
    });
  }

  /**
   * Send animation trigger
   */
  triggerAnimation(card: 'music' | 'text' | 'question' | 'answer'): void {
    this.broadcast({
      type: 'ANIMATE',
      card,
    });
  }

  /**
   * Send title animation trigger
   */
  triggerTitleAnimation(): void {
    this.broadcast({
      type: 'ANIMATE_TITLE',
    });
  }

  /**
   * Send confetti trigger
   */
  triggerConfetti(): void {
    this.broadcast({
      type: 'CONFETTI',
    });
  }

  /**
   * Send snow toggle
   */
  toggleSnow(enabled: boolean): void {
    this.broadcast({
      type: 'TOGGLE_SNOW',
      enabled,
    });
  }

  /**
   * Send video sync event
   */
  syncVideo(event: VideoSyncEvent): void {
    this.broadcast({
      type: 'VIDEO_SYNC',
      ...event,
    });
  }

  /**
   * Send special preview
   */
  sendSpecialPreview(data: SpecialPreviewData): void {
    this.broadcast({
      type: 'SPECIAL_PREVIEW',
      data,
    });
  }

  /**
   * Send media action (play/pause)
   */
  sendMediaAction(action: 'play' | 'pause'): void {
    this.broadcast({
      type: 'MEDIA_ACTION',
      action,
    });
  }

  /**
   * Send toggle fullscreen
   */
  sendToggleFullscreen(): void {
    this.broadcast({ type: 'TOGGLE_FULLSCREEN' });
  }

  /**
   * Subscribe to messages
   */
  onMessage(callback: (message: BroadcastMessage) => void): void {
    this.onMessageCallback = callback;
    this.providers.forEach(p => p.onMessage(callback));
  }

  /**
   * Close channel and reset all state
   */
  close(): void {
    this.providers.forEach(p => p.close());
    this.providers = [];
    this.peerProvider = null;
    this.onMessageCallback = undefined;
  }
}
