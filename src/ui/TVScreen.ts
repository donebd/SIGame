/**
 * TV Screen Component
 * Single Responsibility: Managing TV screen rendering and animations
 */

import { BaseUI } from './BaseUI';
import { GameState, Question, Player } from '../types/index';
import { getTypeIcon, getTypeName, getSpecialTypeName, scaleTextToFit } from '../utils/helpers';
import { t } from '../utils/i18n';

export class TVScreen extends BaseUI {
  private roundData: Record<string, unknown> | null = null;
  private animationLock: Record<string, boolean> = {};
  private lastRoundName: string | null = null;

  constructor() {
    super('game-screen');
  }

  /**
   * Render TV screen based on game state
   */
  render(state: GameState): void {
    const grid = document.getElementById('tv-grid');
    const round = document.getElementById('tv-round');
    const scoreboard = document.getElementById('tv-scoreboard');
    const normalQuestion = document.getElementById('tv-normal-question');
    const specialPreview = document.getElementById('tv-special-preview');

    if (!grid || !round || !scoreboard) {
      console.error('TV Screen: Required elements not found', { grid, round, scoreboard });
      return;
    }

    // Render state silently

    // Always render scoreboard (even if empty)
    this.renderScoreboard(state.players || [], scoreboard);

    // Render based on mode
    if (state.mode === 'GRID') {
      this.renderGrid(state, grid, round, normalQuestion, specialPreview);
    } else if (state.mode === 'ROUND') {
      this.renderRound(state, grid, round, normalQuestion, specialPreview);
    } else {
      // Default to grid if mode is not set
      this.renderGrid(state, grid, round, normalQuestion, specialPreview);
    }

    // Handle round transition animation
    this.handleRoundTransition(state);
  }

  /**
   * Handle round transition animation
   */
  private handleRoundTransition(state: GameState): void {
    const currentRoundName = state.currentRoundName;
    if (currentRoundName && currentRoundName !== this.lastRoundName) {
      // If this is not the first render (or we want to show it on first load too, 
      // but usually only on change). Let's show it on change.
      // But valid round names only.
      if (this.lastRoundName !== null) {
        const overlay = document.getElementById('round-transition-overlay');
        const textEl = document.getElementById('round-transition-text');

        if (overlay && textEl) {
          textEl.textContent = currentRoundName;
          overlay.classList.add('visible');

          setTimeout(() => {
            overlay.classList.remove('visible');
          }, 2000);
        }
      }
      this.lastRoundName = currentRoundName;
    }
  }

  /**
   * Render scoreboard
   */
  private renderScoreboard(players: Player[], scoreboard: HTMLElement): void {
    if (!players || players.length === 0) {
      // Show empty scoreboard
      scoreboard.innerHTML = `<div style="text-align:center; padding:20px; color:#666;">${t('no_players_tv')}</div>`;
      return;
    }

    const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    const activeIds = sortedPlayers.map((p) => `player-${p.id}`);

    // Remove old players
    Array.from(scoreboard.children).forEach((child) => {
      if (!activeIds.includes((child as HTMLElement).id)) {
        child.remove();
      }
    });

    // Store old scores for animation
    const oldScores: { [key: string]: number } = {};
    Array.from(scoreboard.children).forEach((child) => {
      const id = (child as HTMLElement).id.replace('player-', '');
      const valEl = child.querySelector('.tv-score-val');
      if (valEl) {
        oldScores[id] = parseInt(valEl.textContent || '0', 10) || 0;
      }
    });

    // Update or create player elements
    sortedPlayers.forEach((p) => {
      let el = document.getElementById(`player-${p.id}`);

      if (!el) {
        el = document.createElement('div');
        el.id = `player-${p.id}`;
        el.className = 'tv-score';
        el.innerHTML = `
          <span class="tv-score-name">${p.name || 'Без имени'}</span>
          <span class="tv-score-val">${p.score || 0}</span>
        `;
        scoreboard.appendChild(el);
        return;
      }

      const nameEl = el.querySelector('.tv-score-name');
      if (nameEl && nameEl.textContent !== p.name) {
        nameEl.textContent = p.name || 'Без имени';
      }

      const scoreEl = el.querySelector('.tv-score-val');
      if (scoreEl) {
        const oldScore = oldScores[p.id.toString()] || 0;
        scoreEl.textContent = (p.score || 0).toString();

        // Animate score change
        if (oldScore !== (p.score || 0)) {
          scoreEl.classList.remove('score-pop-anim');
          requestAnimationFrame(() => {
            const handleAnimationEnd = () => {
              scoreEl!.classList.remove('score-pop-anim');
              scoreEl!.removeEventListener('animationend', handleAnimationEnd);
            };
            scoreEl!.addEventListener('animationend', handleAnimationEnd);
            scoreEl!.classList.add('score-pop-anim');
          });
        }
      }
    });

    // Reorder players by score
    sortedPlayers.forEach((p) => {
      const el = document.getElementById(`player-${p.id}`);
      if (el) {
        scoreboard.appendChild(el);
      }
    });
  }

