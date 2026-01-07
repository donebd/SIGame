/**
 * Main Application Entry Point
 * Orchestrates all components and services
 */

import './styles.css';
import { GameStateManager } from './state/GameState';
import { StorageService } from './services/StorageService';
import { SyncService } from './services/SyncService';
import { FileService } from './services/FileService';
import { AudioController } from './media/AudioController';
import { VideoController } from './media/VideoController';
import { AdminUI } from './ui/AdminUI';
import { TVScreen } from './ui/TVScreen';
import { GameState, Question, FileStorage, RoundData, SerializedGameState, BroadcastMessage } from './types/index';
import { fileToBase64, getSpecialTypeName } from './utils/helpers';
import { setLanguage, getLanguage, t, updateAllTranslations } from './utils/i18n';

// Initialize services
const stateManager = new GameStateManager();
const storageService = new StorageService();
const syncService = new SyncService();
const fileService = new FileService();

// Flag to prevent double processing of folder load
let isFolderLoading = false;

// Check if this is TV screen
const params = new URLSearchParams(window.location.search);
const isGameScreen = params.get('screen') === 'game';

// Initialize UI
let adminUI: AdminUI | null = null;
let tvScreen: TVScreen | null = null;
let audioController: AudioController | null = null;
let videoController: VideoController | null = null;
let fileStorage: FileStorage = {};

// Initialize based on screen type
if (isGameScreen) {
  initTVScreen();
} else {
  initAdminScreen();
}

/**
 * Initialize Admin Screen
 */
function initAdminScreen(): void {
  adminUI = new AdminUI('admin-ui');
  adminUI.show();

  const audioElement = document.getElementById('master-audio') as HTMLAudioElement;
  const videoElement = document.getElementById('master-video') as HTMLVideoElement;
  const videoDisplay = document.getElementById('master-video-display') as HTMLVideoElement;

  if (audioElement) {
    audioController = new AudioController(audioElement);
  }

  if (videoDisplay) {
    videoController = new VideoController(videoDisplay);
  }

  // Load saved state
  const savedPlayers = storageService.loadPlayers();
  if (savedPlayers.length > 0) {
    stateManager.setPlayers(savedPlayers);
  } else {
    stateManager.addPlayer('Игрок 1');
  }

  // Setup event listeners
  setupAdminEventListeners();

  // Setup sync service
  syncService.onMessage((message) => {
    if (message && message.type === 'REQUEST_SYNC') {
      syncService.syncState(stateManager.getState());
    }
  });

  // Auto-save interval
  setInterval(() => {
    const state = stateManager.getState();
    if (Object.keys(state.rounds).length > 0) {
      storageService.saveGameState(state);
    }
  }, 30000);

  // Initialize i18n
  updateAllTranslations();
  
  // Load saved game state
  const savedState = storageService.loadGameState();
  if (savedState) {
    const loadText = getLanguage() === 'ru' 
      ? `Загрузить сохранение от ${new Date(savedState.serializedAt).toLocaleString()}?`
      : `Load save from ${new Date(savedState.serializedAt).toLocaleString()}?`;
    if (confirm(loadText)) {
      loadGameState(savedState);
    }
  }

  // Setup global handlers for inline event handlers in AdminUI
  (window as any).adminUIHandlers = {
    onNameChange: (id: number, name: string) => {
      stateManager.updatePlayerName(id, name);
      renderAdminUI();
      syncService.syncState(stateManager.getState());
    },
    onScoreChange: (id: number, score: number) => {
      stateManager.updatePlayerScore(id, score);
      syncService.syncState(stateManager.getState());
    },
    onRemove: (id: number) => {
      if (stateManager.removePlayer(id)) {
        renderAdminUI();
        syncService.syncState(stateManager.getState());
      }
    },
    onQuestionClick: (id: string) => {
      selectQuestion(id);
    },
    onRoundChange: (roundName: string) => {
      stateManager.setCurrentRoundName(roundName);
      stateManager.setMode('GRID');
      const gridView = document.getElementById('grid-view');
      const roundControl = document.getElementById('round-control');
      if (gridView) gridView.classList.remove('hidden');
      if (roundControl) roundControl.classList.add('hidden');
      renderAdminUI();
      syncService.syncState(stateManager.getState());
    },
  };

  renderAdminUI();
}

/**
 * Initialize TV Screen
 */
function initTVScreen(): void {
  tvScreen = new TVScreen();
  tvScreen.show();

  const adminUIElement = document.getElementById('admin-ui');
  if (adminUIElement) {
    adminUIElement.style.display = 'none';
  }

  // Initialize TV video
  const tvVideo = document.getElementById('tv-video-player') as HTMLVideoElement;
  if (tvVideo) {
    tvVideo.ontimeupdate = () => {
      const current = document.getElementById('tv-video-current');
      const total = document.getElementById('tv-video-total');
      const seekBar = document.getElementById('tv-video-seek-bar') as HTMLInputElement;
      if (current) current.textContent = formatTime(tvVideo.currentTime);
      if (total) total.textContent = formatTime(tvVideo.duration || 0);
      if (seekBar && tvVideo.duration) {
        seekBar.max = tvVideo.duration.toString();
        seekBar.value = tvVideo.currentTime.toString();
      }
    };
  }

  // Setup sync service for TV
  syncService.onMessage((message) => {
    // Handle TV screen messages
    handleTVMessage(message);
  });

  // Initialize animations
  initTVAnimations();

  // Store state in window for reference
  (window as Window & { currentGameState?: GameState; roundData?: Record<string, unknown> }).currentGameState = undefined;
  (window as Window & { currentGameState?: GameState; roundData?: Record<string, unknown> }).roundData = undefined;

  // Request initial sync after a short delay to ensure admin screen is ready
  setTimeout(() => {
    // Request initial state sync
    syncService.requestSync();
  }, 500);
}

/**
 * Setup admin event listeners
 */
