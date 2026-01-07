/**
 * File Service - handles file operations and question parsing
 * Single Responsibility: Processing uploaded files and creating question objects
 */

import {
  Question,
  FileStorage,
  SpecialType,
} from '../types/index';
import {
  detectQuestionType,
  findAudioFile,
  findVideoFile,
  findImageFiles,
  findTextFile,
} from '@utils/fileDetector';
import { readTextFile, extractCategory, extractScore } from '@utils/helpers';

export interface FileStructure {
  [roundName: string]: {
    [questionFolder: string]: File[];
  };
}

export class FileService {
  /**
   * Parse file structure from FileList
   */
  parseFileStructure(files: File[]): FileStructure {
    const structure: FileStructure = {};

    files.forEach((file) => {
      const path = file.webkitRelativePath.split('/');
      if (path.length < 3) return;

      const roundName = path[1];
      const questionFolder = path[2];

      if (!structure[roundName]) {
        structure[roundName] = {};
      }
      if (!structure[roundName][questionFolder]) {
        structure[roundName][questionFolder] = [];
      }
      structure[roundName][questionFolder].push(file);
    });

    return structure;
  }

  /**
   * Process files and create questions
   */
  async processFiles(
    structure: FileStructure
  ): Promise<{ questions: Question[]; fileStorage: FileStorage }> {
    const rounds: { [roundName: string]: Question[] } = {};
    const fileStorage: FileStorage = {};

    for (const roundName in structure) {
      rounds[roundName] = [];
      let questionId = 1;

      for (const questionFolder in structure[roundName]) {
        const folderFiles = structure[roundName][questionFolder];
        const question = await this.createQuestion(
          roundName,
          questionFolder,
          folderFiles,
          questionId++
        );

        if (question) {
          rounds[roundName].push(question.question);
          if (question.files) {
            fileStorage[question.question.id] = question.files;
          }
        }
      }

      // Sort questions by score
      rounds[roundName].sort((a, b) => a.score - b.score);
    }

    return { questions: Object.values(rounds).flat(), fileStorage };
  }

  /**
   * Create question from folder files
   */
  private async createQuestion(
    roundName: string,
    questionFolder: string,
    files: File[],
    questionId: number
  ): Promise<{ question: Question; files?: FileStorage[string] } | null> {
    // Check for special type
    const specialFile = findTextFile(files, 'special.txt');
    let specialType: SpecialType = null;
    let specialDescription = '';

    if (specialFile) {
      try {
        const specialContent = await readTextFile(specialFile);
        const lines = specialContent
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line);
        if (lines.length > 0) {
          const type = lines[0].toLowerCase();
          const validTypes: SpecialType[] = ['cat', 'bet', 'auction', 'special'];
          if (validTypes.includes(type as SpecialType)) {
            specialType = type as SpecialType;
          }
          if (lines.length > 1) {
            specialDescription = lines.slice(1).join('\n');
          }
        }
      } catch (error) {
        console.error('Ошибка чтения special.txt:', error);
      }
    }

    // Detect question type
    const type = detectQuestionType(files);
    const audioFile = findAudioFile(files);
    const videoFile = findVideoFile(files);
    const images = findImageFiles(files);
    const questionFile = findTextFile(files, 'question.txt');
    const answerFile = findTextFile(files, 'answer.txt');

    // Helper function to find media files by pattern
    const findMediaFile = (files: File[], pattern: RegExp): File | undefined => {
      return files.find(f => pattern.test(f.name.toLowerCase()));
    };

    // Find question media files (questionImage.*, questionVideo.*, questionAudio.*)
    const qImage = findMediaFile(files, /^questionImage\.(jpg|jpeg|png|webp)$/i);
    const qVideo = findMediaFile(files, /^questionVideo\.(mp4|webm|avi|mov)$/i);
    const qAudio = findMediaFile(files, /^questionAudio\.(mp3|wav|ogg|m4a)$/i);
    
    // Find answer media files (answerImage.*, answerVideo.*, answerAudio.*)
    const aImage = findMediaFile(files, /^answerImage\.(jpg|jpeg|png|webp)$/i);
    const aVideo = findMediaFile(files, /^answerVideo\.(mp4|webm|avi|mov)$/i);
    const aAudio = findMediaFile(files, /^answerAudio\.(mp3|wav|ogg|m4a)$/i);

    // Read text files
    let questionText = '';
    let answerText = '';
    if (questionFile) questionText = await readTextFile(questionFile);
    if (answerFile) answerText = await readTextFile(answerFile);

    // Extract category and score
    const score = extractScore(questionFolder);
    const category = extractCategory(questionFolder, roundName);

    // Create question object
    const question: Question = {
      id: `${roundName}_${questionId}`,
      round: roundName,
      type,
      category,
      score,
      played: false,
      specialType: specialType || undefined,
      specialDescription: specialDescription || undefined,
      question: questionText.trim() || undefined,
      answer: answerText.trim() || undefined,
    };

    // Create file storage entry
    const fileStorageEntry: FileStorage[string] = {};

    // Process based on type
    switch (type) {
      case 'mashup':
        if (audioFile && images.length >= 2) {
          question.audioUrl = URL.createObjectURL(audioFile);
          question.previewMusic = URL.createObjectURL(images[0]);
          question.previewText = URL.createObjectURL(images[1]);
          question.audioFileName = audioFile.name;
          fileStorageEntry.audio = audioFile;
          fileStorageEntry.music = images[0];
          fileStorageEntry.text = images[1];
        }
        break;

      case 'audio':
        if (audioFile) {
          question.audioUrl = URL.createObjectURL(audioFile);
          question.audioFileName = audioFile.name;
          fileStorageEntry.audio = audioFile;
        }
        break;

      case 'video':
        if (videoFile) {
          question.videoUrl = URL.createObjectURL(videoFile);
          question.videoFileName = videoFile.name;
          fileStorageEntry.video = videoFile;
        }
        break;

    }

    // Process question media (for all types - text, audio, video)
    if (qImage) {
      question.questionImageUrl = URL.createObjectURL(qImage);
      fileStorageEntry.questionImage = qImage;
    }
    if (qVideo) {
      question.questionVideoUrl = URL.createObjectURL(qVideo);
      fileStorageEntry.questionVideo = qVideo;
    }
    if (qAudio) {
      question.questionAudioUrl = URL.createObjectURL(qAudio);
      fileStorageEntry.questionAudio = qAudio;
    }

    // Process answer media (for all types - text, audio, video, mashup)
    if (aImage) {
      question.answerImageUrl = URL.createObjectURL(aImage);
      fileStorageEntry.answerImage = aImage;
    }
    if (aVideo) {
      question.answerVideoUrl = URL.createObjectURL(aVideo);
      fileStorageEntry.answerVideo = aVideo;
    }
    if (aAudio) {
      question.answerAudioUrl = URL.createObjectURL(aAudio);
      fileStorageEntry.answerAudio = aAudio;
    }

    return {
      question,
      files: Object.keys(fileStorageEntry).length > 0 ? fileStorageEntry : undefined,
    };
  }
}
