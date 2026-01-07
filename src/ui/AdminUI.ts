/**
 * Admin UI Component
 * Single Responsibility: Managing admin panel UI
 */

import { BaseUI } from './BaseUI';
import { GameState, Player, Question } from '../types/index';
import { getTypeIcon, getTypeName } from '../utils/helpers';
import { t } from '../utils/i18n';

export class AdminUI extends BaseUI {
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
      row.innerHTML = `
        <input class="player-name-input" value="${player.name}" 
               onchange="window.adminUIHandlers?.onNameChange(${player.id}, this.value)" 
               placeholder="${t('player_name')}">
        <input type="number" class="score-input" value="${player.score}" 
               onchange="window.adminUIHandlers?.onScoreChange(${player.id}, parseInt(this.value) || 0)">
        <button class="player-remove-btn" onclick="window.adminUIHandlers?.onRemove(${player.id})" 
                title="Удалить игрока">×</button>
      `;
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

    const categories: { [key: string]: Question[] } = {};
    questions.forEach((q) => {
      if (!categories[q.category]) categories[q.category] = [];
      categories[q.category].push(q);
    });

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; flex-wrap: wrap; gap: 30px; align-items: flex-start;';

    Object.keys(categories)
      .sort()
      .forEach((categoryName) => {
        const categoryBlock = document.createElement('div');
        categoryBlock.className = 'category-block';
        let html = `<div class="cat-title"> ${categoryName} </div><div class="cards-row">`;

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

          html += `
            <div class="game-card ${question.played ? 'played' : ''}" 
                 onclick="window.adminUIHandlers?.onQuestionClick('${question.id}')">
              ${question.score} ${specialIcon}
              <small style="font-size:0.5em;">${getTypeIcon(question.type)}</small>
            </div>
          `;
        });

        html += '</div>';
        categoryBlock.innerHTML = html;
        wrapper.appendChild(categoryBlock);
      });

    container.innerHTML = '';
    container.appendChild(wrapper);
  }

  /**
   * Update question panel
   */
  updateQuestionPanel(question: Question): void {
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
      answerHTML += `<video src="${question.answerVideoUrl}" controls style="margin-top:10px; max-width:100%;"></video>`;
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
      btn.className = `btn ${currentRound === roundName ? 'btn-main' : 'btn-ghost'} round-tab`;
      btn.textContent = roundName;
      btn.onclick = () => {
        if (window.adminUIHandlers?.onRoundChange) {
          window.adminUIHandlers.onRoundChange(roundName);
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
