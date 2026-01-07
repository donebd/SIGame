/**
 * Internationalization (i18n) Service
 * Handles language switching and translations
 */

export type Language = 'ru' | 'en';

interface Translations {
  [key: string]: {
    ru: string;
    en: string;
  };
}

const translations: Translations = {
  // Common
  github: { ru: 'GitHub', en: 'GitHub' },
  lang_switch_to_en: { ru: '🌐 Switch to English', en: '🌐 Switch to English' },
  lang_switch_to_ru: { ru: '🌐 Switch to Russian', en: '🌐 Переключить на русский' },

  // Admin Panel
  gm_panel: { ru: '🎮 Панель GM', en: '🎮 GM Panel' },
  add_player: { ru: '+ Добавить игрока', en: '+ Add Player' },
  open_tv: { ru: '📺 Открыть TV экран', en: '📺 Open TV Screen' },
  save: { ru: '💾 Сохранить', en: '💾 Save' },
  load: { ru: '📂 Загрузить', en: '📂 Load' },
  snow: { ru: '❄️ Снег: ВКЛ', en: '❄️ Snow: ON' },
  snow_off: { ru: '❄️ Снег: ВЫКЛ', en: '❄️ Snow: OFF' },
  reset_game: { ru: '🛑 Сброс игры', en: '🛑 Reset Game' },
  load_folder: { ru: 'Загрузите папку с игрой', en: 'Load game folder' },
  no_players: { ru: 'Нет игроков', en: 'No players' },
  player_name: { ru: 'Имя игрока', en: 'Player name' },
  select_player: { ru: '-- Игрок --', en: '-- Player --' },

  // Round Management
  round_management: { ru: '🎯 Управление раундами', en: '🎯 Round Management' },

  // Question Types
  question_type_label: { ru: 'Тип вопроса:', en: 'Question Type:' },
  question_type_mashup: { ru: 'Мешап', en: 'Mashup' },
  question_type_audio: { ru: 'Аудио', en: 'Audio' },
  question_type_video: { ru: 'Видео', en: 'Video' },
  question_type_text: { ru: 'Текст', en: 'Text' },
  question_mashup: { ru: 'Мешап двух песен:', en: 'Mashup of two songs:' },
  question_audio: { ru: 'Аудио вопрос:', en: 'Audio question:' },
  question_video: { ru: 'Видео вопрос:', en: 'Video question:' },
  question_text: { ru: 'Текстовый вопрос:', en: 'Text question:' },
  answer: { ru: 'Ответ:', en: 'Answer:' },
  question_label: { ru: 'Вопрос:', en: 'Question:' },
  question_not_specified: { ru: 'Вопрос не указан', en: 'Question not specified' },
  answer_not_specified: { ru: 'Ответ не указан', en: 'Answer not specified' },
  audio_file: { ru: 'Аудио файл:', en: 'Audio file:' },
  video_file: { ru: 'Видео файл:', en: 'Video file:' },
  audio_label: { ru: 'Аудио:', en: 'Audio:' },
  not_specified: { ru: 'Не указано', en: 'Not specified' },

  // Reset confirmation
  reset_confirm: { ru: 'СБРОС? Все данные будут удалены, страница перезагрузится.', en: 'RESET? All data will be deleted, page will reload.' },

  // Load confirmation
  load_confirm: { ru: 'Загрузить сохранение от', en: 'Load save from' },

  // TV Screen
  no_players_tv: { ru: 'Нет игроков', en: 'No players' },

  // Warnings
  state_restore_warning_title: { ru: 'Важно!', en: 'Important!' },
  state_restore_warning_text: { ru: 'Состояние игры восстановлено, но для полной работы необходимо загрузить папку с вопросами.', en: 'Game state restored, but you need to load the question folder for full functionality.' },
  understand: { ru: 'Понятно', en: 'Got it' },
  remove_player: { ru: 'Удалить игрока', en: 'Remove player' },

  // TV Modal
  open_tv_modal_title: { ru: '📺 Открыть игровой экран', en: '📺 Open Game Screen' },
  open_tv_modal_desc: { ru: 'Выберите режим открытия игрового экрана (TV):', en: 'Choose how to open the game screen (TV):' },
  new_tab: { ru: '🆕 Новая вкладка', en: '🆕 New Tab' },
  new_tab_desc: { ru: 'Откроет игровой экран в новой вкладке браузера', en: 'Opens game screen in a new browser tab' },
  popup: { ru: '🪟 Всплывающее окно', en: '🪟 Popup Window' },
  popup_desc: { ru: 'Откроет игровой экран в отдельном всплывающем окне', en: 'Opens game screen in a separate popup window' },
  switch_view: { ru: '🔄 Переключить вид', en: '🔄 Switch View' },
  switch_view_desc: { ru: 'Переключит текущую вкладку в режим TV', en: 'Switches current tab to TV mode' },
  modal_title_tv: { ru: '📺 Открыть игровой экран', en: '📺 Open Game Screen' },
  modal_desc_tv: { ru: 'Выберите режим открытия игрового экрана (TV):', en: 'Choose Game Screen (TV) mode:' },
  cancel: { ru: 'Отмена', en: 'Cancel' },

  // Round control
  back_to_grid: { ru: '⬅️ Назад к сетке', en: '⬅️ Back to Grid' },
  show_question: { ru: 'Показать вопрос', en: 'Show Question' },
  show_answer: { ru: 'Показать ответ', en: 'Show Answer' },
  reveal_music: { ru: '🎵 Показать Музыку', en: '🎵 Reveal Music' },
  reveal_text: { ru: '📝 Показать Текст', en: '📝 Reveal Text' },
  reveal_both: { ru: 'Показать оба', en: 'Reveal Both' },
  question_played: { ru: '✅ Вопрос сыгран', en: '✅ Question Played' },

  // Score controls
  points_label: { ru: 'Баллы', en: 'Points' },
  award_full: { ru: '+ Полный', en: '+ Full' },
  award_half: { ru: '+ Половина', en: '+ Half' },
  award_minus: { ru: '- Штраф', en: '- Penalty' },
  award_points: { ru: 'Начислить баллы', en: 'Award Points' },
  subtract_points: { ru: 'Снять баллы', en: 'Subtract Points' },
  points: { ru: 'баллов', en: 'points' },

  // Empty states
  load_folder_prompt: { ru: '📂 Загрузите папку с игрой', en: '📂 Load game folder' },
  folder_structure: { ru: 'Структура папок:', en: 'Folder structure:' },
  question_folder_structure: { ru: 'Структура папки вопроса:', en: 'Question folder structure:' },
  folder_structure_title: { ru: '📂 Структура папки', en: '📂 Folder Structure' },
  folder_structure_desc: { ru: 'Пример структуры:', en: 'Example structure:' },
  folder_example_theme: { ru: 'Тема', en: 'Theme' },
  folder_example_cat: { ru: 'Кот в мешке', en: 'Cat in a Bag' },

  // File input
  file_not_selected: { ru: 'Файл не выбран', en: 'File not selected' },
  choose_files: { ru: 'Выбрать файлы', en: 'Choose files' },
  files_loaded: { ru: 'Пак загружен', en: 'Pack loaded' },
  files_loading: { ru: 'Загрузка...', en: 'Loading...' },
  rounds_count: { ru: 'Раундов', en: 'Rounds' },
  questions_count: { ru: 'Вопросов', en: 'Questions' },

  // Confetti
  trigger_confetti: { ru: '🎉 Запустить конфетти', en: '🎉 Launch Confetti' },

  // Special question types
  special_type_cat: { ru: 'Кот в мешке', en: 'Cat in a Bag' },
  special_type_bet: { ru: 'Раунд со ставкой', en: 'Bet Round' },
  special_type_auction: { ru: 'Аукцион', en: 'Auction' },
  special_type_special: { ru: 'Специальный раунд', en: 'Special Round' },

  // Holiday
  new_year_greeting: { ru: '🎄 С Новым Годом! 🎅', en: '🎄 Happy New Year! 🎅' },

  // Category
  no_category: { ru: 'Без категории', en: 'No category' },
};

let currentLanguage: Language = (localStorage.getItem('game_language') as Language) || 'ru';

export function getLanguage(): Language {
  return currentLanguage;
}

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
  localStorage.setItem('game_language', lang);
  // updateAllTranslations() will be called by the caller if needed
  // to avoid double updates
}

export function t(key: string): string {
  const translation = translations[key];
  if (!translation) {
    console.warn(`Translation missing for key: ${key}`);
    return key;
  }
  return translation[currentLanguage] || translation.ru;
}

export function updateAllTranslations(): void {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      const translation = t(key);
      if (element instanceof HTMLInputElement && element.type === 'button') {
        element.value = translation;
      } else {
        element.textContent = translation;
      }
    }
  });

  // Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    const key = element.getAttribute('data-i18n-placeholder');
    if (key && element instanceof HTMLInputElement) {
      element.placeholder = t(key);
    }
  });
}

// Initialize on load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    updateAllTranslations();
  });
}