  /**
   * Render grid mode
   */
  private renderGrid(
    state: GameState,
    grid: HTMLElement,
    round: HTMLElement,
    normalQuestion: HTMLElement | null,
    specialPreview: HTMLElement | null
  ): void {
    grid.classList.remove('hidden');
    round.classList.add('hidden');
    if (normalQuestion) normalQuestion.classList.add('hidden');
    if (specialPreview) specialPreview.classList.add('hidden');

    const currentRound = state.currentRoundName
      ? state.rounds[state.currentRoundName] || []
      : [];

    const categories: { [key: string]: Question[] } = {};
    currentRound.forEach((question) => {
      if (!categories[question.category]) {
        categories[question.category] = [];
      }
      categories[question.category].push(question);
    });

    let gridHTML = '';
    Object.keys(categories)
      .sort()
      .forEach((catName) => {
        gridHTML += `<div class="tv-category"><div class="tv-cat-title">${catName}</div><div class="tv-cat-cards">`;
        categories[catName]
          .sort((a, b) => (a.score || 0) - (b.score || 0))
          .forEach((question) => {
            gridHTML += `
              <div class="tv-card ${question.played ? 'played' : ''}">
                ${question.score || 0}<br>
              </div>
            `;
          });
        gridHTML += '</div></div>';
      });

    grid.innerHTML = gridHTML;
  }

