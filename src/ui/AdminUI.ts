/**
 * Admin UI Component
 * Single Responsibility: Managing admin panel UI
 */

import { BaseUI } from './BaseUI';
import { GameState, Player, Question } from '../types/index';
import { getTypeIcon, getTypeName } from '../utils/helpers';
import { t } from '../utils/i18n';
import { GameController } from '../services/GameController';

export class AdminUI extends BaseUI {
    constructor(containerId: string, private gameController: GameController) {
        super(containerId);
    }
    /**
     * Render players list
     */
    renderPlayers(
        players: Player[],
        onNameChange: (id: number, name: string) => void,
        onScoreChange: (id: number, score: number) => void,
        onRemove: (id: number) => void
    ): void {
        const container = document.getElementById('admin-players');
        const select = document.getElementById('winner-select') as HTMLSelectElement;
        if (!container || !select) return;

        const oldValue = select.value;
        container.innerHTML = '';
        select.innerHTML = `<option value="">${t('select_player')}</option>`;

        players.forEach((player) => {
            const row = document.createElement('div');
            row.className = 'player-row';

            const nameInput = document.createElement('input');
            nameInput.className = 'player-name-input';
            nameInput.value = player.name;
            nameInput.placeholder = t('player_name');
            nameInput.addEventListener('change', () => {
                onNameChange(player.id, nameInput.value);
            });

            const scoreInput = document.createElement('input');
            scoreInput.type = 'number';
            scoreInput.className = 'score-input';
            scoreInput.value = String(player.score);
            scoreInput.addEventListener('change', () => {
                onScoreChange(player.id, parseInt(scoreInput.value, 10) || 0);
            });

            const removeBtn = document.createElement('button');
            removeBtn.className = 'player-remove-btn';
            removeBtn.title = t('remove_player') || 'Удалить игрока';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => {
                onRemove(player.id);
            });

            row.appendChild(nameInput);
            row.appendChild(scoreInput);
            row.appendChild(removeBtn);
            container.appendChild(row);

            const option = document.createElement('option');
            option.value = player.id.toString();
            option.textContent = player.name;
            select.appendChild(option);
        });

