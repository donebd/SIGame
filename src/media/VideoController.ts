/**
 * Video Controller
 * Single Responsibility: Managing video playback and synchronization
 */

import { formatTime } from '@utils/helpers';
import { VideoSyncState } from '../types/index';

export class VideoController {
  private video: HTMLVideoElement;
  private volume: number = 1;
  private syncState: VideoSyncState;
  private onTimeUpdate?: (currentTime: number, duration: number) => void;
  private onPlay?: () => void;
  private onPause?: () => void;
  private onEnded?: () => void;

  constructor(videoElement: HTMLVideoElement) {
    this.video = videoElement;
    this.syncState = {
      admin: { currentTime: 0, isPlaying: false, playbackRate: 1 },
      tv: { currentTime: 0, isPlaying: false, playbackRate: 1 },
    };
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.video.ontimeupdate = () => {
      if (this.onTimeUpdate && this.video.duration) {
        this.onTimeUpdate(this.video.currentTime, this.video.duration);
      }
      this.syncState.admin.currentTime = this.video.currentTime;
    };

    this.video.onplay = () => {
      this.syncState.admin.isPlaying = true;
      if (this.onPlay) this.onPlay();
    };

    this.video.onpause = () => {
      this.syncState.admin.isPlaying = false;
      if (this.onPause) this.onPause();
    };

    this.video.onended = () => {
      this.syncState.admin.isPlaying = false;
      if (this.onEnded) this.onEnded();
    };

    this.video.onratechange = () => {
      this.syncState.admin.playbackRate = this.video.playbackRate;
    };
  }

  /**
   * Set video source
   */
  setSource(src: string): void {
    this.video.src = src;
  }

  /**
   * Play video
   */
  async play(): Promise<void> {
    try {
      await this.video.play();
    } catch (error) {
      console.error('Ошибка воспроизведения видео:', error);
    }
  }

  /**
   * Pause video
   */
  pause(): void {
    this.video.pause();
  }

  /**
   * Toggle play/pause
   */
  toggle(): boolean {
    if (this.video.paused) {
      this.play();
      return true;
    } else {
      this.pause();
      return false;
    }
  }

  /**
   * Seek to time
   */
  seek(time: number): void {
    this.video.currentTime = time;
  }

  /**
   * Seek relative to current time
   */
  seekRelative(seconds: number): void {
    this.video.currentTime += seconds;
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.video.volume = this.volume;
  }

  /**
   * Get volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Set muted
   */
  setMuted(muted: boolean): void {
    this.video.muted = muted;
  }

  /**
   * Get current time
   */
  getCurrentTime(): number {
    return this.video.currentTime;
  }

  /**
   * Get duration
   */
  getDuration(): number {
    return this.video.duration || 0;
  }

  /**
   * Check if playing
   */
  isPlaying(): boolean {
    return !this.video.paused;
  }

  /**
   * Get sync state
   */
  getSyncState(): VideoSyncState {
    return { ...this.syncState };
  }

  /**
   * Sync from TV (for TV screen)
   */
  syncFromAdmin(data: {
    event: string;
    currentTime: number;
    isPlaying: boolean;
    playbackRate: number;
    volume: number;
  }): void {
    this.video.muted = false;
    this.video.volume = data.volume || 1;

    switch (data.event) {
      case 'play':
        this.video.currentTime = data.currentTime || 0;
        this.play().then(() => {
          if (data.playbackRate) this.video.playbackRate = data.playbackRate;
        });
        break;

      case 'pause':
        this.video.currentTime = data.currentTime || this.video.currentTime;
        this.pause();
        break;

      case 'timeupdate':
        if (Math.abs(this.video.currentTime - data.currentTime) > 0.5) {
          this.video.currentTime = data.currentTime;
        }
        break;

      case 'seek':
        this.video.currentTime = data.currentTime;
        if (data.isPlaying) this.play();
        else this.pause();
        break;

      case 'loaded':
        if (data.currentTime) this.video.currentTime = data.currentTime;
        break;

      case 'ratechange':
        this.video.playbackRate = data.playbackRate || 1;
        break;

      case 'volume':
        this.video.volume = data.volume;
        break;

      case 'ended':
        this.pause();
        this.video.currentTime = 0;
        break;
    }
  }

  /**
   * Set time update callback
   */
  setOnTimeUpdate(callback: (currentTime: number, duration: number) => void): void {
    this.onTimeUpdate = callback;
  }

  /**
   * Set play callback
   */
  setOnPlay(callback: () => void): void {
    this.onPlay = callback;
  }

  /**
   * Set pause callback
   */
  setOnPause(callback: () => void): void {
    this.onPause = callback;
  }

  /**
   * Set ended callback
   */
  setOnEnded(callback: () => void): void {
    this.onEnded = callback;
  }

  /**
   * Format current time
   */
  getFormattedCurrentTime(): string {
    return formatTime(this.video.currentTime);
  }

  /**
   * Format duration
   */
  getFormattedDuration(): string {
    return formatTime(this.video.duration || 0);
  }
}