  /**
   * Render round mode
   */
  private renderRound(
    state: GameState,
    grid: HTMLElement,
    round: HTMLElement,
    normalQuestion: HTMLElement | null,
    specialPreview: HTMLElement | null
  ): void {
    const wasHidden = round.classList.contains('hidden');
    grid.classList.add('hidden');
    round.classList.remove('hidden');

    // Animate round info entrance ONLY if it was previously hidden
    if (wasHidden) {
      const roundInfo = round.querySelector('.round-info');
      if (roundInfo) {
        roundInfo.classList.remove('animate-entrance');
        void (roundInfo as HTMLElement).offsetWidth; // Trigger reflow
        roundInfo.classList.add('animate-entrance');
      }
    }

    if (state.specialMode) {
      if (normalQuestion) normalQuestion.classList.add('hidden');
      if (specialPreview) {
        specialPreview.classList.remove('hidden');
        // Special preview should be rendered via SPECIAL_PREVIEW message
        // But we can show a placeholder here
        if (!specialPreview.innerHTML.trim()) {
          specialPreview.innerHTML = `
            <div style="text-align:center; padding:40px;">
              <div style="font-size:6em; margin-bottom:20px;">🎁</div>
              <h1 style="color:var(--accent); margin-bottom:30px; font-size:3em;">
                СПЕЦИАЛЬНЫЙ РАУНД
              </h1>
            </div>
          `;
        }
      }
      return;
    }

    if (normalQuestion) normalQuestion.classList.remove('hidden');
    if (specialPreview) specialPreview.classList.add('hidden');

    if (!state.currentQuestionId) return;

    // Reset mashup images when switching to a new question
    // Check if this is a different question than before
    const musicBox = document.getElementById('tv-box-music');
    const textBox = document.getElementById('tv-box-text');
    if (musicBox) {
      const currentQuestionId = (musicBox as any).dataQuestionId;
      if (currentQuestionId !== state.currentQuestionId) {
        // Reset images for new question
        musicBox.innerHTML = '<div class="cover-placeholder">🎵</div>';
        musicBox.classList.remove('revealed', 'fully-revealed', 'revealing');
        (musicBox as any).dataQuestionId = state.currentQuestionId;
      }
    }
    if (textBox) {
      const currentQuestionId = (textBox as any).dataQuestionId;
      if (currentQuestionId !== state.currentQuestionId) {
        // Reset images for new question
        textBox.innerHTML = '<div class="cover-placeholder">📝</div>';
        textBox.classList.remove('revealed', 'fully-revealed', 'revealing');
        (textBox as any).dataQuestionId = state.currentQuestionId;
      }
    }

    // Find current question
    let currentQuestion: Question | null = null;
    for (const roundName in state.rounds) {
      const found = state.rounds[roundName].find(
        (q) => q.id === state.currentQuestionId
      );
      if (found) {
        currentQuestion = found;
        break;
      }
    }

    if (!currentQuestion) return;

    // Update round info
    const categoryEl = document.getElementById('tv-round-category');
    const scoreEl = document.getElementById('tv-round-score');
    const typeEl = document.getElementById('tv-round-type');

    if (categoryEl) categoryEl.textContent = currentQuestion.category || t('no_category');
    if (scoreEl) scoreEl.textContent = (currentQuestion.score || 0).toString();
    if (typeEl) {
      const typeName = getTypeName(currentQuestion.type);
      const specialName = currentQuestion.specialType ? getSpecialTypeName(currentQuestion.specialType) : '';
      typeEl.innerHTML = `${getTypeIcon(currentQuestion.type)} ${specialName || typeName}`;
    }

    // Update UI for question type
    this.updateUIForQuestionType(currentQuestion, state.visible || {});

    // Apply text scaling
    setTimeout(() => {
      const textElements = [
        document.getElementById('tv-song-title'),
        document.getElementById('tv-audio-question'),
        document.getElementById('tv-audio-answer'),
        document.getElementById('tv-video-question'),
        document.getElementById('tv-video-answer'),
        document.getElementById('tv-text-question'),
        document.getElementById('tv-text-answer'),
      ].filter((el) => el && el.textContent) as HTMLElement[];

      textElements.forEach((el) => {
        scaleTextToFit(el, 85);
      });
    }, 100);

    // Handle specific question types
    if (currentQuestion.type === 'mashup') {
      this.handleMashupType(state);
    } else if (currentQuestion.type === 'audio') {
      this.handleAudioType(state);
    } else if (currentQuestion.type === 'video') {
      this.handleVideoType(state);
    }
  }

