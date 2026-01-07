/**
 * Sync Service - handles BroadcastChannel communication
 * Single Responsibility: Managing state synchronization between admin and TV screens
 */

import { GameState, BroadcastMessage, RoundData } from '../types/index';
import { BROADCAST_CHANNEL_NAME } from '../types/constants';

export class SyncService {
  private channel: BroadcastChannel;

  constructor() {
    // Use native BroadcastChannel API
    this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }

  /**
   * Send game state to TV screen
   */
  syncState(state: GameState): void {
    this.channel.postMessage({
      type: 'STATE',
      state,
    } as BroadcastMessage);
  }

  /**
   * Send round data to TV screen
   */
  sendRoundData(data: RoundData): void {
    this.channel.postMessage({
      type: 'LOAD_ROUND_DATA',
      data,
    } as BroadcastMessage);
  }

  /**
   * Request state sync from admin
   */
  requestSync(): void {
    this.channel.postMessage({
      type: 'REQUEST_SYNC',
    } as BroadcastMessage);
  }

  /**
   * Send animation trigger
   */
  triggerAnimation(card: 'music' | 'text' | 'question' | 'answer'): void {
    this.channel.postMessage({
      type: 'ANIMATE',
      card,
    } as BroadcastMessage);
  }

  /**
   * Send title animation trigger
   */
  triggerTitleAnimation(): void {
    this.channel.postMessage({
      type: 'ANIMATE_TITLE',
    } as BroadcastMessage);
  }

  /**
   * Send confetti trigger
   */
  triggerConfetti(): void {
    this.channel.postMessage({
      type: 'CONFETTI',
    } as BroadcastMessage);
  }

  /**
   * Send snow toggle
   */
  toggleSnow(enabled: boolean): void {
    this.channel.postMessage({
      type: 'TOGGLE_SNOW',
      enabled,
    } as BroadcastMessage);
  }

  /**
   * Send video sync event
   */
  syncVideo(event: {
    event: string;
    currentTime: number;
    isPlaying: boolean;
    playbackRate: number;
    volume: number;
    duration: number;
  }): void {
    this.channel.postMessage({
      type: 'VIDEO_SYNC',
      ...event,
    } as BroadcastMessage);
  }

  /**
   * Send special preview
   */
  sendSpecialPreview(data: {
    specialType: string;
    specialTypeName: string;
    specialIcon: string;
    specialDescription: string;
    score: number;
  }): void {
    this.channel.postMessage({
      type: 'SPECIAL_PREVIEW',
      data,
    } as BroadcastMessage);
  }

  /**
   * Subscribe to messages
   */
  onMessage(callback: (message: BroadcastMessage) => void): void {
    this.channel.onmessage = (event: MessageEvent) => {
      // BroadcastChannel sends MessageEvent, extract data
      const message = event.data as BroadcastMessage;
      callback(message);
    };
  }

  /**
   * Close channel
   */
  close(): void {
    this.channel.close();
  }
}
