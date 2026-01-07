/**
 * Game State Manager
 * Single Responsibility: Managing game state and providing state operations
 */

import {
  GameState,
  Player,
  Question,
  Rounds,
  VisibilityState,
  SpecialType,
} from '../types/index';
import { APP_VERSION } from '../types/constants';

export class GameStateManager {
  private state: GameState;

  constructor() {
    this.state = this.createInitialState();
  }

  /**
   * Get current state
   */
  getState(): GameState {
    return { ...this.state };
  }

  /**
   * Update state
   */
  updateState(updates: Partial<GameState>): void {
    this.state = {
      ...this.state,
      ...updates,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Set rounds
   */
  setRounds(rounds: Rounds, roundNames: string[]): void {
    this.state.rounds = rounds;
    this.state.roundNames = roundNames;
    if (roundNames.length > 0 && !roundNames.includes(this.state.currentRoundName)) {
      this.state.currentRoundName = roundNames[0];
    }
    this.state.lastUpdated = Date.now();
  }

  /**
   * Set players
   */
  setPlayers(players: Player[]): void {
    this.state.players = players;
    this.state.lastUpdated = Date.now();
  }

  /**
   * Add player
   */
  addPlayer(name?: string): Player {
    const existingNames = this.state.players.map((p) => p.name.toLowerCase());
    let playerNumber = 1;
    while (existingNames.includes(`игрок ${playerNumber}`)) {
      playerNumber++;
    }

    const player: Player = {
      id: Date.now() + Math.random(),
      name: name || `Игрок ${playerNumber}`,
      score: 0,
    };

    this.state.players.push(player);
    this.state.lastUpdated = Date.now();
    return player;
  }

  /**
   * Remove player
   */
  removePlayer(id: number): boolean {
    if (this.state.players.length <= 1) {
      return false;
    }

    const index = this.state.players.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.state.players.splice(index, 1);
      this.state.lastUpdated = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Update player name
   */
  updatePlayerName(id: number, name: string): void {
    const player = this.state.players.find((p) => p.id === id);
    if (player) {
      player.name = name || 'Без имени';
      this.state.lastUpdated = Date.now();
    }
  }

  /**
   * Update player score
   */
  updatePlayerScore(id: number, score: number): void {
    const player = this.state.players.find((p) => p.id === id);
    if (player) {
      player.score = score;
      this.state.lastUpdated = Date.now();
    }
  }

  /**
   * Award points to player
   */
  awardPoints(playerId: number, questionId: string, multiplier: 'full' | 'half' | 'minus'): boolean {
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return false;

    const question = this.findQuestion(questionId);
    if (!question) return false;

    if (multiplier === 'full') {
      player.score += question.score;
    } else if (multiplier === 'half') {
      player.score += Math.floor(question.score / 2);
    } else if (multiplier === 'minus') {
      player.score -= question.score;
    }

    this.state.lastUpdated = Date.now();
    return true;
  }

  /**
   * Set current question
   */
  setCurrentQuestion(questionId: string | null): void {
    this.state.currentQuestionId = questionId;
    if (questionId) {
      const question = this.findQuestion(questionId);
      if (question) {
        this.state.currentRoundName = question.round;
      }
    }
    this.state.lastUpdated = Date.now();
  }

  /**
   * Set game mode
   */
  setMode(mode: 'GRID' | 'ROUND'): void {
    this.state.mode = mode;
    this.state.lastUpdated = Date.now();
  }

  /**
   * Set current round name
   */
  setCurrentRoundName(roundName: string): void {
    if (this.state.roundNames.includes(roundName)) {
      this.state.currentRoundName = roundName;
      this.state.lastUpdated = Date.now();
    }
  }

  /**
   * Set visibility state
   */
  setVisibility(visible: Partial<VisibilityState>): void {
    this.state.visible = {
      ...this.state.visible,
      ...visible,
    };
    this.state.lastUpdated = Date.now();
  }

  /**
   * Set playing state
   */
  setPlaying(isPlaying: boolean): void {
    this.state.isPlaying = isPlaying;
    this.state.lastUpdated = Date.now();
  }

  /**
   * Set video playing state
   */
  setVideoPlaying(isPlaying: boolean): void {
    this.state.isVideoPlaying = isPlaying;
    this.state.lastUpdated = Date.now();
  }

  /**
   * Set special mode
   */
  setSpecialMode(mode: SpecialType): void {
    this.state.specialMode = mode;
    this.state.lastUpdated = Date.now();
  }

  /**
   * Mark question as played
   */
  markQuestionPlayed(questionId: string, played: boolean): void {
    const question = this.findQuestion(questionId);
    if (question) {
      question.played = played;
      this.state.lastUpdated = Date.now();
    }
  }

  /**
   * Find question by ID
   */
  findQuestion(questionId: string): Question | null {
    for (const roundName in this.state.rounds) {
      const question = this.state.rounds[roundName].find((q) => q.id === questionId);
      if (question) return question;
    }
    return null;
  }

  /**
   * Get current question
   */
  getCurrentQuestion(): Question | null {
    if (!this.state.currentQuestionId) return null;
    return this.findQuestion(this.state.currentQuestionId);
  }

  /**
   * Get current round questions
   */
  getCurrentRoundQuestions(): Question[] {
    return this.state.rounds[this.state.currentRoundName] || [];
  }

  /**
   * Reset state
   */
  reset(): void {
    this.state = this.createInitialState();
  }

  /**
   * Create initial state
   */
  private createInitialState(): GameState {
    return {
      rounds: {},
      players: [],
      mode: 'GRID',
      currentRoundId: null,
      currentQuestionId: null,
      visible: {
        music: false,
        text: false,
        question: false,
        answer: false,
      },
      isPlaying: false,
      isVideoPlaying: false,
      version: APP_VERSION,
      lastUpdated: Date.now(),
      loadedFolder: null,
      currentRoundName: 'round1',
      roundNames: [],
      specialMode: null,
    };
  }
}