  /**
   * Update UI for question type
   */
  private updateUIForQuestionType(question: Question, visible: any): void {
    const type = question.type || 'mashup';

    // Hide all content types ONLY if they are not the current one
    ['mashup', 'audio', 'video', 'text'].forEach((t) => {
      if (t !== type) {
        const el = document.getElementById(`tv-${t}-content`);
        if (el) el.classList.add('hidden');
      }
    });

    // Show current type
    const currentContent = document.getElementById(`tv-${type}-content`);
    if (currentContent) {
      if (currentContent.classList.contains('hidden')) {
        currentContent.classList.remove('hidden');
        // Trigger entrance animation only if it was hidden
        currentContent.classList.remove('animate-entrance');
        void currentContent.offsetWidth; // Trigger reflow
        currentContent.classList.add('animate-entrance');
      }
    }

    switch (type) {
      case 'mashup':
        const title = document.getElementById('tv-song-title');
        if (title) {
          // Always set text, but only show if answer is visible
          title.textContent = question.answer || question.audioFileName || '';
          if (question.answer && question.answer.length > 30) {
            title.classList.add('long-text');
          } else {
            title.classList.remove('long-text');
          }
          if (visible.answer) {
            title.classList.add('visible');
          } else {
            title.classList.remove('visible', 'animated');
          }
        }
        break;

      case 'audio':
        const audioQuestion = document.getElementById('tv-audio-question');
        const audioAnswer = document.getElementById('tv-audio-answer');
        const audioQuestionMedia = document.getElementById('tv-audio-question-media');
        const audioAnswerMedia = document.getElementById('tv-audio-answer-media');

        if (audioQuestion) audioQuestion.textContent = question.question || '';
        if (audioAnswer) {
          audioAnswer.textContent = question.answer || '';
          audioAnswer.classList.toggle('hidden', !visible.answer);
        }

        // Update question media (use roundData, not blob URLs)
        this.updateMediaContainer(audioQuestionMedia, undefined, undefined, undefined, visible.question, false);

        // Update answer media (hidden until answer is revealed, use roundData)
        this.updateMediaContainer(audioAnswerMedia, undefined, undefined, undefined, visible.answer, true);

        [audioQuestion, audioAnswer].forEach((el) => {
          if (el && el.textContent && el.textContent.length > 100) {
            el.classList.add('long-text');
          } else if (el) {
            el.classList.remove('long-text');
          }
        });
        break;

      case 'video':
        const videoQuestion = document.getElementById('tv-video-question');
        const videoAnswer = document.getElementById('tv-video-answer');
        const videoQuestionMedia = document.getElementById('tv-video-question-media');
        const videoAnswerMedia = document.getElementById('tv-video-answer-media');

        if (videoQuestion) videoQuestion.textContent = question.question || '';
        if (videoAnswer) {
          videoAnswer.textContent = question.answer || '';
          videoAnswer.classList.toggle('hidden', !visible.answer);
        }

        // Update question media (use roundData, not blob URLs)
        this.updateMediaContainer(videoQuestionMedia, undefined, undefined, undefined, visible.question, false);

        // Update answer media (hidden until answer is revealed, use roundData)
        this.updateMediaContainer(videoAnswerMedia, undefined, undefined, undefined, visible.answer, true);

        [videoQuestion, videoAnswer].forEach((el) => {
          if (el && el.textContent && el.textContent.length > 100) {
            el.classList.add('long-text');
          } else if (el) {
            el.classList.remove('long-text');
          }
        });
        break;

      case 'text':
        const textQuestion = document.getElementById('tv-text-question');
        const textAnswer = document.getElementById('tv-text-answer');
        const textQuestionMedia = document.getElementById('tv-text-question-media');
        const textAnswerMedia = document.getElementById('tv-text-answer-media');

        if (textQuestion) textQuestion.textContent = question.question || '';
        if (textAnswer) {
          textAnswer.textContent = question.answer || '';
          textAnswer.classList.toggle('hidden', !visible.answer);
        }

        // Update question media (use roundData, not blob URLs)
        this.updateMediaContainer(textQuestionMedia, undefined, undefined, undefined, visible.question, false);

        // Update answer media (hidden until answer is revealed, use roundData)
        this.updateMediaContainer(textAnswerMedia, undefined, undefined, undefined, visible.answer, true);

        [textQuestion, textAnswer].forEach((el) => {
          if (el && el.textContent && el.textContent.length > 100) {
            el.classList.add('long-text');
          } else if (el) {
            el.classList.remove('long-text');
          }
        });
        break;
    }
  }

