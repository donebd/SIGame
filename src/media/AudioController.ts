/**
 * Audio Controller
 * Single Responsibility: Managing audio playback
 */

import { formatTime } from '@utils/helpers';

export class AudioController {
  private audio: HTMLAudioElement;
  private onTimeUpdate?: (currentTime: number, duration: number) => void;
  private onEnded?: () => void;

  constructor(audioElement: HTMLAudioElement) {
    this.audio = audioElement;
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.audio.ontimeupdate = () => {
      if (this.onTimeUpdate && this.audio.duration) {
        this.onTimeUpdate(this.audio.currentTime, this.audio.duration);
      }
    };

    this.audio.onended = () => {
      if (this.onEnded) {
        this.onEnded();
      }
    };
  }

  /**
   * Set audio source
   */
  setSource(src: string): void {
    this.audio.src = src;
  }

  /**
   * Play audio
   */
  async play(): Promise<void> {
    try {
      await this.audio.play();
    } catch (error) {
      console.error('Ошибка воспроизведения аудио:', error);
    }
  }

  /**
   * Pause audio
   */
  pause(): void {
    this.audio.pause();
  }

  /**
   * Toggle play/pause
   */
  toggle(): boolean {
    if (this.audio.paused) {
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
    this.audio.currentTime = time;
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get current time
   */
  getCurrentTime(): number {
    return this.audio.currentTime;
  }

  /**
   * Get duration
   */
  getDuration(): number {
    return this.audio.duration || 0;
  }

  /**
   * Check if playing
   */
  isPlaying(): boolean {
    return !this.audio.paused;
  }

  /**
   * Set time update callback
   */
  setOnTimeUpdate(callback: (currentTime: number, duration: number) => void): void {
    this.onTimeUpdate = callback;
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
    return formatTime(this.audio.currentTime);
  }

  /**
   * Format duration
   */
  getFormattedDuration(): string {
    return formatTime(this.audio.duration || 0);
  }
}
