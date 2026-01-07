/**
 * Storage Service - handles localStorage operations
 * Single Responsibility: Managing game state persistence
 */

import {
  GameState,
  SerializedGameState,
  Player,
} from '../types/index';
import { STORAGE_KEYS } from '../types/constants';

export class StorageService {
  /**
   * Save game state to localStorage
   */
  saveGameState(state: GameState): boolean {
    try {
      const serialized = this.serializeState(state);
      localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(serialized));
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(state.players));
      return true;
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      return false;
    }
  }

  /**
   * Load game state from localStorage
   */
  loadGameState(): SerializedGameState | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
      if (!saved) return null;
      return JSON.parse(saved) as SerializedGameState;
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      return null;
    }
  }

  /**
   * Load players from localStorage
   */
  loadPlayers(): Player[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PLAYERS);
      if (!saved) return [];
      return JSON.parse(saved) as Player[];
    } catch (error) {
      console.error('Ошибка загрузки игроков:', error);
      return [];
    }
  }

  /**
   * Save snow enabled state
   */
  saveSnowEnabled(enabled: boolean): void {
    localStorage.setItem(STORAGE_KEYS.SNOW_ENABLED, enabled.toString());
  }

  /**
   * Load snow enabled state
   */
  loadSnowEnabled(): boolean {
    const saved = localStorage.getItem(STORAGE_KEYS.SNOW_ENABLED);
    return saved === 'true';
  }

  /**
   * Clear all game data
   */
  clearAll(): void {
    localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
    localStorage.removeItem(STORAGE_KEYS.PLAYERS);
    localStorage.removeItem(STORAGE_KEYS.SNOW_ENABLED);
  }

  /**
   * Serialize game state for storage (removes blob URLs)
   */
  private serializeState(state: GameState): SerializedGameState {
    const stateCopy = JSON.parse(JSON.stringify(state)) as GameState;
    
    // Remove blob URLs from questions
    for (const roundName in stateCopy.rounds) {
      stateCopy.rounds[roundName] = stateCopy.rounds[roundName].map((question) => {
        const { previewMusic, previewText, audioUrl, videoUrl, ...rest } = question;
        return rest;
      });
    }

    // Calculate statistics
    let totalQuestions = 0;
    let playedQuestions = 0;
    for (const roundName in stateCopy.rounds) {
      totalQuestions += stateCopy.rounds[roundName].length;
      playedQuestions += stateCopy.rounds[roundName].filter((q) => q.played).length;
    }

    const totalScore = stateCopy.players.reduce((sum, p) => sum + p.score, 0);

    return {
      ...stateCopy,
      serializedAt: new Date().toISOString(),
      totalQuestions,
      playedQuestions,
      totalScore,
    };
  }
}
