import { SiqService } from '../src/services/SiqService';
import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

// Content XML template mimicking a real SIGame package
const MOCK_CONTENT_XML = `<?xml version="1.0" encoding="utf-8"?>
<package name="Test Package" version="4" id="test-id" date="27.08.2023" difficulty="5" xmlns="http://vladimirkhil.com/ygpackage3.0.xsd">
  <rounds>
    <round name="Round 1">
      <themes>
        <theme name="Simple Questions">
          <questions>
            <question price="100">
              <scenario>
                <atom type="text">What is 2+2?</atom>
              </scenario>
              <right>
                <answer>4</answer>
              </right>
            </question>
            <question price="200">
               <params>
                <param name="question" type="content">
                    <item type="image" isRef="True">question.jpg</item>
                </param>
              </params>
              <right>
                <answer>Image Answer</answer>
              </right>
            </question>
          </questions>
        </theme>
        <theme name="Special">
          <questions>
            <question price="300" type="cat">
               <params>
                <param name="theme">Cats</param>
                <param name="cost">500</param>
              </params>
              <scenario>
                <atom type="text">Meow?</atom>
              </scenario>
              <right>
                <answer>Yes</answer>
              </right>
            </question>
          </questions>
        </theme>
      </themes>
    </round>
    <round name="Final Round" type="final">
      <themes>
        <theme name="Final Theme">
          <questions>
            <question price="0">
              <scenario>
                <atom type="text">Final Q</atom>
              </scenario>
              <right>
                <answer>Final A</answer>
              </right>
            </question>
          </questions>
        </theme>
      </themes>
    </round>
  </rounds>
</package>`;

describe('SiqService Translator Tests', () => {
    let service: SiqService;

    beforeEach(() => {
        service = new SiqService();
    });

    test('should correctly parse a generated SIQ package', async () => {
        // 1. Create a mocked .siq file (zip) in memory
        const zip = new JSZip();
        zip.file('content.xml', MOCK_CONTENT_XML);

        // Add a mock image
        const mockImageBlob = new Uint8Array([1, 2, 3, 4]);
        zip.folder('Images')?.file('question.jpg', mockImageBlob);

        const zipContent = await zip.generateAsync({ type: 'blob' });

        // Polyfill File definition for Node environment if needed, 
        // but since we are using 'blob' type in generateAsync which returns Blob (or Buffer in node?), 
        // ensure compatible type for SiqService which expects 'File'.
        // In Node, JSZip generateAsync with type 'blob' might not work as expected or requires polyfills.
        // Let's use 'uint8array' and convert to a mocked File object.

        const zipBuffer = await zip.generateAsync({ type: 'uint8array' });

        // Mock the File object class if it doesn't exist (Node environment)
        // or just cast it if we are mocking.
        // However, SiqService uses zip.loadAsync(file). JSZip supports loading from Uint8Array/Buffer.
        // So we can pass a dummy object that looks like a File but holds the buffer/arrayBuffer.

        // Create a real File object (available in jsdom)
        const mockFile = new File([zipBuffer as any], 'test.siq', { type: 'application/x-zip-compressed' });

        // 2. Parse
        const result = await service.parseSiq(mockFile);

        // 3. Assertions
        expect(result).toBeDefined();

        // Check Questions Count
        // 100, 200, 300, Final = 4 questions
        expect(result.questions).toHaveLength(4);

        // Check Text Question
        const q1 = result.questions.find(q => q.score === 100);
        expect(q1).toBeDefined();
        expect(q1?.question).toBe('What is 2+2?');
        expect(q1?.answer).toBe('4');
        expect(q1?.category).toBe('Simple Questions');

        // Check Media Question (Image)
        const q2 = result.questions.find(q => q.score === 200);
        expect(q2).toBeDefined();
        expect(q2?.questionImageUrl).toBeDefined();
        // Note: URL.createObjectURL involves DOM, might need mock or check if raw file is in storage
        expect(result.fileStorage[q2!.id]).toBeDefined();
        expect(result.fileStorage[q2!.id].questionImage).toBeDefined();

        // Check Special Question (Cat in Bag)
        const q3 = result.questions.find(q => q.score === 300);
        expect(q3).toBeDefined();
        expect(q3?.specialType).toBe('cat');
        expect(q3?.specialDescription).toContain('Cats');
        expect(q3?.specialDescription).toContain('500');

        // Check Final Round
        expect(result.roundTypes['Final Round']).toBe('final');
        expect(result.roundTypes['Round 1']).toBe('regular');
    });
});

// Mock URL.createObjectURL since it's not available in Node environment
global.URL.createObjectURL = jest.fn((blob: any) => `blob:${blob.size}`);
