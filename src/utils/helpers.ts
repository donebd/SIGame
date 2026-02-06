/**
 * Utility functions
 */

import { QuestionType } from '../types/index';
import { QUESTION_TYPE_ICONS, QUESTION_TYPE_NAMES, SPECIAL_TYPE_NAMES } from '../types/constants';
import { t } from './i18n';

/**
 * Format seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${m}:${sec < 10 ? '0' + sec : sec}`;
}

/**
 * Get icon for question type
 */
export function getTypeIcon(type: QuestionType): string {
  return QUESTION_TYPE_ICONS[type] || '❓';
}

/**
 * Get name for question type
 */
export function getTypeName(type: QuestionType): string {
  const typeNameMap: Record<string, string> = {
    mashup: t('question_type_mashup'),
    audio: t('question_type_audio'),
    video: t('question_type_video'),
    text: t('question_type_text'),
    select: t('question_type_select'),
  };
  return typeNameMap[type] || QUESTION_TYPE_NAMES[type] || 'Неизвестно';
}

/**
 * Get localized name for special question type
 */
export function getSpecialTypeName(specialType: string | null | undefined): string {
  if (!specialType) return '';
  const specialNameMap: Record<string, string> = {
    cat: t('special_type_cat'),
    bet: t('special_type_bet'),
    auction: t('special_type_auction'),
    special: t('special_type_special'),
  };
  return specialNameMap[specialType] || SPECIAL_TYPE_NAMES[specialType] || '';
}

/**
 * Convert file to base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      let result = reader.result as string;

      // Fix for application/octet-stream: browsers often won't play such base64 videos/audio
      if (result.startsWith('data:application/octet-stream;base64,')) {
        const name = file.name.toLowerCase();
        if (name.endsWith('.mp4')) result = result.replace('application/octet-stream', 'video/mp4');
        else if (name.endsWith('.webm')) result = result.replace('application/octet-stream', 'video/webm');
        else if (name.endsWith('.mp3')) result = result.replace('application/octet-stream', 'audio/mpeg');
        else if (name.endsWith('.wav')) result = result.replace('application/octet-stream', 'audio/wav');
        else if (name.endsWith('.png')) result = result.replace('application/octet-stream', 'image/png');
        else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) result = result.replace('application/octet-stream', 'image/jpeg');
      }

      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Read text file content
 */
export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Extract category name from folder name
 */
export function extractCategory(folderName: string, roundName: string): string {
  let category = folderName;
  // Remove trailing numbers
  category = category.replace(/\d+$/, '').trim();
  // Remove trailing dashes/underscores
  category = category.replace(/[-_]+$/, '').trim();
  // Remove any remaining numbers
  if (/\d/.test(category)) {
    category = category.replace(/\d+/g, '').trim();
  }
  // Replace dashes/underscores with spaces
  category = category.replace(/[-_]/g, ' ');
  // Normalize whitespace
  category = category.replace(/\s+/g, ' ').trim();
  // Fallback to round name if empty
  if (!category) {
    category = roundName.charAt(0).toUpperCase() + roundName.slice(1);
  }
  return category;
}

/**
 * Extract score from folder name
 */
export function extractScore(folderName: string): number {
  const match = folderName.match(/(\d+)/);
  return match ? parseInt(match[0], 10) : 100;
}

/**
 * Check if date is in holiday period (Dec 15 - Jan 15)
 */
export function isHolidayPeriod(): boolean {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return (month === 12 && day >= 15) || (month === 1 && day <= 15);
}

/**
 * Scale text to fit container
 */
export function scaleTextToFit(
  element: HTMLElement,
  maxWidthPercent: number = 90
): void {
  if (!element || !element.textContent) return;

  const container = element.parentElement;
  if (!container) return;

  const maxWidth = (window.innerWidth * maxWidthPercent) / 100;
  const text = element.textContent;
  const length = text.length;

  // Set base font size based on text length
  let fontSize: string;
  if (length > 200) {
    fontSize = '1.5rem';
  } else if (length > 100) {
    fontSize = '2rem';
  } else if (length > 50) {
    fontSize = '2.5rem';
  } else {
    fontSize = '3rem';
  }

  element.style.fontSize = fontSize;

  // Check if text fits
  const checkOverflow = (): void => {
    const rect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const scaleFactor = containerRect.width / rect.width;

    if (scaleFactor < 1) {
      const currentSize = parseFloat(window.getComputedStyle(element).fontSize);
      element.style.fontSize = `${currentSize * scaleFactor * 0.9}px`;
    }
  };

  setTimeout(checkOverflow, 50);
}