  /**
   * Handle mashup type
   */
  private handleMashupType(state: GameState): void {
    const viz = document.getElementById('tv-viz');
    if (viz) {
      if (state.isPlaying) {
        viz.classList.add('active');
      } else {
        viz.classList.remove('active');
      }
    }

    // Get roundData from window (set by LOAD_ROUND_DATA message)
    const roundData = (window as any).roundData || this.roundData;

    // Check if question changed - reset images if needed
    const musicBox = document.getElementById('tv-box-music');
    const textBox = document.getElementById('tv-box-text');
    const currentQuestionId = state.currentQuestionId;

    if (musicBox) {
      const storedQuestionId = (musicBox as any).dataQuestionId;
      if (storedQuestionId !== currentQuestionId) {
        // New question - reset
        musicBox.innerHTML = '<div class="cover-placeholder">🎵</div>';
        musicBox.classList.remove('revealed', 'fully-revealed', 'revealing');
        (musicBox as any).dataQuestionId = currentQuestionId;
      }
    }

    if (textBox) {
      const storedQuestionId = (textBox as any).dataQuestionId;
      if (storedQuestionId !== currentQuestionId) {
        // New question - reset
        textBox.innerHTML = '<div class="cover-placeholder">📝</div>';
        textBox.classList.remove('revealed', 'fully-revealed', 'revealing');
        (textBox as any).dataQuestionId = currentQuestionId;
      }
    }

    // Update images - only show if visible flag is true
    if (state.visible?.music && roundData?.music) {
      this.updateTVImage('tv-box-music', true, roundData.music);
    } else if (!state.visible?.music) {
      // Don't show, but keep placeholder if not revealed yet
      if (musicBox && !musicBox.classList.contains('fully-revealed') && !musicBox.classList.contains('revealed')) {
        // Only reset if not already revealed
        this.updateTVImage('tv-box-music', false, null);
      }
    }

    if (state.visible?.text && roundData?.text) {
      this.updateTVImage('tv-box-text', true, roundData.text);
    } else if (!state.visible?.text) {
      // Don't show, but keep placeholder if not revealed yet
      if (textBox && !textBox.classList.contains('fully-revealed') && !textBox.classList.contains('revealed')) {
        // Only reset if not already revealed
        this.updateTVImage('tv-box-text', false, null);
      }
    }

    // Update title
    const title = document.getElementById('tv-song-title');
    if (title) {
      const currentQuestion = this.findCurrentQuestion(state);
      if (currentQuestion) {
        title.textContent = currentQuestion.answer || currentQuestion.audioFileName || '';
      }
      if (state.visible?.answer) {
        title.classList.add('visible');
        if (!title.classList.contains('animated')) {
          this.animateSongTitle();
        }
      } else {
        title.classList.remove('visible', 'animated');
      }
    }
  }

  /**
   * Find current question from state
   */
  private findCurrentQuestion(state: GameState): Question | null {
    if (!state.currentQuestionId) return null;
    for (const roundName in state.rounds) {
      const question = state.rounds[roundName].find(
        (q) => q.id === state.currentQuestionId
      );
      if (question) return question;
    }
    return null;
  }

  /**
   * Update media container (image, video, audio)
   * @param isAnswerContainer - true if this is an answer media container, false for question
   */
  private updateMediaContainer(
    container: HTMLElement | null,
    imageUrl: string | undefined,
    videoUrl: string | undefined,
    audioUrl: string | undefined,
    visible: boolean,
    isAnswerContainer: boolean = false
  ): void {
    if (!container) return;

    container.innerHTML = '';
    container.classList.toggle('hidden', !visible);

    if (!visible) return;

    // Get roundData from window for base64 media
    const roundData = (window as any).roundData || this.roundData;

    // Determine which roundData fields to use based on container type
    const roundImage = isAnswerContainer ? roundData?.answerImage : roundData?.questionImage;
    const roundVideo = isAnswerContainer ? roundData?.answerVideo : roundData?.questionVideo;
    const roundAudio = isAnswerContainer ? roundData?.answerAudio : roundData?.questionAudio;

    // Priority: image > video > audio
    // Use only roundData (base64 data URLs), not blob URLs (they don't work across windows)
    // fileToBase64 already returns data URLs via readAsDataURL
    if (roundImage) {
      const img = document.createElement('img');
      img.src = roundImage; // Already a data URL from fileToBase64
      img.onerror = () => {
        console.error('TVScreen: Failed to load image media');
      };
      img.style.maxWidth = '100%';
      img.style.maxHeight = '60vh';
      img.style.objectFit = 'contain';
      img.style.margin = '10px auto';
      img.style.display = 'block';
      container.appendChild(img);
    } else if (roundVideo) {
      const video = document.createElement('video');
      video.src = roundVideo; // Already a data URL from fileToBase64
      video.onerror = () => {
        console.error('TVScreen: Failed to load video media');
      };
      video.controls = true;
      video.style.maxWidth = '100%';
      video.style.maxHeight = '60vh';
      video.style.margin = '10px auto';
      video.style.display = 'block';
      container.appendChild(video);
    } else if (roundAudio) {
      const audio = document.createElement('audio');
      audio.src = roundAudio; // Already a data URL from fileToBase64
      audio.onerror = () => {
        console.error('TVScreen: Failed to load audio media');
      };
      audio.controls = true;
      audio.style.width = '100%';
      audio.style.margin = '10px auto';
      audio.style.display = 'block';
      container.appendChild(audio);
    }
  }