        select.value = oldValue;
    }

    /**
     * Render grid view
     */
    renderGrid(questions: Question[], onQuestionClick: (id: string) => void): void {
        const container = document.getElementById('grid-view');
        if (!container) return;

        const load_folder_prompt = "Load folder with a game"
        const folder_structure_title = "Folder structure:"
        const folder_example_theme = "Sport"
        const folder_example_cat = "Sport"

        if (questions.length === 0) {
            container.innerHTML = `
        <div style="width:100%; text-align:center; padding:50px; color:#555;">
          <h3>${load_folder_prompt}</h3>
          <p><strong>${folder_structure_title}</strong></p>
          <ul style="text-align:left; display:inline-block; color:#888;">
            <li><strong>root/</strong></li>
            <li style="padding-left:20px;">├── <strong>round1/</strong></li>
            <li style="padding-left:40px;">│   ├── ${folder_example_theme} - 100/</li>
            <li style="padding-left:40px;">│   ├── ${folder_example_cat} - 200/</li>
            <li style="padding-left:40px;">│   └── ...</li>
            <li style="padding-left:20px;">├── <strong>round2/</strong></li>
            <li style="padding-left:40px;">│   └── ...</li>
          </ul>
        </div>
      `;
            return;
        }

        // Preserve original category order from question list (no alphabetical sort)
        const categoryOrder: string[] = [];
        const categories: { [key: string]: Question[] } = {};
        questions.forEach((q) => {
            if (!categories[q.category]) {
                categories[q.category] = [];
                categoryOrder.push(q.category);
            }
            categories[q.category].push(q);
        });

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display: flex; flex-wrap: wrap; gap: 30px; align-items: flex-start;';

        categoryOrder.forEach((categoryName) => {
                const categoryBlock = document.createElement('div');
                categoryBlock.className = 'category-block';

                const catTitle = document.createElement('div');
                catTitle.className = 'cat-title';
                catTitle.textContent = ` ${categoryName} `;
                categoryBlock.appendChild(catTitle);

                const cardsRow = document.createElement('div');
                cardsRow.className = 'cards-row';

                categories[categoryName].forEach((question) => {
                    const specialIcon = question.specialType
                        ? question.specialType === 'cat'
                            ? '🐱'
                            : question.specialType === 'bet'
                                ? '💰'
                                : question.specialType === 'auction'
                                    ? '🔨'
                                    : question.specialType === 'special'
                                        ? '🎁'
                                        : '❓'
                        : '';

                    const card = document.createElement('div');
                    card.className = `game-card ${question.played ? 'played' : ''}`;
                    card.innerHTML = `${question.score} ${specialIcon}<small style="font-size:0.5em;">${getTypeIcon(question.type)}</small>`;
                    card.addEventListener('click', () => onQuestionClick(question.id));
                    cardsRow.appendChild(card);
                });

                categoryBlock.appendChild(cardsRow);
                wrapper.appendChild(categoryBlock);
            });

        container.innerHTML = '';
        container.appendChild(wrapper);
    }

    /**
     * Render game info
     */
    renderGameInfo(state: GameState): void {
        const panel = document.getElementById('game-info-panel');
        const nameEl = document.getElementById('game-package-name');

        if (panel && nameEl) {
            if (state.packageName) {
                panel.classList.remove('hidden');
                nameEl.textContent = state.packageName;
                nameEl.title = state.packageName;
            } else {
                panel.classList.add('hidden');
            }
        }
    }

    /**
     * Update question panel
     */
    updateQuestionPanel(question: Question, answerVisible: boolean = false): void {
        const typePanel = document.getElementById('admin-question-type');
        const contentPanel = document.getElementById('admin-question-content');
        const answerPanel = document.getElementById('admin-answer-content');

        if (!typePanel || !contentPanel || !answerPanel) return;

        const typeNameMap: Record<string, string> = {
            mashup: t('question_type_mashup'),
            audio: t('question_type_audio'),
            video: t('question_type_video'),
            text: t('question_type_text'),
        };

        typePanel.innerHTML = `
      ${getTypeIcon(question.type)} ${t('question_type_label')} 
      <span class="type-${question.type} question-type-badge">${typeNameMap[question.type] || getTypeName(question.type)}</span>
    `;

        // Hide all panels first
        document.getElementById('mashup-preview')?.classList.add('hidden');
        document.getElementById('audio-controls')?.classList.add('hidden');
        document.getElementById('video-controls')?.classList.add('hidden');
        document.getElementById('question-controls')?.classList.add('hidden');

        switch (question.type) {
            case 'mashup':
                document.getElementById('mashup-preview')?.classList.remove('hidden');
                document.getElementById('audio-controls')?.classList.remove('hidden');
                document.getElementById('question-controls')?.classList.remove('hidden');
                contentPanel.innerHTML = `
          <div class="question-content">
            <h4>${t('question_mashup')}</h4>
            <p>${t('audio_label')} ${question.audioFileName || 'audio.mp3'}</p>
          </div>
        `;
                break;

            case 'audio':
                document.getElementById('audio-controls')?.classList.remove('hidden');
                document.getElementById('question-controls')?.classList.remove('hidden');
                contentPanel.innerHTML = `
          <div class="question-content">
            <h4>${t('question_audio')}</h4>
            ${question.question ? `<p><strong>${t('question_label')}</strong> ${question.question}</p>` : ''}
            <p>${t('audio_file')} ${question.audioFileName || 'audio.mp3'}</p>
          </div>
        `;
                break;

            case 'video':
                document.getElementById('video-controls')?.classList.remove('hidden');
                document.getElementById('question-controls')?.classList.remove('hidden');
                contentPanel.innerHTML = `
          <div class="question-content">
            <h4>${t('question_video')}</h4>
            ${question.question ? `<p><strong>${t('question_label')}</strong> ${question.question}</p>` : ''}
            <p>${t('video_file')} ${question.videoFileName || 'video.mp4'}</p>
          </div>
        `;
                break;

            case 'text':
                document.getElementById('question-controls')?.classList.remove('hidden');
                let textQuestionHTML = `
          <div class="question-content">
            <h4>${t('question_text')}</h4>
            <p>${question.question || t('question_not_specified')}</p>`;

                // Show question media if exists
                if (question.questionImageUrl) {
                    textQuestionHTML += `<img src="${question.questionImageUrl}" class="preview-img" style="margin-top:10px; max-width:100%;">`;
                }
                if (question.questionVideoUrl) {
                    textQuestionHTML += `<video src="${question.questionVideoUrl}" controls style="margin-top:10px; max-width:100%;"></video>`;
                }
                if (question.questionAudioUrl) {
                    textQuestionHTML += `<audio src="${question.questionAudioUrl}" controls style="margin-top:10px; width:100%;"></audio>`;
                }

                textQuestionHTML += `</div>`;
                contentPanel.innerHTML = textQuestionHTML;
                break;

            case 'select':
                document.getElementById('question-controls')?.classList.remove('hidden');
                let selectHTML = `
          <div class="question-content">
            <h4>${t('question_select')}</h4>
            <p>${question.question || t('question_not_specified')}</p>`;

                if (question.answerOptions) {
                    selectHTML += `<div class="answer-options-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:15px;">`;
                    question.answerOptions.forEach(opt => {
                        selectHTML += `<div class="answer-option" style="padding:10px; background:rgba(255,255,255,0.1); border-radius:4px; border:1px solid rgba(255,255,255,0.2)">${opt}</div>`;
                    });
                    selectHTML += `</div>`;
                }

                // Show media if exists
                if (question.questionImageUrl) selectHTML += `<img src="${question.questionImageUrl}" class="preview-img" style="margin-top:10px; max-width:100%;">`;
                if (question.questionVideoUrl) selectHTML += `<video src="${question.questionVideoUrl}" controls style="margin-top:10px; max-width:100%;"></video>`;
                if (question.questionAudioUrl) selectHTML += `<audio src="${question.questionAudioUrl}" controls style="margin-top:10px; width:100%;"></audio>`;

                selectHTML += `</div>`;
                contentPanel.innerHTML = selectHTML;
                break;
        }

        // Determine if video controls should be shown:
        // 1. If it's a video question - always show controls (TVScreen falls back to question video if no answer video)
        // 2. If there is an answerVideoUrl and answer IS visible (we are playing the answer video)
        const isVideoQuestion = question.type === 'video';
        const isAnswerVideo = Boolean(question.answerVideoUrl) && answerVisible;

        if (isVideoQuestion || isAnswerVideo) {
            document.getElementById('video-controls')?.classList.remove('hidden');
        } else {
            document.getElementById('video-controls')?.classList.add('hidden');
            const tvVideo = document.getElementById('tv-video-player') as HTMLVideoElement | null;
            if (tvVideo) { tvVideo.src = ''; tvVideo.load(); }
        }

        // Answer panel is always visible in admin (GM needs to see it)
        // For mashup, use answer or fallback to audioFileName
        const answerText = question.type === 'mashup'
            ? (question.answer || question.audioFileName || t('answer_not_specified'))
            : (question.answer || t('answer_not_specified'));

        let answerHTML = `
      <div class="answer-content">
        <h4>${t('answer')}</h4>
        <p>${answerText}</p>`;

        // Show answer media if exists
        if (question.answerImageUrl) {
            answerHTML += `<img src="${question.answerImageUrl}" class="preview-img" style="margin-top:10px; max-width:100%;">`;
        }
        if (question.answerVideoUrl) {
            // Video plays via the video-controls panel; just indicate it's present
            answerHTML += `<div style="margin-top:10px; padding:10px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.2); border-radius:6px; color:#aaa; font-size:0.9em;">🎬 ${t('answer_has_video') || 'Answer video — use ▶ controls to play'}</div>`;
        }
        if (question.answerAudioUrl) {
            answerHTML += `<audio src="${question.answerAudioUrl}" controls style="margin-top:10px; width:100%;"></audio>`;
        }

        answerHTML += `</div>`;
        answerPanel.innerHTML = answerHTML;
        answerPanel.classList.remove('hidden');
    }

    /**
     * Update round selector
     */
    renderRoundSelector(
        roundNames: string[],
        currentRound: string,
        onRoundChange: (roundName: string) => void
    ): void {
        const container = document.getElementById('round-selector');
        const panel = document.getElementById('round-control-panel');
        if (!container || !panel) return;

        container.innerHTML = '';
        roundNames.forEach((roundName) => {
            const btn = document.createElement('button');
            const isActive = currentRound === roundName;
            btn.className = `btn ${isActive ? 'btn-main active' : 'btn-ghost'} round-tab`;
            btn.textContent = roundName;
            btn.onclick = () => {
                if (onRoundChange) {
                    onRoundChange(roundName);
                }
            };
            container.appendChild(btn);
        });

        panel.classList.toggle('hidden', roundNames.length === 0);
    }

    /**
     * Show load status
     */
    showLoadStatus(message: string, isSuccess: boolean = false): void {
        const status = document.getElementById('load-status');
        if (!status) return;

        status.innerText = message;
        status.style.color = isSuccess ? '#4CAF50' : '#888';
    }
}

// Global handlers for inline event handlers
declare global {
    interface Window {
        adminUIHandlers?: {
            onNameChange?: (id: number, name: string) => void;
            onScoreChange?: (id: number, score: number) => void;
            onRemove?: (id: number) => void;
            onQuestionClick?: (id: string) => void;
            onRoundChange?: (roundName: string) => void;
        };
    }
}
