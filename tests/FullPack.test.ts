import { SiqService } from '../src/services/SiqService';
import fs from 'fs';
import path from 'path';

describe('Full Pack Integration Tests', () => {
    let service: SiqService;
    const packPath = path.resolve(__dirname, '../Degenerativnoe_iskusstvo_5.siq');

    beforeEach(() => {
        service = new SiqService();
    });

    test('should parse Degenerativnoe_iskusstvo_5.siq correctly', async () => {
        if (!fs.existsSync(packPath)) {
            console.warn('Pack not found at ' + packPath + ', skipping test.');
            return;
        }

        const buffer = fs.readFileSync(packPath);
        const fileName = path.basename(packPath);

        // Mock File object for SiqService
        const file = new File([buffer], fileName, { type: 'application/x-zip-compressed' });

        const result = await service.parseSiq(file);

        expect(result).toBeDefined();
        expect(result.questions.length).toBeGreaterThan(0);

        // Output some stats for documentation
        console.log(`Parsed pack: ${fileName}`);
        console.log(`Total questions: ${result.questions.length}`);

        const roundNames = Object.keys(result.roundTypes);
        console.log(`Rounds: ${roundNames.join(', ')}`);

        // Basic sanity checks
        expect(roundNames.length).toBeGreaterThan(0);

        // Check if any question has media to verify extraction logic
        const hasMedia = result.questions.some(q => q.questionImageUrl || q.questionAudioUrl || q.questionVideoUrl);
        console.log(`Has media: ${hasMedia}`);

        // Verify Round 1 exists
        const r1Questions = result.questions.filter(q => q.round === roundNames[0]);
        expect(r1Questions.length).toBeGreaterThan(0);

        // Check types distribution
        const types = new Set(result.questions.map(q => q.type));
        console.log(`Question types found: ${Array.from(types).join(', ')}`);

        // Assertions based on "Rounds: 1-й раунд, 2-й раунд, 3-й раунд, ФИНАЛ"
        expect(roundNames.length).toBeGreaterThanOrEqual(1);

        const finalRoundName = roundNames.find(r => r.includes('ФИНАЛ'));
        expect(finalRoundName).toBeDefined();
        expect(result.roundTypes[finalRoundName!]).toBe('final');

        // Verify final round has questions
        const finalQuestions = result.questions.filter(q => q.round === finalRoundName);
        expect(finalQuestions.length).toBeGreaterThan(0);
        finalQuestions.forEach(q => {
            expect(q.score).toBeGreaterThanOrEqual(0);
        });
    });
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn((blob: any) => `blob:${blob.size || 0}`);