function setupAdminEventListeners(): void {
  // File input
  const folderInput = document.getElementById('folder-input') as HTMLInputElement;
  const folderLabel = document.querySelector('label[for="folder-input"]');
  if (folderInput) {
    // Remove any existing listeners to prevent duplicates
    const newInput = folderInput.cloneNode(true) as HTMLInputElement;
    folderInput.parentNode?.replaceChild(newInput, folderInput);
    
    // Add event listener to the new input (only once)
    newInput.addEventListener('change', handleFolderLoad, { once: false });
    
    // Update label click to trigger file input
    if (folderLabel) {
      // Remove existing listeners
      const newLabel = folderLabel.cloneNode(true) as HTMLLabelElement;
      folderLabel.parentNode?.replaceChild(newLabel, folderLabel);
      
      newLabel.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        newInput.click();
      });
    }
  }

  // Buttons
  document.getElementById('add-player-btn')?.addEventListener('click', () => {
    stateManager.addPlayer();
    renderAdminUI();
    syncService.syncState(stateManager.getState());
  });

  document.getElementById('save-btn')?.addEventListener('click', () => {
    storageService.saveGameState(stateManager.getState());
  });

  document.getElementById('load-btn')?.addEventListener('click', () => {
    const saved = storageService.loadGameState();
    if (saved) {
      loadGameState(saved).catch((error) => {
        console.error('Ошибка загрузки состояния:', error);
      });
    }
  });

  // Language toggle
  const updateLangButton = () => {
    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
      const currentLang = getLanguage();
      const span = langToggle.querySelector('span');
      if (span) {
        // Show the language we can switch TO, not the current one
        span.textContent = currentLang === 'ru' ? t('lang_switch_to_en') : t('lang_switch_to_ru');
      }
    }
  };
  
  document.getElementById('lang-toggle')?.addEventListener('click', () => {
    const newLang = getLanguage() === 'ru' ? 'en' : 'ru';
    setLanguage(newLang);
    updateAllTranslations();
    updateLangButton();
    
    // Update snow toggle button text manually (it's dynamic based on state)
    const snowToggle = document.getElementById('snow-toggle');
    if (snowToggle) {
      const isSnowEnabled = localStorage.getItem('lotto_snow_enabled') === 'true';
      const span = snowToggle.querySelector('span');
      if (span) {
        span.textContent = isSnowEnabled ? t('snow') : t('snow_off');
      } else {
        snowToggle.textContent = isSnowEnabled ? t('snow') : t('snow_off');
      }
    }
    
    renderAdminUI();
  });
  
  // Initialize lang button text after DOM is ready
  setTimeout(() => {
    updateLangButton();
  }, 100);

  document.getElementById('reset-btn')?.addEventListener('click', () => {
    if (confirm(t('reset_confirm'))) {
      storageService.clearAll();
      location.reload();
    }
  });

  // TV modal buttons
  document.getElementById('open-tv-btn')?.addEventListener('click', () => {
    const modal = document.getElementById('tv-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  });

  document.getElementById('close-tv-modal')?.addEventListener('click', () => {
    const modal = document.getElementById('tv-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  });

  document.getElementById('open-new-tab')?.addEventListener('click', () => {
    window.open(`${window.location.pathname}?screen=game`, '_blank');
    const modal = document.getElementById('tv-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  });

  document.getElementById('open-popup')?.addEventListener('click', () => {
    const width = 1920;
    const height = 1080;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    window.open(
      `${window.location.pathname}?screen=game`,
      'TVScreen',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no`
    );
    const modal = document.getElementById('tv-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  });

  document.getElementById('open-same')?.addEventListener('click', () => {
    window.location.href = `${window.location.pathname}?screen=game`;
  });

  // Snow toggle
  let snowEnabled = storageService.loadSnowEnabled();
  const snowToggle = document.getElementById('snow-toggle');
  if (snowToggle) {
    const updateSnowText = () => {
      const span = snowToggle.querySelector('span');
      if (span) {
        span.textContent = snowEnabled ? t('snow') : t('snow_off');
      } else {
        snowToggle.textContent = snowEnabled ? t('snow') : t('snow_off');
      }
    };
    updateSnowText();
    snowToggle.addEventListener('click', () => {
      snowEnabled = !snowEnabled;
      storageService.saveSnowEnabled(snowEnabled);
      updateSnowText();
      syncService.toggleSnow(snowEnabled);
    });
  }

  // Back to grid
  document.getElementById('back-to-grid-btn')?.addEventListener('click', () => {
    // Stop audio and video
    if (audioController) {
      audioController.pause();
    }
    if (videoController) {
      videoController.pause();
    }

    // Reset state
    stateManager.setMode('GRID');
    stateManager.setCurrentQuestion(null);
    stateManager.setVisibility({ music: false, text: false, question: false, answer: false });

    // Update UI
    const gridView = document.getElementById('grid-view');
    const roundControl = document.getElementById('round-control');
    if (gridView) gridView.classList.remove('hidden');
    if (roundControl) roundControl.classList.add('hidden');
    
    renderAdminUI();
    syncService.syncState(stateManager.getState());
    storageService.saveGameState(stateManager.getState());
  });

  // Played status checkbox
  const playedCheckbox = document.getElementById('played-status-checkbox') as HTMLInputElement;
  if (playedCheckbox) {
    playedCheckbox.addEventListener('change', (e) => {
      const questionId = stateManager.getState().currentQuestionId;
      if (questionId) {
        stateManager.markQuestionPlayed(questionId, (e.target as HTMLInputElement).checked);
        syncService.syncState(stateManager.getState());
        storageService.saveGameState(stateManager.getState());
      }
    });
  }

  // Audio controls
  setupAudioControls();

  // Video controls
  setupVideoControls();

  // Question controls
  setupQuestionControls();

  // Award buttons
  setupAwardButtons();
}

/**
 * Setup audio controls
 */
function setupAudioControls(): void {
  const playBtn = document.getElementById('play-btn');
  if (playBtn && audioController) {
    playBtn.addEventListener('click', () => {
      const isPlaying = audioController!.toggle();
      stateManager.setPlaying(isPlaying);
      syncService.syncState(stateManager.getState());
      updatePlayButtonText();
    });
  }

  const seekBar = document.getElementById('seek-bar') as HTMLInputElement;
  if (seekBar && audioController) {
    seekBar.addEventListener('input', (e) => {
      audioController!.seek(parseFloat((e.target as HTMLInputElement).value));
    });

    // Update seek bar on time update
    if (audioController) {
      audioController.setOnTimeUpdate((currentTime, duration) => {
        seekBar.max = duration.toString();
        seekBar.value = currentTime.toString();
        const currentEl = document.getElementById('time-current');
        const totalEl = document.getElementById('time-total');
        if (currentEl) currentEl.textContent = audioController!.getFormattedCurrentTime();
        if (totalEl) totalEl.textContent = audioController!.getFormattedDuration();
      });
    }
  }

  const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
  if (volumeSlider && audioController) {
    volumeSlider.addEventListener('input', (e) => {
      audioController!.setVolume(parseFloat((e.target as HTMLInputElement).value));
    });
  }
}

/**
 * Setup video controls
 */
function setupVideoControls(): void {
  const videoPlayBtn = document.getElementById('video-play-btn-small');
  if (videoPlayBtn && videoController) {
    videoPlayBtn.addEventListener('click', () => {
      const isPlaying = videoController!.toggle();
      stateManager.setVideoPlaying(isPlaying);
      syncService.syncState(stateManager.getState());
      updateVideoPlayButtonText();
    });
  }

  const videoSeekBar = document.getElementById('video-seek-bar') as HTMLInputElement;
  if (videoSeekBar && videoController) {
    videoSeekBar.addEventListener('input', (e) => {
      videoController!.seek(parseFloat((e.target as HTMLInputElement).value));
      syncService.syncVideo({
        event: 'seek',
        currentTime: videoController!.getCurrentTime(),
        isPlaying: videoController!.isPlaying(),
        playbackRate: 1,
        volume: videoController!.getVolume(),
        duration: videoController!.getDuration(),
      });
    });

    if (videoController) {
      videoController.setOnTimeUpdate((currentTime, duration) => {
        videoSeekBar.max = duration.toString();
        videoSeekBar.value = currentTime.toString();
        const currentEl = document.getElementById('video-time-current');
        const totalEl = document.getElementById('video-time-total');
        if (currentEl) currentEl.textContent = videoController!.getFormattedCurrentTime();
        if (totalEl) totalEl.textContent = videoController!.getFormattedDuration();
      });
    }
  }

  // Video seek buttons
  document.getElementById('video-seek-back-30')?.addEventListener('click', () => {
    if (videoController) {
      videoController.seekRelative(-30);
      syncService.syncVideo({
        event: 'seek',
        currentTime: videoController.getCurrentTime(),
        isPlaying: videoController.isPlaying(),
        playbackRate: 1,
        volume: videoController.getVolume(),
        duration: videoController.getDuration(),
      });
    }
  });

  document.getElementById('video-seek-back-10')?.addEventListener('click', () => {
    if (videoController) {
      videoController.seekRelative(-10);
      syncService.syncVideo({
        event: 'seek',
        currentTime: videoController.getCurrentTime(),
        isPlaying: videoController.isPlaying(),
        playbackRate: 1,
        volume: videoController.getVolume(),
        duration: videoController.getDuration(),
      });
    }
  });

  document.getElementById('video-seek-forward-10')?.addEventListener('click', () => {
    if (videoController) {
      videoController.seekRelative(10);
      syncService.syncVideo({
        event: 'seek',
        currentTime: videoController.getCurrentTime(),
        isPlaying: videoController.isPlaying(),
        playbackRate: 1,
        volume: videoController.getVolume(),
        duration: videoController.getDuration(),
      });
    }
  });

  document.getElementById('video-seek-forward-30')?.addEventListener('click', () => {
    if (videoController) {
      videoController.seekRelative(30);
      syncService.syncVideo({
        event: 'seek',
        currentTime: videoController.getCurrentTime(),
        isPlaying: videoController.isPlaying(),
        playbackRate: 1,
        volume: videoController.getVolume(),
        duration: videoController.getDuration(),
      });
    }
  });
}

/**
 * Setup question controls
 */
function setupQuestionControls(): void {
  // Reveal music button
  document.getElementById('reveal-music-btn')?.addEventListener('click', () => {
    const question = stateManager.getCurrentQuestion();
    if (!question || question.type !== 'mashup') return;
    
    if (!stateManager.getState().visible.music) {
      stateManager.setVisibility({ music: true });
      syncService.triggerAnimation('music');
      syncService.syncState(stateManager.getState());
      storageService.saveGameState(stateManager.getState());
    }
    
    // Show image in admin panel
    if (question.previewMusic) {
      const img = document.getElementById('admin-img-music') as HTMLImageElement;
      if (img) {
        img.src = question.previewMusic;
        img.style.display = 'block';
      }
    }
  });

  // Reveal text button
  document.getElementById('reveal-text-btn')?.addEventListener('click', () => {
    const question = stateManager.getCurrentQuestion();
    if (!question || question.type !== 'mashup') return;
    
    if (!stateManager.getState().visible.text) {
      stateManager.setVisibility({ text: true });
      syncService.triggerAnimation('text');
      syncService.syncState(stateManager.getState());
      storageService.saveGameState(stateManager.getState());
    }
    
    // Show image in admin panel
    if (question.previewText) {
      const img = document.getElementById('admin-img-text') as HTMLImageElement;
      if (img) {
        img.src = question.previewText;
        img.style.display = 'block';
      }
    }
  });

  // Show question button
  document.getElementById('show-question-btn')?.addEventListener('click', () => {
    const question = stateManager.getCurrentQuestion();
    if (!question || question.type === 'mashup') return;
    
    if (!stateManager.getState().visible.question) {
      stateManager.setVisibility({ question: true });
      syncService.triggerAnimation('question');
      syncService.syncState(stateManager.getState());
      storageService.saveGameState(stateManager.getState());
    }
  });

  // Show answer button
  document.getElementById('show-answer-btn')?.addEventListener('click', () => {
    if (!stateManager.getState().visible.answer) {
      const question = stateManager.getCurrentQuestion();
      stateManager.setVisibility({ answer: true });
      
      if (question && question.type === 'mashup') {
        syncService.triggerTitleAnimation();
      } else {
        syncService.triggerAnimation('answer');
      }
      
      syncService.syncState(stateManager.getState());
      storageService.saveGameState(stateManager.getState());
    }
  });

  // Confetti button
  document.getElementById('confetti-btn')?.addEventListener('click', () => {
    syncService.triggerConfetti();
  });
}

/**
 * Setup award buttons
 */
function setupAwardButtons(): void {
  document.getElementById('award-full-btn')?.addEventListener('click', () => {
    awardPoints('full');
  });

  document.getElementById('award-half-btn')?.addEventListener('click', () => {
    awardPoints('half');
  });

  document.getElementById('award-minus-btn')?.addEventListener('click', () => {
    awardPoints('minus');
  });
}

/**
 * Award points to selected player
 */
function awardPoints(multiplier: 'full' | 'half' | 'minus'): void {
  const winnerSelect = document.getElementById('winner-select') as HTMLSelectElement;
  const questionId = stateManager.getState().currentQuestionId;

  if (!winnerSelect || !questionId) {
    alert('Нет активного вопроса!');
    return;
  }

  const playerIdStr = winnerSelect.value;
  if (!playerIdStr) {
    alert('Выберите игрока!');
    return;
  }

  const playerId = parseFloat(playerIdStr); // Use parseFloat to handle decimal IDs
  if (isNaN(playerId)) {
    alert('Ошибка: неверный ID игрока');
    return;
  }

  const question = stateManager.findQuestion(questionId);
  if (!question) {
    alert('Вопрос не найден!');
    return;
  }

  if (stateManager.awardPoints(playerId, questionId, multiplier)) {
    renderAdminUI();
    syncService.syncState(stateManager.getState());
    storageService.saveGameState(stateManager.getState());
  } else {
    alert(t('award_error'));
  }
}

/**
 * Update play button text
 */
function updatePlayButtonText(): void {
  const playBtn = document.getElementById('play-btn');
  if (playBtn && audioController) {
    playBtn.textContent = audioController.isPlaying() ? '⏸️' : '▶️';
  }
}

/**
 * Update video play button text
 */
function updateVideoPlayButtonText(): void {
  const playBtn = document.getElementById('video-play-btn-small');
  if (playBtn && videoController) {
    playBtn.textContent = videoController.isPlaying() ? '⏸️' : '▶️';
  }
}

/**
 * Handle folder load
 */
async function handleFolderLoad(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  
  // Prevent double processing
  if (isFolderLoading) {
    input.value = ''; // Clear input but don't process
    return;
  }
  
  isFolderLoading = true;
  
  // Update status to loading
  const loadStatus = document.getElementById('load-status');
  if (loadStatus) {
    loadStatus.textContent = t('files_loading');
    loadStatus.style.color = '#03dac6';
  }
  
  try {
    // Store files before clearing input (to prevent double processing)
    const files = Array.from(input.files);
    // Clear input value immediately to prevent browser from asking again
    // This allows selecting the same folder again without double confirmation
    input.value = '';

    // Save current state before loading folder (players, played questions, etc.)
    const currentState = stateManager.getState();
    const savedPlayers = [...currentState.players];
    const savedRoundsState: { [roundName: string]: { [key: string]: boolean } } = {};
    
    // Save played status for each question
    for (const roundName in currentState.rounds) {
      savedRoundsState[roundName] = {};
      currentState.rounds[roundName].forEach((q) => {
        // Use category+score+type as key to match questions
        const key = `${q.category}_${q.score}_${q.type}_${q.specialType || ''}`;
        savedRoundsState[roundName][key] = q.played || false;
      });
    }

    const structure = fileService.parseFileStructure(files);
    const { questions, fileStorage: storage } = await fileService.processFiles(structure);

    fileStorage = storage;

    // Convert to rounds format
    const rounds: { [key: string]: Question[] } = {};
    const roundNames: string[] = [];

    questions.forEach((q) => {
      if (!rounds[q.round]) {
        rounds[q.round] = [];
        roundNames.push(q.round);
      }
      rounds[q.round].push(q);
    });

    // Restore played status from saved state
    for (const roundName in savedRoundsState) {
      if (rounds[roundName]) {
        const savedRoundState = savedRoundsState[roundName];
        rounds[roundName].forEach((q) => {
          const key = `${q.category}_${q.score}_${q.type}_${q.specialType || ''}`;
          if (savedRoundState[key] !== undefined) {
            q.played = savedRoundState[key];
          }
        });
      }
    }

    // Set rounds (this will update state)
    stateManager.setRounds(rounds, roundNames.sort());
    
    // Restore players if they exist
    if (savedPlayers.length > 0) {
      stateManager.setPlayers(savedPlayers);
    }

    // Restore current round if it exists
    if (currentState.currentRoundName && roundNames.includes(currentState.currentRoundName)) {
      stateManager.setCurrentRoundName(currentState.currentRoundName);
    }

    renderAdminUI();
    syncService.syncState(stateManager.getState());
    storageService.saveGameState(stateManager.getState());
    
    // Update load status with success message
    const loadStatus = document.getElementById('load-status');
    if (loadStatus) {
      const totalQuestions = Object.values(rounds).reduce((sum, round) => sum + round.length, 0);
      const roundsCount = roundNames.length;
      loadStatus.textContent = `${t('files_loaded')}: ${roundsCount} ${t('rounds_count')}, ${totalQuestions} ${t('questions_count')}`;
      loadStatus.style.color = '#03dac6';
      loadStatus.removeAttribute('data-i18n'); // Remove i18n attribute since we set custom text
    }
  } catch (error) {
    // Update status on error
    const loadStatus = document.getElementById('load-status');
    if (loadStatus) {
      loadStatus.textContent = t('file_not_selected');
      loadStatus.style.color = '#888';
      loadStatus.setAttribute('data-i18n', 'file_not_selected');
    }
    console.error('Error loading folder:', error);
  } finally {
    // Reset flag after processing is complete
    isFolderLoading = false;
  }
}

/**
 * Load game state
 */
async function loadGameState(savedState: SerializedGameState): Promise<void> {
  // Implementation would restore state from saved data
  // This is simplified
  if (savedState.players) {
    stateManager.setPlayers(savedState.players);
  }
  if (savedState.rounds) {
    stateManager.setRounds(savedState.rounds, savedState.roundNames || []);
  }
  renderAdminUI();
  syncService.syncState(stateManager.getState());
  
  // Show warning about needing to load folder
  showStateRestoreWarning();
}

/**
 * Animate round switch with fade out/in and sequential category appearance
 */
function animateRoundSwitch(callback: () => void): void {
  const gridView = document.getElementById('grid-view');
  if (!gridView) {
    callback();
    return;
  }

  // Fade out
  gridView.style.transition = 'opacity 0.3s ease-out';
  gridView.style.opacity = '0';

  setTimeout(() => {
    callback();
    
    // After callback, fade in and animate categories
    requestAnimationFrame(() => {
      gridView.style.opacity = '1';
      
      // Animate categories appearing one by one
      const categoryBlocks = gridView.querySelectorAll('.category-block');
      categoryBlocks.forEach((block, index) => {
        const categoryElement = block as HTMLElement;
        categoryElement.style.opacity = '0';
        categoryElement.style.transform = 'translateY(20px)';
        categoryElement.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
        
        setTimeout(() => {
          categoryElement.style.opacity = '1';
          categoryElement.style.transform = 'translateY(0)';
        }, index * 100 + 100);
      });
    });
  }, 300);
}

/**
 * Show warning about needing to load folder after state restore
 */
function showStateRestoreWarning(): void {
  const warningDiv = document.createElement('div');
  warningDiv.id = 'state-restore-warning';
  warningDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    color: white;
    padding: 20px 25px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    max-width: 400px;
    animation: slideInRight 0.3s ease-out;
  `;
  warningDiv.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 15px;">
      <div style="font-size: 2em; line-height: 1;">⚠️</div>
      <div style="flex: 1;">
        <h3 style="margin: 0 0 10px 0; font-size: 1.1em;">${t('state_restore_warning_title')}</h3>
        <p style="margin: 0 0 15px 0; line-height: 1.5; font-size: 0.95em;">
          ${t('state_restore_warning_text')}
        </p>
        <button class="btn btn-main" style="width: 100%; padding: 8px;" onclick="this.closest('#state-restore-warning')?.remove()">
          ${t('understand')}
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(warningDiv);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (warningDiv.parentNode) {
      warningDiv.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => warningDiv.remove(), 300);
    }
  }, 10000);
}

/**
 * Render admin UI
 */
function renderAdminUI(): void {
  if (!adminUI) return;

  const state = stateManager.getState();
  const currentRoundQuestions = stateManager.getCurrentRoundQuestions();

  adminUI.renderPlayers(
    state.players,
    (id, name) => {
      stateManager.updatePlayerName(id, name);
      renderAdminUI();
      syncService.syncState(stateManager.getState());
    },
    (id, score) => {
      stateManager.updatePlayerScore(id, score);
      syncService.syncState(stateManager.getState());
    },
    (id) => {
      if (stateManager.removePlayer(id)) {
        renderAdminUI();
        syncService.syncState(stateManager.getState());
      }
    }
  );

  adminUI.renderGrid(currentRoundQuestions, (id) => {
    selectQuestion(id);
  });

  adminUI.renderRoundSelector(
    state.roundNames,
    state.currentRoundName,
    (roundName) => {
      // Animate round switch
      animateRoundSwitch(() => {
        stateManager.setCurrentRoundName(roundName);
        stateManager.setMode('GRID');
        const gridView = document.getElementById('grid-view');
        const roundControl = document.getElementById('round-control');
        if (gridView) gridView.classList.remove('hidden');
        if (roundControl) roundControl.classList.add('hidden');
        renderAdminUI();
        syncService.syncState(stateManager.getState());
      });
    }
  );

  // Update round control visibility
  const roundControl = document.getElementById('round-control');
  if (roundControl) {
    if (state.mode === 'ROUND' && state.currentQuestionId) {
      roundControl.classList.remove('hidden');
      const gridView = document.getElementById('grid-view');
      if (gridView) gridView.classList.add('hidden');
    } else {
      roundControl.classList.add('hidden');
      const gridView = document.getElementById('grid-view');
      if (gridView) gridView.classList.remove('hidden');
    }
  }
}

/**
 * Select question
 */
async function selectQuestion(questionId: string): Promise<void> {
  const question = stateManager.findQuestion(questionId);
  if (!question) return;

  // Reset visibility when selecting new question
  stateManager.setVisibility({ music: false, text: false, question: false, answer: false });

  stateManager.setCurrentQuestion(questionId);
  stateManager.setMode('ROUND');
  stateManager.markQuestionPlayed(questionId, true);

  // Show round control panel (only on admin screen, not TV)
  const gridView = document.getElementById('grid-view');
  const roundControl = document.getElementById('round-control');
  if (gridView) gridView.classList.add('hidden');
  if (roundControl) roundControl.classList.remove('hidden');

  // Handle special types
  if (question.specialType) {
    stateManager.setSpecialMode(question.specialType);
    
    const specialTypeName = question.specialType ? getSpecialTypeName(question.specialType) : '';
    let specialIcon = '';
    if (question.specialType) {
      const iconMap: Record<string, string> = {
        cat: '🐱',
        bet: '💰',
        auction: '🔨',
        special: '🎁',
      };
      specialIcon = iconMap[question.specialType] || '❓';
    }

    let previewHTML = `
      <div style="text-align:center; padding:40px;">
        <div style="font-size:4em; margin-bottom:20px;">${specialIcon}</div>
        <h2 style="color:var(--accent); margin-bottom:20px;">${specialTypeName}</h2>`;

    if (question.specialDescription && question.specialDescription.trim()) {
      previewHTML += `
        <div style="background:#2a2a2a; padding:20px; border-radius:10px; margin:20px 0;">
          <h3>Правила:</h3>
          <p style="white-space: pre-wrap;">${question.specialDescription}</p>
        </div>`;
    } else {
      previewHTML += `
        <div style="background:#2a2a2a; padding:20px; border-radius:10px; margin:20px 0;">
          <h3>Правила:</h3>
          <p>ГМ объясняет правила устно</p>
        </div>`;
    }

    previewHTML += `
      <div style="font-size:1.2em; color:var(--secondary); margin:20px 0;">
        ${t('points_label')}: <strong>${question.score} ${t('points')}</strong>
      </div>
      <button class="btn btn-main btn-lg" id="open-special-question-btn" 
              style="padding:15px 30px; font-size:1.2em;">
        ▶️ Открыть вопрос
      </button>
    </div>`;

    const questionContent = document.getElementById('admin-question-content');
    if (questionContent) {
      questionContent.innerHTML = previewHTML;
    }

    // Hide all other panels
    document.getElementById('mashup-preview')?.classList.add('hidden');
    document.getElementById('audio-controls')?.classList.add('hidden');
    document.getElementById('video-controls')?.classList.add('hidden');
    document.getElementById('question-controls')?.classList.add('hidden');
    document.getElementById('admin-answer-content')?.classList.add('hidden');

    // Setup button handler
    setTimeout(() => {
      document.getElementById('open-special-question-btn')?.addEventListener('click', () => {
        openSpecialQuestion(questionId);
      });
    }, 100);

    // Send to TV
    syncService.sendSpecialPreview({
      specialType: question.specialType,
      specialTypeName: specialTypeName,
      specialIcon: specialIcon,
      specialDescription: question.specialDescription || '',
      score: question.score,
    });

    syncService.syncState(stateManager.getState());
    storageService.saveGameState(stateManager.getState());
    return;
  }

  // Normal question handling
  stateManager.setSpecialMode(null);

  // Update played checkbox
  const playedCheckbox = document.getElementById('played-status-checkbox') as HTMLInputElement;
  if (playedCheckbox) {
    playedCheckbox.checked = question.played;
  }

  // Update round info
  const roundInfo = document.getElementById('current-round-info');
  if (roundInfo) {
    roundInfo.textContent = `${question.category} — ${question.score} ${t('points')}`;
  }

  // Load media
  if (question.type === 'mashup' || question.type === 'audio') {
    if (audioController && question.audioUrl) {
      audioController.setSource(question.audioUrl);
      const trackName = document.getElementById('player-track-name');
      if (trackName) {
        trackName.textContent = question.audioFileName || 'Аудио';
      }
    }
  } else if (question.type === 'video' && question.videoUrl && videoController) {
    videoController.setSource(question.videoUrl);
  }

  // Update mashup preview images - always show in admin
  if (question.type === 'mashup') {
    const musicImg = document.getElementById('admin-img-music') as HTMLImageElement;
    const textImg = document.getElementById('admin-img-text') as HTMLImageElement;
    if (musicImg && question.previewMusic) {
      musicImg.src = question.previewMusic;
      musicImg.style.display = 'block';
    }
    if (textImg && question.previewText) {
      textImg.src = question.previewText;
      textImg.style.display = 'block';
    }
  }

  // Update UI
  if (adminUI) {
    adminUI.updateQuestionPanel(question);
  }

  // Send to TV
  const roundData: RoundData = {
    type: question.type,
    category: question.category,
    score: question.score,
    question: question.question,
    answer: question.answer,
  };

  const files = fileStorage[questionId];
  if (files) {
    // Mashup media
    if (question.type === 'mashup') {
      if (files.music && files.text) {
        roundData.music = await fileToBase64(files.music);
        roundData.text = await fileToBase64(files.text);
      }
      if (files.audio) {
        roundData.audio = await fileToBase64(files.audio);
      }
    }
    
    // Original question media
    if (question.type === 'audio' && files.audio) {
      roundData.audio = await fileToBase64(files.audio);
    }
    if (question.type === 'video' && files.video) {
      roundData.video = await fileToBase64(files.video);
    }
    
    // Question media (for all types)
    if (files.questionImage) {
      roundData.questionImage = await fileToBase64(files.questionImage);
    }
    if (files.questionVideo) {
      roundData.questionVideo = await fileToBase64(files.questionVideo);
    }
    if (files.questionAudio) {
      roundData.questionAudio = await fileToBase64(files.questionAudio);
    }
    
    // Answer media (for all types)
    if (files.answerImage) {
      roundData.answerImage = await fileToBase64(files.answerImage);
    }
    if (files.answerVideo) {
      roundData.answerVideo = await fileToBase64(files.answerVideo);
    }
    if (files.answerAudio) {
      roundData.answerAudio = await fileToBase64(files.answerAudio);
    }
  }

  syncService.sendRoundData(roundData);
  syncService.syncState(stateManager.getState());
  storageService.saveGameState(stateManager.getState());
}

/**
 * Open special question (after preview)
 */
async function openSpecialQuestion(questionId: string): Promise<void> {
  const question = stateManager.findQuestion(questionId);
  if (!question) return;

  stateManager.setSpecialMode(null);
  stateManager.setVisibility({ music: false, text: false, question: false, answer: false });
  stateManager.markQuestionPlayed(questionId, true);

  // Update round info
  const roundInfo = document.getElementById('current-round-info');
  if (roundInfo) {
    roundInfo.textContent = `${question.category} — ${question.score} ${t('points')}`;
  }

  // Load media
  if (question.type === 'mashup' || question.type === 'audio') {
    if (audioController && question.audioUrl) {
      audioController.setSource(question.audioUrl);
      const trackName = document.getElementById('player-track-name');
      if (trackName) {
        trackName.textContent = question.audioFileName || 'Аудио';
      }
    }
  } else if (question.type === 'video' && question.videoUrl && videoController) {
    videoController.setSource(question.videoUrl);
  }

  // Update mashup preview images - always show in admin
  if (question.type === 'mashup') {
    const musicImg = document.getElementById('admin-img-music') as HTMLImageElement;
    const textImg = document.getElementById('admin-img-text') as HTMLImageElement;
    if (musicImg && question.previewMusic) {
      musicImg.src = question.previewMusic;
      musicImg.style.display = 'block';
    }
    if (textImg && question.previewText) {
      textImg.src = question.previewText;
      textImg.style.display = 'block';
    }
  }

  // Update UI
  if (adminUI) {
    adminUI.updateQuestionPanel(question);
  }

  // Send to TV
  const roundData: RoundData = {
    type: question.type,
    category: question.category,
    score: question.score,
    question: question.question,
    answer: question.answer,
  };

  const files = fileStorage[questionId];
  if (files) {
    // Mashup media
    if (question.type === 'mashup') {
      if (files.music && files.text) {
        roundData.music = await fileToBase64(files.music);
        roundData.text = await fileToBase64(files.text);
      }
      if (files.audio) {
        roundData.audio = await fileToBase64(files.audio);
      }
    }
    
    // Original question media
    if (question.type === 'audio' && files.audio) {
      roundData.audio = await fileToBase64(files.audio);
    }
    if (question.type === 'video' && files.video) {
      roundData.video = await fileToBase64(files.video);
    }
    
    // Question media (for all types)
    if (files.questionImage) {
      roundData.questionImage = await fileToBase64(files.questionImage);
    }
    if (files.questionVideo) {
      roundData.questionVideo = await fileToBase64(files.questionVideo);
    }
    if (files.questionAudio) {
      roundData.questionAudio = await fileToBase64(files.questionAudio);
    }
    
    // Answer media (for all types)
    if (files.answerImage) {
      roundData.answerImage = await fileToBase64(files.answerImage);
    }
    if (files.answerVideo) {
      roundData.answerVideo = await fileToBase64(files.answerVideo);
    }
    if (files.answerAudio) {
      roundData.answerAudio = await fileToBase64(files.answerAudio);
    }
  }

  syncService.sendRoundData(roundData);
  setTimeout(() => {
    syncService.syncState(stateManager.getState());
    storageService.saveGameState(stateManager.getState());
  }, 100);
}

/**
 * Handle TV messages
 */
function handleTVMessage(message: BroadcastMessage): void {
  if (!tvScreen) {
    console.warn('TV Screen: tvScreen not initialized');
    return;
  }

  // Process TV screen message

  switch (message.type) {
    case 'STATE':
      // Render game state on TV screen
      if (message.state && typeof message.state === 'object') {
        const gameState = message.state as GameState;
        (window as Window & { currentGameState?: GameState }).currentGameState = gameState;
        tvScreen.render(gameState);
      }
      break;

    case 'LOAD_ROUND_DATA':
    case 'ROUND_DATA':
      // Store round data in window for TV screen access
      if (message.data && typeof message.data === 'object') {
        const roundData = message.data as Record<string, unknown>;
        (window as Window & { roundData?: Record<string, unknown> }).roundData = roundData;
        tvScreen.setRoundData(roundData);
        
        // Initialize video if needed
        if (roundData.type === 'video' && roundData.video && typeof roundData.video === 'string') {
          setTimeout(() => {
            const tvVideo = document.getElementById('tv-video-player') as HTMLVideoElement;
            if (tvVideo) {
              // Convert base64 to blob URL if needed
              let videoSrc = roundData.video as string;
              if (videoSrc.startsWith('data:video')) {
                // Already a data URL, use directly
                tvVideo.src = videoSrc;
              } else if (videoSrc.startsWith('data:')) {
                tvVideo.src = videoSrc;
              } else {
                // Assume it's a blob URL or regular URL
                tvVideo.src = videoSrc;
              }
              
              tvVideo.ontimeupdate = () => {
                const current = document.getElementById('tv-video-current');
                const total = document.getElementById('tv-video-total');
                const seekBar = document.getElementById('tv-video-seek-bar') as HTMLInputElement;
                if (current) current.textContent = formatTime(tvVideo.currentTime);
                if (total) total.textContent = formatTime(tvVideo.duration || 0);
                if (seekBar && tvVideo.duration) {
                  seekBar.max = tvVideo.duration.toString();
                  seekBar.value = tvVideo.currentTime.toString();
                }
              };
              
              tvVideo.onloadedmetadata = () => {
                const total = document.getElementById('tv-video-total');
                const seekBar = document.getElementById('tv-video-seek-bar') as HTMLInputElement;
                if (total) total.textContent = formatTime(tvVideo.duration || 0);
                if (seekBar && tvVideo.duration) {
                  seekBar.max = tvVideo.duration.toString();
                }
              };
            }
          }, 100);
        }
        // Re-render if we have state
        const currentState = (window as Window & { currentGameState?: GameState }).currentGameState;
        if (currentState) {
          tvScreen.render(currentState);
        }
      }
      break;

    case 'ANIMATE':
      if (message.card === 'music') {
        const currentState = (window as any).currentGameState;
        if (currentState && currentState.visible) {
          currentState.visible.music = true;
        }
        // Update image if we have roundData
        const roundData = (window as any).roundData;
        if (roundData && roundData.music && tvScreen) {
          tvScreen.updateTVImage('tv-box-music', true, roundData.music);
          // Re-render to update state
          if (currentState) {
            tvScreen.render(currentState);
          }
        } else {
          // Just animate the box
          const box = document.getElementById('tv-box-music');
          if (box) {
            box.classList.remove('revealed', 'fully-revealed');
            box.classList.add('revealing');
            setTimeout(() => {
              box.classList.remove('revealing');
              box.classList.add('fully-revealed');
            }, 800);
          }
        }
      }
      if (message.card === 'text') {
        const currentState = (window as any).currentGameState;
        if (currentState && currentState.visible) {
          currentState.visible.text = true;
        }
        // Update image if we have roundData
        const roundData = (window as any).roundData;
        if (roundData && roundData.text && tvScreen) {
          tvScreen.updateTVImage('tv-box-text', true, roundData.text);
          // Re-render to update state
          if (currentState) {
            tvScreen.render(currentState);
          }
        } else {
          // Just animate the box
          const box = document.getElementById('tv-box-text');
          if (box) {
            box.classList.remove('revealed', 'fully-revealed');
            box.classList.add('revealing');
            setTimeout(() => {
              box.classList.remove('revealing');
              box.classList.add('fully-revealed');
            }, 800);
          }
        }
      }
      if (message.card === 'question') {
        const questionEl = document.querySelector('.tv-question-text') as HTMLElement;
        if (questionEl) {
          questionEl.classList.remove('animated');
          void questionEl.offsetWidth;
          questionEl.classList.add('animated');
        }
      }
      if (message.card === 'answer') {
        const answerEl = document.querySelector('.tv-answer-text') as HTMLElement;
        if (answerEl) {
          answerEl.classList.remove('hidden', 'animated');
          void answerEl.offsetWidth;
          answerEl.classList.add('animated');
        }
      }
      break;

    case 'ANIMATE_TITLE':
      const title = document.getElementById('tv-song-title');
      if (title) {
        title.classList.remove('animated');
        void title.offsetWidth;
        title.classList.add('animated');
        setTimeout(() => title.classList.remove('animated'), 800);
      }
      break;

    case 'CONFETTI':
      tvScreen.triggerConfetti();
      break;

    case 'SPECIAL_PREVIEW':
      if (message.data && typeof message.data === 'object') {
        const previewData = message.data as {
          specialType: string;
          specialTypeName: string;
          specialIcon: string;
          specialDescription: string;
          score: number;
        };
        tvScreen.renderSpecialPreview(previewData);
      }
      break;

    case 'VIDEO_SYNC':
      handleVideoSyncOnTV(message as BroadcastMessage & { currentTime?: number; paused?: boolean; playbackRate?: number });
      break;

    case 'TOGGLE_SNOW':
      if (typeof message.enabled === 'boolean') {
        toggleSnowOnTV(message.enabled);
      }
      break;
  }
}

/**
 * Handle video sync on TV
 */
function handleVideoSyncOnTV(data: any): void {
  const tvVideo = document.getElementById('tv-video-player') as HTMLVideoElement;
  if (!tvVideo) return;

  tvVideo.muted = false;
  tvVideo.volume = data.volume || 1;

  switch (data.event) {
    case 'play':
      tvVideo.currentTime = data.currentTime || 0;
      tvVideo
        .play()
        .then(() => {
          if (data.playbackRate) tvVideo.playbackRate = data.playbackRate;
        })
        .catch((error) => {
          console.error('TV: Ошибка воспроизведения видео:', error);
        });
      break;

    case 'pause':
      tvVideo.currentTime = data.currentTime || tvVideo.currentTime;
      tvVideo.pause();
      break;

    case 'timeupdate':
      if (Math.abs(tvVideo.currentTime - data.currentTime) > 0.5) {
        tvVideo.currentTime = data.currentTime;
      }
      break;

    case 'seek':
      tvVideo.currentTime = data.currentTime;
      if (data.isPlaying) tvVideo.play();
      else tvVideo.pause();
      break;

    case 'loaded':
      if (data.currentTime) tvVideo.currentTime = data.currentTime;
      break;

    case 'ratechange':
      tvVideo.playbackRate = data.playbackRate || 1;
      break;

    case 'volume':
      tvVideo.volume = data.volume;
      break;

    case 'ended':
      tvVideo.pause();
      tvVideo.currentTime = 0;
      break;
  }
}

/**
 * Initialize TV animations
 */
function initTVAnimations(): void {
  // Check if holiday period
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const isHoliday = (month === 12 && day >= 15) || (month === 1 && day <= 15);

  if (isHoliday) {
    createHolidayLights();
    const banner = document.getElementById('holiday-banner');
    if (banner) banner.style.display = 'block';
  }

  // Load snow state
  const snowEnabled = storageService.loadSnowEnabled();
  if (snowEnabled) {
    createSnowflakes();
    setInterval(() => {
      if (snowEnabled) {
        createSnowflakes();
      }
    }, 2000);
  }
}

/**
 * Create holiday lights
 */
function createHolidayLights(): void {
  const container = document.getElementById('holiday-lights');
  if (!container) return;

  container.innerHTML = '';
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
  const lightCount = Math.floor(window.innerWidth / 30);

  for (let i = 0; i < lightCount; i++) {
    const light = document.createElement('div');
    light.className = 'light';
    light.style.background = colors[Math.floor(Math.random() * colors.length)];
    light.style.animationDelay = `${Math.random() * 2}s`;
    container.appendChild(light);
  }
}

/**
 * Create snowflakes
 */
function createSnowflakes(): void {
  const container = document.getElementById('snow-overlay');
  if (!container) return;

  const existingCount = container.children.length;
  const targetCount = Math.min(100, Math.floor((window.innerWidth * window.innerHeight) / 5000));
  const addCount = Math.max(0, targetCount - existingCount);

  if (addCount > 0) {
    for (let i = 0; i < addCount; i++) {
      createSingleSnowflake(container);
    }
  }

  // Update existing snowflakes
  Array.from(container.children).forEach((snowflake) => {
    const style = window.getComputedStyle(snowflake as HTMLElement);
    const opacity = parseFloat(style.opacity);
    if (opacity < 0.1 || style.animationName === 'none') {
      updateSnowflake(snowflake as HTMLElement);
    }
  });
}

/**
 * Create single snowflake
 */
function createSingleSnowflake(container: HTMLElement): void {
  const snowflake = document.createElement('div');
  snowflake.className = 'snowflake';
  snowflake.innerHTML = ['❄', '❅', '❆', '•'][Math.floor(Math.random() * 4)];

  const left = Math.random() * 100;
  const size = 0.5 + Math.random() * 1.5;
  const duration = 8 + Math.random() * 15;
  const delay = Math.random() * 5;
  const opacity = 0.3 + Math.random() * 0.7;
  const drift = Math.random() * 80 - 40;

  snowflake.style.cssText = `
    left: ${left}vw;
    font-size: ${size}em;
    opacity: ${opacity};
    animation: snowFall ${duration}s linear ${delay}s infinite;
    --snow-drift: ${drift}px;
    animation-fill-mode: both;
  `;

  container.appendChild(snowflake);
}

/**
 * Update snowflake
 */
function updateSnowflake(snowflake: HTMLElement): void {
  const left = Math.random() * 100;
  const size = 0.5 + Math.random() * 1.5;
  const duration = 8 + Math.random() * 15;
  const delay = Math.random() * 5;
  const opacity = 0.3 + Math.random() * 0.7;
  const drift = Math.random() * 80 - 40;

  if (Math.random() < 0.3) {
    snowflake.innerHTML = ['❄', '❅', '❆', '•'][Math.floor(Math.random() * 4)];
  }

  snowflake.style.animation = 'none';
  void snowflake.offsetWidth;

  snowflake.style.cssText = `
    left: ${left}vw;
    font-size: ${size}em;
    opacity: ${opacity};
    animation: snowFall ${duration}s linear ${delay}s infinite;
    --snow-drift: ${drift}px;
    animation-fill-mode: both;
    position: fixed;
    top: -10px;
    color: white;
    text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
    user-select: none;
    pointer-events: none;
    z-index: 9999;
  `;
}

/**
 * Toggle snow on TV
 */
function toggleSnowOnTV(enabled: boolean): void {
  const container = document.getElementById('snow-overlay');
  if (!container) return;

  if (enabled) {
    container.innerHTML = '';
    createSnowflakes();
  } else {
    container.innerHTML = '';
  }
}

/**
 * Format time helper
 */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${m}:${sec < 10 ? '0' + sec : sec}`;
}

// Export for global access if needed
(window as any).app = {
  stateManager,
  syncService,
  storageService,
};
