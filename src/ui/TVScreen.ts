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
    const isFinalRound = state.roundTypes?.[state.currentRoundName] === 'final';

    if (state.mode === 'GRID') {
      if (isFinalRound) {
        this.renderFinalRound(state, grid, round, normalQuestion, specialPreview);
      } else {
        this.renderGrid(state, grid, round, normalQuestion, specialPreview);
      }
    } else if (state.mode === 'ROUND') {
      this.renderRound(state, grid, round, normalQuestion, specialPreview);
    } else if (state.mode === 'RESULTS') {
      this.renderResults(state, grid, round, normalQuestion, specialPreview);
    } else {
      // Default
      if (isFinalRound) {
        this.renderFinalRound(state, grid, round, normalQuestion, specialPreview);
      } else {
        this.renderGrid(state, grid, round, normalQuestion, specialPreview);
      }
    }

    // Handle round transition animation
    this.handleRoundTransition(state);
  }

  /**
   * Render results selection (Podium)
   */
  private renderResults(
    state: GameState,
    grid: HTMLElement,
    round: HTMLElement,
    normalQuestion: HTMLElement | null,
    specialPreview: HTMLElement | null
  ): void {
    const resultsContainer = document.getElementById('tv-results-container');
    const finalRoundView = document.getElementById('tv-final-round');
    if (!resultsContainer) return;

    // Toggle visibility
    grid.classList.add('hidden');
    round.classList.add('hidden');
    if (normalQuestion) normalQuestion.classList.add('hidden');
    if (specialPreview) specialPreview.classList.add('hidden');
    if (finalRoundView) finalRoundView.classList.add('hidden');
    resultsContainer.classList.remove('hidden');

    // Sort players by score
    const players = [...state.players].sort((a, b) => b.score - a.score);

    // Group players by score
    const scoreGroups: { score: number, players: Player[] }[] = [];
    players.forEach(p => {
      const lastGroup = scoreGroups[scoreGroups.length - 1];
      if (lastGroup && lastGroup.score === p.score) {
        lastGroup.players.push(p);
      } else {
        scoreGroups.push({ score: p.score, players: [p] });
      }
    });

    // Assign ranks (Gold, Silver, Bronze)
    interface RankingGroup {
      rank: number;
      players: Player[];
      placeClass: number; // 1, 2, 3 for style
    }

    const podiumGroups: RankingGroup[] = [];
    const loserPlayers: Player[] = [];

    // We only care about visual "steps": Step 1 (Winner), Step 2, Step 3
    // Any remaining groups are losers
    scoreGroups.forEach((group, index) => {
      if (index < 3) {
        podiumGroups.push({
          rank: index + 1,
          players: group.players,
          placeClass: index + 1
        });
      } else {
        loserPlayers.push(...group.players);
      }
    });

    // Default podium order: Rank 2 (Left), Rank 1 (Center), Rank 3 (Right)
    const visualOrder: RankingGroup[] = [];

    // 2nd Place (Left) logic: Exists if we have rank 2
    const rank2 = podiumGroups.find(g => g.rank === 2);
    if (rank2) visualOrder.push(rank2);

    // 1st Place (Center) logic: Exists if we have rank 1
    const rank1 = podiumGroups.find(g => g.rank === 1);
    if (rank1) visualOrder.push(rank1);

    // 3rd Place (Right) logic: Exists if we have rank 3
    const rank3 = podiumGroups.find(g => g.rank === 3);
    if (rank3) visualOrder.push(rank3);

    // Build HTML
    let html = `
      <div class="winners-arch">
        <div class="arch-text">${t('winners_title')}</div>
      </div>
      <div class="podium">
    `;

    visualOrder.forEach(group => {
      const place = group.placeClass; // 1, 2, 3

      let headContent = '';
      if (place === 1) headContent = '😎';
      else if (place === 2) headContent = '🙂';
      else if (place === 3) headContent = '🥴';

      // Render characters container
      let charsHtml = `<div style="display:flex; justify-content:center; gap:5px;">`;
      group.players.forEach(p => {
        let actionExtras = '';
        // 3rd Place: add champagne bottle div (medal is CSS pseudo-element)
        if (place === 3) {
          actionExtras = `<div class="action-item">🍾</div>`;
        }

        charsHtml += `
            <div class="character character-${place}">
                <div class="head">${headContent}</div>
                <div class="body"></div>
                ${actionExtras}
            </div>
            `;
      });
      charsHtml += `</div>`;

      // Render info card (combined)
      const names = group.players.map(p => `<span class="res-name-item color-${p.id}">${p.name}</span>`).join(', ');

      let infoHtml = `
            <div class="player-info-card">
                <div class="res-name">${names}</div>
                <div class="res-score">${group.players[0].score}</div>
            </div>
      `;

      html += `
        <div class="place-column place-${place}">
            ${charsHtml}
            <div class="pedestal">
                <div class="pedestal-number">${place}</div>
            </div>
            <div class="info-container">
                ${infoHtml}
            </div>
        </div>
        `;
    });

    html += `</div>`;

    // Render Crowd
    if (loserPlayers.length > 0) {
      html += `<div class="losers-crowd">`;
      loserPlayers.forEach((p, i) => {
        html += `
            <div class="loser-item" style="--i: ${i}">
                <div class="head">😐</div>
                <div class="body"></div>
                <div class="res-name color-${p.id}">${p.name}</div>
                <div class="res-score">${p.score}</div>
            </div>
            `;
      });
      html += `</div>`;
    }

    // Add confettif for celebration if just switched
    // We could trigger confetti here but TVScreen creates new fireworks usually.
    // Let's add built-in confetti logic if available or just keep it simple.

    // Add effects
    html += `
    <div class="orchestra">
      <div class="musician-char"><div class="head">🙂</div><div class="body"></div><div class="instrument">🎻</div></div>
      <div class="musician-char"><div class="head">🙂</div><div class="body"></div><div class="instrument">🎻</div></div>
      <div class="musician-char"><div class="head">🙂</div><div class="body"></div><div class="instrument">🎺</div></div>
      <div class="musician-char"><div class="head">🙂</div><div class="body"></div><div class="instrument">🎷</div></div>
    </div>
    
    <div class="paparazzi-group">
      <div class="flash" style="top:20%; left:10%; animation-delay:0s"></div>
      <div class="flash" style="top:40%; left:80%; animation-delay:1s"></div>
      <div class="flash" style="top:70%; left:30%; animation-delay:2s"></div>
      <div class="flash" style="top:10%; left:70%; animation-delay:1.5s"></div>
      <div class="flash" style="top:60%; left:20%; animation-delay:0.5s"></div>
      <div class="flash" style="top:30%; left:90%; animation-delay:2.5s"></div>
    </div>

    <div class="confetti-container">
      ${Array.from({ length: 50 }).map(() => {
      const left = Math.random() * 100;
      const delay = Math.random() * 4;
      const duration = 3 + Math.random() * 2;
      const bg = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f'][Math.floor(Math.random() * 6)];
      return `<div class="confetti-piece" style="left:${left}%; animation-delay:${delay}s; animation-duration:${duration}s; background:${bg};"></div>`
    }).join('')}
    </div>
    `;

    resultsContainer.innerHTML = html;
  }

  /**
   * Render Final Round
   */
  private renderFinalRound(
    state: GameState,
    grid: HTMLElement,
    round: HTMLElement,
    normalQuestion: HTMLElement | null,
    specialPreview: HTMLElement | null
  ): void {
    const finalRoundView = document.getElementById('tv-final-round');
    if (!finalRoundView) return;

    // Toggle visibility
    grid.classList.add('hidden');
    round.classList.add('hidden');
    if (normalQuestion) normalQuestion.classList.add('hidden');
    if (specialPreview) specialPreview.classList.add('hidden');
    finalRoundView.classList.remove('hidden');

    // Get current round questions
    const currentRound = state.currentRoundName
      ? state.rounds[state.currentRoundName] || []
      : [];

    // Render themes
    finalRoundView.innerHTML = '';

    const container = document.createElement('div');
    container.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 30px;
    `;

    const title = document.createElement('h1');
    title.textContent = 'ФИНАЛ';
    title.style.cssText = `
        font-size: 4em;
        color: var(--accent);
        text-shadow: 0 0 20px rgba(3, 218, 198, 0.5);
        margin-bottom: 20px;
    `;
    container.appendChild(title);

    const themesGrid = document.createElement('div');
    themesGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        width: 100%;
        max-width: 1200px;
        justify-content: center;
    `;

    currentRound.forEach(q => {
      const isBanned = state.bannedThemes.includes(q.category);
      const themeEl = document.createElement('div');
      themeEl.textContent = q.category;
      themeEl.style.cssText = `
            background: ${isBanned ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.1)'};
            padding: 30px;
            text-align: center;
            font-size: 2em;
            border-radius: 15px;
            border: 2px solid ${isBanned ? '#555' : 'var(--accent)'};
            color: ${isBanned ? '#777' : '#fff'};
            text-decoration: ${isBanned ? 'line-through' : 'none'};
            transition: all 0.5s ease;
            opacity: ${isBanned ? '0.5' : '1'};
        `;
      themesGrid.appendChild(themeEl);
    });

    container.appendChild(themesGrid);
    finalRoundView.appendChild(container);
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
   * Stop all media (video and audio)
   */
  private stopMedia(): void {
    const video = document.getElementById('tv-video-player') as HTMLVideoElement;
    if (video) {
      video.pause();
    }
    // Stop round specific media if any
    const roundMediaElements = document.querySelectorAll('#tv-round video, #tv-round audio');
    roundMediaElements.forEach((el) => {
      (el as HTMLMediaElement).pause();
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
    // Stop any playing media when returning to grid
    this.stopMedia();

    const finalRoundView = document.getElementById('tv-final-round');
    const resultsContainer = document.getElementById('tv-results-container');

    grid.classList.remove('hidden');
    round.classList.add('hidden');
    if (finalRoundView) finalRoundView.classList.add('hidden');
    if (resultsContainer) resultsContainer.classList.add('hidden');
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
    const finalRoundView = document.getElementById('tv-final-round');

    grid.classList.add('hidden');
    if (finalRoundView) finalRoundView.classList.add('hidden');
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

    if (categoryEl) categoryEl.textContent = currentQuestion.category || t('no_category');

    // Check if final round
    const isFinalRound = state.roundTypes?.[currentQuestion.round] === 'final';

    const roundInfo = document.getElementById('tv-round-info');
    if (roundInfo) {
      if (isFinalRound) {
        // Only show category - the structure is Category — Score баллов
        roundInfo.innerHTML = `<span id="tv-round-category">${currentQuestion.category || t('no_category')}</span><span id="tv-round-score" class="hidden"></span>`;
      } else {
        // Normal layout
        roundInfo.innerHTML = `<span id="tv-round-category">${currentQuestion.category || t('no_category')}</span> — <span id="tv-round-score">${(currentQuestion.score || 0)}</span> баллов`;
      }
    }

    // Update UI for question type
    this.updateUIForQuestionType(currentQuestion, state);

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
  private updateUIForQuestionType(question: Question, state: GameState): void {
    const visible = state.visible || {};

    const qType = question.type || 'mashup';
    // Get roundData from window (set by LOAD_ROUND_DATA message)
    const roundData = (window as any).roundData || this.roundData;

    // Hide all content types ONLY if they are not the current one
    ['mashup', 'audio', 'video', 'text'].forEach((t) => {
      // For 'select' type, we use the 'text' container
      const containerType = qType === 'select' ? 'text' : qType;
      if (t !== containerType) {
        const el = document.getElementById(`tv-${t}-content`);
        if (el) el.classList.add('hidden');
      }
    });

    // Show current type
    const activeContainerType = qType === 'select' ? 'text' : qType;
    const currentContent = document.getElementById(`tv-${activeContainerType}-content`);
    if (currentContent) {
      if (currentContent.classList.contains('hidden')) {
        currentContent.classList.remove('hidden');
        // Trigger entrance animation only if it was hidden
        currentContent.classList.remove('animate-entrance');
        void currentContent.offsetWidth; // Trigger reflow
        currentContent.classList.add('animate-entrance');
      }
    }

    switch (qType) {
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

        if (audioQuestion) {
          const text = question.question || '';
          audioQuestion.textContent = text;
          // Hide question text if question is not visible or text is empty
          audioQuestion.classList.toggle('hidden', !visible.question || !text.trim());
        }
        if (audioAnswer) {
          const text = question.answer || '';
          audioAnswer.textContent = text;
          audioAnswer.classList.toggle('hidden', !visible.answer || !text.trim());
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

        const hasMainVideo = !!roundData?.video;
        const hasAnswerVideo = !!roundData?.answerVideo;

        // Manage main video player visibility
        // We show it for the question (if exists) OR for the answer (if answer has video)
        const mainVideoPlayer = document.querySelector('#tv-video-content .video-player');
        if (mainVideoPlayer) {
          const showPlayer = (visible.question && hasMainVideo) || (visible.answer && hasAnswerVideo);
          mainVideoPlayer.classList.toggle('hidden', !showPlayer);
        }

        if (videoQuestion) {
          const text = question.question || '';
          videoQuestion.textContent = text;
          videoQuestion.classList.toggle('hidden', !visible.question || !text.trim());
        }
        if (videoAnswer) {
          const text = question.answer || '';
          videoAnswer.textContent = text;
          videoAnswer.classList.toggle('hidden', !visible.answer || !text.trim());
        }

        // Update question media (suppress if main video is used)
        this.updateMediaContainer(videoQuestionMedia, undefined, undefined, undefined, visible.question && !hasMainVideo, false);

        // Update answer media (suppress if answer video is used in main player)
        this.updateMediaContainer(videoAnswerMedia, undefined, undefined, undefined, visible.answer && !hasAnswerVideo, true);

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

        if (textQuestion) {
          const text = question.question || '';
          textQuestion.textContent = text;
          textQuestion.classList.toggle('hidden', !visible.question || !text.trim());
        }
        if (textAnswer) {
          const text = question.answer || '';
          textAnswer.textContent = text;
          textAnswer.classList.toggle('hidden', !visible.answer || !text.trim());
        }

        this.updateMediaContainer(textQuestionMedia, undefined, undefined, undefined, visible.question, false);
        this.updateMediaContainer(textAnswerMedia, undefined, undefined, undefined, visible.answer, true);

        // Ensure options are hidden in plain text mode (cleaning up from potential previous 'select' mode)
        const textSelectCleanup = document.getElementById('tv-select-options');
        if (textSelectCleanup) {
          textSelectCleanup.classList.add('hidden');
          textSelectCleanup.innerHTML = '';
        }
        break;

      case 'select':
        const selectQuestion = document.getElementById('tv-text-question');
        const selectAnswer = document.getElementById('tv-text-answer');
        const selectOptions = document.getElementById('tv-select-options');
        const selectQuestionMedia = document.getElementById('tv-text-question-media');
        const selectAnswerMedia = document.getElementById('tv-text-answer-media');

        if (selectQuestion) {
          const text = question.question || '';
          selectQuestion.textContent = text;
          selectQuestion.classList.toggle('hidden', !visible.question || !text.trim());
        }

        if (selectOptions) {
          selectOptions.innerHTML = '';
          if (roundData?.answerOptions && Array.isArray(roundData.answerOptions)) {
            const grid = document.createElement('div');
            grid.className = 'tv-options-grid';
            roundData.answerOptions.forEach((opt: string) => {
              const el = document.createElement('div');
              el.className = 'tv-option';
              el.textContent = opt;
              grid.appendChild(el);
            });
            selectOptions.appendChild(grid);
            selectOptions.classList.toggle('hidden', !visible.question);
          } else {
            selectOptions.classList.add('hidden');
          }
        }

        if (selectAnswer) {
          const text = question.answer || '';
          selectAnswer.textContent = text;
          selectAnswer.classList.toggle('hidden', !visible.answer || !text.trim());
        }

        this.updateMediaContainer(selectQuestionMedia, undefined, undefined, undefined, visible.question, false);
        this.updateMediaContainer(selectAnswerMedia, undefined, undefined, undefined, visible.answer, true);
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
    // Fallback to roundData.audio/video if specific question/answer fields are missing
    let roundImage = isAnswerContainer ? roundData?.answerImage : roundData?.questionImage;
    let roundVideo = isAnswerContainer ? roundData?.answerVideo : roundData?.questionVideo;
    let roundAudio = (isAnswerContainer ? roundData?.answerAudio : roundData?.questionAudio) || roundData?.audio;

    // If this is the main video content area, priority is different
    if (container.id.includes('video')) {
      roundVideo = roundData?.video || roundVideo;
    }

    // Priority: image > video > audio
    if (roundImage) {
      const img = document.createElement('img');
      img.src = roundImage;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '60vh';
      img.style.objectFit = 'contain';
      img.style.margin = '10px auto';
      img.style.display = 'block';
      container.appendChild(img);
    } else if (roundVideo) {
      const video = document.createElement('video');
      video.id = container.id === 'tv-video-question-media' ? 'tv-round-video' : '';
      video.src = roundVideo;
      video.controls = true;
      video.style.maxWidth = '100%';
      video.style.maxHeight = '60vh';
      video.style.margin = '10px auto';
      video.style.display = 'block';

      container.appendChild(video);
    } else if (roundAudio) {
      const audio = document.createElement('audio');
      // Use a recognizable ID for the current round audio
      audio.id = 'tv-round-audio';
      audio.src = roundAudio;
      audio.controls = false;
      audio.style.display = 'none';

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
    const visible = state.visible || {};

    // Determine correct video source: answer video if answer is visible, otherwise question video
    const videoSrc = (visible.answer && roundData?.answerVideo) ? roundData.answerVideo : roundData?.video;

    if (videoSrc) {
      // Only update src if it's different to avoid reloading
      if (tvVideo.src !== videoSrc) {
        tvVideo.src = videoSrc;
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
