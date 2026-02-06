import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { Question, FileStorage, QuestionType, SpecialType } from '../types';

interface SiqAtom {
    '@_type': string; // text, say, image, video, voice, marker, audio
    '#text'?: string;
    '@_time'?: string;
}

interface SiqItem {
    '@_type': string; // image, video, voice, text, audio
    '@_isRef'?: string;
    '#text'?: string;
}

interface SiqParam {
    '@_name': string;
    '@_type'?: string; // content
    item?: SiqItem | SiqItem[];
}

interface SiqScenario {
    atom: SiqAtom | SiqAtom[];
}

interface SiqAnswer {
    '#text': string;
}

interface SiqRight {
    answer: SiqAnswer | SiqAnswer[];
}

interface SiqQuestion {
    '@_price': string;
    scenario?: SiqScenario;
    right?: SiqRight;
    params?: { param: SiqParam[] | SiqParam };
}

interface SiqTheme {
    '@_name': string;
    questions?: { question: SiqQuestion[] | SiqQuestion };
}

interface SiqRound {
    '@_name': string;
    '@_type'?: string;
    themes?: { theme: SiqTheme[] | SiqTheme };
}

interface SiqPackage {
    package: {
        rounds: { round: SiqRound[] | SiqRound };
    };
}

export class SiqService {
    private parser: XMLParser;

    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
        });
    }

    /**
     * Parse .siq file and convert to GameState questions
     */
    async parseSiq(file: File): Promise<{ questions: Question[]; fileStorage: FileStorage; roundTypes: Record<string, 'regular' | 'final'> }> {
        const zip = new JSZip();
        const contents = await zip.loadAsync(file);

        const contentXml = await contents.file('content.xml')?.async('string');
        if (!contentXml) {
            throw new Error('Invalid .siq file: content.xml not found');
        }

        const xmlObj = this.parser.parse(contentXml);
        const questions: Question[] = [];
        const fileStorage: FileStorage = {};
        const roundTypes: Record<string, 'regular' | 'final'> = {};

        // 0. Pre-index all files in the ZIP for fast and robust lookup
        // This handles cases where files are in the root, standard folders, or messy subfolders
        // Also handles case-insensitivity, leading/trailing spaces, and Unicode normalization (NFC/NFD)
        const zipFileMap = new Map<string, string>(); // normalized path -> original path
        const baseNameMap = new Map<string, string>(); // normalized base name -> original path

        const normalizeSearch = (s: string) => {
            if (!s) return '';
            return s.trim()
                .toLowerCase()
                .normalize('NFC')
                .replace(/\s+/g, ' '); // collapse multiple spaces
        };

        const getMimeType = (filename: string, blobType: string): string => {
            if (blobType && blobType !== 'application/octet-stream') return blobType;
            const ext = filename.split('.').pop()?.toLowerCase();
            switch (ext) {
                case 'png': return 'image/png';
                case 'jpg':
                case 'jpeg': return 'image/jpeg';
                case 'gif': return 'image/gif';
                case 'webp': return 'image/webp';
                case 'mp3': return 'audio/mpeg';
                case 'wav': return 'audio/wav';
                case 'ogg': return 'audio/ogg';
                case 'mp4': return 'video/mp4';
                case 'webm': return 'video/webm';
                case 'mov': return 'video/quicktime';
                default: return blobType || 'application/octet-stream';
            }
        };

        Object.keys(contents.files).forEach(path => {
            const entry = contents.files[path];
            if (entry.dir) return;

            // Standard normalized path
            const normPath = normalizeSearch(path);
            zipFileMap.set(normPath, path);

            // Also index by decoded and encoded versions if they differ
            try {
                const decoded = normalizeSearch(decodeURIComponent(path));
                if (decoded !== normPath) zipFileMap.set(decoded, path);
            } catch (e) { }

            try {
                const encoded = normalizeSearch(encodeURIComponent(path).replace(/%2F/g, '/'));
                if (encoded !== normPath) zipFileMap.set(encoded, path);
            } catch (e) { }

            // Base name index
            const bName = path.split(/[/\\]/).pop() || path;
            const normBase = normalizeSearch(bName);
            baseNameMap.set(normBase, path);

            // Variants for base name (like replacing + with space or vice versa)
            baseNameMap.set(normBase.replace(/\+/g, ' '), path);
            baseNameMap.set(normBase.replace(/ /g, '+'), path);
        });

        // Helper to extract media
        const extractFile = async (filename: string, type: 'Images' | 'Audio' | 'Video'): Promise<File | undefined> => {
            if (!filename) return undefined;

            try {
                // 1. Basic cleaning
                const rawName = filename.replace(/^@/, '');
                const cleanName = rawName.trim();
                const baseName = cleanName.split(/[/\\]/).pop() || cleanName;

                // 2. Generate search candidates
                const candidates = new Set<string>();
                candidates.add(cleanName);
                candidates.add(baseName);
                candidates.add(rawName);

                // Add variant: Unicode normalization
                candidates.add(cleanName.normalize('NFC'));
                candidates.add(cleanName.normalize('NFD'));

                // Add variant: URL encoding/decoding
                try { candidates.add(decodeURIComponent(cleanName)); } catch (e) { }
                try { candidates.add(decodeURIComponent(baseName)); } catch (e) { }
                try {
                    candidates.add(encodeURIComponent(cleanName).replace(/%2F/g, '/').replace(/\(/g, '%28').replace(/\)/g, '%29'));
                } catch (e) { }

                // Add variant: common SI naming quirks
                candidates.add(cleanName.replace(/\+/g, ' '));
                candidates.add(cleanName.replace(/ /g, '+'));
                candidates.add(cleanName.replace(/&amp;/g, '&').replace(/&quot;/g, '"'));

                // 3. Try to find the file using indexed maps
                const prefixes = ['', `${type}/`, `Images/`, `Audio/`, `Video/`, `Texts/`, `${type.toLowerCase()}/`];

                for (const prefix of prefixes) {
                    for (const cand of candidates) {
                        const normCand = normalizeSearch(prefix + cand);
                        const actualPath = zipFileMap.get(normCand);
                        if (actualPath && contents.files[actualPath]) {
                            const blob = await contents.file(actualPath)!.async('blob');
                            const mimeType = getMimeType(actualPath, blob.type);
                            return new File([blob], baseName, { type: mimeType });
                        }
                    }
                }

                // 4. Try base name matching with variants
                for (const cand of candidates) {
                    const normBase = normalizeSearch(cand.split(/[/\\]/).pop() || cand);
                    const fallbackPath = baseNameMap.get(normBase);
                    if (fallbackPath) {
                        const blob = await contents.file(fallbackPath)!.async('blob');
                        const mimeType = getMimeType(fallbackPath, blob.type);
                        return new File([blob], baseName, { type: mimeType });
                    }
                }

                // 5. Desperate search: sequence match
                const targetBase = normalizeSearch(baseName);
                if (targetBase.length > 5) {
                    const match = Array.from(baseNameMap.keys()).find(k => k.includes(targetBase) || targetBase.includes(k));
                    if (match) {
                        const targetPath = baseNameMap.get(match)!;
                        const blob = await contents.file(targetPath)!.async('blob');
                        const mimeType = getMimeType(targetPath, blob.type);
                        return new File([blob], baseName, { type: mimeType });
                    }
                }

            } catch (err) {
                console.error(`SiqService: Error extracting ${filename}:`, err);
            }

            console.warn(`SiqService: Could not find file ${filename} (type: ${type})`);
            return undefined;
        };

        const processRound = async (round: SiqRound, index: number, total: number) => {
            const roundName = round['@_name'];
            // Only mark as 'final' if explicitly set in XML
            // This prevents regular rounds named "Final" from being treated as interactive final rounds
            const isExplicitFinal = round['@_type'] === 'final';
            const roundType = isExplicitFinal ? 'final' : 'regular';
            roundTypes[roundName] = roundType;

            const themes = this.asArray(round.themes?.theme);

            for (const theme of themes) {
                const category = theme['@_name'];
                const themeQuestions = this.asArray(theme.questions?.question);

                for (const q of themeQuestions) {
                    // Price can be an attribute or a child element
                    // SI-pedia sometimes uses cost, or different case
                    const anyQ = q as any;
                    let priceValue = q['@_price'] || anyQ['@_cost'] || anyQ['@_value'] || anyQ['@_Price'];

                    if (priceValue === undefined) {
                        // Try child elements
                        if ((q as any).price) priceValue = this.getText((q as any).price);
                        else if ((q as any).cost) priceValue = this.getText((q as any).cost);
                        else if ((q as any).value) priceValue = this.getText((q as any).value);
                    }

                    const price = parseInt(String(priceValue), 10) || 0;

                    // Parse Question Content
                    const questionItems = this.extractContentItems(q, 'question');
                    const questionData = await this.parseContentItems(questionItems, extractFile);

                    // Parse Answer Content
                    const answerItems = this.extractContentItems(q, 'answer');
                    const answerData = await this.parseContentItems(answerItems, extractFile);

                    // Parse text answer
                    const answers = this.asArray(q.right?.answer);
                    let answerText = answers.length > 0 ? this.getText(answers[0]) : '';

                    if (answerData.text) {
                        answerText = answerText ? `${answerText} (${answerData.text})` : answerData.text;
                    }

                    // Parse options for 'select' type (Schema v5+)
                    let answerOptions: string[] = [];
                    let finalType = questionData.type;

                    if (q.params?.param) {
                        const params = this.asArray(q.params.param);
                        const typeParam = params.find(p => p['@_name'] === 'answerType');
                        if (typeParam && this.getText(typeParam) === 'select') {
                            finalType = 'select';
                            const optionsGroup = params.find(p => p['@_name'] === 'answerOptions' && p['@_type'] === 'group');
                            if (optionsGroup && (optionsGroup as any).param) {
                                const optionParams = this.asArray((optionsGroup as any).param);
                                answerOptions = optionParams.map(opt => {
                                    // Option text might be directly in param text or inside nested item
                                    let text = this.getText(opt);
                                    if (!text && (opt as any).item) {
                                        const items = this.asArray((opt as any).item);
                                        if (items.length > 0) text = this.getText(items[0]);
                                    }
                                    return `${opt['@_name']}: ${text}`;
                                });
                            }
                        }
                    }

                    // Parse special type (bagcat, sponsored, etc.)
                    let specialType: SpecialType = null;
                    let specialDesc = '';

                    const qTypeRaw = (q as any).type;
                    let typeName = '';
                    let typeSource: any = null;

                    if (qTypeRaw) {
                        // Standard format: type is a child element
                        typeSource = Array.isArray(qTypeRaw) ? qTypeRaw[0] : qTypeRaw;
                        typeName = typeSource['@_name'];
                        if (!typeName && typeof typeSource === 'string') typeName = typeSource;
                    } else if ((q as any)['@_type']) {
                        // Legacy format: type is an attribute of question
                        typeName = (q as any)['@_type'];
                        typeSource = q;
                    }

                    if (typeName) {
                        const lowerTypeName = typeName.toLowerCase();

                        // Helper to extract params from various sources
                        const getParams = () => {
                            let validParams: any[] = [];
                            // 1. Direct param children
                            if (typeSource.param) {
                                validParams = [...validParams, ...this.asArray(typeSource.param)];
                            }
                            // 2. Nested params object
                            if (typeSource.params?.param) {
                                validParams = [...validParams, ...this.asArray(typeSource.params.param)];
                            }
                            return validParams;
                        };

                        const params = getParams();

                        if (lowerTypeName === 'bagcat' || lowerTypeName === 'cat') {
                            specialType = 'cat';

                            let themeValue = '';
                            let costValue = '';

                            if (params.length > 0) {
                                const themeParam = params.find(p => p['@_name'] === 'theme');
                                const costParam = params.find(p => p['@_name'] === 'cost');
                                themeValue = this.getText(themeParam);
                                costValue = this.getText(costParam);
                            }

                            // Fallback: Try attributes on typeSource
                            if (!themeValue) themeValue = typeSource['@_theme'] || '';
                            if (!costValue) costValue = typeSource['@_cost'] || '';

                            specialDesc = `Тема: ${themeValue}, Стоимость: ${costValue}`;
                        } else if (lowerTypeName === 'sponsored') {
                            specialType = 'bet';
                            specialDesc = 'Вопрос со ставкой';
                        } else if (lowerTypeName === 'secret') {
                            specialType = 'special';

                            const modeParam = params.find(p => p['@_name'] === 'selectionMode');
                            const mode = this.getText(modeParam);

                            switch (mode) {
                                case 'exceptCurrent':
                                    specialDesc = 'Секретный вопрос (Отдать другому)';
                                    break;
                                case 'current':
                                    specialDesc = 'Секретный вопрос (Играть самому)';
                                    break;
                                case 'any':
                                    specialDesc = 'Секретный вопрос (Выбор игрока)';
                                    break;
                                default:
                                    specialDesc = 'Секретный вопрос';
                            }
                        } else if (lowerTypeName === 'stake') {
                            specialType = 'auction';
                            specialDesc = 'Своя игра (Аукцион)';
                        }
                    }

                    const qId = `${roundName}_${category}_${price}_${Math.random().toString(36).substr(2, 5)}`;
                    const cleanId = qId.replace(/[^a-zA-Z0-9_-]/g, '');

                    const newQuestion: Question = {
                        id: cleanId,
                        round: roundName,
                        category: category,
                        score: price,
                        played: false,
                        type: finalType,
                        question: questionData.text,
                        answer: answerText,
                        answerOptions: answerOptions.length > 0 ? answerOptions : undefined,
                        specialType: specialType,
                        specialDescription: specialDesc,

                        // Question Media URLs
                        questionImageUrl: questionData.image ? URL.createObjectURL(questionData.image) : undefined,
                        questionAudioUrl: questionData.audio ? URL.createObjectURL(questionData.audio) : undefined,
                        questionVideoUrl: questionData.video ? URL.createObjectURL(questionData.video) : undefined,

                        // Answer Media URLs
                        answerImageUrl: answerData.image ? URL.createObjectURL(answerData.image) : undefined,
                        answerAudioUrl: answerData.audio ? URL.createObjectURL(answerData.audio) : undefined,
                        answerVideoUrl: answerData.video ? URL.createObjectURL(answerData.video) : undefined,

                        // Original media (legacy compat)
                        audioUrl: questionData.audio ? URL.createObjectURL(questionData.audio) : undefined,
                        videoUrl: questionData.video ? URL.createObjectURL(questionData.video) : undefined,
                        audioFileName: questionData.audio?.name,
                        videoFileName: questionData.video?.name
                    };

                    // Store files
                    const storageEntry: FileStorage[string] = {};
                    if (questionData.image) storageEntry.questionImage = questionData.image;
                    if (questionData.audio) storageEntry.questionAudio = questionData.audio;
                    if (questionData.video) storageEntry.questionVideo = questionData.video;
                    if (answerData.image) storageEntry.answerImage = answerData.image;
                    if (answerData.audio) storageEntry.answerAudio = answerData.audio;
                    if (answerData.video) storageEntry.answerVideo = answerData.video;

                    if (questionData.audio) storageEntry.audio = questionData.audio;
                    if (questionData.video) storageEntry.video = questionData.video;

                    if (Object.keys(storageEntry).length > 0) {
                        fileStorage[cleanId] = storageEntry;
                    }


                    questions.push(newQuestion);
                }
            }
        };

        const packageRounds = this.asArray(xmlObj.package?.rounds?.round);
        for (let i = 0; i < packageRounds.length; i++) {
            const round = packageRounds[i];
            await processRound(round, i, packageRounds.length);
        }

        return { questions, fileStorage, roundTypes };
    }

    private asArray<T>(item: T | T[] | undefined): T[] {
        if (!item) return [];
        return Array.isArray(item) ? item : [item];
    }

    /**
     * Safe text extraction from an item that might be a string, number, or an object with #text
     */
    private getText(item: any): string {
        if (item === null || item === undefined) return '';
        if (typeof item === 'string') return item;
        if (typeof item === 'number' || typeof item === 'boolean') return String(item);

        const text = item['#text'];
        if (text !== undefined && text !== null) return String(text);

        return '';
    }

    /**
     * Extract content items from a question, handling different schema versions.
     * @param target 'question' or 'answer'
     */
    private extractContentItems(q: SiqQuestion, target: 'question' | 'answer'): { type: string; text: string }[] {
        // 1. Try 'params' (Schema v5+)
        if (q.params?.param) {
            const params = this.asArray(q.params.param);
            const param = params.find(p => p['@_name'] === target);
            if (param && param.item) {
                const items = this.asArray(param.item);
                return items.map(item => ({
                    type: item['@_type'] || 'text',
                    text: this.getText(item)
                }));
            }
        }

        // 2. Try 'scenario' (Schema v4 and older) - ONLY applies to 'question'
        if (target === 'question' && q.scenario?.atom) {
            const atoms = this.asArray(q.scenario.atom);
            return atoms.map(atom => ({
                type: atom['@_type'] || 'text',
                text: this.getText(atom)
            }));
        }

        return [];
    }


    private async parseContentItems(
        items: { type: string; text: string }[],
        extractor: (name: string, type: 'Images' | 'Audio' | 'Video') => Promise<File | undefined>
    ): Promise<{
        type: QuestionType;
        text?: string;
        image?: File;
        audio?: File;
        video?: File;
    }> {
        let type: QuestionType = 'text';
        let textParts: string[] = [];
        let image: File | undefined;
        let audio: File | undefined;
        let video: File | undefined;

        for (const item of items) {
            const content = item.text;

            switch (item.type) {
                case 'text':
                case 'say':
                    if (content && !content.startsWith('@')) {
                        textParts.push(content);
                    }
                    break;
                case 'image':
                    if (content) {
                        image = await extractor(content, 'Images');
                    }
                    break;
                case 'voice':
                case 'audio': // Added explicit support for 'audio' type
                    if (content) {
                        audio = await extractor(content, 'Audio');
                        if (type === 'text') type = 'audio';
                    }
                    break;
                case 'video':
                    if (content) {
                        video = await extractor(content, 'Video');
                        type = 'video';
                    }
                    break;
            }
        }

        return {
            type,
            text: textParts.join('\n').trim() || undefined,
            image,
            audio,
            video
        };
    }
}