  /**
   * Handle audio type
   */
  private handleAudioType(state: GameState): void {
    const viz = document.getElementById('tv-audio-viz');
    if (!viz) return;

    viz.innerHTML = '';
    if (state.isPlaying) {
      for (let i = 0; i < 20; i++) {
        const bar = document.createElement('div');
        bar.className = 'audio-bar';
        bar.style.height = `${Math.random() * 80 + 20}px`;
        bar.style.animationDelay = `${i * 0.05}s`;
        viz.appendChild(bar);
      }
    }
  }

  /**
   * Handle video type
   */
  private handleVideoType(state: GameState): void {
    const tvVideo = document.getElementById('tv-video-player') as HTMLVideoElement;
    if (!tvVideo) return;

    // Use roundData from window (set by LOAD_ROUND_DATA message)
    const roundData = (window as any).roundData || this.roundData;
    if (roundData?.video) {
      // Only update src if it's different to avoid reloading
      if (tvVideo.src !== roundData.video) {
        tvVideo.src = roundData.video;
      }
      if (state.isVideoPlaying) {
        tvVideo.play().catch((error) => {
          console.error('TVScreen: Ошибка воспроизведения видео:', error);
        });
      } else {
        tvVideo.pause();
      }
    }
  }

  /**
   * Update TV image (public for external calls)
   */
  updateTVImage(boxId: string, visible: boolean, src: string | null): void {
    const box = document.getElementById(boxId);
    if (!box) return;

    // If not visible and no src, reset to placeholder only if not already revealed
    if (!visible || !src) {
      // Don't reset if already revealed - keep the image visible
      if (box.classList.contains('fully-revealed') || box.classList.contains('revealed')) {
        return;
      }
      box.innerHTML = `<div class="cover-placeholder">${boxId.includes('music') ? '🎵' : '📝'}</div>`;
      box.classList.remove('revealed', 'fully-revealed', 'revealing');
      return;
    }

    // If image already exists and matches, just animate if needed
    const existingImg = box.querySelector('img');
    if (existingImg && existingImg.src === src) {
      if (!box.classList.contains('fully-revealed')) {
        this.animateCardReveal(boxId);
      }
      return;
    }

    // If already revealed, don't reset - just update src if different
    if (box.classList.contains('fully-revealed') || box.classList.contains('revealed')) {
      if (existingImg) {
        existingImg.src = src;
      }
      return;
    }

    // New image - create and animate
    box.innerHTML = '';
    box.classList.remove('revealed', 'fully-revealed', 'revealing');

    const img = document.createElement('img');
    img.src = src;
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.5s ease-in-out';
    box.appendChild(img);

    const placeholder = document.createElement('div');
    placeholder.className = 'cover-placeholder';
    placeholder.innerHTML = boxId.includes('music') ? '🎵' : '📝';
    placeholder.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; justify-content: center; align-items: center;
      font-size: 5em; color: #333; z-index: 1;
    `;
    box.appendChild(placeholder);

    this.animateCardReveal(boxId);
    setTimeout(() => {
      img.style.opacity = '1';
      placeholder.style.opacity = '0';
      placeholder.style.transition = 'opacity 0.3s';
      setTimeout(() => {
        placeholder.style.display = 'none';
      }, 300);
    }, 400);
  }

  /**
   * Animate card reveal
   */
  private animateCardReveal(cardId: string): void {
    const card = document.getElementById(cardId);
    if (!card || this.animationLock[cardId]) return;

    if (card.classList.contains('fully-revealed') || card.classList.contains('revealed')) {
      card.classList.remove('revealing');
      card.classList.add('fully-revealed');
      return;
    }

    this.animationLock[cardId] = true;
    const placeholder = card.querySelector('.cover-placeholder') as HTMLElement;
    if (placeholder) {
      placeholder.style.opacity = '0';
      setTimeout(() => {
        if (placeholder) placeholder.style.display = 'none';
      }, 300);
    }

    card.classList.remove('revealed', 'fully-revealed');
    card.classList.add('revealing');

    setTimeout(() => {
      card.classList.remove('revealing');
      card.classList.add('fully-revealed');
      setTimeout(() => {
        this.animationLock[cardId] = false;
      }, 1000);
    }, 800);
  }

  /**
   * Animate song title
   */
  private animateSongTitle(): void {
    const title = document.getElementById('tv-song-title');
    if (!title) return;

    title.classList.remove('animated');
    void title.offsetWidth; // Force reflow
    title.classList.add('animated');
    setTimeout(() => title.classList.remove('animated'), 800);
  }

  /**
   * Set round data
   */
  setRoundData(data: Record<string, unknown>): void {
    this.roundData = data;
    (window as any).roundData = data;
  }

  /**
   * Render special preview
   */
  renderSpecialPreview(data: {
    specialType: string;
    specialTypeName: string;
    specialIcon: string;
    specialDescription: string;
    score: number;
  }): void {
    const grid = document.getElementById('tv-grid');
    const round = document.getElementById('tv-round');
    const normalQuestion = document.getElementById('tv-normal-question');
    const specialPreview = document.getElementById('tv-special-preview');

    if (!grid || !round || !specialPreview) return;

    grid.classList.add('hidden');
    round.classList.remove('hidden');
    if (normalQuestion) normalQuestion.classList.add('hidden');
    specialPreview.classList.remove('hidden');

    let previewHTML = `
      <div class="special-card-entrance" style="text-align:center; padding:40px;">
        <div style="font-size:6em; margin-bottom:20px;">${data.specialIcon || '❓'}</div>
        <h1 style="color:var(--accent); margin-bottom:30px; font-size:3em;">
          ${data.specialTypeName || 'СПЕЦИАЛЬНЫЙ РАУНД'}
        </h1>`;

    if (data.specialDescription && data.specialDescription.trim()) {
      previewHTML += `
        <div style="background:rgba(0,0,0,0.5); padding:30px; border-radius:15px; margin:30px 0; border:2px solid var(--secondary);">
          <p style="font-size:1.5em; white-space: pre-wrap;">${data.specialDescription}</p>
        </div>`;
    }

    previewHTML += `
      <div style="font-size:2em; color:var(--secondary); margin:30px 0;">
        ${t('points_label')}: <strong>${data.score} ${t('points')}</strong>
      </div>
    </div>`;

    specialPreview.innerHTML = previewHTML;
  }

  /**
   * Trigger confetti
   */
  triggerConfetti(): void {
    const colors = [
      '#ff0000',
      '#00ff00',
      '#0000ff',
      '#ffff00',
      '#ff00ff',
      '#00ffff',
      '#ffffff',
    ];
    const confettiCount = 300;
    const gameScreen = document.getElementById('game-screen');
    if (!gameScreen) return;

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.width = `${Math.random() * 10 + 5}px`;
      confetti.style.height = `${Math.random() * 10 + 5}px`;

      const startX = 50 + (Math.random() - 0.5) * 100;
      confetti.style.position = 'fixed';
      confetti.style.left = `${startX}%`;
      confetti.style.bottom = '0px';
      confetti.style.zIndex = '9996';
      confetti.style.pointerEvents = 'none';

      const driftX = (Math.random() - 0.5) * 300;
      const rise = -(Math.random() * 800 + 100);

      // Set CSS variables - must be set before animation
      confetti.style.setProperty('--confetti-drift-x', `${driftX}px`);
      confetti.style.setProperty('--confetti-rise', `${rise}px`);

      if (Math.random() > 0.5) confetti.style.borderRadius = '50%';

      gameScreen.appendChild(confetti);

      // Force reflow to ensure styles are applied
      void confetti.offsetWidth;

      const duration = 3 + Math.random() * 2;
      const delay = Math.random() * 0.3;

      // Apply animation - use single animation that combines movement and rotation
      confetti.style.animation = `confettiLaunch ${duration}s ease-out ${delay}s forwards`;
      confetti.style.animationFillMode = 'forwards';

      setTimeout(() => {
        if (confetti.parentNode) {
          confetti.parentNode.removeChild(confetti);
        }
      }, (duration + delay) * 1000);
    }
  }
}
