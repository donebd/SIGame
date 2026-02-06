/**
 * Application constants
 */

export const APP_VERSION = '2.0.0';
export const BROADCAST_CHANNEL_NAME = 'sigame_v2';
export const SAVE_DEBOUNCE = 2000;
export const AUTO_SAVE_INTERVAL = 30000;
export const VIDEO_SYNC_INTERVAL = 500;

export const STORAGE_KEYS = {
  GAME_STATE: 'sigame_v2_state',
  PLAYERS: 'sigame_v2_players',
  SNOW_ENABLED: 'sigame_v2_snow_enabled',
} as const;

export const QUESTION_TYPE_ICONS: Record<string, string> = {
  mashup: '🎵',
  audio: '🎧',
  video: '🎬',
  text: '📝',
  select: '📋',
};

export const QUESTION_TYPE_NAMES: Record<string, string> = {
  mashup: 'Мешап',
  audio: 'Аудио',
  video: 'Видео',
  text: 'Текст',
  select: 'Выбор',
};

export const SPECIAL_TYPE_ICONS: Record<string, string> = {
  cat: '🐱',
  bet: '💰',
  auction: '🔨',
  special: '🎁',
};

export const SPECIAL_TYPE_NAMES: Record<string, string> = {
  cat: 'Кот в мешке',
  bet: 'Раунд со ставкой',
  auction: 'Аукцион',
  special: 'Специальный раунд',
};
