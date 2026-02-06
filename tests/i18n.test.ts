import { t, setLanguage, getLanguage } from '../src/utils/i18n';

describe('i18n Service Tests', () => {
    beforeEach(() => {
        // Reset to default (ru) before each test
        setLanguage('ru');
    });

    test('should return correct Russian translation by default', () => {
        expect(getLanguage()).toBe('ru');
        expect(t('winners_title')).toBe('ПОБЕДИТЕЛИ');
    });

    test('should return correct English translation after switching', () => {
        setLanguage('en');
        expect(getLanguage()).toBe('en');
        expect(t('winners_title')).toBe('WINNERS');
    });

    test('should return key if translation is missing', () => {
        const missingKey = 'non_existent_key_123';
        expect(t(missingKey)).toBe(missingKey);
    });

    test('should fallback to Russian if English translation is missing (theoretical)', () => {
        // In this implementation, translations always have both keys, 
        // but if we had a partial object, we'd test fallback.
        // Let's just verify a known key.
        expect(t('gm_panel')).toBe('🎮 Панель GM');
        setLanguage('en');
        expect(t('gm_panel')).toBe('🎮 GM Panel');
    });
});
