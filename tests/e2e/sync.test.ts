import { test, expect } from '@playwright/test';

test.describe('Synchronization Tests', () => {
    test('should sync player additions from Admin to TV Screen', async ({ browser }) => {
        // 1. Create a single context to allow BroadcastChannel communication
        const context = await browser.newContext();

        // 2. Open Admin Panel
        const adminPage = await context.newPage();
        console.log('Opening Admin Page...');
        await adminPage.goto('/SIGame.html');

        // Wait for Admin UI to be visible (auto-switched if no ?screen=game)
        await expect(adminPage.locator('#admin-ui')).toBeVisible({ timeout: 10000 });
        console.log('Admin UI visible.');

        // 3. Open TV Screen in another tab/page
        const tvPage = await context.newPage();
        console.log('Opening TV Page...');
        await tvPage.goto('/SIGame.html?screen=game');

        // Wait for TV Screen to be visible
        await expect(tvPage.locator('#game-screen')).toBeVisible({ timeout: 10000 });
        console.log('TV Screen visible.');

        // 4. Add a player in Admin
        console.log('Adding player...');
        await adminPage.click('#add-player-btn');

        // Find the newly created player input and type a name
        const playerNameInput = adminPage.locator('.player-name-input').first();
        await playerNameInput.waitFor({ state: 'visible' });
        await playerNameInput.fill('Test Player 1');
        // Trigger change event (blur)
        await playerNameInput.blur();
        console.log('Player added and name blurred.');

        // 5. Verify player appears on TV Screen scoreboard
        // The scoreboard elements are generated in TVScreen.ts with id `player-${id}`
        // and class `tv-score`
        console.log('Checking TV Scoreboard...');
        const tvScoreboard = tvPage.locator('#tv-scoreboard');
        await expect(tvScoreboard).toContainText('Test Player 1', { timeout: 10000 });
        console.log('Player found on TV Scoreboard.');

        // 6. Update score in Admin and verify on TV
        console.log('Updating score...');
        const scoreInput = adminPage.locator('.score-input').first();
        await scoreInput.fill('500');
        await scoreInput.blur();

        const tvScoreVal = tvPage.locator('.tv-score-val').first();
        await expect(tvScoreVal).toHaveText('500', { timeout: 10000 });
        console.log('Score updated on TV.');

        await context.close();
    });
});
