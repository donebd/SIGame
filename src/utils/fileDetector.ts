/**
 * File type detection utilities
 */

import { QuestionType } from '../types/index';

/**
 * Detect question type from files
 */
export function detectQuestionType(files: File[]): QuestionType {
  const fileNames = files.map((f) => f.name.toLowerCase());
  const hasAudio = files.some((f) => /\.(mp3|wav|ogg|m4a)$/i.test(f.name));
  const hasVideo = files.some((f) => /\.(mp4|webm|avi|mov)$/i.test(f.name));
  const hasImages =
    files.filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f.name)).length >= 2;
  const hasQuestion = fileNames.includes('question.txt');
  const hasAnswer = fileNames.includes('answer.txt');
  const hasSingleImage = files.some((f) => /\.(jpg|jpeg|png|webp)$/i.test(f.name));

  // Mashup: audio + 2+ images, no question.txt
  if (hasAudio && hasImages && !hasQuestion) return 'mashup';
  
  // Audio: audio + question.txt + answer.txt
  if (hasAudio && hasQuestion && hasAnswer) return 'audio';
  
  // Video: video + question.txt + answer.txt
  if (hasVideo && hasQuestion && hasAnswer) return 'video';
  
  // Text: question.txt + answer.txt, no audio/video (images are allowed)
  if (hasQuestion && hasAnswer && !hasAudio && !hasVideo) return 'text';
  
  // Fallback: audio without images
  if (hasAudio && !hasImages) return 'audio';
  
  return 'mashup';
}

/**
 * Find audio file in files array
 */
export function findAudioFile(files: File[]): File | undefined {
  return files.find((f) => /\.(mp3|wav|ogg|m4a)$/i.test(f.name));
}

/**
 * Find video file in files array
 */
export function findVideoFile(files: File[]): File | undefined {
  return files.find((f) => /\.(mp4|webm|avi|mov)$/i.test(f.name));
}

/**
 * Find image files in files array
 */
export function findImageFiles(files: File[]): File[] {
  return files.filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f.name));
}

/**
 * Find text file by name
 */
export function findTextFile(files: File[], fileName: string): File | undefined {
  return files.find((f) => f.name.toLowerCase() === fileName.toLowerCase());
}
